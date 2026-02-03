/**
 * Browse API: Documented contracts with filters
 *
 * GET /api/browse?era=homestead&type=token&q=transfer&page=1&limit=24
 * Returns contracts that have a short_description (documented).
 * Filters: era (era_id), type (contract_type), q (search in decompiled/source code).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isDatabaseConfigured,
  getDocumentedContractsFromDb,
  getDocumentedContractsCountFromDb,
} from "@/lib/db-client";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        data: { contracts: [], total: 0, page: 1, limit: DEFAULT_LIMIT, totalPages: 0 },
        meta: { timestamp: new Date().toISOString(), cached: false },
      },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const era = searchParams.get("era")?.trim() || undefined;
  const type = searchParams.get("type")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  const [contracts, total] = await Promise.all([
    getDocumentedContractsFromDb({
      eraId: era || null,
      contractType: type || null,
      codeQuery: q || null,
      limit,
      offset,
    }),
    getDocumentedContractsCountFromDb({
      eraId: era || null,
      contractType: type || null,
      codeQuery: q || null,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const list = contracts.map((c) => ({
    address: c.address,
    name: c.etherscanContractName || `Contract ${c.address.slice(0, 10)}...`,
    shortDescription: c.shortDescription,
    eraId: c.eraId,
    deploymentDate: c.deploymentTimestamp?.split("T")[0] ?? null,
    contractType: c.heuristics?.contractType ?? null,
    tokenName: c.tokenName,
    tokenSymbol: c.tokenSymbol,
  }));

  return NextResponse.json({
    data: {
      contracts: list,
      total,
      page,
      limit,
      totalPages,
    },
    meta: {
      timestamp: new Date().toISOString(),
      cached: false,
    },
  });
}
