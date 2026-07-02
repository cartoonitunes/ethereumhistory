/**
 * Documentation Progress Stats API Route
 *
 * GET /api/stats/progress
 *
 * Returns total and documented contract counts overall, per era, and per year,
 * plus community stats (historian count, total edits).
 *
 * Totals for the full 12M+ Turso `contract_index` are precomputed once per hour
 * by the /api/cron/refresh-stats cron and stored in Neon's contract_stats_cache
 * (see lib/progress-stats). This handler reads ONLY Neon (~20-40 cached rows)
 * and never scans Turso, so it can't burn Turso read quota on page loads.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db-client";
import { getProgressStats } from "@/lib/progress-stats";

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
    const data = await getProgressStats();
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
