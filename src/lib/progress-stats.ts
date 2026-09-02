/**
 * Documentation-progress stats — shared by the homepage (SSR) and
 * /api/stats/progress (client fetch on the browse page).
 *
 * WHY THIS EXISTS
 * ---------------
 * The progress widget needs an "overall total" across the full 12M-row Turso
 * `contract_index`, broken down by era and by year. Running
 * `COUNT(*)` / `GROUP BY` over that table scans every row, and Turso bills by
 * rows read. The in-memory cache (see lib/cache) is per-serverless-instance and
 * dies with the instance, so under real traffic every cold start re-ran those
 * full-table scans — which is what was burning the Turso read quota and, when
 * the scans timed out, left the widget rendering nothing.
 *
 * FIX
 * ---
 * The expensive Turso aggregation now runs ONLY from the hourly cron
 * (`/api/cron/refresh-stats`, which executes in Node where Turso is reachable).
 * It writes the results into Neon's tiny `contract_stats_cache` table under
 * `turso:*` scopes. The request path (`getProgressStats`) reads ONLY Neon
 * (~20-40 rows, indexed) and never touches Turso. The scan happens at most once
 * per hour globally instead of once per cold request.
 *
 * WHICH DENOMINATOR
 * -----------------
 * Both numerator and denominator come from Neon's `contracts` table: of the
 * contracts we have ingested, how many are documented. That is the published,
 * external-facing coverage figure and it must stay stable.
 *
 * This module used to prefer the `turso:*` scopes for the denominator and fall
 * back to Neon only until "the first Turso refresh lands". That made the
 * headline metric depend on whether an unrelated cron job had finished: the
 * numerator counts Neon's ~1.4M ingested rows while the Turso index holds ~12M,
 * so the moment a refresh succeeded the published number silently dropped from
 * ~70% to ~8% with no code change and no data loss. Two different universes
 * were being divided by each other.
 *
 * The `turso:*` scopes are still refreshed, and `getIndexTotals` below serves
 * them to /coverage, which is deliberately a full-index view. They must simply
 * never drive THIS widget. See `totalFor` in getProgressStats.
 */

import { getDb } from "@/lib/db-client";
import { isTursoConfigured, turso } from "@/lib/turso";
import * as schema from "@/lib/schema";
import { sql, eq } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export interface ProgressStats {
  overall: { total: number; documented: number };
  byEra: Record<string, { total: number; documented: number }>;
  byYear: Record<string, { total: number; documented: number }>;
  community: { historians: number; totalEdits: number };
}

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"] as const;
const YEARS = [2015, 2016, 2017, 2018] as const;

// Turso stores verbose era names; map to app-canonical short IDs.
const TURSO_ERA_TO_APP: Record<string, string> = {
  "frontier-thawing": "frontier",
  "dao-fork": "dao",
  "tangerine-whistle": "tangerine",
  "spurious-dragon": "spurious",
};

type CacheRow = { scope: string; total: number | string; documented: number | string };

function toRows<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : (((raw as { rows?: T[] }).rows) ?? []);
}

/**
 * Recompute the full-index totals from Turso and persist them into Neon's
 * `contract_stats_cache` under `turso:overall`, `turso:era:<id>`,
 * `turso:year:<yyyy>` scopes. Expensive (full-table scan) — call ONLY from the
 * scheduled cron, never from a request handler. No-op if Turso isn't configured.
 *
 * These scopes do NOT feed the progress widget's denominator (see
 * getProgressStats) — a failure here can no longer move that published number.
 * They DO back /coverage via getIndexTotals, which degrades to the smaller Neon
 * totals when a scope is missing, so keeping this job finishing still matters.
 */
