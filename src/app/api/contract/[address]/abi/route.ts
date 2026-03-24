/**
 * GET /api/contract/[address]/abi
 *
 * Returns the ABI for a contract if it is verified (directly or via sibling).
 *
 * Response:
 *   { data: { abi: string, source: 'direct' | 'sibling', siblingAddress?: string }, error: null }
 *   { data: null, error: null }  — no ABI available
 */

import { NextRequest, NextResponse } from "next/server";
import { getContractAbiFromDb } from "@/lib/db-client";
import { isValidAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return NextResponse.json(
      { data: null, error: "Invalid Ethereum address format." },
      { status: 400 }
    );
  }

  try {
    const result = await getContractAbiFromDb(address.toLowerCase());
    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    console.error("[api/contract/abi] error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error." },
      { status: 500 }
    );
  }
}
