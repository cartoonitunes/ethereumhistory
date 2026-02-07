/**
 * Activity Feed API Route
 *
 * GET /api/activity?limit=20
 * Returns recent edits for the activity feed.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, getRecentEditsFromDb } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: { edits: [] }, error: null });
  }

  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get("limit") || "20", 10) || 20, 1),
    50
  );

  try {
    const edits = await getRecentEditsFromDb(limit);
    return NextResponse.json(
      { data: { edits }, error: null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[activity] Error fetching recent edits:", error);
    return NextResponse.json({ data: { edits: [] }, error: "Failed to fetch activity" }, { status: 500 });
  }
}
