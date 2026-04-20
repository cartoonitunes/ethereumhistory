/**
 * Documentation Progress Stats API Route
 *
 * GET /api/stats/progress
 *
 * Returns total and documented contract counts overall, per era, and per year,
 * plus community stats (historian count, total edits).
 *
 * Totals come from the Turso contract_index (12M+ contracts) when configured.
 * Documented counts come from Neon: contracts with short_description set (~40),
 * which reflects actual editorial work by historians — not the broader
 * is_documented flag that includes verified/sibling contracts.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import { isTursoConfigured, turso } from "@/lib/turso";
import * as schema from "@/lib/schema";
import { sql, eq } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"] as const;
const YEARS = [2015, 2016, 2017, 2018] as const;

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    const empty = { total: 0, documented: 0 };
    return NextResponse.json({
      data: {
        overall: empty,
        byEra: Object.fromEntries(ERA_IDS.map((id) => [id, empty])),
        byYear: Object.fromEntries(YEARS.map((y) => [y, empty])),
        community: { historians: 0, totalEdits: 0 },
      },
      error: null,
    });
  }

  try {
    const data = await cached("stats:progress:v3", CACHE_TTL.MEDIUM, async () => {
      const db = getDb();

      const historianPromise = db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.historians)
        .where(eq(schema.historians.active, true));

      const editsPromise = db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.contractEdits);

      // Documented = short_description set — actual historian editorial work
      type NeonDocRow = { scope: string; documented: number };
      const neonDocPromise = db.execute<NeonDocRow>(sql`
        SELECT 'overall' AS scope, COUNT(*)::int AS documented, NULL AS extra
        FROM contracts WHERE short_description IS NOT NULL AND short_description != ''
        UNION ALL
        SELECT 'era:' || era_id, COUNT(*)::int, NULL
        FROM contracts WHERE short_description IS NOT NULL AND short_description != ''
          AND era_id IS NOT NULL
        GROUP BY era_id
        UNION ALL
        SELECT 'year:' || EXTRACT(YEAR FROM deployment_timestamp)::int::text, COUNT(*)::int, NULL
        FROM contracts WHERE short_description IS NOT NULL AND short_description != ''
          AND deployment_timestamp IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM deployment_timestamp)::int
      `);

      if (isTursoConfigured()) {
        const [historianCountResult, totalEditsResult, neonDocRaw, tursoOverall, tursoByEra, tursoByYear] =
          await Promise.all([
            historianPromise,
            editsPromise,
            neonDocPromise,
            turso.execute(`SELECT COUNT(*) AS total FROM contract_index`),
            turso.execute(`SELECT era, COUNT(*) AS total FROM contract_index WHERE era IS NOT NULL GROUP BY era`),
            turso.execute(`SELECT year, COUNT(*) AS total FROM contract_index WHERE year IS NOT NULL GROUP BY year`),
          ]);

        const neonRows: NeonDocRow[] = Array.isArray(neonDocRaw)
          ? (neonDocRaw as NeonDocRow[])
          : ((neonDocRaw as { rows?: NeonDocRow[] }).rows ?? []);

        const docMap = new Map<string, number>();
        for (const r of neonRows) docMap.set(r.scope, Number(r.documented));

        const grandTotal = Number((tursoOverall.rows[0] as unknown as { total: number | bigint })?.total ?? 0);

        const byEra: Record<string, { total: number; documented: number }> = Object.fromEntries(
          ERA_IDS.map((id) => [id, { total: 0, documented: docMap.get(`era:${id}`) ?? 0 }])
        );
        for (const r of tursoByEra.rows as unknown as { era: string; total: number | bigint }[]) {
          byEra[r.era] = { total: Number(r.total), documented: docMap.get(`era:${r.era}`) ?? 0 };
        }

        const byYear: Record<number, { total: number; documented: number }> = Object.fromEntries(
          YEARS.map((y) => [y, { total: 0, documented: docMap.get(`year:${y}`) ?? 0 }])
        );
        for (const r of tursoByYear.rows as unknown as { year: number; total: number | bigint }[]) {
          byYear[Number(r.year)] = { total: Number(r.total), documented: docMap.get(`year:${r.year}`) ?? 0 };
        }

        return {
          overall: { total: grandTotal, documented: docMap.get("overall") ?? 0 },
          byEra,
          byYear,
          community: {
            historians: historianCountResult[0]?.count ?? 0,
            totalEdits: totalEditsResult[0]?.count ?? 0,
          },
        };
      }

      // Fallback: Neon-only (Turso not configured), documented = short_description only
      type NeonTotalRow = { scope: string; total: number };
      const neonTotalPromise = db.execute<NeonTotalRow>(sql`
        SELECT 'overall' AS scope, COUNT(*)::int AS total, NULL AS extra FROM contracts
        UNION ALL
        SELECT 'era:' || era_id, COUNT(*)::int, NULL
        FROM contracts WHERE era_id IS NOT NULL GROUP BY era_id
        UNION ALL
        SELECT 'year:' || EXTRACT(YEAR FROM deployment_timestamp)::int::text, COUNT(*)::int, NULL
        FROM contracts WHERE deployment_timestamp IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM deployment_timestamp)::int
      `);

      const [historianCountResult, totalEditsResult, neonDocRaw, neonTotalRaw] = await Promise.all([
        historianPromise,
        editsPromise,
        neonDocPromise,
        neonTotalPromise,
      ]);

      const neonDocRows: NeonDocRow[] = Array.isArray(neonDocRaw)
        ? (neonDocRaw as NeonDocRow[])
        : ((neonDocRaw as { rows?: NeonDocRow[] }).rows ?? []);
      const neonTotalRows: NeonTotalRow[] = Array.isArray(neonTotalRaw)
        ? (neonTotalRaw as NeonTotalRow[])
        : ((neonTotalRaw as { rows?: NeonTotalRow[] }).rows ?? []);

      const docMap = new Map<string, number>();
      const totalMap = new Map<string, number>();
      for (const r of neonDocRows) docMap.set(r.scope, Number(r.documented));
      for (const r of neonTotalRows) totalMap.set(r.scope, Number(r.total));

      const byEra: Record<string, { total: number; documented: number }> = Object.fromEntries(
        ERA_IDS.map((id) => [
          id,
          { total: totalMap.get(`era:${id}`) ?? 0, documented: docMap.get(`era:${id}`) ?? 0 },
        ])
      );
      const byYear: Record<number, { total: number; documented: number }> = Object.fromEntries(
        YEARS.map((y) => [
          y,
          { total: totalMap.get(`year:${y}`) ?? 0, documented: docMap.get(`year:${y}`) ?? 0 },
        ])
      );

      return {
        overall: { total: totalMap.get("overall") ?? 0, documented: docMap.get("overall") ?? 0 },
        byEra,
        byYear,
        community: {
          historians: historianCountResult[0]?.count ?? 0,
          totalEdits: totalEditsResult[0]?.count ?? 0,
        },
      };
    });

    return NextResponse.json(
      { data, error: null },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[stats/progress] Error fetching progress stats:", error);
    return NextResponse.json(
      { data: null, error: `Failed to fetch progress stats: ${msg}` },
      { status: 500 }
    );
  }
}
