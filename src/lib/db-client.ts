/**
 * Database Client for Ethereum History
 *
 * Uses Drizzle ORM (postgres-js) for all environments.
 */

import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, like, ilike, desc, asc, and, or, SQL, sql, inArray, isNotNull, ne } from "drizzle-orm";
import * as schema from "./schema";
import type {
  Contract as AppContract,
  ContractSimilarity,
  HeuristicContractType,
  HistoricalLink,
  ContractMetadataItem,
  UnifiedSearchResult,
  UnifiedMatchType,
  Person as AppPerson,
  HistorianMe,
} from "@/types";
import { ERAS } from "@/types";

// =============================================================================
// Database Connection
// =============================================================================

// Create drizzle instance (singleton per runtime instance)
let db: ReturnType<typeof drizzlePostgres<typeof schema>> | null = null;

function getDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

function isPoolerUrl(dbUrl: string): boolean {
  try {
    const host = new URL(dbUrl).hostname;
    return host.includes("pooler");
  } catch {
    return dbUrl.includes("pooler");
  }
}

function getDb() {
  if (!db) {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error("POSTGRES_URL (or DATABASE_URL) not configured");
    }

    // In serverless, keep pool tiny to avoid connection explosion
    // For Neon pooler/pgbouncer, disable prepared statements.
    const client = postgres(dbUrl, { max: 1, prepare: !isPoolerUrl(dbUrl) });
    db = drizzlePostgres(client, { schema });
  }
  return db;
}

/**
 * Check if database is configured and available
 */
export function isDatabaseConfigured(): boolean {
  return !!getDatabaseUrl();
}

// =============================================================================
// Contract Queries
// =============================================================================

/**
 * Transform database row to app Contract type
 */
function dbRowToContract(row: schema.Contract): AppContract {
  const era = row.eraId ? ERAS[row.eraId] || null : null;

  return {
    address: row.address,
    runtimeBytecode: row.runtimeBytecode,
    creationBytecode: null,
    deployerAddress: row.deployerAddress,
    deploymentTxHash: row.deploymentTxHash,
    deploymentBlock: row.deploymentBlock,
    deploymentTimestamp: row.deploymentTimestamp?.toISOString() || null,
    decompiledCode: row.decompiledCode,
    decompilationSuccess: row.decompilationSuccess || false,
    currentBalanceWei: null,
    transactionCount: null,
    lastStateUpdate: null,
    gasUsed: row.gasUsed,
    gasPrice: row.gasPrice,
    codeSizeBytes: row.codeSizeBytes,
    eraId: row.eraId,
    era,
    heuristics: {
      contractType: (row.contractType as HeuristicContractType) || null,
      confidence: row.confidence || 0.5,
      isProxy: row.isProxy || false,
      hasSelfDestruct: row.hasSelfDestruct || false,
      isErc20Like: row.isErc20Like || false,
      notes: null,
    },
    ensName: null,
    etherscanVerified: !!row.sourceCode,
    etherscanContractName: row.etherscanContractName,
    sourceCode: row.sourceCode,
    abi: row.abi,
    compilerVersion: null,
    tokenName: row.tokenName,
    tokenSymbol: row.tokenSymbol,
    tokenDecimals: row.tokenDecimals,
    tokenLogo: row.tokenLogo,
    tokenTotalSupply: null,
    shortDescription: row.shortDescription,
    description: row.description,
    historicalSummary: row.historicalSummary,
    historicalSignificance: row.historicalSignificance,
    historicalContext: row.historicalContext,
    verificationStatus: row.sourceCode
      ? "verified"
      : row.decompilationSuccess
      ? "decompiled"
      : "bytecode_only",
  };
}

/**
 * Get a single contract by address
 */
export async function getContractByAddress(
  address: string
): Promise<AppContract | null> {
  const database = getDb();
  const result = await database
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.address, address.toLowerCase()))
    .limit(1);

  return result.length > 0 ? dbRowToContract(result[0]) : null;
}

/**
 * Update token metadata fields for a contract (idempotent).
 * Useful for filling in missing DB fields using RPC lookups.
 */
