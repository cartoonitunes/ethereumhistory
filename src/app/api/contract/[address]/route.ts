/**
 * Contract API Route
 *
 * GET /api/contract/[address]
 * Returns full contract page data including:
 * - Contract metadata
 * - Bytecode analysis
 * - Similar contracts
 * - Detected patterns
 * - Function signatures
 */

import { NextRequest, NextResponse } from "next/server";
import { getContractPageData } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import type { ApiResponse, ContractPageData } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<ContractPageData>>> {
  const { address } = await params;

  // Validate address format
  if (!isValidAddress(address)) {
    return NextResponse.json(
      {
        data: null,
        error: "Invalid Ethereum address format. Must be 0x followed by 40 hex characters.",
      },
      { status: 400 }
    );
  }

  try {
    const data = await getContractPageData(address);

    if (!data) {
      return NextResponse.json(
        {
          data: null,
          error: "Contract not found in our historical archive.",
          meta: {
            timestamp: new Date().toISOString(),
            cached: false,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Error fetching contract:", error);

    return NextResponse.json(
      {
        data: null,
        error: "An error occurred while fetching contract data.",
      },
      { status: 500 }
    );
  }
}
