/**
 * Browse API
 *
 * GET /api/browse?era=homestead&type=token&q=transfer&page=1&limit=24
 *
 * Default mode: documented contracts from Neon (has short_description).
 * Pass undocumented=1 for contracts without documentation.
 *
 * Pass source=index to query the full Turso contract index (12M+ contracts).
 * Index mode supports: era, year, deployer, min_size, max_size, min_siblings.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isDatabaseConfigured,
  getDocumentedContractsFromDb,
  getDocumentedContractsCountFromDb,
  getUndocumentedContractsFromDb,
  getUndocumentedContractsCountFromDb,
} from "@/lib/db-client";
import { turso, isTursoConfigured } from "@/lib/turso";
import { cached, CACHE_TTL } from "@/lib/cache";
import { CAPABILITY_CATEGORIES } from "@/types";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source")?.trim();

  if (source === "index") {
    return browseIndex(searchParams);
  }

  return browseNeon(searchParams);
}

// =============================================================================
// Neon browse (documented / undocumented editorial content)
// =============================================================================

async function browseNeon(searchParams: URLSearchParams): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        data: { contracts: [], total: 0, page: 1, limit: DEFAULT_LIMIT, totalPages: 0 },
        meta: { timestamp: new Date().toISOString(), cached: false },
      },
      { status: 200 }
    );
  }

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
  const verification = searchParams.get("verification")?.trim() || undefined;
  const sort = searchParams.get("sort")?.trim() || undefined;
  const registrar = searchParams.get("registrar")?.trim() || undefined;
  const selfDestructedParam = searchParams.get("self_destructed")?.trim();
  // selfDestructed=true → show only self-destructed; false/null → exclude self-destructed (default)
  const selfDestructed = selfDestructedParam === "1" ? true : selfDestructedParam === "0" ? false : null;

  const filterParams = {
    eraId: era || null,
    contractType: type || null,
    codeQuery: q || null,
    year: year && year >= 2015 && year <= 2018 ? year : null,
    capabilityKeys: capabilityKeys.length > 0 ? capabilityKeys : null,
    verification: verification || null,
    registrar: (registrar as "any" | "GlobalRegistrar" | "LinageeRegistrar" | "NameRegistry" | null) || null,
    sort: sort || null,
    selfDestructed,
  };

  // Build a cache key from all filter params for short-lived caching
  const cacheKey = `browse:${undocumented ? "u" : "d"}:${era || ""}:${type || ""}:${q || ""}:${year || ""}:${capabilitiesParam}:${verification || ""}:${registrar || ""}:${sort || ""}:${selfDestructedParam || ""}:${page}:${limit}`;

  const [contractList, total] = await cached(
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

  const list = contractList.map((c) => ({
    address: c.address,
    name: c.tokenName || c.etherscanContractName || `Contract ${c.address.slice(0, 10)}...`,
    shortDescription: c.shortDescription,
    eraId: c.eraId,
    deploymentDate: c.deploymentTimestamp?.split("T")[0] ?? null,
    contractType: c.heuristics?.contractType ?? null,
    tokenName: c.tokenName,
    tokenSymbol: c.tokenSymbol,
    deploymentRank: c.deploymentRank ?? null,
    codeSizeBytes: c.codeSizeBytes ?? null,
    deployStatus: c.deployStatus ?? null,
  }));

  return NextResponse.json(
    {
      data: { contracts: list, total, page, limit, totalPages },
      meta: { timestamp: new Date().toISOString(), cached: !q },
    },
    {
      headers: {
        ...(q ? {} : { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" }),
      },
    }
  );
}

// =============================================================================
// Turso index browse (full 12M+ contract index)
// =============================================================================

interface TursoIndexRow {
  address: string;
  deployer: string;
  block_number: number;
  timestamp: number;
  bytecode_hash: string | null;
  code_size: number;
  era: string;
  year: number;
  is_internal: number;
}

async function browseIndex(searchParams: URLSearchParams): Promise<NextResponse> {
  if (!isTursoConfigured()) {
    return NextResponse.json(
      { data: null, error: "Contract index is not available (TURSO_DATABASE_URL not configured)." },
      { status: 503 }
    );
  }

  const era = searchParams.get("era")?.trim() || null;
  const year = searchParams.get("year")?.trim() ? parseInt(searchParams.get("year")!, 10) : null;
  const deployer = searchParams.get("deployer")?.trim().toLowerCase() || null;
  const minSize = searchParams.get("min_size")?.trim() ? parseInt(searchParams.get("min_size")!, 10) : null;
  const maxSize = searchParams.get("max_size")?.trim() ? parseInt(searchParams.get("max_size")!, 10) : null;
  const minSiblings = searchParams.get("min_siblings")?.trim() ? parseInt(searchParams.get("min_siblings")!, 10) : null;
  const isInternal = searchParams.get("is_internal")?.trim();
  const sort = searchParams.get("sort")?.trim() || "block_asc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (era) { conditions.push("ci.era = ?"); args.push(era); }
  if (year && year >= 2015 && year <= 2030) { conditions.push("ci.year = ?"); args.push(year); }
  if (deployer) { conditions.push("ci.deployer = ?"); args.push(deployer); }
  if (minSize !== null) { conditions.push("ci.code_size >= ?"); args.push(minSize); }
  if (maxSize !== null) { conditions.push("ci.code_size <= ?"); args.push(maxSize); }
  if (isInternal === "1") { conditions.push("ci.is_internal = 1"); }
  else if (isInternal === "0") { conditions.push("ci.is_internal = 0"); }

  const needsFamily = minSiblings !== null;
  const fromClause = needsFamily
    ? "FROM contract_index ci LEFT JOIN bytecode_families bf ON ci.bytecode_hash = bf.bytecode_hash"
    : "FROM contract_index ci";

  if (minSiblings !== null) { conditions.push("bf.sibling_count >= ?"); args.push(minSiblings); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderExpr =
    sort === "block_desc" ? "ci.block_number DESC" :
    sort === "size_desc"  ? "ci.code_size DESC" :
    sort === "size_asc"   ? "ci.code_size ASC" :
    "ci.block_number ASC";

  try {
    const [countResult, rowsResult] = await Promise.all([
      turso.execute({ sql: `SELECT COUNT(*) as total ${fromClause} ${whereClause}`, args }),
      turso.execute({
        sql: `SELECT ci.address, ci.deployer, ci.block_number, ci.timestamp, ci.bytecode_hash, ci.code_size, ci.era, ci.year, ci.is_internal
              ${fromClause} ${whereClause}
              ORDER BY ${orderExpr}
              LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);
    const rows = rowsResult.rows as unknown as TursoIndexRow[];
    const totalPages = Math.ceil(total / limit);

    const list = rows.map((r) => ({
      address: r.address,
      deployer: r.deployer,
      blockNumber: r.block_number,
      deploymentDate: r.timestamp ? new Date(r.timestamp * 1000).toISOString().split("T")[0] : null,
      bytecodeHash: r.bytecode_hash,
      codeSizeBytes: r.code_size,
      era: r.era,
      year: r.year,
      isInternal: r.is_internal === 1,
    }));

    return NextResponse.json({
      data: { contracts: list, total, page, limit, totalPages, source: "index" },
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Index browse error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to query contract index." },
      { status: 500 }
    );
  }
}
