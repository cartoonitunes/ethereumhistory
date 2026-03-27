/**
 * Browse/search queries — documented, undocumented, search, discovery.
 */

import { eq, and, or, asc, desc, ilike, inArray, isNull, isNotNull, ne, gte, lte, sql, SQL } from "drizzle-orm";
import * as schema from "../schema";
import type {
  Contract as AppContract,
  HeuristicContractType,
  UnifiedSearchResult,
  UnifiedMatchType,
} from "@/types";
import { FRONTIER_REGISTRAR_NAMES, type RegistrarType } from "../frontier-registrar";
import { getDb } from "./connection";
import { dbRowToContract, enrichContractsWithRank } from "./contracts";

// =============================================================================
// Agent Discovery
// =============================================================================

/**
 * Get contracts for agent discovery / temporal queries.
 * Optional filters: era_id, featured, undocumented_only, from_timestamp, to_timestamp.
 * Pagination: limit (default 50, max 200), offset (default 0).
 */
export async function getContractsForAgentDiscoveryFromDb(params: {
  eraId?: string | null;
  featured?: boolean | null;
  undocumentedOnly?: boolean | null;
  unverified?: boolean | null;
  q?: string | null;
  sort?: string | null;
  fromTimestamp?: string | null; // ISO string
  toTimestamp?: string | null; // ISO string
  limit?: number;
  offset?: number;
}): Promise<AppContract[]> {
  const database = getDb();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const conditions: SQL[] = [];
  if (params.eraId != null && params.eraId !== "") {
    conditions.push(eq(schema.contracts.eraId, params.eraId));
  }
  if (params.featured === true) {
    conditions.push(eq(schema.contracts.featured, true));
  }
  if (params.undocumentedOnly === true) {
    conditions.push(
      or(
        isNull(schema.contracts.shortDescription),
        eq(schema.contracts.shortDescription, "")
      )!
    );
  }
  if (params.unverified === true) {
    conditions.push(isNull(schema.contracts.verificationMethod));
  }
  if (params.q != null && params.q.trim() !== "") {
    const pattern = `%${params.q.trim()}%`;
    conditions.push(
      or(
        ilike(schema.contracts.etherscanContractName, pattern),
        ilike(schema.contracts.tokenName, pattern),
        ilike(schema.contracts.tokenSymbol, pattern),
        ilike(schema.contracts.address, pattern),
        ilike(schema.contracts.decompiledCode, pattern),
      )!
    );
  }
  if (params.fromTimestamp != null && params.fromTimestamp !== "") {
    try {
      conditions.push(gte(schema.contracts.deploymentTimestamp, new Date(params.fromTimestamp)));
    } catch {
      // ignore invalid date
    }
  }
  if (params.toTimestamp != null && params.toTimestamp !== "") {
    try {
      conditions.push(lte(schema.contracts.deploymentTimestamp, new Date(params.toTimestamp)));
    } catch {
      // ignore invalid date
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort by sibling count (most shared bytecode first) or by date
  if (params.sort === "siblings") {
    const results = await database.execute(sql`
      SELECT c.*,
        COALESCE((SELECT COUNT(*) FROM contracts c2 WHERE c2.deployed_bytecode_hash = c.deployed_bytecode_hash AND c.deployed_bytecode_hash IS NOT NULL), 0) as _sibling_count
      FROM contracts c
      WHERE ${whereClause ?? sql`true`}
      ORDER BY _sibling_count DESC, c.deployment_timestamp ASC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `);
    return ((results as any).rows ?? results as any[]).map((row: any) => {
      const contract = dbRowToContract(row);
      (contract as any)._siblingCount = Number(row._sibling_count) || 0;
      return contract;
    });
  }

  const results = await database
    .select()
    .from(schema.contracts)
    .where(whereClause ?? sql`true`)
    .orderBy(asc(schema.contracts.deploymentTimestamp))
    .limit(limit)
    .offset(offset);

  return results.map(dbRowToContract);
}

// =============================================================================
// Decompiled code search
// =============================================================================

/**
 * Search contracts in decompiled code
 */
export async function searchDecompiledCode(
  query: string,
  limit = 20,
  offset = 0
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(
      and(
        eq(schema.contracts.decompilationSuccess, true),
        ilike(schema.contracts.decompiledCode, `%${query}%`)
      )
    )
    .orderBy(asc(schema.contracts.deploymentTimestamp))
    .limit(limit)
    .offset(offset);

  return results.map(dbRowToContract);
}

// =============================================================================
// Unified search
// =============================================================================

/**
 * Unified text search across:
 * - address (partial)
 * - contract name (etherscan_contract_name)
 * - token name/symbol
 * - decompiled code
 * - verified source code
 * - abi
 *
 * Pagination: limit + offset. Callers can use limit+1 to determine "hasMore".
 */
export async function searchUnifiedFromDb(
  query: string,
  limit = 20,
  offset = 0
): Promise<UnifiedSearchResult[]> {
  const database = getDb();
  const q = query.trim();
  const pattern = `%${q}%`;
  const qLower = q.toLowerCase();

  const matchTypeExpr = sql<UnifiedMatchType>`CASE
    WHEN ${schema.contracts.address} ILIKE ${pattern} THEN 'address'
    WHEN ${schema.contracts.tokenName} ILIKE ${pattern} THEN 'token_name'
    WHEN ${schema.contracts.tokenSymbol} ILIKE ${pattern} THEN 'token_symbol'
    WHEN ${schema.contracts.etherscanContractName} ILIKE ${pattern} THEN 'contract_name'
    WHEN ${schema.contracts.decompiledCode} ILIKE ${pattern} THEN 'decompiled_code'
    WHEN ${schema.contracts.sourceCode} ILIKE ${pattern} THEN 'source_code'
    WHEN ${schema.contracts.abi} ILIKE ${pattern} THEN 'abi'
    ELSE 'address'
  END`;

  const matchRankExpr = sql<number>`CASE
    WHEN ${schema.contracts.tokenName} ILIKE ${pattern} THEN 1
    WHEN ${schema.contracts.tokenSymbol} ILIKE ${pattern} THEN 2
    WHEN ${schema.contracts.etherscanContractName} ILIKE ${pattern} THEN 3
    WHEN ${schema.contracts.decompiledCode} ILIKE ${pattern} THEN 4
    WHEN ${schema.contracts.sourceCode} ILIKE ${pattern} THEN 5
    WHEN ${schema.contracts.abi} ILIKE ${pattern} THEN 6
    WHEN ${schema.contracts.address} ILIKE ${pattern} THEN 7
    ELSE 99
  END`;

  const snippetExpr = sql<string | null>`CASE
    WHEN ${schema.contracts.tokenName} ILIKE ${pattern} THEN ${schema.contracts.tokenName}
    WHEN ${schema.contracts.tokenSymbol} ILIKE ${pattern} THEN ${schema.contracts.tokenSymbol}
    WHEN ${schema.contracts.etherscanContractName} ILIKE ${pattern} THEN ${schema.contracts.etherscanContractName}
    WHEN ${schema.contracts.decompiledCode} ILIKE ${pattern} THEN substring(${schema.contracts.decompiledCode} from greatest(strpos(lower(${schema.contracts.decompiledCode}), ${qLower}) - 40, 1) for 140)
    WHEN ${schema.contracts.sourceCode} ILIKE ${pattern} THEN substring(${schema.contracts.sourceCode} from greatest(strpos(lower(${schema.contracts.sourceCode}), ${qLower}) - 40, 1) for 140)
    WHEN ${schema.contracts.abi} ILIKE ${pattern} THEN substring(${schema.contracts.abi} from greatest(strpos(lower(${schema.contracts.abi}), ${qLower}) - 40, 1) for 140)
    WHEN ${schema.contracts.address} ILIKE ${pattern} THEN ${schema.contracts.address}
    ELSE NULL
  END`;

  const rows = await database
    .select({
      address: schema.contracts.address,
      deploymentTimestamp: schema.contracts.deploymentTimestamp,
      eraId: schema.contracts.eraId,
      contractType: schema.contracts.contractType,
      tokenName: schema.contracts.tokenName,
      tokenSymbol: schema.contracts.tokenSymbol,
      etherscanContractName: schema.contracts.etherscanContractName,
      hasSourceCode: sql<boolean>`(${schema.contracts.sourceCode} is not null and length(${schema.contracts.sourceCode}) > 0)`,
      decompilationSuccess: schema.contracts.decompilationSuccess,
      matchType: matchTypeExpr,
      matchSnippet: snippetExpr,
      matchRank: matchRankExpr,
    })
    .from(schema.contracts)
    .where(
      or(
        ilike(schema.contracts.address, pattern),
        ilike(schema.contracts.tokenName, pattern),
        ilike(schema.contracts.tokenSymbol, pattern),
        ilike(schema.contracts.etherscanContractName, pattern),
        ilike(schema.contracts.decompiledCode, pattern),
        ilike(schema.contracts.sourceCode, pattern),
        ilike(schema.contracts.abi, pattern)
      )
    )
    .orderBy(asc(matchRankExpr), asc(schema.contracts.deploymentTimestamp), asc(schema.contracts.address))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => {
    const title =
      r.tokenName ||
      r.etherscanContractName ||
      (r.tokenSymbol ? `Token ${r.tokenSymbol}` : `Contract ${r.address.slice(0, 10)}...`);

    const subtitleParts: string[] = [];
    if (r.tokenSymbol) subtitleParts.push(r.tokenSymbol);
    if (r.etherscanContractName && r.tokenName && r.etherscanContractName !== r.tokenName) {
      subtitleParts.push(`Etherscan: ${r.etherscanContractName}`);
    }
    const subtitle = subtitleParts.length ? subtitleParts.join(" • ") : null;

    return {
      entityType: "contract",
      address: r.address,
      title,
      subtitle,
      matchType: r.matchType,
      matchSnippet: r.matchSnippet ? String(r.matchSnippet).replace(/\s+/g, " ").trim() : null,
      deploymentTimestamp: r.deploymentTimestamp?.toISOString() || null,
      eraId: r.eraId,
      heuristicContractType: (r.contractType as HeuristicContractType) || null,
      verificationStatus: r.hasSourceCode
        ? "verified"
        : r.decompilationSuccess
        ? "decompiled"
        : "bytecode_only",
      personSlug: null,
    };
  });
}

// =============================================================================
// Documented / undocumented browse
// =============================================================================

/**
 * Get documented contracts for browse page.
 * Documented = has non-empty shortDescription.
 * Optional filters: eraId, contractType, codeQuery (search in decompiled/source code).
 */
export async function getDocumentedContractsFromDb(params: {
  eraId?: string | null;
  contractType?: string | null;
  codeQuery?: string | null;
  year?: number | null;
  capabilityKeys?: string[] | null;
  verification?: string | null;
  registrar?: RegistrarType | "any" | null;
  sort?: string | null;
  selfDestructed?: boolean | null;
  limit?: number;
  offset?: number;
}): Promise<AppContract[]> {
  const database = getDb();
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  // When a registrar filter is active, show ALL contracts with that name regardless of
  // documentation state (most registrar contracts aren't documented yet).
  const conditions: SQL[] = params.registrar != null ? [] : [
    isNotNull(schema.contracts.shortDescription),
    ne(schema.contracts.shortDescription, ""),
  ];

  // Self-destruct filter
  if (params.selfDestructed === true) {
    conditions.push(sql`${schema.contracts.codeSizeBytes} = 0`);
  } else if (params.selfDestructed === false) {
    conditions.push(sql`(${schema.contracts.codeSizeBytes} IS NULL OR ${schema.contracts.codeSizeBytes} > 0)`);
  }
  if (params.eraId != null && params.eraId !== "") {
    conditions.push(eq(schema.contracts.eraId, params.eraId));
  }
  if (params.year != null) {
    conditions.push(
      sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${params.year}`
    );
  }
  if (params.contractType != null && params.contractType !== "") {
    conditions.push(eq(schema.contracts.contractType, params.contractType));
  }
  if (params.codeQuery != null && params.codeQuery.trim() !== "") {
    const pattern = `%${params.codeQuery.trim()}%`;
    conditions.push(
      or(
        ilike(schema.contracts.address, pattern),
        ilike(schema.contracts.tokenName, pattern),
        ilike(schema.contracts.tokenSymbol, pattern),
        ilike(schema.contracts.etherscanContractName, pattern),
        ilike(schema.contracts.decompiledCode, pattern),
        ilike(schema.contracts.sourceCode, pattern)
      )!
    );
  }
  if (params.capabilityKeys != null && params.capabilityKeys.length > 0) {
    conditions.push(
      (() => { const keys = params.capabilityKeys!; const keyList = sql.join(keys.map((k) => sql`${k}`), sql`, `); return sql`${schema.contracts.address} IN (SELECT contract_address FROM contract_capabilities WHERE capability_key IN (${keyList}) AND status IN ('present', 'probable') GROUP BY contract_address HAVING COUNT(DISTINCT capability_key) = ${keys.length})`; })()
    );
  }
  if (params.registrar != null) {
    const addrs = Object.entries(FRONTIER_REGISTRAR_NAMES)
      .filter(([, v]) => params.registrar === "any" || v.registrar === params.registrar)
      .map(([addr]) => addr);
    if (addrs.length > 0) conditions.push(inArray(schema.contracts.address, addrs));
  }
  if (params.verification === "unverified") {
    conditions.push(
      and(
        or(isNull(schema.contracts.sourceCode), eq(schema.contracts.sourceCode, ""))!,
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "etherscan") {
    conditions.push(
      and(
        isNotNull(schema.contracts.sourceCode),
        ne(schema.contracts.sourceCode, ""),
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "proof") {
    conditions.push(isNotNull(schema.contracts.verificationMethod));
  }

  const whereClause = and(...conditions);

  if (params.sort === "most_active") {
    // Sort by total transaction count from contract_metadata
    const txCountSubquery = sql`COALESCE((
      SELECT SUM(v::bigint) FROM contract_metadata cm,
        jsonb_each_text(cm.json_value->'counts') AS t(k,v)
      WHERE cm.contract_address = ${schema.contracts.address}
        AND cm.key = 'tx_counts_by_year_external_to_v1'
    ), 0)`;
    const results = await database
      .select()
      .from(schema.contracts)
      .where(whereClause)
      .orderBy(sql`${txCountSubquery} DESC`)
      .limit(limit)
      .offset(offset);
    return enrichContractsWithRank(results.map(dbRowToContract));
  }

  const orderBy = params.sort === "newest"
    ? desc(schema.contracts.deploymentTimestamp)
    : asc(schema.contracts.deploymentTimestamp);
  const results = await database
    .select()
    .from(schema.contracts)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return enrichContractsWithRank(results.map(dbRowToContract));
}

/**
 * Get count of documented contracts (with same filters as getDocumentedContractsFromDb).
 */
export async function getDocumentedContractsCountFromDb(params: {
  eraId?: string | null;
  contractType?: string | null;
  codeQuery?: string | null;
  year?: number | null;
  capabilityKeys?: string[] | null;
  verification?: string | null;
  registrar?: RegistrarType | "any" | null;
  sort?: string | null;
  selfDestructed?: boolean | null;
}): Promise<number> {
  const database = getDb();
  const conditions: SQL[] = params.registrar != null ? [] : [
    isNotNull(schema.contracts.shortDescription),
    ne(schema.contracts.shortDescription, ""),
  ];

  // Self-destruct filter
  if (params.selfDestructed === true) {
    conditions.push(sql`${schema.contracts.codeSizeBytes} = 0`);
  } else if (params.selfDestructed === false) {
    conditions.push(sql`(${schema.contracts.codeSizeBytes} IS NULL OR ${schema.contracts.codeSizeBytes} > 0)`);
  }
  if (params.eraId != null && params.eraId !== "") {
    conditions.push(eq(schema.contracts.eraId, params.eraId));
  }
  if (params.year != null) {
    conditions.push(
      sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${params.year}`
    );
  }
  if (params.contractType != null && params.contractType !== "") {
    conditions.push(eq(schema.contracts.contractType, params.contractType));
  }
  if (params.codeQuery != null && params.codeQuery.trim() !== "") {
    const pattern = `%${params.codeQuery.trim()}%`;
    conditions.push(
      or(
        ilike(schema.contracts.address, pattern),
        ilike(schema.contracts.tokenName, pattern),
        ilike(schema.contracts.tokenSymbol, pattern),
        ilike(schema.contracts.etherscanContractName, pattern),
        ilike(schema.contracts.decompiledCode, pattern),
        ilike(schema.contracts.sourceCode, pattern)
      )!
    );
  }
  if (params.capabilityKeys != null && params.capabilityKeys.length > 0) {
    conditions.push(
      (() => { const keys = params.capabilityKeys!; const keyList = sql.join(keys.map((k) => sql`${k}`), sql`, `); return sql`${schema.contracts.address} IN (SELECT contract_address FROM contract_capabilities WHERE capability_key IN (${keyList}) AND status IN ('present', 'probable') GROUP BY contract_address HAVING COUNT(DISTINCT capability_key) = ${keys.length})`; })()
    );
  }
    if (params.registrar != null) {
    const addrs = Object.entries(FRONTIER_REGISTRAR_NAMES)
      .filter(([, v]) => params.registrar === "any" || v.registrar === params.registrar)
      .map(([addr]) => addr);
    if (addrs.length > 0) conditions.push(inArray(schema.contracts.address, addrs));
  }
  if (params.verification === "unverified") {
    conditions.push(
      and(
        or(isNull(schema.contracts.sourceCode), eq(schema.contracts.sourceCode, ""))!,
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "etherscan") {
    conditions.push(
      and(
        isNotNull(schema.contracts.sourceCode),
        ne(schema.contracts.sourceCode, ""),
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "proof") {
    conditions.push(isNotNull(schema.contracts.verificationMethod));
  }
  const whereClause = and(...conditions);
  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.contracts)
    .where(whereClause);
  return Number(result[0]?.count ?? 0);
}

/**
 * Get distinct contract types among documented contracts (has shortDescription).
 * Used to populate the Type filter on the browse page.
 */
export async function getDocumentedContractTypesFromDb(): Promise<string[]> {
  const database = getDb();
  const rows = await database
    .selectDistinct({ contractType: schema.contracts.contractType })
    .from(schema.contracts)
    .where(
      and(
        isNotNull(schema.contracts.shortDescription),
        ne(schema.contracts.shortDescription, ""),
        isNotNull(schema.contracts.contractType),
        ne(schema.contracts.contractType, "")
      )
    )
    .orderBy(asc(schema.contracts.contractType));

  return rows.map((r) => r.contractType as string).filter(Boolean);
}

/**
 * Get undocumented contracts (missing or empty shortDescription).
 * Used by the "Undocumented" filter on the browse page.
 */
export async function getUndocumentedContractsFromDb(params: {
  eraId?: string | null;
  contractType?: string | null;
  codeQuery?: string | null;
  year?: number | null;
  capabilityKeys?: string[] | null;
  verification?: string | null;
  registrar?: RegistrarType | "any" | null;
  sort?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AppContract[]> {
  const database = getDb();
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const conditions: SQL[] = [
    or(
      isNull(schema.contracts.shortDescription),
      eq(schema.contracts.shortDescription, "")
    )!,
  ];
  if (params.eraId != null && params.eraId !== "") {
    conditions.push(eq(schema.contracts.eraId, params.eraId));
  }
  if (params.year != null) {
    conditions.push(
      sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${params.year}`
    );
  }
  if (params.contractType != null && params.contractType !== "") {
    conditions.push(eq(schema.contracts.contractType, params.contractType));
  }
  if (params.codeQuery != null && params.codeQuery.trim() !== "") {
    const pattern = `%${params.codeQuery.trim()}%`;
    conditions.push(
      or(
        ilike(schema.contracts.address, pattern),
        ilike(schema.contracts.tokenName, pattern),
        ilike(schema.contracts.tokenSymbol, pattern),
        ilike(schema.contracts.etherscanContractName, pattern),
        ilike(schema.contracts.decompiledCode, pattern),
        ilike(schema.contracts.sourceCode, pattern)
      )!
    );
  }
  if (params.capabilityKeys != null && params.capabilityKeys.length > 0) {
    conditions.push(
      (() => { const keys = params.capabilityKeys!; const keyList = sql.join(keys.map((k) => sql`${k}`), sql`, `); return sql`${schema.contracts.address} IN (SELECT contract_address FROM contract_capabilities WHERE capability_key IN (${keyList}) AND status IN ('present', 'probable') GROUP BY contract_address HAVING COUNT(DISTINCT capability_key) = ${keys.length})`; })()
    );
  }
  if (params.registrar != null) {
    const addrs = Object.entries(FRONTIER_REGISTRAR_NAMES)
      .filter(([, v]) => params.registrar === "any" || v.registrar === params.registrar)
      .map(([addr]) => addr);
    if (addrs.length > 0) conditions.push(inArray(schema.contracts.address, addrs));
  }

  if (params.verification === "unverified") {
    conditions.push(
      and(
        or(isNull(schema.contracts.sourceCode), eq(schema.contracts.sourceCode, ""))!,
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "etherscan") {
    conditions.push(
      and(
        isNotNull(schema.contracts.sourceCode),
        ne(schema.contracts.sourceCode, ""),
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "proof") {
    conditions.push(isNotNull(schema.contracts.verificationMethod));
  }

  const whereClause = and(...conditions);

  if (params.sort === "most_active") {
    const txCountSubquery = sql`COALESCE((
      SELECT SUM(v::bigint) FROM contract_metadata cm,
        jsonb_each_text(cm.json_value->'counts') AS t(k,v)
      WHERE cm.contract_address = ${schema.contracts.address}
        AND cm.key = 'tx_counts_by_year_external_to_v1'
    ), 0)`;
    const results = await database
      .select()
      .from(schema.contracts)
      .where(whereClause)
      .orderBy(sql`${txCountSubquery} DESC`)
      .limit(limit)
      .offset(offset);
    return enrichContractsWithRank(results.map(dbRowToContract));
  }

  const orderBy = params.sort === "newest"
    ? desc(schema.contracts.deploymentTimestamp)
    : asc(schema.contracts.deploymentTimestamp);
  const results = await database
    .select()
    .from(schema.contracts)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return enrichContractsWithRank(results.map(dbRowToContract));
}

/**
 * Get count of undocumented contracts (matching same filters as getUndocumentedContractsFromDb).
 */
export async function getUndocumentedContractsCountFromDb(params: {
  eraId?: string | null;
  contractType?: string | null;
  codeQuery?: string | null;
  year?: number | null;
  capabilityKeys?: string[] | null;
  verification?: string | null;
  registrar?: RegistrarType | "any" | null;
  sort?: string | null;
}): Promise<number> {
  const database = getDb();
  const conditions: SQL[] = [
    or(
      isNull(schema.contracts.shortDescription),
      eq(schema.contracts.shortDescription, "")
    )!,
  ];
  if (params.eraId != null && params.eraId !== "") {
    conditions.push(eq(schema.contracts.eraId, params.eraId));
  }
  if (params.year != null) {
    conditions.push(
      sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${params.year}`
    );
  }
  if (params.contractType != null && params.contractType !== "") {
    conditions.push(eq(schema.contracts.contractType, params.contractType));
  }
  if (params.codeQuery != null && params.codeQuery.trim() !== "") {
    const pattern = `%${params.codeQuery.trim()}%`;
    conditions.push(
      or(
        ilike(schema.contracts.address, pattern),
        ilike(schema.contracts.tokenName, pattern),
        ilike(schema.contracts.tokenSymbol, pattern),
        ilike(schema.contracts.etherscanContractName, pattern),
        ilike(schema.contracts.decompiledCode, pattern),
        ilike(schema.contracts.sourceCode, pattern)
      )!
    );
  }
  if (params.capabilityKeys != null && params.capabilityKeys.length > 0) {
    conditions.push(
      (() => { const keys = params.capabilityKeys!; const keyList = sql.join(keys.map((k) => sql`${k}`), sql`, `); return sql`${schema.contracts.address} IN (SELECT contract_address FROM contract_capabilities WHERE capability_key IN (${keyList}) AND status IN ('present', 'probable') GROUP BY contract_address HAVING COUNT(DISTINCT capability_key) = ${keys.length})`; })()
    );
  }
  if (params.registrar != null) {
    const addrs = Object.entries(FRONTIER_REGISTRAR_NAMES)
      .filter(([, v]) => params.registrar === "any" || v.registrar === params.registrar)
      .map(([addr]) => addr);
    if (addrs.length > 0) conditions.push(inArray(schema.contracts.address, addrs));
  }
  if (params.verification === "unverified") {
    conditions.push(
      and(
        or(isNull(schema.contracts.sourceCode), eq(schema.contracts.sourceCode, ""))!,
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "etherscan") {
    conditions.push(
      and(
        isNotNull(schema.contracts.sourceCode),
        ne(schema.contracts.sourceCode, ""),
        isNull(schema.contracts.verificationMethod)
      )!
    );
  } else if (params.verification === "proof") {
    conditions.push(isNotNull(schema.contracts.verificationMethod));
  }
  const whereClause = and(...conditions);
  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.contracts)
    .where(whereClause);
  return Number(result[0]?.count ?? 0);
}
