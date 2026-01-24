/**
 * External Contract Data API Route
 *
 * GET /api/contract/[address]/external
 * Fetches external data for a contract from Etherscan and on-chain calls.
 * Returns token name, symbol, verified source code, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchExternalContractData, getExternalDataStatus } from "@/lib/external-data";
import type { ApiResponse, ExternalContractData } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<ExternalContractData>>> {
  const { address } = await params;

  // Validate address format
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json(
      {
        data: null,
        error: "Invalid Ethereum address format",
      },
      { status: 400 }
    );
  }

  // Check if any external APIs are configured
  const status = getExternalDataStatus();
  if (!status.etherscanConfigured && !status.rpcConfigured) {
    return NextResponse.json(
      {
        data: null,
        error: "No external data sources configured. Set ETHERSCAN_API_KEY and/or ETHEREUM_RPC_URL environment variables.",
      },
      { status: 503 }
    );
  }

  try {
    const externalData = await fetchExternalContractData(address);

    return NextResponse.json({
      data: externalData,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Error fetching external contract data:", error);

    return NextResponse.json(
      {
        data: null,
        error: "Failed to fetch external contract data",
      },
      { status: 500 }
    );
  }
}
