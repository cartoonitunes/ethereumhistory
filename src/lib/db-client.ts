/**
 * Database Client for Ethereum History
 *
 * Uses Drizzle ORM (postgres-js) for all environments.
 */

import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, like, ilike, desc, asc, and, SQL, sql, inArray, isNotNull, ne } from "drizzle-orm";
import * as schema from "./schema";
import type {
  Contract as AppContract,
  ContractSimilarity,
  HeuristicContractType,
  HistoricalLink,
  ContractMetadataItem,
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

function getDb() {
  if (!db) {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error("POSTGRES_URL (or DATABASE_URL) not configured");
    }

    // In serverless, keep pool tiny to avoid connection explosion
    const client = postgres(dbUrl, { max: 1 });
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
