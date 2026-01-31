/**
 * Agent API: Discovery and temporal queries
 *
 * GET /api/agent/contracts?era_id=...&featured=...&undocumented_only=...&from_timestamp=...&to_timestamp=...&limit=...&offset=...
 * Read-only, deterministic. Returns list of contracts matching criteria.
 * Minimal fields for discovery; full contract facts via GET /api/agent/contracts/[address].
 */

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, getContractsForAgentDiscoveryFromDb } from "@/lib/db-client";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        data: [],
        meta: {
          timestamp: new Date().toISOString(),
          cached: false,
          message: "Database not configured; discovery requires PostgreSQL.",
        },
      },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const eraId = searchParams.get("era_id")?.trim() || undefined;
  const featuredParam = searchParams.get("featured");
  const featured =
    featuredParam === "1" || featuredParam === "true" ? true : featuredParam === "0" || featuredParam === "false" ? false : undefined;
  const undocumentedOnly =
    searchParams.get("undocumented_only") === "1" || searchParams.get("undocumented_only") === "true";
  const fromTimestamp = searchParams.get("from_timestamp")?.trim() || undefined;
  const toTimestamp = searchParams.get("to_timestamp")?.trim() || undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw != null ? Math.min(Math.max(parseInt(limitRaw, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT) : DEFAULT_LIMIT;
  const offsetRaw = searchParams.get("offset");
  const offset = offsetRaw != null ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : 0;

  const contracts = await getContractsForAgentDiscoveryFromDb({
    eraId: eraId || null,
    featured: featured ?? null,
    undocumentedOnly: undocumentedOnly || null,
    fromTimestamp: fromTimestamp || null,
    toTimestamp: toTimestamp || null,
    limit,
    offset,
  });

  const data = contracts.map((c) => ({
    address: c.address,
    era_id: c.eraId,
    deployer_address: c.deployerAddress,
    deployment_timestamp: c.deploymentTimestamp,
    has_short_description: !!(c.shortDescription && c.shortDescription.trim()),
    decompilation_success: c.decompilationSuccess,
    etherscan_contract_name: c.etherscanContractName,
    token_name: c.tokenName,
    token_symbol: c.tokenSymbol,
  }));

  return NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      cached: false,
      limit,
      offset,
      count: data.length,
    },
  });
}
