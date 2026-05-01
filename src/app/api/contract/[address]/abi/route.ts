/**
 * GET /api/contract/[address]/abi
 *
 * Returns the ABI for a contract if it is verified (directly or via sibling).
 * Falls back to Etherscan's getsourcecode API when Neon has no ABI.
 *
 * Response:
 *   { data: { abi: string, source: 'direct' | 'sibling', siblingAddress?: string }, error: null }
 *   { data: null, error: null }  — no ABI available
 */

import { NextRequest, NextResponse } from "next/server";
import { getContractAbiFromDb } from "@/lib/db-client";
import { isValidAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function fetchAbiFromEtherscan(address: string): Promise<string | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    const json = await res.json();
    const abi = json?.result?.[0]?.ABI;
    if (abi && abi !== "Contract source code not verified") return abi;
  } catch {}
  return null;
}

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

  const normalizedAddress = address.toLowerCase();

  try {
    const result = await getContractAbiFromDb(normalizedAddress);
    if (result) {
      return NextResponse.json({ data: result, error: null });
    }

    // Neon has no ABI — try Etherscan as fallback
    const etherscanAbi = await fetchAbiFromEtherscan(normalizedAddress);
    if (etherscanAbi) {
      return NextResponse.json({
        data: { abi: etherscanAbi, source: "direct" as const },
        error: null,
      });
    }

    return NextResponse.json({ data: null, error: null });
  } catch (err) {
    console.error("[api/contract/abi] error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error." },
      { status: 500 }
    );
  }
}