export async function refreshTursoIndexTotals(): Promise<void> {
  if (!isTursoConfigured()) return;
  const db = getDb();

  // ONE full scan, not three. The previous version issued COUNT(*), GROUP BY
  // era and GROUP BY year as three concurrent queries — three passes over 12M
  // rows, three times the billed reads, and ~5 minutes wall clock, which sat
  // right on the function timeout and meant the refresh usually died halfway.
  // Grouping by (era, year) in a single pass gives all three answers: the
  // overall count is the sum of every group, and the per-era / per-year totals
  // are the two marginals. NULL era/year still form groups, so the sum is a
  // true COUNT(*) and not a filtered subtotal.
  const gridRes = await turso.execute(
    `SELECT era, year, COUNT(*) AS total FROM contract_index GROUP BY era, year`
  );

  const grid = gridRes.rows as unknown as {
    era: string | null;
    year: number | null;
    total: number | bigint;
  }[];

  // An empty grid means the scan returned nothing — a locked/unavailable
  // replica, not a genuinely empty index. Bail out rather than persisting
  // zeroes over good cached values.
  if (grid.length === 0) {
    throw new Error("Turso contract_index returned no rows; refusing to cache zeroed totals");
  }

  let overall = 0;
  // Collapse verbose Turso era names into app era IDs (summing any collisions).
  const eraTotals = new Map<string, number>();
  const yearTotals = new Map<number, number>();

  for (const r of grid) {
    const count = Number(r.total);
    overall += count;

    if (r.era != null) {
      const appEra = TURSO_ERA_TO_APP[r.era] ?? r.era;
      if ((ERA_IDS as readonly string[]).includes(appEra)) {
        eraTotals.set(appEra, (eraTotals.get(appEra) ?? 0) + count);
      }
    }

    if (r.year != null) {
      const y = Number(r.year);
      if ((YEARS as readonly number[]).includes(y)) {
        yearTotals.set(y, (yearTotals.get(y) ?? 0) + count);
      }
    }
  }

  const upserts: { scope: string; total: number }[] = [
    { scope: "turso:overall", total: overall },
    ...ERA_IDS.map((id) => ({ scope: `turso:era:${id}`, total: eraTotals.get(id) ?? 0 })),
    ...YEARS.map((y) => ({ scope: `turso:year:${y}`, total: yearTotals.get(y) ?? 0 })),
  ];

  // Skip writing rows we couldn't compute (e.g. a partial Turso failure) so we
  // never clobber a good cached value with a zero. This applies to EVERY scope
  // including `turso:overall`, which used to be exempt — that exemption meant a
  // Turso hiccup could persist a 0 denominator and render "950,826 of 0 (0%)",
  // the exact failure the guard exists to prevent.
  for (const { scope, total } of upserts) {
    if (total <= 0) continue;
    await db.execute(sql`
      INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
      VALUES (${scope}, ${total}, 0, now())
      ON CONFLICT (scope) DO UPDATE
        SET total = EXCLUDED.total, updated_at = EXCLUDED.updated_at
    `);
  }
}

/**
 * Full-index totals per era and per year, read from `contract_stats_cache`.
 *
 * Prefers the `turso:*` scopes (true contract_index totals, written by the
 * cron) and falls back to the Neon base-scope total for any scope Turso has
 * not been sampled for. That fallback is what keeps these surfaces rendering
 * while Turso reads are blocked — /api/coverage used to scan the 12M-row
 * contract_index on every request instead, which both burned the read quota
 * and 500'd the whole dashboard the moment the quota ran out.
 *
 * Unlike getProgressStats, this is NOT restricted to the ERA_IDS / YEARS
 * whitelists: the coverage dashboard renders every era and year present.
 */
