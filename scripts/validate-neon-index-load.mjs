#!/usr/bin/env node
/**
 * Post-load validation: compares the Neon index against the enriched SQLite
 * source, aggregate by aggregate. Read-only on both sides.
 *
 *   node scripts/validate-neon-index-load.mjs
 *
 * Exit 0 only if every comparison matches exactly.
 */
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { homedir } from "node:os";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const SQLITE_PATH = path.join(homedir(), ".openclaw/enrichment-pipeline/enriched_index.db");
const PG_URL = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING ||
               process.env.POSTGRES_URL || process.env.DATABASE_URL;

const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
const sql = postgres(PG_URL, { max: 1, idle_timeout: 0, connect_timeout: 30, prepare: false });

let pass = 0, fail = 0;
const failures = [];
const fmt = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? v.toLocaleString() : String(v));

function cmp(label, a, b) {
  const A = a === null || a === undefined ? null : String(a);
  const B = b === null || b === undefined ? null : String(b);
  if (A === B) { pass++; console.log(`  ✓ ${label.padEnd(46)} ${fmt(a)}`); }
  else { fail++; failures.push(`${label}: sqlite=${fmt(a)} neon=${fmt(b)}`); console.log(`  ✗ ${label.padEnd(46)} sqlite=${fmt(a)}  neon=${fmt(b)}`); }
}

// SUM(timestamp) over 12M rows is ~1.8e16 — past Number.MAX_SAFE_INTEGER.
// node:sqlite throws rather than silently rounding, so every read here is done
// in BigInt mode and compared as a string. Postgres-side sums are cast to
// ::text for the same reason (postgres.js would hand back a JS number).
function liteRow(q, ...p) {
  const stmt = sqlite.prepare(q);
  stmt.setReadBigInts(true);
  return stmt.get(...p) ?? null;
}
function liteAll(q, ...p) {
  const stmt = sqlite.prepare(q);
  stmt.setReadBigInts(true);
  return stmt.all(...p);
}
const lite1 = (q, ...p) => { const r = liteRow(q, ...p); return r ? Object.values(r)[0] : null; };
const pg1 = async (q) => { const r = await sql.unsafe(q); return r[0] ? Object.values(r[0])[0] : null; };

