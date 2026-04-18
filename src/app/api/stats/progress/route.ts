/**
 * Documentation Progress Stats API Route
 *
 * GET /api/stats/progress
 *
 * Returns total and documented contract counts overall, per era, and per year,
 * plus community stats (historian count, total edits).
 *
 * Backed by the `contract_stats_cache` table (migration 068), which is a
 * ~20-row precomputed snapshot refreshed via `refresh_contract_stats_cache()`.
 * This keeps the endpoint sub-millisecond instead of paying an O(1.4M-row)
 * aggregation on every request.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { sql, eq } from "drizzle-orm";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"] as const;
const YEARS = [2015, 2016, 2017, 2018] as const;

type CacheRow = { scope: string; total: number | string; documented: number | string };

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    const emptyEra = { total: 0, documented: 0 };
    const emptyYear = { total: 0, documented: 0 };
    return NextResponse.json({
      data: {
        overall: { total: 0, documented: 0 },
        byEra: Object.fromEntries(ERA_IDS.map((id) => [id, emptyEra])),
        byYear: Object.fromEntries(YEARS.map((y) => [y, emptyYear])),
        community: { historians: 0, totalEdits: 0 },
      },
      error: null,
    });
  }

  try {
    const db = getDb();

    const cacheRowsPromise = db.execute<CacheRow>(sql`
      SELECT scope, total, documented FROM contract_stats_cache
    `);

    const historianPromise = db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.historians)
      .where(eq(schema.historians.active, true));

    const editsPromise = db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.contractEdits);

    const [cacheRowsRaw, historianCountResult, totalEditsResult] =
      await Promise.all([cacheRowsPromise, historianPromise, editsPromise]);

    const byEra: Record<string, { total: number; documented: number }> = {};
    const byYear: Record<number, { total: number; documented: number }> = {};
    for (const eraId of ERA_IDS) byEra[eraId] = { total: 0, documented: 0 };
    for (const year of YEARS) byYear[year] = { total: 0, documented: 0 };
    let overall = { total: 0, documented: 0 };

    const cacheRows: CacheRow[] = Array.isArray(cacheRowsRaw)
      ? (cacheRowsRaw as CacheRow[])
      : ((cacheRowsRaw as { rows?: CacheRow[] }).rows ?? []);

    for (const row of cacheRows) {
      const total = Number(row.total);
      const documented = Number(row.documented);
      if (row.scope === "overall") {
        overall = { total, documented };
      } else if (row.scope.startsWith("era:")) {
        const eraId = row.scope.slice(4);
        if ((ERA_IDS as readonly string[]).includes(eraId)) {
          byEra[eraId] = { total, documented };
        }
      } else if (row.scope.startsWith("year:")) {
        const y = Number(row.scope.slice(5));
        if ((YEARS as readonly number[]).includes(y)) {
          byYear[y] = { total, documented };
        }
      }
    }

    const community = {
      historians: historianCountResult[0]?.count ?? 0,
      totalEdits: totalEditsResult[0]?.count ?? 0,
    };

    return NextResponse.json(
      { data: { overall, byEra, byYear, community }, error: null },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (error) {
    console.error("[stats/progress] Error fetching progress stats:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch progress stats" },
      { status: 500 }
    );
  }
}