export async function updateContractTokenMetadataFromDb(
  address: string,
  patch: {
    tokenName?: string | null;
    tokenSymbol?: string | null;
    tokenDecimals?: number | null;
    tokenLogo?: string | null;
  }
): Promise<void> {
  const database = getDb();

  const updates: Partial<schema.NewContract> = {
    updatedAt: new Date(),
  };

  if (patch.tokenName !== undefined) updates.tokenName = patch.tokenName;
  if (patch.tokenSymbol !== undefined) updates.tokenSymbol = patch.tokenSymbol;
  if (patch.tokenDecimals !== undefined) updates.tokenDecimals = patch.tokenDecimals;
  if (patch.tokenLogo !== undefined) updates.tokenLogo = patch.tokenLogo;

  // Nothing to update besides updatedAt
  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
}

/**
 * Update runtime bytecode fields for a contract (idempotent).
 * Useful for filling in missing DB fields using RPC `eth_getCode`.
 */
export async function updateContractRuntimeBytecodeFromDb(
  address: string,
  patch: {
    runtimeBytecode?: string | null;
    codeSizeBytes?: number | null;
  }
): Promise<void> {
  const database = getDb();

  const updates: Partial<schema.NewContract> = {
    updatedAt: new Date(),
  };

  if (patch.runtimeBytecode !== undefined) updates.runtimeBytecode = patch.runtimeBytecode;
  if (patch.codeSizeBytes !== undefined) updates.codeSizeBytes = patch.codeSizeBytes;

  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
}

/**
 * Update optional Etherscan-enriched fields for a contract (idempotent).
 */
export async function updateContractEtherscanEnrichmentFromDb(
  address: string,
  patch: {
    deployerAddress?: string | null;
    deploymentTxHash?: string | null;
    deploymentBlock?: number | null;
    deploymentTimestamp?: Date | null;
    etherscanContractName?: string | null;
    abi?: string | null;
    sourceCode?: string | null;
  }
): Promise<void> {
  const database = getDb();

  const updates: Partial<schema.NewContract> = {
    updatedAt: new Date(),
  };

  if (patch.deployerAddress !== undefined) updates.deployerAddress = patch.deployerAddress;
  if (patch.deploymentTxHash !== undefined) updates.deploymentTxHash = patch.deploymentTxHash;
  if (patch.deploymentBlock !== undefined) updates.deploymentBlock = patch.deploymentBlock;
  if (patch.deploymentTimestamp !== undefined) updates.deploymentTimestamp = patch.deploymentTimestamp;
  if (patch.etherscanContractName !== undefined) updates.etherscanContractName = patch.etherscanContractName;
  if (patch.abi !== undefined) updates.abi = patch.abi;
  if (patch.sourceCode !== undefined) updates.sourceCode = patch.sourceCode;

  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
}

// =============================================================================
// People
// =============================================================================

function dbRowToPerson(row: schema.Person): AppPerson {
  return {
    address: row.address,
    name: row.name,
    slug: row.slug,
    role: row.role,
    shortBio: row.shortBio,
    bio: row.bio,
    highlights: (row.highlights as unknown as string[] | null) ?? null,
    websiteUrl: row.websiteUrl,
    wallets: [],
  };
}

async function getWalletsForPersonFromDb(personAddress: string): Promise<Array<{ address: string; label: string | null }>> {
  const database = getDb();
  const rows = await database
    .select({ address: schema.peopleWallets.address, label: schema.peopleWallets.label })
    .from(schema.peopleWallets)
    .where(eq(schema.peopleWallets.personAddress, personAddress.toLowerCase()))
    .orderBy(asc(schema.peopleWallets.label), asc(schema.peopleWallets.address));
  return rows.map((r) => ({ address: r.address, label: r.label }));
}

export async function getPersonByAddressFromDb(address: string): Promise<AppPerson | null> {
  const database = getDb();
  const normalized = address.toLowerCase();

  // 1) Primary address match
  const direct = await database
    .select()
    .from(schema.people)
    .where(eq(schema.people.address, normalized))
    .limit(1);
  if (direct[0]) {
    const person = dbRowToPerson(direct[0]);
    person.wallets = await getWalletsForPersonFromDb(person.address);
    return person;
  }

  // 2) Secondary wallet match
  const joined = await database
    .select({ person: schema.people })
    .from(schema.peopleWallets)
    .innerJoin(schema.people, eq(schema.peopleWallets.personAddress, schema.people.address))
    .where(eq(schema.peopleWallets.address, normalized))
    .limit(1);

  if (!joined[0]?.person) return null;
  const person = dbRowToPerson(joined[0].person);
  person.wallets = await getWalletsForPersonFromDb(person.address);
  return person;
}

