/**
 * Contract Edit History API
 *
 * GET /api/contract/[address]/edits
 * Returns the edit history for a specific contract — who edited what, when.
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidAddress } from "@/lib/utils";
import { isDatabaseConfigured, getEditsForContractFromDb } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return NextResponse.json(
      { data: null, error: "Invalid Ethereum address format." },
      { status: 400 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      data: { edits: [] },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  try {
    const edits = await getEditsForContractFromDb(address.toLowerCase());

    return NextResponse.json({
      data: { edits },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Error fetching contract edit history:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch edit history." },
      { status: 500 }
    );
  }
}
