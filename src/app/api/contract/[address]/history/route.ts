/**
 * Contract History/Metadata API Route
 *
 * GET /api/contract/[address]/history
 * Returns curated historical links + metadata stored in Postgres.
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, ContractHistoryData } from "@/types";
import { isValidAddress } from "@/lib/utils";
import { isDatabaseConfigured } from "@/lib/db-client";
import {
  getContractMetadataFromDb,
  getHistoricalLinksForContractFromDb,
} from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<ContractHistoryData>>> {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return NextResponse.json(
      {
        data: null,
        error: "Invalid Ethereum address format. Must be 0x followed by 40 hex characters.",
      },
      { status: 400 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        data: { links: [], metadata: [] },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          cached: false,
        },
      },
      { status: 200 }
    );
  }

  try {
    const normalized = address.toLowerCase();
    const [links, metadata] = await Promise.all([
      getHistoricalLinksForContractFromDb(normalized),
      getContractMetadataFromDb(normalized),
    ]);

    return NextResponse.json({
      data: { links, metadata },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Error fetching contract history:", error);
    return NextResponse.json(
      {
        data: null,
        error: "Failed to fetch contract history/metadata.",
      },
      { status: 500 }
    );
  }
}