export async function getPersonBySlugFromDb(slug: string): Promise<AppPerson | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.people)
    .where(eq(schema.people.slug, slug))
    .limit(1);
  if (!rows[0]) return null;
  const person = dbRowToPerson(rows[0]);
  person.wallets = await getWalletsForPersonFromDb(person.address);
  return person;
}

export async function searchPeopleFromDb(
  query: string,
  limit = 50
): Promise<UnifiedSearchResult[]> {
  const database = getDb();
  const q = query.trim();
  const pattern = `%${q}%`;

  // Match by name/role/bio, or any wallet address partial match.
  const rows = await database
    .select({
      address: schema.people.address,
      name: schema.people.name,
      slug: schema.people.slug,
      role: schema.people.role,
      shortBio: schema.people.shortBio,
      websiteUrl: schema.people.websiteUrl,
      walletAddress: schema.peopleWallets.address,
    })
    .from(schema.people)
    .leftJoin(schema.peopleWallets, eq(schema.peopleWallets.personAddress, schema.people.address))
    .where(
      or(
        ilike(schema.people.name, pattern),
        ilike(schema.people.role, pattern),
        ilike(schema.people.shortBio, pattern),
        ilike(schema.people.bio, pattern),
        ilike(schema.people.websiteUrl, pattern),
        ilike(schema.peopleWallets.address, pattern),
        ilike(schema.people.slug, pattern)
      )
    )
    .limit(limit);

  // De-dupe by person address (left join can create duplicates).
  const map = new Map<string, UnifiedSearchResult>();
  for (const r of rows) {
    const key = r.address.toLowerCase();
    if (map.has(key)) continue;

    const matchType: UnifiedSearchResult["matchType"] =
      r.walletAddress && r.walletAddress.toLowerCase().includes(q.toLowerCase())
        ? "person_wallet"
        : "person_name";

    map.set(key, {
      entityType: "person",
      address: r.address,
      title: r.name,
      subtitle: r.role || r.shortBio || null,
      matchType,
      matchSnippet: r.websiteUrl || null,
      deploymentTimestamp: null,
      eraId: null,
      heuristicContractType: null,
      verificationStatus: null,
      personSlug: r.slug,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Get contracts by era with pagination
 */
export async function getContractsByEra(
  eraId: string,
  limit = 50,
  offset = 0
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.eraId, eraId))
    .orderBy(asc(schema.contracts.deploymentTimestamp))
    .limit(limit)
    .offset(offset);

  return results.map(dbRowToContract);
}

/**
 * Fetch a specific set of contracts by address.
 * Returned array preserves the order of the input addresses.
 */
export async function getContractsByAddressesFromDb(
  addresses: string[]
): Promise<AppContract[]> {
  const normalized = addresses.map((a) => a.toLowerCase());
  const database = getDb();

  if (normalized.length === 0) return [];

  const results = await database
    .select()
    .from(schema.contracts)
    .where(inArray(schema.contracts.address, normalized));

  const map = new Map(results.map((r) => [r.address.toLowerCase(), r]));
  return normalized
    .map((a) => map.get(a))
    .filter((r): r is schema.Contract => !!r)
    .map(dbRowToContract);
}

export async function getHistoricalLinksForContractFromDb(
  address: string,
  limit = 50
): Promise<HistoricalLink[]> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.historicalLinks)
    .where(eq(schema.historicalLinks.contractAddress, address.toLowerCase()))
    .orderBy(desc(schema.historicalLinks.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    contractAddress: r.contractAddress,
    title: r.title,
    url: r.url,
    source: r.source,
    note: r.note,
    createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

// =============================================================================
// Historians (auth)
// =============================================================================

export async function getHistorianByEmailFromDb(email: string): Promise<schema.Historian | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.historians)
    // Be forgiving: historically some rows may have mixed-case or whitespace.
    .where(sql`lower(trim(${schema.historians.email})) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return rows[0] || null;
}

export async function getHistorianByIdFromDb(id: number): Promise<schema.Historian | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.historians)
    .where(eq(schema.historians.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function createHistorianFromDb(params: {
  email: string;
  name: string;
  tokenHash: string;
}): Promise<void> {
  const database = getDb();
  await database.insert(schema.historians).values({
    email: params.email.trim().toLowerCase(),
    name: params.name,
    tokenHash: params.tokenHash,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export function historianRowToMe(row: schema.Historian): HistorianMe {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    active: row.active ?? true,
  };
}

// =============================================================================
// History editing helpers
// =============================================================================

export async function updateContractHistoryFieldsFromDb(
  address: string,
  patch: {
    etherscanContractName?: string | null;
    tokenName?: string | null;
    contractType?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    historicalSummary?: string | null;
    historicalSignificance?: string | null;
    historicalContext?: string | null;
  }
): Promise<void> {
  const database = getDb();
  const updates: Partial<schema.NewContract> = { updatedAt: new Date() };
  if (patch.etherscanContractName !== undefined)
    updates.etherscanContractName = patch.etherscanContractName;
  if (patch.tokenName !== undefined) updates.tokenName = patch.tokenName;
  if (patch.contractType !== undefined) updates.contractType = patch.contractType;
  if (patch.shortDescription !== undefined) updates.shortDescription = patch.shortDescription;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.historicalSummary !== undefined) updates.historicalSummary = patch.historicalSummary;
  if (patch.historicalSignificance !== undefined) updates.historicalSignificance = patch.historicalSignificance;
  if (patch.historicalContext !== undefined) updates.historicalContext = patch.historicalContext;
  if (Object.keys(updates).length <= 1) return;
  await database.update(schema.contracts).set(updates).where(eq(schema.contracts.address, address.toLowerCase()));
}

export async function upsertHistoricalLinkFromDb(params: {
  id?: number | null;
  contractAddress: string;
  title: string | null;
  url: string;
  source: string | null;
  note: string | null;
  historianId: number;
}): Promise<void> {
  const database = getDb();
  const normalized = params.contractAddress.toLowerCase();

  if (params.id) {
    await database
      .update(schema.historicalLinks)
      .set({
        title: params.title,
        url: params.url,
        source: params.source,
        note: params.note,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(schema.historicalLinks.id, params.id), eq(schema.historicalLinks.contractAddress, normalized)));
    return;
  }

  await database.insert(schema.historicalLinks).values({
    contractAddress: normalized,
    title: params.title,
    url: params.url,
    source: params.source,
    note: params.note,
    createdBy: params.historianId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
}

export async function updateContractTokenLogoFromDb(
  address: string,
  tokenLogo: string | null
): Promise<void> {
  await updateContractTokenMetadataFromDb(address, { tokenLogo });
}

export async function deleteHistoricalLinksFromDb(params: {
  contractAddress: string;
  ids: number[];
}): Promise<void> {
  const database = getDb();
  const normalized = params.contractAddress.toLowerCase();
  if (!params.ids.length) return;
  await database
    .delete(schema.historicalLinks)
    .where(and(eq(schema.historicalLinks.contractAddress, normalized), inArray(schema.historicalLinks.id, params.ids)));
}

export async function getContractMetadataFromDb(
  address: string,
  limit = 200
): Promise<ContractMetadataItem[]> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.contractMetadata)
    .where(eq(schema.contractMetadata.contractAddress, address.toLowerCase()))
    .orderBy(asc(schema.contractMetadata.key), desc(schema.contractMetadata.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    contractAddress: r.contractAddress,
    key: r.key,
    value: r.value,
    jsonValue: (r.jsonValue as unknown) ?? null,
    sourceUrl: r.sourceUrl,
    createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

export async function getContractMetadataJsonValueByKeyFromDb(
  address: string,
  key: string
): Promise<unknown | null> {
  const database = getDb();
  const rows = await database
    .select({ jsonValue: schema.contractMetadata.jsonValue })
    .from(schema.contractMetadata)
    .where(
      and(
        eq(schema.contractMetadata.contractAddress, address.toLowerCase()),
        eq(schema.contractMetadata.key, key)
      )
    )
    .orderBy(desc(schema.contractMetadata.createdAt))
    .limit(1);

  return (rows[0]?.jsonValue as unknown) ?? null;
}

export async function setContractMetadataJsonValueByKeyFromDb(
  address: string,
  key: string,
  jsonValue: unknown,
  sourceUrl: string | null = null
): Promise<void> {
  const database = getDb();
  const normalized = address.toLowerCase();

  // Ensure we only keep one row per (contract, key)
  await database
    .delete(schema.contractMetadata)
    .where(
      and(
        eq(schema.contractMetadata.contractAddress, normalized),
        eq(schema.contractMetadata.key, key)
      )
    );

  await database.insert(schema.contractMetadata).values({
    contractAddress: normalized,
    key,
    value: null,
    jsonValue: jsonValue as any,
    sourceUrl,
    createdAt: new Date(),
  });
}

/**
 * Get most recently deployed contracts
 */
export async function getRecentContractsFromDb(
  limit = 10
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .orderBy(desc(schema.contracts.deploymentTimestamp))
    .limit(limit);

  return results.map(dbRowToContract);
}

/**
 * Get contracts by deployer address
 */
export async function getContractsByDeployerFromDb(
  deployerAddress: string,
  limit = 200
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.deployerAddress, deployerAddress.toLowerCase()))
    .orderBy(desc(schema.contracts.deploymentTimestamp))
    .limit(limit);

  return results.map(dbRowToContract);
}

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

/**
 * Get total contract count
 */
export async function getTotalContractCount(): Promise<number> {
  const database = getDb();
  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.contracts);
  return Number(result[0]?.count ?? 0);
}

/**
 * Get decompiled contract count
 */
export async function getDecompiledContractCount(): Promise<number> {
  const database = getDb();
  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.contracts)
    .where(eq(schema.contracts.decompilationSuccess, true));
  return Number(result[0]?.count ?? 0);
}

/**
 * Get featured contracts (oldest with successful decompilation and known type)
 */
export async function getFeaturedContracts(
  limit = 6
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(
      and(
        eq(schema.contracts.decompilationSuccess, true),
        isNotNull(schema.contracts.contractType),
        ne(schema.contracts.contractType, "unknown")
      )
    )
    .orderBy(asc(schema.contracts.deploymentTimestamp))
    .limit(limit);

  return results.map(dbRowToContract);
}

// =============================================================================
// Similarity Queries
// =============================================================================

/**
 * Get similar contracts from pre-computed index
 */
export async function getSimilarContractsFromDb(
  address: string,
  limit = 10
): Promise<ContractSimilarity[]> {
  const database = getDb();

  const results = await database
    .select()
    .from(schema.similarityIndex)
    .where(eq(schema.similarityIndex.contractAddress, address.toLowerCase()))
    .orderBy(desc(schema.similarityIndex.similarityScore))
    .limit(limit);

  // Get matched contract details
  const matchedAddresses = results.map((r) => r.matchedAddress);
  const matchedContracts =
    matchedAddresses.length > 0
      ? await database
          .select()
          .from(schema.contracts)
          .where(inArray(schema.contracts.address, matchedAddresses))
      : [];

  const contractMap = new Map(matchedContracts.map((c) => [c.address, c]));

  return results.map((row) => {
    const matched = contractMap.get(row.matchedAddress);
    return {
      contractAddress: row.contractAddress,
      matchedAddress: row.matchedAddress,
      similarityScore: row.similarityScore,
      ngramSimilarity: row.ngramSimilarity || 0,
      controlFlowSimilarity: row.controlFlowSimilarity || 0,
      shapeSimilarity: row.shapeSimilarity || 0,
      similarityType: (row.similarityType ||
        "weak") as ContractSimilarity["similarityType"],
      confidenceScore: Math.round(row.similarityScore * 100),
      explanation: row.explanation || "",
      sharedPatterns: row.sharedPatterns
        ? JSON.parse(row.sharedPatterns)
        : [],
      matchedContract: matched
        ? {
            deploymentTimestamp:
              matched.deploymentTimestamp?.toISOString() || null,
            deployerAddress: matched.deployerAddress,
            heuristicContractType:
              (matched.contractType as HeuristicContractType) || null,
            eraId: matched.eraId,
          }
        : undefined,
    };
  });
}

// =============================================================================
// Batch Operations (for imports)
// =============================================================================

/**
 * Insert contracts in batches
 */
export async function insertContracts(
  contracts: schema.NewContract[]
): Promise<void> {
  const database = getDb();
  const batchSize = 100;

  for (let i = 0; i < contracts.length; i += batchSize) {
    const batch = contracts.slice(i, i + batchSize);
    await database.insert(schema.contracts).values(batch).onConflictDoNothing();
  }
}

/**
 * Insert a single contract row if missing (no updates on conflict).
 */
export async function insertContractIfMissing(
  contract: schema.NewContract
): Promise<void> {
  const database = getDb();
  await database.insert(schema.contracts).values(contract).onConflictDoNothing();
}

/**
 * Insert similarity records in batches
 */
export async function insertSimilarityRecords(
  records: schema.NewSimilarityRecord[]
): Promise<void> {
  const database = getDb();
  const batchSize = 100;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await database
      .insert(schema.similarityIndex)
      .values(batch)
      .onConflictDoNothing();
  }
}
