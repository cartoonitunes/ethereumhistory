/**
 * Coverage API
 *
 * GET /api/coverage
 * Per-era and per-year breakdowns of the three disjoint coverage buckets.
 * All of the computation — and the reasoning behind the bucket definitions —
 * lives in lib/coverage-stats, which the /coverage page metadata and OG image
 * also read so every surface quotes the same numbers.
 *
 * When the underlying totals are unavailable this returns 503 + Retry-After
 * rather than 500: the dashboard cannot be drawn without them, and that is
 * unavailability, not a crash (same reasoning as cd0ec99 on the contract
 * route). A failure in a single bucket query no longer fails the request at
 * all — that band degrades to 0 and `meta.degraded` is set.
 */

import { NextResponse } from "next/server";
import { getCoverageStats, CoverageUnavailableError } from "@/lib/coverage-stats";
import { DEFAULT_RETRY_AFTER_SECONDS } from "@/lib/rpc-errors";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getCoverageStats();

    return NextResponse.json(
      {
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          cached: true,
          degraded: result.degraded,
        },
      },
      {
        headers: {
          // Don't let a degraded payload sit in the CDN for the full window.
          "Cache-Control": result.degraded
            ? "public, s-maxage=15, stale-while-revalidate=60"
            : "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    if (error instanceof CoverageUnavailableError) {
      console.error("Coverage index totals unavailable:", error.cause ?? error);
      return NextResponse.json(
        { data: null, error: "Coverage data is temporarily unavailable." },
        {
          status: 503,
          headers: { "Retry-After": String(DEFAULT_RETRY_AFTER_SECONDS) },
        }
      );
    }
    console.error("Coverage API error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch coverage data." },
      { status: 500 }
    );
  }
}
