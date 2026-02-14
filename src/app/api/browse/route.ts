/**
 * Browse API: Documented contracts with filters
 *
 * GET /api/browse?era=homestead&type=token&q=transfer&page=1&limit=24
 * Returns contracts that have a short_description (documented).
 * Pass undocumented=1 to instead return contracts without documentation.
 * Filters: era (era_id), type (contract_type), q (search in decompiled/source code).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isDatabaseConfigured,
  getDocumentedContractsFromDb,
  getDocumentedContractsCountFromDb,
  getUndocumentedContractsFromDb,
  getUndocumentedContractsCountFromDb,
} from "@/lib/db-client";
import { cached, CACHE_TTL } from "@/lib/cache";
import { CAPABILITY_CATEGORIES } from "@/types";

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
  const yearParam = searchParams.get("year")?.trim();
  const undocumented = searchParams.get("undocumented") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  const year = yearParam ? parseInt(yearParam, 10) : null;
  const capabilitiesParam = searchParams.get("capabilities")?.trim() || "";
  const capabilityKeys = capabilitiesParam
    ? capabilitiesParam.split(",").flatMap((slug) => CAPABILITY_CATEGORIES[slug]?.keys ?? [])
    : [];

  const filterParams = {
    eraId: era || null,
    contractType: type || null,
    codeQuery: q || null,
    year: year && year >= 2015 && year <= 2017 ? year : null,
    capabilityKeys: capabilityKeys.length > 0 ? capabilityKeys : null,
  };

  // Build a cache key from all filter params for short-lived caching
  const cacheKey = `browse:${undocumented ? "u" : "d"}:${era || ""}:${type || ""}:${q || ""}:${year || ""}:${capabilitiesParam}:${page}:${limit}`;

  const [contracts, total] = await cached(
    cacheKey,
    // Code search queries bypass cache (expensive + varied), others cache 1 min
    q ? 0 : CACHE_TTL.SHORT,
    async () => {
      return undocumented
        ? Promise.all([
            getUndocumentedContractsFromDb({ ...filterParams, limit, offset }),
            getUndocumentedContractsCountFromDb(filterParams),
          ])
        : Promise.all([
            getDocumentedContractsFromDb({ ...filterParams, limit, offset }),
            getDocumentedContractsCountFromDb(filterParams),
          ]);
    }
  );

  const totalPages = Math.ceil(total / limit);

  const list = contracts.map((c) => ({
    address: c.address,
    name: c.etherscanContractName || c.tokenName || `Contract ${c.address.slice(0, 10)}...`,
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
      cached: !q, // code-search queries bypass cache
    },
  });
}
