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
 * WHICH CORPUS
 * ------------
 * BOTH halves come from the full index (`getIndexTotals`). The denominator is
 * its ~12.05M rows; the numerator is the index's own `is_documented` flag,
 * which marks ~5.94M of them (sibling propagation + Sourcify) against the
 * ~980k the editorial `contracts` table knows about. The widget publishes ~49%.
 *
 * The history is worth keeping, because two earlier shapes were both wrong in
 * ways that looked right:
 *
 *  1. Editorial numerator over an index denominator (~980k / ~12.05M = ~8%).
 *     Two different universes divided by each other. This was originally a BUG
 *     — the denominator preferred `turso:*` and fell back to Neon, so the
 *     published figure dropped from ~70% to ~8% the moment an unrelated cron
 *     finished — and was later re-adopted deliberately, in the window before
 *     the index's own documentation flag was wired through to this widget.
 *  2. Editorial over editorial (~980k / ~1.37M = ~72%). Internally consistent,
 *     but it silently scoped the published claim to the slice already ingested.
 *
 * Both halves now come from one corpus AND that corpus is the whole index, so
 * the figure is consistent and complete at once. The rule to preserve: the
 * numerator and the denominator must be drawn from the SAME source. If either
 * is ever repointed, repoint the other in the same change.
 *
 * getIndexTotals resolves both through a fixed tier order (active source, then
 * the other, then the editorial base scopes), so the figure does not depend on
 * cron timing and survives a flag rollback. Documented additionally refuses to
 * let a zero displace a lower tier — see the note on `mergeDoc`.
 */

import { getDb } from "@/lib/db-client";
import { isTursoConfigured, turso } from "@/lib/turso";
import { getIndexSource, indexScopePrefix } from "@/lib/index-source";
import { getIndexGrid } from "@/lib/neon-index";
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
 * Recompute the full-index totals from whichever backend `INDEX_SOURCE`
 * selects, and persist them into Neon's `contract_stats_cache`. Expensive
 * (full-table scan) — call ONLY from the scheduled cron, never from a request
 * handler. In turso mode it is a no-op if Turso isn't configured.
 *
 * SCOPE NAMING follows the flag: `turso:*` in turso mode, `index:*` in neon
 * mode (see lib/index-source). Writes and reads therefore flip together, and
 * rolling the flag back finds the `turso:*` rows still sitting there — this
 * function only ever upserts, it never deletes.
 *
 * These scopes do NOT feed the progress widget's denominator (see
 * getProgressStats) — a failure here can no longer move that published number.
 * They DO back /coverage via getIndexTotals, which degrades to the smaller Neon
 * totals when a scope is missing, so keeping this job finishing still matters.
 *
 * The name is kept for its callers' sake; it is now source-agnostic.
 */
export async function refreshTursoIndexTotals(): Promise<void> {
  const source = getIndexSource();
  if (source === "turso" && !isTursoConfigured()) return;
  const db = getDb();
  const prefix = indexScopePrefix(source);

  // ONE full scan, not three. The previous version issued COUNT(*), GROUP BY
  // era and GROUP BY year as three concurrent queries — three passes over 12M
  // rows, three times the billed reads, and ~5 minutes wall clock, which sat
  // right on the function timeout and meant the refresh usually died halfway.
  // Grouping by (era, year) in a single pass gives all three answers: the
  // overall count is the sum of every group, and the per-era / per-year totals
  // are the two marginals. NULL era/year still form groups, so the sum is a
  // true COUNT(*) and not a filtered subtotal.
  type GridRow = {
    era: string | null;
    year: number | null;
    total: number | bigint;
    // Only the Neon index carries a documentation flag. The Turso path leaves
    // this undefined and every documented count below stays 0, exactly as it
    // was before the index gained one — see the upsert guard.
    documented?: number | bigint;
  };

  let grid: GridRow[];
  if (source === "neon") {
    grid = await getIndexGrid();
  } else {
    const gridRes = await turso.execute(
      `SELECT era, year, COUNT(*) AS total FROM contract_index GROUP BY era, year`
    );
    grid = gridRes.rows as unknown as GridRow[];
  }

  // An empty grid means the scan returned nothing — a locked/unavailable
  // replica or an unloaded table, not a genuinely empty index. Bail out rather
  // than persisting zeroes over good cached values.
  if (grid.length === 0) {
    throw new Error(
      `${source} contract index returned no rows; refusing to cache zeroed totals`
    );
  }

  let overall = 0;
  let overallDocumented = 0;
  // Collapse verbose Turso era names into app era IDs (summing any collisions).
  const eraTotals = new Map<string, number>();
  const yearTotals = new Map<number, number>();
  const eraDocumented = new Map<string, number>();
  const yearDocumented = new Map<number, number>();

  for (const r of grid) {
    const count = Number(r.total);
    const documentedCount = Number(r.documented ?? 0);
    overall += count;
    overallDocumented += documentedCount;

    if (r.era != null) {
      const appEra = TURSO_ERA_TO_APP[r.era] ?? r.era;
      if ((ERA_IDS as readonly string[]).includes(appEra)) {
        eraTotals.set(appEra, (eraTotals.get(appEra) ?? 0) + count);
        eraDocumented.set(appEra, (eraDocumented.get(appEra) ?? 0) + documentedCount);
      }
    }

    if (r.year != null) {
      const y = Number(r.year);
      if ((YEARS as readonly number[]).includes(y)) {
        yearTotals.set(y, (yearTotals.get(y) ?? 0) + count);
        yearDocumented.set(y, (yearDocumented.get(y) ?? 0) + documentedCount);
      }
    }
  }

  const upserts: { scope: string; total: number; documented: number }[] = [
    { scope: `${prefix}overall`, total: overall, documented: overallDocumented },
    ...ERA_IDS.map((id) => ({
      scope: `${prefix}era:${id}`,
      total: eraTotals.get(id) ?? 0,
      documented: eraDocumented.get(id) ?? 0,
    })),
    ...YEARS.map((y) => ({
      scope: `${prefix}year:${y}`,
      total: yearTotals.get(y) ?? 0,
      documented: yearDocumented.get(y) ?? 0,
    })),
  ];

  // Skip writing rows we couldn't compute (e.g. a partial Turso failure) so we
  // never clobber a good cached value with a zero. This applies to EVERY scope
  // including `turso:overall`, which used to be exempt — that exemption meant a
  // Turso hiccup could persist a 0 denominator and render "950,826 of 0 (0%)",
  // the exact failure the guard exists to prevent.
  for (const { scope, total, documented } of upserts) {
    if (total <= 0) continue;
    await db.execute(sql`
      INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
      VALUES (${scope}, ${total}, ${documented}, now())
      ON CONFLICT (scope) DO UPDATE
        SET total = EXCLUDED.total,
            documented = EXCLUDED.documented,
            updated_at = EXCLUDED.updated_at
    `);
  }
}

