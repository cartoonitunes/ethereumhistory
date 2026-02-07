/**
 * Analytics Dashboard API Route
 *
 * GET /api/analytics/dashboard?days=7
 * Returns engagement summary. Protected — requires historian session.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, getAnalyticsSummaryFromDb } from "@/lib/db-client";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Require authenticated historian
  const me = await getHistorianMeFromCookies();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get("days") || "7", 10) || 7, 1),
    90
  );

  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const summary = await getAnalyticsSummaryFromDb({ since });

    return NextResponse.json({
      data: {
        ...summary,
        period: { days, since: since.toISOString(), until: new Date().toISOString() },
      },
      error: null,
    });
  } catch (error) {
    console.error("[analytics] Dashboard query failed:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
