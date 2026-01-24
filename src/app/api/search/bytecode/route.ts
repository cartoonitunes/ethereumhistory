/**
 * Bytecode/Decompiled Code Search API Route
 *
 * GET /api/search/bytecode?q=[query]&type=[decompiled|bytecode|all]&limit=[number]
 * Searches through decompiled code and bytecode for patterns
 */

import { NextRequest, NextResponse } from "next/server";
import { searchBytecodeContent } from "@/lib/db";
import type { ApiResponse, BytecodeSearchResult } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<BytecodeSearchResult[]>>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const searchType = searchParams.get("type") || "all";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  if (!query) {
    return NextResponse.json(
      {
        data: null,
        error: "Missing search query. Provide ?q=[search term]",
      },
      { status: 400 }
    );
  }

  if (query.length < 2) {
    return NextResponse.json(
      {
        data: null,
        error: "Search query must be at least 2 characters.",
      },
      { status: 400 }
    );
  }

  const validTypes = ["decompiled", "bytecode", "all"];
  if (!validTypes.includes(searchType)) {
    return NextResponse.json(
      {
        data: null,
        error: "Invalid search type. Must be one of: decompiled, bytecode, all",
      },
      { status: 400 }
    );
  }

  try {
    const results = await searchBytecodeContent(
      query,
      searchType as "decompiled" | "bytecode" | "all",
      limit
    );

    return NextResponse.json({
      data: results,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Error searching bytecode:", error);

    return NextResponse.json(
      {
        data: null,
        error: "An error occurred during search.",
      },
      { status: 500 }
    );
  }
}
