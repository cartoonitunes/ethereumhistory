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
 *
 * RPC enrichment is best-effort. When the upstream provider rate-limits or
 * times out we serve whatever the archive already knows (200 with partial
 * data), and only fall back to 503 + Retry-After when there is nothing to
 * serve at all. A rate limit is never a 500 — nothing is broken on our side.
 */

import { NextRequest, NextResponse } from "next/server";
import { getContractPageData } from "@/lib/db";
import { resolveContract, buildContractFromResolved } from "@/lib/contract-resolver";
import { isTursoConfigured } from "@/lib/turso";
import {
  DEFAULT_RETRY_AFTER_SECONDS,
  isRpcUnavailable,
  type RpcUnavailableError,
} from "@/lib/rpc-errors";
import { isValidAddress } from "@/lib/utils";
import type { ApiResponse, ContractPageData } from "@/types";

export const dynamic = "force-dynamic";

const DEGRADED_NOTICE =
  "Live chain data is temporarily unavailable (upstream RPC rate limit). Showing archived data only.";

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

  // Set when an upstream — the RPC provider or the archive index — is the
  // reason we have less than the full picture.
  let rpcError: RpcUnavailableError | null = null;
  let indexUnavailable = false;

  try {
    const data = await getContractPageData(address);

    if (data) {
      return NextResponse.json({
        data,
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      });
    }
  } catch (error) {
    if (!isRpcUnavailable(error)) {
      console.error("Error fetching contract:", error);
      return NextResponse.json(
        { data: null, error: "An error occurred while fetching contract data." },
        { status: 500 }
      );
    }
    // The contract may still be in the Turso index — fall through to it.
    console.warn("[rpc] contract enrichment unavailable:", error.message);
    rpcError = error;
  }

  // Neon + RPC came up empty — fall back to Turso index.
  // Covers self-destructed contracts and historical contracts not yet seeded into Neon.
  let resolved: Awaited<ReturnType<typeof resolveContract>> = null;
  try {
    if (isTursoConfigured()) resolved = await resolveContract(address);
  } catch (error) {
    // The index is the only thing that can tell a self-destructed archived
    // contract from an address that never held code, so when it is down we
    // genuinely cannot answer — that is unavailability, not a crash.
    console.error("Error resolving contract from index:", error);
    indexUnavailable = true;
  }

  if (resolved) {
    return NextResponse.json({
      data: {
        contract: buildContractFromResolved(resolved),
        bytecodeAnalysis: null,
        similarContracts: [],
        detectedPatterns: [],
        functionSignatures: [],
      } satisfies ContractPageData,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
        ...(rpcError ? { degraded: true, warning: DEGRADED_NOTICE } : {}),
      },
    });
  }

  // Nothing archived, and the lookup that would have answered this is
  // unavailable — "not found" would be a lie, so ask the caller to retry.
  if (rpcError || indexUnavailable) {
    return NextResponse.json(
      {
        data: null,
        error: rpcError
          ? "Chain data is temporarily unavailable (upstream RPC rate limit). Please retry shortly."
          : "The contract archive is temporarily unavailable. Please retry shortly.",
        meta: {
          timestamp: new Date().toISOString(),
          cached: false,
          degraded: true,
        },
      },
      {
        status: 503,
        headers: {
          "Retry-After": String(rpcError?.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS),
        },
      }
    );
  }

  return NextResponse.json(
    {
      data: null,
      error: "Contract not found in our historical archive.",
      meta: { timestamp: new Date().toISOString(), cached: false },
    },
    { status: 404 }
  );
}
