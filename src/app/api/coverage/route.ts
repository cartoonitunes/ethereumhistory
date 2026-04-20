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
interface YearRow { year: number; total: number; uncovered: number; }
interface NeonEraRow { era_id: string | null; count: number; }
interface NeonYearRow { year: number | null; count: number; }

export async function GET(): Promise<NextResponse> {
  try {
    const result = await cached("coverage:v1", CACHE_TTL.SHORT, async () => {
      const [eraResult, yearResult] = await Promise.all([
        turso.execute(`
          SELECT
            ci.era,
            COUNT(*) as total,
            COUNT(CASE WHEN bf.is_cracked = 1 THEN 1 END) as uncovered
          FROM contract_index ci
          LEFT JOIN bytecode_families bf ON ci.bytecode_hash = bf.bytecode_hash
          GROUP BY ci.era
          ORDER BY MIN(ci.block_number) ASC
        `),
        turso.execute(`
          SELECT
            ci.year,
            COUNT(*) as total,
            COUNT(CASE WHEN bf.is_cracked = 1 THEN 1 END) as uncovered
          FROM contract_index ci
          LEFT JOIN bytecode_families bf ON ci.bytecode_hash = bf.bytecode_hash
          GROUP BY ci.year
          ORDER BY ci.year ASC
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
            WHERE short_description IS NOT NULL AND short_description != ''
            GROUP BY era_id
          `),
          db.execute(sql`
            SELECT EXTRACT(YEAR FROM deployment_timestamp)::int as year, COUNT(*)::int as count
            FROM contracts
            WHERE short_description IS NOT NULL AND short_description != ''
              AND deployment_timestamp IS NOT NULL
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

      const eras = eraRows.map((r) => {
        const total = Number(r.total);
        const documented = neonEraMap.get(r.era) ?? 0;
        const uncovered = Number(r.uncovered);
        return {
          eraId: r.era,
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Coverage API error:", error);
    return NextResponse.json(
      { data: null, error: `Failed to fetch coverage data: ${msg}` },
      { status: 500 }
    );
  }
}
