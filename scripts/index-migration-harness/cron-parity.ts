/**
 * Exercises refreshTursoIndexTotals + getIndexTotals in BOTH flag modes against
 * the sample data, proving the scope-prefix switch and the fallback chain.
 */
process.env.POSTGRES_URL = "postgres://postgres@127.0.0.1:55433/ehtest";

import { sql } from "drizzle-orm";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

async function main() {
  const { getDb } = await import("@/lib/db-client");
  const db = getDb();

  // Seed a Neon base scope so the fallback tier has something to serve.
  await db.execute(sql`
    INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
    VALUES ('overall', 1368030, 980744, now()), ('era:frontier', 12753, 7820, now()),
           ('year:2019', 36, 2, now())
    ON CONFLICT (scope) DO UPDATE SET total = EXCLUDED.total, documented = EXCLUDED.documented`);
  // And a stale turso:* scope, as production has today.
  await db.execute(sql`
    INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
    VALUES ('turso:overall', 12023046, 0, now()), ('turso:era:frontier', 14201, 0, now())
    ON CONFLICT (scope) DO UPDATE SET total = EXCLUDED.total`);

  // ---- neon mode: the cron writes index:* ----
  process.env.INDEX_SOURCE = "neon";
  const ps = await import("@/lib/progress-stats");
  await ps.refreshTursoIndexTotals();

  const rows = (await db.execute<{ scope: string; total: number }>(
    sql`SELECT scope, total FROM contract_stats_cache ORDER BY scope`
  )) as unknown as { scope: string; total: number }[] | { rows: { scope: string; total: number }[] };
  const list = Array.isArray(rows) ? rows : rows.rows;
  const byScope = new Map(list.map((r) => [r.scope, Number(r.total)]));

  ok("cron wrote index:overall", byScope.has("index:overall"), [...byScope.keys()].filter(k=>k.startsWith("index:")));
  ok("index:overall = sample row count", byScope.get("index:overall") === 40157, byScope.get("index:overall"));
  ok("cron did NOT touch turso:overall", byScope.get("turso:overall") === 12023046);
  ok("cron did NOT touch the Neon base scope", byScope.get("overall") === 1368030);
  ok("index:era:byzantium written", (byScope.get("index:era:byzantium") ?? 0) > 0);
  ok("index:era:frontier folds frontier + frontier-thawing",
     (byScope.get("index:era:frontier") ?? 0) > 0);
  ok("zero-total scopes are skipped, not written as 0",
     [...byScope.entries()].filter(([k]) => k.startsWith("index:")).every(([, v]) => v > 0));

  // ---- getIndexTotals in neon mode prefers index:* ----
  const neonTotals = await ps.getIndexTotals();
  ok("neon mode: overall = index:overall", neonTotals.overall === 40157, neonTotals.overall);
  ok("neon mode: era:frontier = index value, not turso's 14201",
     neonTotals.byEra.get("frontier") === byScope.get("index:era:frontier"),
     [neonTotals.byEra.get("frontier"), byScope.get("index:era:frontier")]);
  ok("neon mode: year:2019 still falls back to the Neon base scope",
     neonTotals.byYear.get(2019) === 36, neonTotals.byYear.get(2019));

  // ---- turso mode reads turso:* (rollback path) ----
  process.env.INDEX_SOURCE = "turso";
  const { getIndexTotals: getTotalsTurso } = await import("@/lib/progress-stats");
  const tursoTotals = await getTotalsTurso();
  ok("turso mode: overall = turso:overall", tursoTotals.overall === 12023046, tursoTotals.overall);
  ok("turso mode: era:frontier = 14201", tursoTotals.byEra.get("frontier") === 14201, tursoTotals.byEra.get("frontier"));
  ok("turso mode: year:2019 still 36 from the base scope", tursoTotals.byYear.get(2019) === 36);

  // ---- the progress widget: full-index denominator, editorial numerator ----
  // Reversed deliberately at the Neon cutover (see WHICH DENOMINATOR in
  // lib/progress-stats). The pairing is the whole point: if the numerator ever
  // starts tracking the denominator, a full-index prefix has reached the
  // documented counts and every bucket will read 0.
  await db.execute(sql`CREATE TABLE IF NOT EXISTS historians (id serial primary key, active boolean default true)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS contract_edits (id serial primary key)`);
  process.env.INDEX_SOURCE = "neon";
  const progress = await ps.getProgressStats();
  ok("progress denominator is index:overall, not the Neon base scope",
     progress.overall.total === 40157, progress.overall);
  ok("progress documented still comes from the Neon base scope",
     progress.overall.documented === 980744, progress.overall);
  ok("progress era:frontier total is the index value, not Neon's 12753",
     progress.byEra.frontier.total === byScope.get("index:era:frontier"),
     [progress.byEra.frontier.total, byScope.get("index:era:frontier")]);
  ok("progress era:frontier documented still editorial (7820)",
     progress.byEra.frontier.documented === 7820, progress.byEra.frontier);
  // year:2019 is written by no full-index refresh; without getIndexTotals'
  // base-scope tier this bucket would render 0% instead of its real total.
  ok("progress year:2019 falls back to the base scope total (36)",
     progress.byYear["2019"].total === 36, progress.byYear["2019"]);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