/**
 * Full-index totals per era and per year, read from `contract_stats_cache`.
 *
 * Prefers the ACTIVE index source's scopes (true full-index totals, written by
 * the cron — `turso:*` in turso mode, `index:*` in neon mode), then the other
 * source's scopes, then the Neon base-scope total for any scope neither source
 * has been sampled for. That last fallback is what keeps these surfaces
 * rendering while Turso reads are blocked — /api/coverage used to scan the
 * 12M-row contract_index on every request instead, which both burned the read
 * quota and 500'd the whole dashboard the moment the quota ran out.
 *
 * The cross-source fallback is what makes the cutover seamless in both
 * directions: flipping to neon before the first neon refresh has landed still
 * renders the `turso:*` numbers rather than collapsing to the much smaller Neon
 * base totals, and flipping back finds `turso:*` untouched.
 *
 * Unlike getProgressStats, this is NOT restricted to the ERA_IDS / YEARS
 * whitelists: the coverage dashboard renders every era and year present.
 */
export async function getIndexTotals(): Promise<{
  overall: number;
  byEra: Map<string, number>;
  byYear: Map<number, number>;
  documentedOverall: number;
  documentedByEra: Map<string, number>;
  documentedByYear: Map<number, number>;
}> {
  const activePrefix = indexScopePrefix();
  const otherPrefix = activePrefix === "turso:" ? "index:" : "turso:";

  // The cache key carries the prefix: a warm instance that computed these under
  // the previous flag value must not keep serving them after a flip.
  return cached(`stats:index-totals:v3:${activePrefix}`, CACHE_TTL.LONG, async () => {
    const db = getDb();
    const raw = await db.execute<CacheRow>(
      sql`SELECT scope, total, documented FROM contract_stats_cache`
    );

    // Three tiers, least to most preferred: Neon base scopes, the inactive
    // index source, the active index source.
    const eraTiers = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
    const yearTiers = [new Map<number, number>(), new Map<number, number>(), new Map<number, number>()];
    const overallTiers = [0, 0, 0];
    const eraDocTiers = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
    const yearDocTiers = [new Map<number, number>(), new Map<number, number>(), new Map<number, number>()];
    const overallDocTiers = [0, 0, 0];

    for (const r of toRows<CacheRow>(raw)) {
      let tier: number;
      let base: string;
      if (r.scope.startsWith(activePrefix)) {
        tier = 2;
        base = r.scope.slice(activePrefix.length);
      } else if (r.scope.startsWith(otherPrefix)) {
        tier = 1;
        base = r.scope.slice(otherPrefix.length);
      } else {
        tier = 0;
        base = r.scope;
      }
      const total = Number(r.total);
      const documented = Number(r.documented);

      if (base === "overall") {
        overallTiers[tier] = total;
        overallDocTiers[tier] = documented;
      } else if (base.startsWith("era:")) {
        const rawEra = base.slice("era:".length).replace(/_/g, "-");
        // Legacy spellings ("spurious_dragon") share a bucket with the
        // canonical id, so sum rather than overwrite.
        const id = TURSO_ERA_TO_APP[rawEra] ?? rawEra;
        const map = eraTiers[tier];
        map.set(id, (map.get(id) ?? 0) + total);
        const docMap = eraDocTiers[tier];
        docMap.set(id, (docMap.get(id) ?? 0) + documented);
      } else if (base.startsWith("year:")) {
        const y = Number(base.slice("year:".length));
        if (Number.isFinite(y)) {
          yearTiers[tier].set(y, total);
          yearDocTiers[tier].set(y, documented);
        }
      }
    }

    // Higher tiers overwrite lower ones per key, so a scope only the base has
    // (e.g. year:2019, which no full-index refresh writes) still shows up.
    const byEra = new Map<string, number>(eraTiers[0]);
    for (const tier of [1, 2]) for (const [k, v] of eraTiers[tier]) byEra.set(k, v);
    const byYear = new Map<number, number>(yearTiers[0]);
    for (const tier of [1, 2]) for (const [k, v] of yearTiers[tier]) byYear.set(k, v);

    // Documented resolves through the same tier order with ONE extra rule: a
    // zero never displaces a lower tier. Unlike a total, a 0 here is almost
    // always a placeholder rather than a measurement — the Turso path has no
    // documentation flag to read and writes 0 for every scope, and an era the
    // index does not carry at all (tangerine, whose rows are stored under
    // era ids the index never uses — finding E4) would otherwise report 0
    // documented against a non-zero total. Falling through to the editorial
    // count is the honest answer in both cases.
    const mergeDoc = <K>(tiers: Map<K, number>[]): Map<K, number> => {
      const out = new Map<K, number>(tiers[0]);
      for (const tier of [1, 2]) {
        for (const [k, v] of tiers[tier]) if (v > 0) out.set(k, v);
      }
      return out;
    };
    const documentedByEra = mergeDoc(eraDocTiers);
    const documentedByYear = mergeDoc(yearDocTiers);

    return {
      overall: overallTiers[2] || overallTiers[1] || overallTiers[0],
      byEra,
      byYear,
      documentedOverall: overallDocTiers[2] || overallDocTiers[1] || overallDocTiers[0],
      documentedByEra,
      documentedByYear,
    };
  });
}

