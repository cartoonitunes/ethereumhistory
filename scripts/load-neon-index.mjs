#!/usr/bin/env node
/**
 * Bulk-load the enriched SQLite index into Neon.
 *
 *   node scripts/load-neon-index.mjs --table contract_index
 *   node scripts/load-neon-index.mjs --table bytecode_families
 *
 * Streams rows straight from SQLite into a Postgres `COPY … FROM STDIN` — no
 * intermediate CSV file. That is deliberate: a CSV round-trip cannot reliably
 * distinguish a SQL NULL from an empty string (sqlite3's CSV writer emits both
 * as an empty field), and this index has 2.1M NULL bytecode_hash values that
 * MUST NOT arrive as ''. COPY's text format has a dedicated NULL marker (\N),
 * so the distinction survives.
 *
 * RESUMABILITY
 * ------------
 * Rows are copied in chunks, each its own transaction. A COPY that fails rolls
 * back whole, so a chunk is all-or-nothing and a failed chunk can simply be
 * retried. `--resume` reads the max rowid already present and continues past it,
 * which makes an interrupted load safe to restart.
 *
 * value_wei carries TWO upstream formats (decimal wei and, for ~23.7k rows, a
 * hex string). It is stored verbatim in `value_wei`; `value_wei_decimal` gets
 * the BigInt-normalized number. See migration 090.
 */

import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { homedir } from "node:os";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const args = process.argv.slice(2);
const argOf = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const TABLE = argOf("--table", "contract_index");
const CHUNK = parseInt(argOf("--chunk", "200000"), 10);
const RESUME = args.includes("--resume");
const SQLITE_PATH = argOf("--db", path.join(homedir(), ".openclaw/enrichment-pipeline/enriched_index.db"));

const PG_URL =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;
if (!PG_URL) { console.error("No Postgres URL in the environment"); process.exit(1); }

// COPY text format: NULL is \N; backslash, tab, newline and CR must be escaped.
// Anything else goes through byte-for-byte.
const ESCAPE = /[\\\t\n\r]/g;
const ESCAPES = { "\\": "\\\\", "\t": "\\t", "\n": "\\n", "\r": "\\r" };
function field(v) {
  if (v === null || v === undefined) return "\\N";
  const s = typeof v === "string" ? v : String(v);
  return s.includes("\\") || s.includes("\t") || s.includes("\n") || s.includes("\r")
    ? s.replace(ESCAPE, (c) => ESCAPES[c])
    : s;
}

/** Normalize both upstream value_wei formats to a decimal string. */
function toDecimalWei(v) {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  try {
    if (/^0[xX][0-9a-fA-F]+$/.test(s)) return BigInt(s).toString();
    if (/^-?\d+$/.test(s)) return s;
    return null; // unparseable — recorded as NULL rather than guessed at
  } catch { return null; }
}

