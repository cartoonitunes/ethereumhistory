/**
 * Recover preview_cards rows destroyed by ad hoc DELETEs on 2026-09-06.
 *
 * WHAT HAPPENED
 * -------------
 * Twenty unqualified `DELETE FROM preview_cards;` statements ran against
 * production between 01:42Z and 18:20Z that day. Every address that could be
 * traced in the session transcript was a test scan, but the /preview route is
 * not instrumented in analytics_events, so organic visits in that window would
 * have left no trace anywhere. That is why this script exists: the question of
 * whether real user rows were lost cannot be answered from what survives, only
 * from Neon's history.
 *
 * HOW IT WORKS
 * ------------
 * Each delete wiped the table, so rows only ever survived in the gaps between
 * them. This branches the Neon project at the end of each gap, reads
 * preview_cards as it stood at that instant, and merges anything it finds back
 * into production. The gaps are ordered longest first, because a ten hour
 * overnight window is where an organic row is most likely to be sitting.
 *
 * SAFETY
 * ------
 * Restores are INSERT ... ON CONFLICT DO NOTHING. A recovered row never
 * overwrites a current one, and nothing here deletes from production. Reads are
 * on throwaway branches that are destroyed afterwards. Run with --dry-run first
 * to see what is there without writing anything.
 *
 * USAGE
 *   export NEON_API_KEY=...        # from console.neon.tech, Account -> API keys
 *   node scripts/recover-preview-cards.mjs --dry-run
 *   node scripts/recover-preview-cards.mjs --restore
 */

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API = "https://console.neon.tech/api/v2";
const KEY = process.env.NEON_API_KEY;
const PROJECT = process.env.NEON_PROJECT_ID;
const RESTORE = process.argv.includes("--restore");

if (!KEY) {
  console.error(`
NEON_API_KEY is not set, and it is the one thing this needs.

Create one at console.neon.tech -> Account settings -> API keys, then either
export it in this shell or add it to .env.local. It is a credential, so put it
in the file rather than pasting it into a chat.

Without it, the same recovery can be done by hand in the Neon console:
  Branches -> New branch -> "Point in time", enter a timestamp below, then read
  preview_cards on the new branch.
`);
}

/**
 * The gaps between deletes, in UTC, longest first.
 *
 * The timestamp is a few seconds before the delete that ended the gap, so the
 * branch sees the table as it stood with that gap's rows still in it.
 */
const WINDOWS = [
  { at: "2026-09-06T12:06:55Z", gap: "10h 22m", note: "overnight, the largest window and the likeliest to hold an organic row" },
  { at: "2026-09-06T17:38:35Z", gap: "3h 18m", note: "afternoon" },
  { at: "2026-09-06T18:12:30Z", gap: "17m", note: "just before the final cleanup" },
  { at: "2026-09-06T14:18:55Z", gap: "1h 10m", note: "midday" },
  { at: "2026-09-06T01:42:10Z", gap: "since the table was created", note: "before the very first delete" },
];

const api = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${path}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

async function readAt(when) {
  const name = `recover-preview-${when.replace(/[^0-9]/g, "")}`;
  let branchId = null;
  try {
    const made = await api(`/projects/${PROJECT}/branches`, {
      method: "POST",
      body: JSON.stringify({
        branch: { name, parent_timestamp: when },
        endpoints: [{ type: "read_write" }],
      }),
    });
    branchId = made.branch.id;
    const uri =
      made.connection_uris?.[0]?.connection_uri ??
      (await api(`/projects/${PROJECT}/connection_uri?branch_id=${branchId}&database_name=${process.env.PGDATABASE}&role_name=${process.env.PGUSER}`)).uri;

    // Give the new endpoint a moment to accept connections.
    for (let i = 0; i < 10; i++) {
      try {
        const sql = neon(uri);
        return await sql`SELECT * FROM preview_cards ORDER BY id`;
      } catch (e) {
        if (i === 9) throw e;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  } finally {
    if (branchId) {
      await api(`/projects/${PROJECT}/branches/${branchId}`, { method: "DELETE" }).catch(() => {});
    }
  }
}

async function main() {
  if (!KEY) process.exit(1);
  const live = neon(process.env.DATABASE_URL);
  const current = new Set(
    (await live`SELECT address FROM preview_cards`).map((r) => r.address)
  );
  console.log(`production currently holds ${current.size} row(s)\n`);

  const found = new Map();
  for (const w of WINDOWS) {
    process.stdout.write(`branching at ${w.at}  (gap ${w.gap}, ${w.note})\n`);
    let rows;
    try {
      rows = await readAt(w.at);
    } catch (e) {
      console.log(`   could not read: ${e.message}\n`);
      continue;
    }
    console.log(`   ${rows.length} row(s) present at that instant`);
    for (const r of rows) {
      if (!found.has(r.address)) found.set(r.address, r);
      const tag = current.has(r.address) ? "already live" : "RECOVERABLE";
      console.log(`     ${r.address}  ${r.ens_name ?? ""}  score=${r.score} held=${r.contract_count}  [${tag}]`);
    }
    console.log();
  }

  const missing = [...found.values()].filter((r) => !current.has(r.address));
  console.log(`\n${found.size} distinct address(es) seen across all windows`);
  console.log(`${missing.length} not currently in production\n`);

  if (!missing.length) {
    console.log("Nothing to restore.");
    return;
  }
  if (!RESTORE) {
    console.log("Dry run. Re-run with --restore to merge these back.");
    return;
  }
  for (const r of missing) {
    await live`
      INSERT INTO preview_cards
        (address, ens_name, card_data_json, score, tier_label, contract_count,
         earliest_year, first_scanned_at, last_scanned_at, scan_count,
         claimed_by_historian_id, claimed_at, listed)
      VALUES
        (${r.address}, ${r.ens_name}, ${r.card_data_json}, ${r.score}, ${r.tier_label},
         ${r.contract_count}, ${r.earliest_year}, ${r.first_scanned_at}, ${r.last_scanned_at},
         ${r.scan_count}, ${r.claimed_by_historian_id}, ${r.claimed_at}, ${r.listed})
      ON CONFLICT (address) DO NOTHING`;
    console.log(`  restored ${r.address}`);
  }
  console.log(`\nDone. ${missing.length} row(s) merged back.`);
}

main().catch((e) => {
  console.error("failed:", e.message);
  process.exit(1);
});
