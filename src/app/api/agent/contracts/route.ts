/**
 * Agent API: Discovery and temporal queries
 *
 * GET /api/agent/contracts?era_id=...&featured=...&undocumented_only=...&unverified=...&q=...&from_timestamp=...&to_timestamp=...&sort=...&limit=...&offset=...
 * Read-only, deterministic. Returns list of contracts matching criteria.
 * Minimal fields for discovery; full contract facts via GET /api/agent/contracts/[address].
 *
 * Params:
 *   q - Text search across etherscan_contract_name, token_name, token_symbol, decompiled_code
 *   unverified=1 - Only contracts with no verification_method AND no etherscan-verified source
 *   sort=siblings - Sort by sibling count (most shared bytecode first), sort=date (default)
 *   from_timestamp / to_timestamp - ISO date range filter
 *   era_id - Filter by era (frontier, homestead, dao, tangerine, spurious)
 *   limit / offset - Pagination (max 200)
 */

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, getContractsForAgentDiscoveryFromDb } from "@/lib/db-client";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// Rate limits: authenticated users get 120/min, anonymous get 20/min
const RATE_LIMIT_AUTH = { maxRequests: 120, windowSeconds: 60 };
const RATE_LIMIT_ANON = { maxRequests: 20, windowSeconds: 60 };

function validateApiKey(request: NextRequest): boolean {
  const token = request.headers.get("x-historian-token") || request.headers.get("x-api-key");
  if (!token) return false;
  // Accept historian tokens (validated elsewhere) or the agent token
  const validTokens = [
    process.env.AGENT_API_KEY,
    "neo-historian-d4b105db78f760f0abcc58c13c4452f2", // Neo's token
  ].filter(Boolean);
  return validTokens.includes(token);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const isAuthenticated = validateApiKey(request);
  const config = isAuthenticated ? RATE_LIMIT_AUTH : RATE_LIMIT_ANON;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") || "unknown";
  const identifier = isAuthenticated
    ? `agent-auth:${request.headers.get("x-historian-token") || request.headers.get("x-api-key")}`
    : `agent-anon:${ip}`;
  const { allowed, remaining, resetAt } = checkRateLimit(identifier, config);

  if (!allowed) {
    return NextResponse.json(
      { data: [], error: "Rate limit exceeded. Authenticate with x-api-key header for higher limits.", meta: { resetAt: new Date(resetAt).toISOString() } },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)), "X-RateLimit-Remaining": "0" } }
    );
  }

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
  const unverified =
    searchParams.get("unverified") === "1" || searchParams.get("unverified") === "true";
  const q = searchParams.get("q")?.trim() || undefined;
  const sort = searchParams.get("sort")?.trim() || undefined;
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
    unverified: unverified || null,
    q: q || null,
    sort: sort || null,
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
    verification_method: c.verificationMethod || null,
    code_size_bytes: c.codeSizeBytes || null,
    siblings: (c as any)._siblingCount ?? null,
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
  }, {
    headers: {
      "X-RateLimit-Remaining": String(remaining),
    },
  });
}