const SPECS = {
  contract_index: {
    target: "neon_contract_index",
    source: "contract_index",
    columns: [
      "address","deployer","block_number","timestamp","bytecode_hash","code_size","era","year",
      "is_internal","gas_used","value_wei","value_wei_decimal","is_documented","is_cracked",
      "verification_method","etherscan_contract_name","contract_type","manual_categories",
      "has_writeup","cracked_sibling_address","proof_url","is_erc20_like","is_proxy",
      "has_selfdestruct","is_self_destructed","token_name","token_symbol","token_decimals",
      "ens_name","deployer_ens_name","sourcify_verified","sourcify_match_type","creation_tx_hash",
    ],
    select: `SELECT rowid AS _rid, address, deployer, block_number, timestamp, bytecode_hash,
                    code_size, era, year, is_internal, gas_used, value_wei, is_documented,
                    is_cracked, verification_method, etherscan_contract_name, contract_type,
                    manual_categories, has_writeup, cracked_sibling_address, proof_url,
                    is_erc20_like, is_proxy, has_selfdestruct, is_self_destructed, token_name,
                    token_symbol, token_decimals, ens_name, deployer_ens_name, sourcify_verified,
                    sourcify_match_type, creation_tx_hash
             FROM contract_index WHERE rowid > ? ORDER BY rowid LIMIT ?`,
    line: (r) =>
      field(r.address) + "\t" + field(r.deployer) + "\t" + field(r.block_number) + "\t" +
      field(r.timestamp) + "\t" + field(r.bytecode_hash) + "\t" + field(r.code_size) + "\t" +
      field(r.era) + "\t" + field(r.year) + "\t" + field(r.is_internal) + "\t" +
      field(r.gas_used) + "\t" + field(r.value_wei) + "\t" + field(toDecimalWei(r.value_wei)) + "\t" +
      field(r.is_documented) + "\t" + field(r.is_cracked) + "\t" + field(r.verification_method) + "\t" +
      field(r.etherscan_contract_name) + "\t" + field(r.contract_type) + "\t" +
      field(r.manual_categories) + "\t" + field(r.has_writeup) + "\t" +
      field(r.cracked_sibling_address) + "\t" + field(r.proof_url) + "\t" +
      field(r.is_erc20_like) + "\t" + field(r.is_proxy) + "\t" + field(r.has_selfdestruct) + "\t" +
      field(r.is_self_destructed) + "\t" + field(r.token_name) + "\t" + field(r.token_symbol) + "\t" +
      field(r.token_decimals) + "\t" + field(r.ens_name) + "\t" + field(r.deployer_ens_name) + "\t" +
      field(r.sourcify_verified) + "\t" + field(r.sourcify_match_type) + "\t" +
      field(r.creation_tx_hash) + "\n",
  },
  bytecode_families: {
    target: "neon_bytecode_families",
    source: "bytecode_families",
    columns: ["bytecode_hash", "sibling_count", "is_cracked", "cracked_address", "proof_url"],
    select: `SELECT rowid AS _rid, bytecode_hash, sibling_count, is_cracked, cracked_address, proof_url
             FROM bytecode_families WHERE rowid > ? ORDER BY rowid LIMIT ?`,
    line: (r) =>
      field(r.bytecode_hash) + "\t" + field(r.sibling_count ?? 0) + "\t" +
      field(r.is_cracked ?? 0) + "\t" + field(r.cracked_address) + "\t" + field(r.proof_url) + "\n",
  },
};

const spec = SPECS[TABLE];
if (!spec) { console.error(`Unknown --table ${TABLE}`); process.exit(1); }

const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
const sql = postgres(PG_URL, { max: 1, idle_timeout: 0, connect_timeout: 30, prepare: false });

const totalRows = Number(sqlite.prepare(`SELECT COUNT(*) AS c FROM ${spec.source}`).get().c);
const maxRid = Number(sqlite.prepare(`SELECT MAX(rowid) AS m FROM ${spec.source}`).get().m);

// Progress is journalled after every committed chunk so --resume knows exactly
// where to pick up rather than inferring it.
const PROGRESS_FILE = path.join(
  process.env.TMPDIR || "/tmp",
  `neon-index-load.${spec.target}.progress`
);
function writeProgress(lastRid, rowsCopied) {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify({ lastRid, rowsCopied, at: new Date().toISOString() }));
  } catch { /* journalling is an optimization; never fail the load over it */ }
}