/**
 * Assemble the progress stats for the widget. Reads ONLY Neon:
 *  - documented counts from the `contract_stats_cache` base scopes (editorial)
 *  - totals from `getIndexTotals` (full index — see WHICH DENOMINATOR above)
 *  - live historian / edit counts (small, indexed)
 *
 * Never queries Turso. Wrapped in the in-memory cache so repeated hits within a
 * warm instance don't even touch Neon.
 */
export async function getProgressStats(): Promise<ProgressStats> {
  // v11: BOTH halves now come from getIndexTotals. The denominator is the
  // full-index total; the numerator is the index's own `is_documented` flag,
  // which counts ~5.94M of the 12.05M rows against the editorial table's
  // ~980k. Every bump here is required — warm instances hold the previous
  // entry for up to an hour, so a change that only touches the computation
  // would keep serving the old ratio after deploy.
  return cached<ProgressStats>("stats:progress:v11", CACHE_TTL.LONG, async () => {
    const db = getDb();

    // contract_stats_cache is no longer read directly here: getIndexTotals
    // already reads that table and resolves every scope through its tier
    // order, editorial base scopes included, so a second pass would only risk
    // the two disagreeing.
    const [historianCountResult, totalEditsResult, indexTotals] = await Promise.all([
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.historians)
        .where(eq(schema.historians.active, true)),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contractEdits),
      getIndexTotals(),
    ]);

    // A zero (or a missing row) counts as ABSENT rather than as a real
    // denominator: `??` only bridges null and undefined, so a 0 that reached the
    // table would previously have been served as a genuine total and rendered
    // the widget as 0%. Nothing should write a 0 (see the guard in
    // refreshTursoIndexTotals), but a denominator is exactly the wrong place to
    // trust that.
    //
    // getIndexTotals falls back to the base scope for any era or year no
    // full-index refresh writes (constantinople, year:2019+), for both halves,
    // so such a bucket renders its editorial pair rather than collapsing to 0%.
    const asDenominator = (value: number | undefined): number =>
      typeof value === "number" && value > 0 ? value : 0;

    const byEra: Record<string, { total: number; documented: number }> = {};
    for (const id of ERA_IDS) {
      byEra[id] = {
        total: asDenominator(indexTotals.byEra.get(id)),
        documented: indexTotals.documentedByEra.get(id) ?? 0,
      };
    }

    const byYear: Record<string, { total: number; documented: number }> = {};
    for (const y of YEARS) {
      byYear[String(y)] = {
        total: asDenominator(indexTotals.byYear.get(y)),
        documented: indexTotals.documentedByYear.get(y) ?? 0,
      };
    }

    return {
      overall: {
        total: asDenominator(indexTotals.overall),
        documented: indexTotals.documentedOverall,
      },
      byEra,
      byYear,
      community: {
        historians: historianCountResult[0]?.count ?? 0,
        totalEdits: totalEditsResult[0]?.count ?? 0,
      },
    };
  });
}
