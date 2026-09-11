/**
 * Coverage stats — shared by /api/coverage, the /coverage page metadata, and
 * the /coverage OG image, so all three quote the same numbers.
 *
 * THE THREE BUCKETS
 * -----------------
 * They partition the full-index total and never overlap:
 *   - documented: a historian writeup exists somewhere in the contract's
 *                 bytecode cluster (is_documented), minus `uncovered`
 *   - uncovered:  source recovered by compiler archaeology, no writeup yet
 *                 (verification_method set AND short_description empty)
 *   - indexed:    the remainder — on-chain, not yet researched
 *
 * `uncovered` was hardcoded to 0 until migration 080, which left the amber
 * band on /coverage permanently empty and folded the cracking work invisibly
 * into `documented`.
 *
 * WHICH CORPUS
 * ------------
 * `documented` and the totals both come from `neon_contract_index` via
 * getIndexTotals — the index's own is_documented flag, ~5.94M of 12.05M rows.
 * It used to be counted from the `contracts` table instead (~980k), which made
 * this dashboard publish ~7.6% while the progress widget published ~49% from
 * the index, for what reads as the same claim. Same corpus on both surfaces
 * now; see WHICH CORPUS in lib/progress-stats for the same rule stated there.
 *
 * The two do not print an identical percentage, and should not: `uncovered` is
 * carved out of `documented` here and not on the widget, so this dashboard
 * shows ~48.8% documented plus a ~0.5% amber band where the widget shows one
 * ~49.3% figure. `documented + uncovered` equals the widget's numerator
 * exactly — that is the invariant to check if they ever look unrelated.
 *
 * `uncovered` stays a `contracts` query: it is a finer editorial distinction
 * the index does not model. Carving it out of an index-sourced `documented`
 * is only sound because every source-only row is also is_documented IN THE
 * INDEX — verified as 60,153 of 60,153, none missing from the index and none
 * flagged undocumented. If that ever stops holding, `indexed` absorbs the
 * error silently, so re-check it before trusting this split again.
 *
 * COST
 * ----
 * `documented` is now free — it rides along with the totals already being
 * read from contract_stats_cache, replacing two grouped aggregates over the
 * ~1.4M-row contracts table. `uncovered` is an index-only scan over the ~60k
 * source-only rows via the migration 080 partial indexes.
 *
 * Totals come from contract_stats_cache via getIndexTotals(), NOT from a live
 * contract_index scan. The old scan burned the Turso read quota and then took
 * the whole dashboard down with a 500 once reads started being refused.
 */

import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import { getIndexTotals } from "@/lib/progress-stats";
import { sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

const TURSO_ERA_TO_APP: Record<string, string> = {
  "frontier-thawing": "frontier",
  "dao-fork": "dao",
  "tangerine-whistle": "tangerine",
  "spurious-dragon": "spurious",
};

const ERA_ORDER = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"];

interface NeonEraRow { era_id: string | null; count: number; }
interface NeonYearRow { year: number | null; count: number; }

export interface CoverageBuckets {
  total: number;
  documented: number;
  uncovered: number;
  indexed: number;
  documentedPct: number;
}

export interface CoverageData {
  summary: CoverageBuckets;
  eras: (CoverageBuckets & { eraId: string })[];
  years: (CoverageBuckets & { year: number })[];
  /** True when a bucket query failed and its band is showing 0 rather than a real count. */
  degraded: boolean;
}

/** Thrown when there is genuinely nothing to render — callers should 503, not 500. */
export class CoverageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Coverage totals are unavailable");
    this.name = "CoverageUnavailableError";
    this.cause = cause;
  }
}

function rowsOf(result: unknown): unknown[] {
  return (result as { rows?: unknown[] }).rows ?? (result as unknown[]) ?? [];
}

/**
 * Split a cluster-level is_documented count into the two disjoint buckets the
 * UI renders. Every source-only row is also is_documented, so `uncovered` is
 * carved OUT of the documented count rather than added alongside it —
 * otherwise the two bands would double-count and `indexed` could go negative.
 *
 * Neon and the index are counted independently, so a Neon count can exceed its
 * index total if the index lags an ingest; clamp instead of rendering a
 * negative band.
 */
function split(total: number, documentedRaw: number, uncoveredRaw: number): CoverageBuckets {
  const uncovered = Math.min(uncoveredRaw, total);
  const documented = Math.max(0, Math.min(documentedRaw - uncovered, total - uncovered));
  return {
    total,
    documented,
    uncovered,
    indexed: Math.max(0, total - documented - uncovered),
    documentedPct: total > 0 ? Math.round((documented / total) * 1000) / 10 : 0,
  };
}