let startRid = 0;
if (RESUME) {
  const [{ n }] = await sql.unsafe(`SELECT COUNT(*)::bigint AS n FROM ${spec.target}`);
  const present = Number(n);
  if (present > 0) {
    let journalled = null;
    try {
      journalled = JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
    } catch { /* no journal — fall back below */ }

    if (journalled && Number(journalled.rowsCopied) === present) {
      startRid = Number(journalled.lastRid);
      console.log(`resuming from the journal: ${present.toLocaleString()} rows present, continuing after rowid ${startRid}`);
    } else {
      // No usable journal. Rows are copied in strict rowid order, so the count
      // IS the last rowid — but only when the source rowids are contiguous from
      // 1. Verify that rather than assume it: on a gapped source (rows deleted
      // upstream) count < last-loaded-rowid, and resuming from the count would
      // re-read rows that are already in Postgres. The PRIMARY KEY would catch
      // that and abort the chunk, so it cannot corrupt anything — but the
      // operator deserves a straight answer instead of a confusing PK error.
      const minRid = Number(sqlite.prepare(`SELECT MIN(rowid) AS m FROM ${spec.source}`).get().m);
      if (minRid !== 1 || maxRid !== totalRows) {
        console.error(
          `cannot infer the resume point: ${spec.source} rowids are not contiguous ` +
          `(min=${minRid}, max=${maxRid}, count=${totalRows}) and no progress journal ` +
          `was found at ${PROGRESS_FILE}.\n` +
          `Either truncate ${spec.target} and reload from scratch, or pass an explicit ` +
          `--after <rowid> once you have established how far the previous run got.`
        );
        await sql.end({ timeout: 5 });
        process.exit(1);
      }
      startRid = present;
      console.log(`resuming: ${present.toLocaleString()} rows present, contiguous rowids verified, continuing after rowid ${startRid}`);
    }
  }
}

// Explicit override, for the case the message above points at.
const AFTER = argOf("--after", null);
if (AFTER !== null) {
  startRid = parseInt(AFTER, 10);
  console.log(`starting after rowid ${startRid} (--after)`);
}

console.log(`loading ${spec.source} → ${spec.target}`);
console.log(`  source rows: ${totalRows.toLocaleString()}  (rowid 1..${maxRid.toLocaleString()})`);
console.log(`  chunk size:  ${CHUNK.toLocaleString()}`);

const started = Date.now();
let copied = 0;
let rid = startRid;
const stmt = sqlite.prepare(spec.select);

while (rid < maxRid) {
  const rows = stmt.all(rid, CHUNK);
  if (rows.length === 0) break;

  const buf = [];
  for (const r of rows) buf.push(spec.line(r));
  const payload = buf.join("");
  const lastRid = Number(rows[rows.length - 1]._rid);

  let attempt = 0;
  for (;;) {
    try {
      const writable = await sql.unsafe(
        `COPY ${spec.target} (${spec.columns.join(",")}) FROM STDIN`
      ).writable();
      await new Promise((resolve, reject) => {
        writable.on("error", reject);
        writable.on("finish", resolve);
        writable.write(payload, (err) => (err ? reject(err) : writable.end()));
      });
      break;
    } catch (err) {
      attempt += 1;
      // A failed COPY rolls back entirely, so retrying the same chunk cannot
      // double-insert. Give up after 3 tries and leave the load resumable.
      if (attempt >= 3) {
        console.error(`\nchunk ending at rowid ${lastRid} failed after ${attempt} attempts:`, err.message);
        console.error(`rerun with --resume to continue from where this stopped`);
        await sql.end({ timeout: 5 });
        process.exit(1);
      }
      console.warn(`\n  chunk ending at rowid ${lastRid} failed (attempt ${attempt}): ${err.message} — retrying`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  copied += rows.length;
  rid = lastRid;
  writeProgress(lastRid, startRid + copied);
  const elapsed = (Date.now() - started) / 1000;
  const rate = copied / elapsed;
  const remaining = Math.max(0, totalRows - startRid - copied);
  process.stdout.write(
    `\r  ${(startRid + copied).toLocaleString()} / ${totalRows.toLocaleString()} ` +
    `(${(((startRid + copied) / totalRows) * 100).toFixed(1)}%)  ` +
    `${Math.round(rate).toLocaleString()} rows/s  eta ${Math.round(remaining / Math.max(rate, 1))}s      `
  );
}

const elapsed = (Date.now() - started) / 1000;
const [{ n }] = await sql.unsafe(`SELECT COUNT(*)::bigint AS n FROM ${spec.target}`);
console.log(`\n  done: copied ${copied.toLocaleString()} rows in ${elapsed.toFixed(0)}s`);
console.log(`  ${spec.target} now holds ${Number(n).toLocaleString()} rows (source has ${totalRows.toLocaleString()})`);

await sql.end({ timeout: 10 });
sqlite.close();
process.exit(Number(n) === totalRows ? 0 : 2);