export async function getIndexTotals(): Promise<{
  overall: number;
  byEra: Map<string, number>;
  byYear: Map<number, number>;
}> {
  return cached("stats:index-totals:v1", CACHE_TTL.LONG, async () => {
    const db = getDb();
    const raw = await db.execute<CacheRow>(
      sql`SELECT scope, total, documented FROM contract_stats_cache`
    );

    const neonEra = new Map<string, number>();
    const neonYear = new Map<number, number>();
    const tursoEra = new Map<string, number>();
    const tursoYear = new Map<number, number>();
    let neonOverall = 0;
    let tursoOverall = 0;

    for (const r of toRows<CacheRow>(raw)) {
      const isTurso = r.scope.startsWith("turso:");
      const base = isTurso ? r.scope.slice("turso:".length) : r.scope;
      const total = Number(r.total);

      if (base === "overall") {
        if (isTurso) tursoOverall = total;
        else neonOverall = total;
      } else if (base.startsWith("era:")) {
        const raw = base.slice("era:".length);
        // Legacy spellings ("spurious_dragon") share a bucket with the
        // canonical id, so sum rather than overwrite.
        const id = TURSO_ERA_TO_APP[raw.replace(/_/g, "-")] ?? raw.replace(/_/g, "-");
        const map = isTurso ? tursoEra : neonEra;
        map.set(id, (map.get(id) ?? 0) + total);
      } else if (base.startsWith("year:")) {
        const y = Number(base.slice("year:".length));
        if (Number.isFinite(y)) (isTurso ? tursoYear : neonYear).set(y, total);
      }
    }

    const byEra = new Map<string, number>(neonEra);
    for (const [k, v] of tursoEra) byEra.set(k, v);
    const byYear = new Map<number, number>(neonYear);
    for (const [k, v] of tursoYear) byYear.set(k, v);

    return { overall: tursoOverall || neonOverall, byEra, byYear };
  });
}

/**
 * Assemble the progress stats for the widget. Reads ONLY Neon:
 *  - documented counts + totals from the `contract_stats_cache` base scopes
 *  - live historian / edit counts (small, indexed)
 *
 * The `turso:*` scopes in the same table are deliberately ignored here.
 *
 * Never queries Turso. Wrapped in the in-memory cache so repeated hits within a
 * warm instance don't even touch Neon.
 */
export async function getProgressStats(): Promise<ProgressStats> {
  // v8: denominator pinned to Neon; zero treated as absent. The bump is
  // required — warm instances still hold v7 entries computed against the Turso
  // denominator, which would keep serving ~8% for up to an hour after deploy.
  return cached<ProgressStats>("stats:progress:v8", CACHE_TTL.LONG, async () => {
    const db = getDb();

    const [cacheRowsRaw, historianCountResult, totalEditsResult] = await Promise.all([
      db.execute<CacheRow>(sql`SELECT scope, total, documented FROM contract_stats_cache`),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.historians)
        .where(eq(schema.historians.active, true)),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contractEdits),
    ]);

    const rows = toRows<CacheRow>(cacheRowsRaw);
    const documented = new Map<string, number>(); // base scope -> documented
    const neonTotal = new Map<string, number>(); // base scope -> Neon total
    for (const r of rows) {
      // `turso:*` rows are full-index totals from a different corpus. They are
      // read by the cron's own reporting, never here — skip them so they cannot
      // reach the denominator by accident.
      if (r.scope.startsWith("turso:")) continue;
      documented.set(r.scope, Number(r.documented));
      neonTotal.set(r.scope, Number(r.total));
    }

    // Neon is the ONLY source for the denominator, so the published percentage
    // is stable and always divides two counts drawn from the same corpus.
    //
    // A zero (or a missing row) counts as ABSENT rather than as a real
    // denominator: `??` only bridges null and undefined, so a 0 that reached the
    // table would previously have been served as a genuine total and rendered
    // the widget as 0%. Nothing should write a 0 (see the guard in
    // refreshTursoIndexTotals), but a denominator is exactly the wrong place to
    // trust that.
    const asDenominator = (value: number | undefined): number =>
      typeof value === "number" && value > 0 ? value : 0;
    const totalFor = (scope: string): number => asDenominator(neonTotal.get(scope));

    const byEra: Record<string, { total: number; documented: number }> = {};
    for (const id of ERA_IDS) {
      byEra[id] = { total: totalFor(`era:${id}`), documented: documented.get(`era:${id}`) ?? 0 };
    }

    const byYear: Record<string, { total: number; documented: number }> = {};
    for (const y of YEARS) {
      byYear[String(y)] = { total: totalFor(`year:${y}`), documented: documented.get(`year:${y}`) ?? 0 };
    }

    return {
      overall: { total: totalFor("overall"), documented: documented.get("overall") ?? 0 },
      byEra,
      byYear,
      community: {
        historians: historianCountResult[0]?.count ?? 0,
        totalEdits: totalEditsResult[0]?.count ?? 0,
      },
    };
  });
}
