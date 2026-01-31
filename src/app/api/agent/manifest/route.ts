/**
 * Agent API: Static skill manifest
 *
 * GET /api/agent/manifest
 * Describes EthereumHistory as a factual, non-opinionated historical data provider.
 * MoltBot, ClawdBot, OpenClaw, or other agents can register EthereumHistory as a skill using this manifest.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://ethereumhistory.com";

export async function GET(): Promise<NextResponse> {
  const manifest = {
    name: "Ethereum History",
    id: "ethereumhistory",
    description:
      "Historical contract data and documentation for Ethereum mainnet. Factual, non-opinionated; what a contract is and is not. Includes runtime bytecode, decompiled code, and editorial history when available.",
    version: "1.0",
    base_url: BASE_URL,
    capabilities: [
      "contract_facts",
      "discovery",
      "temporal_queries",
    ],
    endpoints: [
      {
        capability: "contract_facts",
        method: "GET",
        path: "/api/agent/contracts/{address}",
        description: "Factual contract data for one address (bytecode, decompiled code, history, links, metadata).",
      },
      {
        capability: "discovery",
        method: "GET",
        path: "/api/agent/contracts",
        description: "List contracts with optional filters: era_id, featured, undocumented_only, limit, offset.",
        query_params: ["era_id", "featured", "undocumented_only", "limit", "offset"],
      },
      {
        capability: "temporal_queries",
        method: "GET",
        path: "/api/agent/contracts",
        description: "Contracts by deployment time range: from_timestamp, to_timestamp (ISO 8601).",
        query_params: ["from_timestamp", "to_timestamp", "era_id", "limit", "offset"],
      },
    ],
    terms: "Read-only. No opinions or editorial stance. Data as documented on EthereumHistory.com. Factual, non-opinionated historical data provider.",
  };

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
