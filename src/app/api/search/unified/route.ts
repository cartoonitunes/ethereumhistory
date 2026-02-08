/**
 * Unified Search API Route
 *
 * GET /api/search/unified?q=[query]&page=[number]
 * - If query is a full address, the client should navigate directly (we still allow searching).
 * - Otherwise searches across: decompiled code, verified source, ABI, contract name, token name/symbol, address.
 *
 * Pagination: 20 per page (default). Returns hasMore for Next button.
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, UnifiedSearchResponse } from "@/types";
import { searchUnifiedContracts } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UnifiedSearchResponse>>> {
  // Rate limit: 60 searches per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimit(`search:${ip}`, { maxRequests: 60, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: "Too many search requests. Please slow down." },
      { status: 429 }
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const raw = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const q = raw.trim();
  if (!q) {
    return NextResponse.json(
      { data: null, error: "Missing search query. Provide ?q=[query]" },
      { status: 400 }
    );
  }

  // Avoid accidental expensive wildcard scans for tiny queries.
  if (!isValidAddress(q) && q.length < 2) {
    return NextResponse.json(
      { data: null, error: "Search query must be at least 2 characters." },
      { status: 400 }
    );
  }

  try {
    const data = await searchUnifiedContracts(q, page, 20);
    return NextResponse.json(
      {
        data,
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      },
      {
        headers: {
          // Allow browser/Vercel edge to reuse results briefly; query is in the URL.
          // Note: this is "best effort" caching; sessionStorage cache in the client
          // handles the back-button UX reliably.
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error in unified search:", error);
    return NextResponse.json(
      { data: null, error: "An error occurred during search." },
      { status: 500 }
    );
  }
}

