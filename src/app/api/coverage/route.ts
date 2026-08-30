/**
 * Coverage API
 *
 * GET /api/coverage
 * Returns per-era and per-year breakdowns of three DISJOINT buckets that
 * partition the Turso index total:
 *   - documented: known contracts that have a historian writeup somewhere in
 *                 their bytecode cluster (is_documented), minus `uncovered`
 *   - uncovered:  source recovered by compiler archaeology, but no writeup yet
 *                 (verification_method set AND short_description empty)
 *   - indexed:    the remainder — on-chain, not yet researched
 *
 * `uncovered` used to be hardcoded to 0, which left the amber band on
 * /coverage permanently empty and folded the cracking work invisibly into
 * `documented`. It is now a real count, backed by the partial indexes from
 * migration 080.
 *
 * Both Neon counts are cheap: `documented` reuses the existing
 * (era_id, is_documented) / (year, is_documented) composite indexes, and
 * `uncovered` is an index-only scan over the ~21k source-only rows. Because
 * every source-only row is also is_documented (enforced by the migration 067
 * trigger), the disjoint documented count is a subtraction rather than a
 * second filtered aggregate over ~950k rows.
 */

import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import { sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

interface EraRow { era: string; total: number; }

const TURSO_ERA_TO_APP: Record<string, string> = {
  "frontier-thawing": "frontier",
  "dao-fork": "dao",
  "tangerine-whistle": "tangerine",
  "spurious-dragon": "spurious",
};
interface YearRow { year: number; total: number; }
interface NeonEraRow { era_id: string | null; count: number; }
interface NeonYearRow { year: number | null; count: number; }

export async function GET(): Promise<NextResponse> {
  try {
    const result = await cached("coverage:v2", CACHE_TTL.SHORT, async () => {
      const [eraResult, yearResult] = await Promise.all([
        turso.execute(`
          SELECT era, COUNT(*) as total
          FROM contract_index
          GROUP BY era
          ORDER BY MIN(block_number) ASC
        `),
        turso.execute(`
          SELECT year, COUNT(*) as total
          FROM contract_index
          GROUP BY year
          ORDER BY year ASC
        `),
      ]);

      const eraRows = eraResult.rows as unknown as EraRow[];
      const yearRows = yearResult.rows as unknown as YearRow[];

      const neonEraMap = new Map<string, number>();
      const neonYearMap = new Map<number, number>();
      const uncoveredEraMap = new Map<string, number>();
      const uncoveredYearMap = new Map<number, number>();

      if (isDatabaseConfigured()) {
        const db = getDb();
        const [neonByEra, neonByYear, uncoveredByEra, uncoveredByYear] = await Promise.all([
          db.execute(sql`
            SELECT era_id, COUNT(*)::int as count
            FROM contracts
            WHERE is_documented = TRUE AND era_id IS NOT NULL
            GROUP BY era_id
          `),
          db.execute(sql`
            SELECT EXTRACT(YEAR FROM deployment_timestamp)::int as year, COUNT(*)::int as count
            FROM contracts
            WHERE is_documented = TRUE AND deployment_timestamp IS NOT NULL
            GROUP BY year
          `),
          // Source recovered, no writeup yet. Matches the partial index from
          // migration 080 exactly — keep the predicates in sync or this
          // silently degrades to a seq scan over the contracts table.
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

        // Neon carries a few legacy era_id spellings ("spurious-dragon",
        // "spurious_dragon"); normalize them the same way the Turso rows are
        // normalized below, or those contracts are dropped from the totals.
        const addEra = (map: Map<string, number>, raw: string, count: number) => {
          const appEra = TURSO_ERA_TO_APP[raw] ?? raw.replace(/_/g, "-");
          const canonical = TURSO_ERA_TO_APP[appEra] ?? appEra;
          map.set(canonical, (map.get(canonical) ?? 0) + count);
        };

        for (const r of (neonByEra as any).rows ?? (neonByEra as any[])) {
          const row = r as NeonEraRow;
          if (row.era_id) addEra(neonEraMap, row.era_id, Number(row.count));
        }
        for (const r of (neonByYear as any).rows ?? (neonByYear as any[])) {
          const row = r as NeonYearRow;
          if (row.year) neonYearMap.set(Number(row.year), Number(row.count));
        }
        for (const r of (uncoveredByEra as any).rows ?? (uncoveredByEra as any[])) {
          const row = r as NeonEraRow;
          if (row.era_id) addEra(uncoveredEraMap, row.era_id, Number(row.count));
        }
        for (const r of (uncoveredByYear as any).rows ?? (uncoveredByYear as any[])) {
          const row = r as NeonYearRow;
          if (row.year) uncoveredYearMap.set(Number(row.year), Number(row.count));
        }
      }

      // Merge Turso verbose era names into app-canonical IDs before building output
      const eraMerged = new Map<string, number>();
      for (const r of eraRows) {
        const appEra = TURSO_ERA_TO_APP[r.era] ?? r.era;
        eraMerged.set(appEra, (eraMerged.get(appEra) ?? 0) + Number(r.total));
      }

      /**
       * Split a cluster-level is_documented count into the two disjoint
       * buckets the UI renders. Every source-only row is also is_documented,
       * so `uncovered` is carved OUT of the documented count rather than added
       * alongside it — otherwise the two bands would double-count and
       * `indexed` could go negative.
       *
       * Neon and Turso are counted independently, so a Neon count can exceed
       * its Turso total if the index lags an ingest; clamp instead of
       * rendering a negative band.
       */
      const split = (total: number, documentedRaw: number, uncoveredRaw: number) => {
        const uncovered = Math.min(uncoveredRaw, total);
        const documented = Math.max(0, Math.min(documentedRaw - uncovered, total - uncovered));
        return {
          total,
          documented,
          uncovered,
          indexed: Math.max(0, total - documented - uncovered),
          documentedPct: total > 0 ? Math.round((documented / total) * 1000) / 10 : 0,
        };
      };

      const ERA_ORDER = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"];
      const eras = ERA_ORDER.filter((id) => eraMerged.has(id)).map((id) => ({
        eraId: id,
        ...split(eraMerged.get(id)!, neonEraMap.get(id) ?? 0, uncoveredEraMap.get(id) ?? 0),
      }));

      const years = yearRows.map((r) => {
        const year = Number(r.year);
        return {
          year,
          ...split(Number(r.total), neonYearMap.get(year) ?? 0, uncoveredYearMap.get(year) ?? 0),
        };
      });

      const grandTotal = eras.reduce((s, e) => s + e.total, 0);
      const grandDocumented = eras.reduce((s, e) => s + e.documented, 0);
      const grandUncovered = eras.reduce((s, e) => s + e.uncovered, 0);
      const grandIndexed = eras.reduce((s, e) => s + e.indexed, 0);

      return {
        summary: {
          total: grandTotal,
          documented: grandDocumented,
          uncovered: grandUncovered,
          indexed: grandIndexed,
          documentedPct: grandTotal > 0 ? Math.round((grandDocumented / grandTotal) * 1000) / 10 : 0,
        },
        eras,
        years,
      };
    });

    return NextResponse.json(
      { data: result, meta: { timestamp: new Date().toISOString(), cached: true } },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (error) {
    console.error("Coverage API error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch coverage data." },
      { status: 500 }
    );
  }
}
