/**
 * Documentation Progress Stats API Route
 *
 * GET /api/stats/progress
 *
 * Returns total and documented contract counts overall, per era, and per year,
 * plus community stats (historian count, total edits).
 *
 * Totals come from the Turso contract_index (12M+ contracts) when configured.
 * Documented counts come from Neon's contract_stats_cache (~20 rows), which
 * uses is_documented=TRUE: historian narratives, cracked/etherscan-verified
 * contracts, and all bytecode siblings of any of the above.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import { isTursoConfigured, turso } from "@/lib/turso";
import * as schema from "@/lib/schema";
import { sql, eq } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"] as const;
const YEARS = [2015, 2016, 2017, 2018] as const;

// Turso DB stores verbose era names; map to app-canonical short IDs
const TURSO_ERA_TO_APP: Record<string, string> = {
  "frontier-thawing": "frontier",
  "dao-fork": "dao",
  "tangerine-whistle": "tangerine",
  "spurious-dragon": "spurious",
};

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
    const data = await cached("stats:progress:v4", CACHE_TTL.MEDIUM, async () => {
      const db = getDb();

      // contract_stats_cache: ~20 rows, uses is_documented=TRUE as numerator.
      // Covers: historian narratives + verification_method + bytecode siblings.
      type CacheRow = { scope: string; documented: number | string };
      const [cacheRowsRaw, historianCountResult, totalEditsResult] = await Promise.all([
        db.execute<CacheRow>(sql`SELECT scope, documented FROM contract_stats_cache`),
        db.select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.historians)
          .where(eq(schema.historians.active, true)),
        db.select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contractEdits),
      ]);

      const cacheRows: CacheRow[] = Array.isArray(cacheRowsRaw)
        ? (cacheRowsRaw as CacheRow[])
        : ((cacheRowsRaw as { rows?: CacheRow[] }).rows ?? []);

      const docMap = new Map<string, number>();
      for (const r of cacheRows) docMap.set(r.scope, Number(r.documented));

      const byEra: Record<string, { total: number; documented: number }> = Object.fromEntries(
        ERA_IDS.map((id) => [id, { total: 0, documented: docMap.get(`era:${id}`) ?? 0 }])
      );
      const byYear: Record<number, { total: number; documented: number }> = Object.fromEntries(
        YEARS.map((y) => [y, { total: 0, documented: docMap.get(`year:${y}`) ?? 0 }])
      );
      let grandTotal = 0;

      if (isTursoConfigured()) {
        const [tursoOverall, tursoByEra, tursoByYear] = await Promise.all([
          turso.execute(`SELECT COUNT(*) AS total FROM contract_index`),
          turso.execute(`SELECT era, COUNT(*) AS total FROM contract_index WHERE era IS NOT NULL GROUP BY era`),
          turso.execute(`SELECT year, COUNT(*) AS total FROM contract_index WHERE year IS NOT NULL GROUP BY year`),
        ]);

        grandTotal = Number((tursoOverall.rows[0] as unknown as { total: number | bigint })?.total ?? 0);

        for (const r of tursoByEra.rows as unknown as { era: string; total: number | bigint }[]) {
          const appEra = TURSO_ERA_TO_APP[r.era] ?? r.era;
          if (!(appEra in byEra)) continue;
          const prev = byEra[appEra];
          byEra[appEra] = { total: prev.total + Number(r.total), documented: prev.documented };
        }

        for (const r of tursoByYear.rows as unknown as { year: number; total: number | bigint }[]) {
          const y = Number(r.year);
          if (!(y in byYear)) continue;
          byYear[y] = { total: Number(r.total), documented: byYear[y].documented };
        }
      } else {
        // Fallback: Neon-only totals from contract_stats_cache
        type TotalRow = { scope: string; total: number | string };
        const totalRowsRaw = await db.execute<TotalRow>(sql`SELECT scope, total FROM contract_stats_cache`);
        const totalRows: TotalRow[] = Array.isArray(totalRowsRaw)
          ? (totalRowsRaw as TotalRow[])
          : ((totalRowsRaw as { rows?: TotalRow[] }).rows ?? []);

        for (const r of totalRows) {
          const t = Number(r.total);
          if (r.scope === "overall") {
            grandTotal = t;
          } else if (r.scope.startsWith("era:")) {
            const eraId = r.scope.slice(4);
            if (eraId in byEra) byEra[eraId] = { total: t, documented: byEra[eraId].documented };
          } else if (r.scope.startsWith("year:")) {
            const y = Number(r.scope.slice(5));
            if (y in byYear) byYear[y] = { total: t, documented: byYear[y].documented };
          }
        }
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
    });

    return NextResponse.json(
      { data, error: null },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } }
    );
  } catch (error) {
    console.error("[stats/progress] Error fetching progress stats:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch progress stats" },
      { status: 500 }
    );
  }
}