export async function getCoverageStats(): Promise<CoverageData> {
  return cached<CoverageData>("coverage:v5", CACHE_TTL.SHORT, async () => {
    // Totals are the one hard dependency: without them there are no bars to
    // draw at all, so a failure here is unavailability rather than a crash.
    let indexTotals: Awaited<ReturnType<typeof getIndexTotals>>;
    try {
      indexTotals = await getIndexTotals();
    } catch (error) {
      throw new CoverageUnavailableError(error);
    }
    if (indexTotals.byEra.size === 0 && indexTotals.byYear.size === 0) {
      throw new CoverageUnavailableError("contract_stats_cache is empty");
    }

    const uncoveredEraMap = new Map<string, number>();
    const uncoveredYearMap = new Map<number, number>();
    let degraded = false;

    if (isDatabaseConfigured()) {
      const db = getDb();

      // Neon carries a few legacy era_id spellings ("spurious-dragon",
      // "spurious_dragon"); normalize them onto the canonical ids or those
      // contracts silently vanish from the era totals.
      const addEra = (map: Map<string, number>, raw: string, count: number) => {
        const dashed = raw.replace(/_/g, "-");
        const canonical = TURSO_ERA_TO_APP[dashed] ?? dashed;
        map.set(canonical, (map.get(canonical) ?? 0) + count);
      };

      // Only `uncovered` is still a contracts-table query. The documented
      // counts now arrive with the totals from getIndexTotals, so both halves
      // of this dashboard's ratio are drawn from the same corpus as the
      // progress widget's — see THE THREE BUCKETS above.
      //
      // Each bucket is loaded independently. A transient Neon failure on one
      // of these should cost that band, not the entire page — before this,
      // any single query throwing 500'd the whole dashboard.
      const results = await Promise.allSettled([
        // Source recovered, no writeup yet. Matches the migration 080 partial
        // index exactly — keep the predicates in sync or this silently
        // degrades to a seq scan over the contracts table.
        db.execute(sql`
          SELECT era_id, COUNT(*)::int as count
          FROM contracts
          WHERE verification_method IS NOT NULL
            AND (short_description IS NULL OR short_description = '')
            AND era_id IS NOT NULL
          GROUP BY era_id
        `),
        db.execute(sql`
          SELECT EXTRACT(YEAR FROM deployment_timestamp)::int as year, COUNT(*)::int as count
          FROM contracts
          WHERE verification_method IS NOT NULL
            AND (short_description IS NULL OR short_description = '')
            AND deployment_timestamp IS NOT NULL
          GROUP BY year
        `),
      ]);

      const [uncoveredEra, uncoveredYear] = results;

      for (const r of results) {
        if (r.status === "rejected") {
          degraded = true;
          console.error("[coverage] bucket query failed:", r.reason);
        }
      }

      if (uncoveredEra.status === "fulfilled") {
        for (const raw of rowsOf(uncoveredEra.value)) {
          const row = raw as NeonEraRow;
          if (row.era_id) addEra(uncoveredEraMap, row.era_id, Number(row.count));
        }
      }
      if (uncoveredYear.status === "fulfilled") {
        for (const raw of rowsOf(uncoveredYear.value)) {
          const row = raw as NeonYearRow;
          if (row.year) uncoveredYearMap.set(Number(row.year), Number(row.count));
        }
      }
    }

    const eras = ERA_ORDER.filter((id) => indexTotals.byEra.has(id)).map((id) => ({
      eraId: id,
      ...split(
        indexTotals.byEra.get(id)!,
        indexTotals.documentedByEra.get(id) ?? 0,
        uncoveredEraMap.get(id) ?? 0
      ),
    }));

    const years = [...indexTotals.byYear.keys()]
      .sort((a, b) => a - b)
      .map((year) => ({
        year,
        ...split(
          indexTotals.byYear.get(year)!,
          indexTotals.documentedByYear.get(year) ?? 0,
          uncoveredYearMap.get(year) ?? 0
        ),
      }));

    const total = eras.reduce((s, e) => s + e.total, 0);
    const documented = eras.reduce((s, e) => s + e.documented, 0);

    return {
      summary: {
        total,
        documented,
        uncovered: eras.reduce((s, e) => s + e.uncovered, 0),
        indexed: eras.reduce((s, e) => s + e.indexed, 0),
        documentedPct: total > 0 ? Math.round((documented / total) * 1000) / 10 : 0,
      },
      eras,
      years,
      degraded,
    };
  });
}
