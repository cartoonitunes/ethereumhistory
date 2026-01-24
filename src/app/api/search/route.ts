/**
 * Search API Route
 *
 * GET /api/search?q=[address]
 * Searches for an address and returns basic information
 */

import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import type { ApiResponse, SearchResult } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SearchResult>>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      {
        data: null,
        error: "Missing search query. Provide ?q=[address]",
      },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim().toLowerCase();

  // Validate address format
  if (!isValidAddress(trimmedQuery)) {
    return NextResponse.json(
      {
        data: null,
        error: "Invalid Ethereum address format. Must be 0x followed by 40 hex characters.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await searchAddress(trimmedQuery);

    return NextResponse.json({
      data: result,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Error searching:", error);

    return NextResponse.json(
      {
        data: null,
        error: "An error occurred during search.",
      },
      { status: 500 }
    );
  }
}
