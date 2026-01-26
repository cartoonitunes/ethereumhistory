/**
 * Top Editors API Route
 *
 * GET /api/editors/top?limit=10
 * Returns top editors by edit count
 */

import { NextRequest, NextResponse } from "next/server";
import { getTopEditorsFromDb } from "@/lib/db-client";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

interface TopEditorsResponse {
  editors: Array<{
    historianId: number;
    name: string;
    editCount: number;
    newPagesCount: number;
  }>;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<TopEditorsResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100); // Clamp between 1 and 100
    
    const editors = await getTopEditorsFromDb(limit);

    return NextResponse.json({
      data: {
        editors,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Error fetching top editors:", error);

    return NextResponse.json(
      {
        data: null,
        error: "An error occurred while fetching top editors.",
      },
      { status: 500 }
    );
  }
}