async function main() {
  console.log("\n=== ROW COUNTS ===");
  cmp("contract_index rows", lite1("SELECT COUNT(*) FROM contract_index"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index"));
  cmp("bytecode_families rows", lite1("SELECT COUNT(*) FROM bytecode_families"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_bytecode_families"));

  console.log("\n=== ERA BREAKDOWN ===");
  const liteEra = sqlite.prepare("SELECT era, COUNT(*) AS c FROM contract_index GROUP BY era ORDER BY era").all();
  const pgEra = await sql.unsafe("SELECT era, COUNT(*)::bigint AS c FROM neon_contract_index GROUP BY era ORDER BY era");
  const pgEraMap = new Map(pgEra.map((r) => [r.era, String(r.c)]));
  cmp("distinct era values", liteEra.length, pgEra.length);
  for (const r of liteEra) cmp(`  era=${r.era}`, r.c, pgEraMap.get(r.era) ?? null);

  console.log("\n=== YEAR BREAKDOWN ===");
  const liteYear = sqlite.prepare("SELECT year, COUNT(*) AS c FROM contract_index GROUP BY year ORDER BY year").all();
  const pgYear = await sql.unsafe("SELECT year, COUNT(*)::bigint AS c FROM neon_contract_index GROUP BY year ORDER BY year");
  const pgYearMap = new Map(pgYear.map((r) => [String(r.year), String(r.c)]));
  cmp("distinct year values", liteYear.length, pgYear.length);
  for (const r of liteYear) cmp(`  year=${r.year}`, r.c, pgYearMap.get(String(r.year)) ?? null);

  console.log("\n=== NULL PRESERVATION (NULL must not have become '') ===");
  // One pass per side, not one per column: 20 separate full scans over 12M rows
  // is what made the first run take ~15 minutes.
  const NULLABLE = ["bytecode_hash","gas_used","value_wei","verification_method",
    "etherscan_contract_name","contract_type","token_name","token_symbol","token_decimals",
    "ens_name","deployer_ens_name","proof_url","cracked_sibling_address","sourcify_match_type",
    "creation_tx_hash","manual_categories"];
  const EMPTYABLE = ["bytecode_hash","verification_method","token_name","manual_categories",
    "etherscan_contract_name","token_symbol"];
  const liteNulls = liteRow(
    `SELECT ${NULLABLE.map((c) => `SUM(${c} IS NULL) AS n_${c}`).join(", ")},
            ${EMPTYABLE.map((c) => `SUM(${c} = '') AS e_${c}`).join(", ")}
     FROM contract_index`
  );
  const pgNulls = (await sql.unsafe(
    `SELECT ${NULLABLE.map((c) => `count(*) FILTER (WHERE ${c} IS NULL)::text AS n_${c}`).join(", ")},
            ${EMPTYABLE.map((c) => `count(*) FILTER (WHERE ${c} = '')::text AS e_${c}`).join(", ")}
     FROM neon_contract_index`
  ))[0];
  for (const c of NULLABLE) cmp(`${c} IS NULL`, liteNulls[`n_${c}`], pgNulls[`n_${c}`]);
  console.log("  -- empty strings must match too, not be conflated with NULL --");
  for (const c of EMPTYABLE) cmp(`${c} = ''`, liteNulls[`e_${c}`], pgNulls[`e_${c}`]);

  console.log("\n=== NUMERIC AGGREGATES (checksums over every row) ===");
  const SUMCOLS = ["block_number","code_size","timestamp","is_internal","gas_used","year",
    "is_documented","is_cracked","has_writeup","is_erc20_like","is_proxy","has_selfdestruct",
    "is_self_destructed","sourcify_verified","token_decimals"];
  const MINMAX = ["block_number","timestamp","code_size"];
  const liteAgg = liteRow(
    `SELECT ${SUMCOLS.map((c) => `SUM(${c}) AS s_${c}`).join(", ")},
            ${MINMAX.map((c) => `MIN(${c}) AS mn_${c}, MAX(${c}) AS mx_${c}`).join(", ")},
            SUM(length(address)) AS len_address, SUM(length(deployer)) AS len_deployer,
            SUM(length(era)) AS len_era, SUM(length(bytecode_hash)) AS len_bytecode_hash,
            SUM(length(value_wei)) AS len_value_wei
     FROM contract_index`
  );
  const pgAgg = (await sql.unsafe(
    `SELECT ${SUMCOLS.map((c) => `SUM(${c})::text AS s_${c}`).join(", ")},
            ${MINMAX.map((c) => `MIN(${c})::text AS mn_${c}, MAX(${c})::text AS mx_${c}`).join(", ")},
            SUM(length(address))::text AS len_address, SUM(length(deployer))::text AS len_deployer,
            SUM(length(era))::text AS len_era, SUM(length(bytecode_hash))::text AS len_bytecode_hash,
            SUM(length(value_wei))::text AS len_value_wei
     FROM neon_contract_index`
  ))[0];
  for (const c of SUMCOLS) cmp(`SUM(${c})`, liteAgg[`s_${c}`], pgAgg[`s_${c}`]);
  for (const c of MINMAX) {
    cmp(`MIN(${c})`, liteAgg[`mn_${c}`], pgAgg[`mn_${c}`]);
    cmp(`MAX(${c})`, liteAgg[`mx_${c}`], pgAgg[`mx_${c}`]);
  }
  console.log("  -- total text bytes per column (catches truncation/re-encoding) --");
  for (const c of ["address","deployer","era","bytecode_hash","value_wei"]) {
    cmp(`SUM(length(${c}))`, liteAgg[`len_${c}`], pgAgg[`len_${c}`]);
  }

  console.log("\n=== CARDINALITY ===");
  const liteCard = liteRow(`SELECT COUNT(DISTINCT deployer) AS d, COUNT(DISTINCT bytecode_hash) AS b,
                                   COUNT(DISTINCT address) AS a, COUNT(DISTINCT era) AS e
                            FROM contract_index`);
  const pgCard = (await sql.unsafe(`SELECT COUNT(DISTINCT deployer)::text AS d, COUNT(DISTINCT bytecode_hash)::text AS b,
                                           COUNT(DISTINCT address)::text AS a, COUNT(DISTINCT era)::text AS e
                                    FROM neon_contract_index`))[0];
  cmp("COUNT(DISTINCT deployer)", liteCard.d, pgCard.d);
  cmp("COUNT(DISTINCT bytecode_hash)", liteCard.b, pgCard.b);
  cmp("COUNT(DISTINCT address)", liteCard.a, pgCard.a);
  cmp("COUNT(DISTINCT era)", liteCard.e, pgCard.e);

  console.log("\n=== value_wei DUAL FORMAT (migration 090) ===");
  cmp("value_wei hex-format rows", lite1("SELECT COUNT(*) FROM contract_index WHERE value_wei GLOB '0x*'"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE value_wei LIKE '0x%'"));
  cmp("value_wei stored verbatim (no rewrite)",
      lite1("SELECT COUNT(*) FROM contract_index WHERE value_wei GLOB '0x*'"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE value_wei LIKE '0x%'"));
  cmp("value_wei_decimal populated where value_wei IS NOT NULL",
      lite1("SELECT COUNT(*) FROM contract_index WHERE value_wei IS NOT NULL"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE value_wei_decimal IS NOT NULL"));
  cmp("value_wei_decimal NULL where value_wei IS NULL",
      lite1("SELECT COUNT(*) FROM contract_index WHERE value_wei IS NULL"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE value_wei_decimal IS NULL"));
  cmp("decimal rows: value_wei_decimal == value_wei",
      0,
      await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE value_wei IS NOT NULL AND value_wei NOT LIKE '0x%' AND value_wei_decimal::text <> value_wei"));

  console.log("\n=== FAMILIES ===");
  cmp("SUM(sibling_count)", lite1("SELECT SUM(sibling_count) FROM bytecode_families"),
      await pg1("SELECT SUM(sibling_count)::bigint FROM neon_bytecode_families"));
  cmp("cracked families", lite1("SELECT COUNT(*) FROM bytecode_families WHERE is_cracked=1"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_bytecode_families WHERE is_cracked=1"));
  cmp("families with a proof_url", lite1("SELECT COUNT(*) FROM bytecode_families WHERE proof_url IS NOT NULL"),
      await pg1("SELECT COUNT(*)::bigint FROM neon_bytecode_families WHERE proof_url IS NOT NULL"));
  cmp("MAX(sibling_count)", lite1("SELECT MAX(sibling_count) FROM bytecode_families"),
      await pg1("SELECT MAX(sibling_count) FROM neon_bytecode_families"));

  console.log("\n=== ROW-LEVEL SPOT CHECK (every column, 400 rows spread across the table) ===");
  const COLS = ["address","deployer","block_number","timestamp","bytecode_hash","code_size","era","year",
    "is_internal","gas_used","value_wei","is_documented","is_cracked","verification_method",
    "etherscan_contract_name","contract_type","manual_categories","has_writeup","cracked_sibling_address",
    "proof_url","is_erc20_like","is_proxy","has_selfdestruct","is_self_destructed","token_name",
    "token_symbol","token_decimals","ens_name","deployer_ens_name","sourcify_verified",
    "sourcify_match_type","creation_tx_hash"];
  const sample = liteAll(
    `SELECT ${COLS.join(",")} FROM contract_index WHERE rowid % 30118 = 1 LIMIT 400`
  );
  const addrs = sample.map((r) => r.address);
  const pgRows = await sql`SELECT ${sql.unsafe(COLS.join(","))} FROM neon_contract_index WHERE address IN ${sql(addrs)}`;
  const pgMap = new Map(pgRows.map((r) => [r.address, r]));
  let mismatched = 0, missing = 0;
  const details = [];
  for (const lr of sample) {
    const pr = pgMap.get(lr.address);
    if (!pr) { missing++; details.push(`${lr.address}: absent from Neon`); continue; }
    for (const c of COLS) {
      const a = lr[c] === null || lr[c] === undefined ? null : String(lr[c]);
      const b = pr[c] === null || pr[c] === undefined ? null : String(pr[c]);
      if (a !== b) { mismatched++; if (details.length < 12) details.push(`${lr.address}.${c}: sqlite=${JSON.stringify(a)} neon=${JSON.stringify(b)}`); }
    }
  }
  cmp(`rows sampled`, sample.length, pgMap.size);
  cmp(`rows missing from Neon`, 0, missing);
  cmp(`column values mismatched (${sample.length * COLS.length} compared)`, 0, mismatched);
  if (details.length) { console.log("  first mismatches:"); for (const d of details) console.log(`    ${d}`); }

  console.log("\n=== INTEGRITY ===");
  cmp("addresses not lowercase", 0, await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE address <> lower(address)"));
  cmp("deployers not lowercase", 0, await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE deployer <> lower(deployer)"));
  cmp("address length <> 42", 0, await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE length(address) <> 42"));
  cmp("bytecode_hash length <> 32 (non-null)", 0, await pg1("SELECT COUNT(*)::bigint FROM neon_contract_index WHERE bytecode_hash IS NOT NULL AND length(bytecode_hash) <> 32"));
  cmp("family hash length <> 32", 0, await pg1("SELECT COUNT(*)::bigint FROM neon_bytecode_families WHERE length(bytecode_hash) <> 32"));

  console.log(`\n${pass} checks passed, ${fail} failed`);
  if (failures.length) { console.log("\nFAILURES:"); for (const f of failures) console.log(`  - ${f}`); }
  await sql.end({ timeout: 10 });
  sqlite.close();
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { console.error(e); try { await sql.end({ timeout: 5 }); } catch {} process.exit(1); });
