/**
 * Featured Contracts API Route
 *
 * GET /api/featured
 * Returns featured historical contracts for the homepage.
 * Cached in-memory for 5 minutes to reduce DB load.
 */

import { NextResponse } from "next/server";
import { getFeaturedContracts, getRecentContracts, getAllEras } from "@/lib/db";
import { cached, CACHE_TTL } from "@/lib/cache";
import type { ApiResponse, FeaturedContract, EthereumEra, Contract } from "@/types";

export const dynamic = "force-dynamic";

interface FeaturedResponse {
  featuredContracts: FeaturedContract[];
  recentContracts: Contract[];
  eras: EthereumEra[];
}

export async function GET(): Promise<NextResponse<ApiResponse<FeaturedResponse>>> {
  try {
    const data = await cached<FeaturedResponse>(
      "featured:homepage",
      CACHE_TTL.MEDIUM,
      async () => {
        const [featuredContracts, recentContracts, eras] = await Promise.all([
          getFeaturedContracts(),
          getRecentContracts(5),
          getAllEras(),
        ]);
        return { featuredContracts, recentContracts, eras };
      }
    );

    return NextResponse.json({
      data,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: true,
      },
    });
  } catch (error) {
    console.error("Error fetching featured content:", error);

    return NextResponse.json(
      {
        data: null,
        error: "An error occurred while fetching featured content.",
      },
      { status: 500 }
    );
  }
}
