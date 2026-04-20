/**
 * Coverage API
 *
 * GET /api/coverage
 * Returns per-era and per-year breakdowns of:
 *   - total:      contracts in the Turso index
 *   - documented: contracts with editorial content in Neon (shortDescription)
 *   - uncovered:  indexed contracts whose bytecode family has a documented sibling
 *   - indexed:    remaining indexed contracts (no documented sibling)
 */

import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import { sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

interface EraRow { era: string; total: number; uncovered: number; }

const TURSO_ERA_TO_APP: Record<string, string> = {
  "frontier-thawing": "frontier",
  "dao-fork": "dao",
  "tangerine-whistle": "tangerine",
  "spurious-dragon": "spurious",
};
interface YearRow { year: number; total: number; uncovered: number; }
interface NeonEraRow { era_id: string | null; count: number; }
interface NeonYearRow { year: number | null; count: number; }

export async function GET(): Promise<NextResponse> {
  try {
    const result = await cached("coverage:v1", CACHE_TTL.SHORT, async () => {
      const [eraResult, yearResult] = await Promise.all([
        turso.execute(`
          SELECT era, COUNT(*) as total, 0 as uncovered
          FROM contract_index
          GROUP BY era
          ORDER BY MIN(block_number) ASC
        `),
        turso.execute(`
          SELECT year, COUNT(*) as total, 0 as uncovered
          FROM contract_index
          GROUP BY year
          ORDER BY year ASC
        `),
      ]);

      const eraRows = eraResult.rows as unknown as EraRow[];
      const yearRows = yearResult.rows as unknown as YearRow[];

      let neonEraMap = new Map<string, number>();
      let neonYearMap = new Map<number, number>();

      if (isDatabaseConfigured()) {
        const db = getDb();
        const [neonByEra, neonByYear] = await Promise.all([
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
        ]);

        for (const r of (neonByEra as any).rows ?? (neonByEra as any[])) {
          const row = r as NeonEraRow;
          if (row.era_id) neonEraMap.set(row.era_id, Number(row.count));
        }
        for (const r of (neonByYear as any).rows ?? (neonByYear as any[])) {
          const row = r as NeonYearRow;
          if (row.year) neonYearMap.set(Number(row.year), Number(row.count));
        }
      }

      // Merge Turso verbose era names into app-canonical IDs before building output
      const eraMerged = new Map<string, { total: number; uncovered: number }>();
      for (const r of eraRows) {
        const appEra = TURSO_ERA_TO_APP[r.era] ?? r.era;
        const prev = eraMerged.get(appEra) ?? { total: 0, uncovered: 0 };
        eraMerged.set(appEra, { total: prev.total + Number(r.total), uncovered: prev.uncovered + Number(r.uncovered) });
      }

      const ERA_ORDER = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"];
      const eras = ERA_ORDER.filter((id) => eraMerged.has(id)).map((id) => {
        const { total, uncovered } = eraMerged.get(id)!;
        const documented = neonEraMap.get(id) ?? 0;
        return {
          eraId: id,
          total,
          documented,
          uncovered,
          indexed: total - documented - uncovered,
          documentedPct: total > 0 ? Math.round((documented / total) * 1000) / 10 : 0,
        };
      });

      const years = yearRows.map((r) => {
        const total = Number(r.total);
        const documented = neonYearMap.get(Number(r.year)) ?? 0;
        const uncovered = Number(r.uncovered);
        return {
          year: Number(r.year),
          total,
          documented,
          uncovered,
          indexed: total - documented - uncovered,
          documentedPct: total > 0 ? Math.round((documented / total) * 1000) / 10 : 0,
        };
      });

      const grandTotal = eras.reduce((s, e) => s + e.total, 0);
      const grandDocumented = eras.reduce((s, e) => s + e.documented, 0);
      const grandUncovered = eras.reduce((s, e) => s + e.uncovered, 0);

      return {
        summary: {
          total: grandTotal,
          documented: grandDocumented,
          uncovered: grandUncovered,
          indexed: grandTotal - grandDocumented - grandUncovered,
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
