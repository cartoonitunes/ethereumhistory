/**
 * Featured Contracts API Route
 *
 * GET /api/featured
 * Returns featured historical contracts for the homepage
 */

import { NextResponse } from "next/server";
import { getFeaturedContracts, getRecentContracts, getAllEras } from "@/lib/db";
import type { ApiResponse, FeaturedContract, EthereumEra, Contract } from "@/types";

export const dynamic = "force-dynamic";

interface FeaturedResponse {
  featuredContracts: FeaturedContract[];
  recentContracts: Contract[];
  eras: EthereumEra[];
}

export async function GET(): Promise<NextResponse<ApiResponse<FeaturedResponse>>> {
  try {
    const [featuredContracts, recentContracts, eras] = await Promise.all([
      getFeaturedContracts(),
      getRecentContracts(5),
      getAllEras(),
    ]);

    return NextResponse.json({
      data: {
        featuredContracts,
        recentContracts,
        eras,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
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
