/**
 * Contract queries — core CRUD and update helpers.
 */

import { eq, and, asc, desc, inArray, isNotNull, ne, sql, lt, or } from "drizzle-orm";
import * as schema from "../schema";
import crypto from "crypto";
import type {
  Contract as AppContract,
  HeuristicContractType,
  HistoricalLink,
  ContractMetadataItem,
} from "@/types";
import { ERAS } from "@/types";
import { getDb } from "./connection";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Transform database row to app Contract type
 */
export function dbRowToContract(row: schema.Contract): AppContract {
  const era = row.eraId ? ERAS[row.eraId] || null : null;

  return {
    address: row.address,
    runtimeBytecode: row.runtimeBytecode,
    runtimeBytecodeHash: row.runtimeBytecodeHash ?? null,
    creationBytecode: null,
    deployerAddress: row.deployerAddress,
    deploymentTxHash: row.deploymentTxHash,
    deploymentBlock: row.deploymentBlock,
    deploymentTimestamp: row.deploymentTimestamp?.toISOString() || null,
    deploymentTxIndex: row.deploymentTxIndex ?? null,
    deploymentTraceIndex: row.deploymentTraceIndex ?? null,
    deploymentRank: null, // populated separately via getDeploymentRank()
    deployStatus: row.deployStatus ?? null,
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
    manualCategories: Array.isArray(row.manualCategories) ? (row.manualCategories as string[]) : null,
    ensName: row.ensName ?? null,
    deployerEnsName: row.deployerEnsName ?? null,
    etherscanVerified: row.verificationMethod === "etherscan_verified",
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
    compilerLanguage: row.compilerLanguage ?? null,
    compilerCommit: row.compilerCommit ?? null,
    compilerRepo: row.compilerRepo ?? null,
    canonicalAddress: row.canonicalAddress ?? null,
    verificationMethod: row.verificationMethod ?? null,
    verificationProofUrl: row.verificationProofUrl ?? null,
    verificationNotes: row.verificationNotes ?? null,
    verificationStatus: row.sourceCode
      ? "verified"
      : row.decompilationSuccess
      ? "decompiled"
      : "bytecode_only",
  };
}

// =============================================================================
// Queries
// =============================================================================

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

  if (patch.runtimeBytecode !== undefined) {
    updates.runtimeBytecode = patch.runtimeBytecode;
    // Compute bytecode hash for fast family lookups
    if (patch.runtimeBytecode) {
      updates.runtimeBytecodeHash = crypto.createHash("md5").update(patch.runtimeBytecode).digest("hex");
    } else {
      updates.runtimeBytecodeHash = null;
    }
  }
  if (patch.codeSizeBytes !== undefined) updates.codeSizeBytes = patch.codeSizeBytes;

  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
}

/**
 * Update decompiled code fields for a contract (idempotent).
 * Used to cache on-the-fly decompilation results.
 */
export async function updateContractDecompiledCodeFromDb(
  address: string,
  patch: {
    decompiledCode: string;
    decompilationSuccess: boolean;
  }
): Promise<void> {
  const database = getDb();

  await database
    .update(schema.contracts)
    .set({
      decompiledCode: patch.decompiledCode,
      decompilationSuccess: patch.decompilationSuccess,
      updatedAt: new Date(),
    })
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
    compilerLanguage?: string | null;
    compilerCommit?: string | null;
    verificationMethod?: string | null;
    verificationProofUrl?: string | null;
    verificationNotes?: string | null;
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
  if (patch.compilerLanguage !== undefined) updates.compilerLanguage = patch.compilerLanguage;
  if (patch.compilerCommit !== undefined) updates.compilerCommit = patch.compilerCommit;
  if (patch.verificationMethod !== undefined) updates.verificationMethod = patch.verificationMethod;
  if (patch.verificationProofUrl !== undefined) updates.verificationProofUrl = patch.verificationProofUrl;
  if (patch.verificationNotes !== undefined) updates.verificationNotes = patch.verificationNotes;

  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
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
 * Get addresses of contracts marked as featured (for homepage).
 */
export async function getFeaturedAddressesFromDb(): Promise<string[]> {
  const database = getDb();
  const rows = await database
    .select({ address: schema.contracts.address })
    .from(schema.contracts)
    .where(eq(schema.contracts.featured, true));
  return rows.map((r) => r.address);
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

/**
 * Update ENS names for a contract (persist after reverse resolution).
 */
export async function updateContractEnsNamesFromDb(
  address: string,
  patch: { ensName?: string | null; deployerEnsName?: string | null }
): Promise<void> {
  const database = getDb();
  const normalized = address.toLowerCase();
  const updates: Partial<schema.NewContract> = { updatedAt: new Date() };
  if (patch.ensName !== undefined) updates.ensName = patch.ensName;
  if (patch.deployerEnsName !== undefined) updates.deployerEnsName = patch.deployerEnsName;
  if (patch.ensName === undefined && patch.deployerEnsName === undefined) return;
  await database.update(schema.contracts).set(updates).where(eq(schema.contracts.address, normalized));
}

export async function updateContractTokenLogoFromDb(
  address: string,
  tokenLogo: string | null
): Promise<void> {
  await updateContractTokenMetadataFromDb(address, { tokenLogo });
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

/**
 * Get all contract addresses for sitemap generation
 */
export async function getAllContractAddressesForSitemap(): Promise<
  Array<{ address: string; updatedAt: Date | null; featured: boolean | null }>
> {
  const database = getDb();
  return database
    .select({
      address: schema.contracts.address,
      updatedAt: schema.contracts.updatedAt,
      featured: schema.contracts.featured,
    })
    .from(schema.contracts)
    .where(isNotNull(schema.contracts.shortDescription));
}

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

// =============================================================================
// Deployment Rank
// =============================================================================

export interface DeploymentRankResult {
  rank: number;
  ogSnippet: string | null;
  rankTag: string;
}

/**
 * Compute global deployment rank for a contract.
 * Never stored — always derived from (block, tx_index, trace_index).
 * Fixing one contract's ordering data auto-corrects all downstream ranks.
 *
 * Returns null if ordering columns haven't been backfilled yet.
 */
export async function getDeploymentRank(
  address: string
): Promise<DeploymentRankResult | null> {
  const database = getDb();
  const rows = await database
    .select({
      deploymentBlock: schema.contracts.deploymentBlock,
      deploymentTxIndex: schema.contracts.deploymentTxIndex,
      deploymentTraceIndex: schema.contracts.deploymentTraceIndex,
    })
    .from(schema.contracts)
    .where(eq(schema.contracts.address, address.toLowerCase()))
    .limit(1);

  const row = rows[0];
  if (!row || row.deploymentTxIndex === null || row.deploymentBlock === null) return null;

  // Don't rank failed/empty deploys
  const codeCheck = await database
    .select({ codeSizeBytes: schema.contracts.codeSizeBytes, runtimeBytecode: schema.contracts.runtimeBytecode })
    .from(schema.contracts)
    .where(eq(schema.contracts.address, address.toLowerCase()))
    .limit(1);
  const code = codeCheck[0];
  if (!code || !code.codeSizeBytes || code.codeSizeBytes === 0) return null;
  if (!code.runtimeBytecode || code.runtimeBytecode === '0x' || code.runtimeBytecode === '') return null;

  const { deploymentBlock: block, deploymentTxIndex: txIdx, deploymentTraceIndex: traceIdx } = row;

  // Count contracts strictly deployed before this one.
  // Exclude empty-code entries (failed deploys or bad seed data) from rank count.
  const result = await database.execute<{ count: string }>(sql`
    SELECT COUNT(*)::int AS count FROM contracts
    WHERE
      code_size_bytes > 0
      AND runtime_bytecode IS NOT NULL
      AND runtime_bytecode NOT IN ('0x', '')
      AND (
        deployment_block < ${block}
        OR (deployment_block = ${block} AND deployment_tx_index < ${txIdx})
        OR (
          deployment_block = ${block}
          AND deployment_tx_index = ${txIdx}
          AND deployment_trace_index IS NOT NULL
          AND deployment_trace_index < ${traceIdx ?? 0}
        )
      )
  `);

  const rank = Number((result as any)[0]?.count ?? 0) + 1;

  return {
    rank,
    ogSnippet: buildOgSnippet(rank),
    rankTag: formatRankTag(rank),
  };
}

/** Tiered social copy — returns null above 1M (too noisy for OG) */
export function buildOgSnippet(rank: number): string | null {
  if (rank <= 1_000)     return `One of Ethereum's first 1,000 contracts ever deployed`;
  if (rank <= 10_000)    return `One of Ethereum's first 10,000 contracts`;
  if (rank <= 100_000)   return `Deployed when Ethereum had fewer than 100,000 contracts`;
  if (rank <= 1_000_000) return `One of Ethereum's first million contracts`;
  return null;
}

/** Short form for card tag chips */
export function formatRankTag(rank: number): string {
  if (rank <= 9_999)   return `#${rank.toLocaleString()}`;
  if (rank <= 999_999) return `#${Math.floor(rank / 1000)}K`;
  return `#${(rank / 1_000_000).toFixed(1)}M`;
}

// =============================================================================
// Batch Rank Enrichment (for list pages — one query for all cards)
// =============================================================================

/**
 * Enrich an array of contracts with their deployment ranks in a single query.
 * Uses a correlated subquery — one DB round-trip regardless of list size.
 * Contracts without tx_index or with empty bytecode get rank = null.
 */
export async function enrichContractsWithRank(
  contractList: AppContract[]
): Promise<AppContract[]> {
  if (contractList.length === 0) return contractList;

  try {
    const database = getDb();
    const addresses = contractList
      .filter(c => c.deploymentTxIndex !== null && c.codeSizeBytes && c.codeSizeBytes > 0)
      .map(c => c.address);

    if (addresses.length === 0) return contractList;

    // Single query: compute rank for each address via correlated COUNT subquery
    // Use explicit cast to avoid Drizzle ANY() issues
    const addrList = addresses.map(a => `'${a}'`).join(",");
    const rows = await database.execute(sql.raw(`
      SELECT
        c1.address,
        (
          SELECT COUNT(*)::int FROM contracts c2
          WHERE
            c2.code_size_bytes > 0
            AND c2.runtime_bytecode IS NOT NULL
            AND c2.runtime_bytecode NOT IN ('0x', '')
            AND c2.deployment_tx_index IS NOT NULL
            AND (
              c2.deployment_block < c1.deployment_block
              OR (c2.deployment_block = c1.deployment_block AND c2.deployment_tx_index < c1.deployment_tx_index)
            )
        ) + 1 AS rank
      FROM contracts c1
      WHERE c1.address IN (${addrList})
    `));

    const rankMap = new Map<string, number>();
    for (const row of rows as any[]) {
      rankMap.set(row.address, Number(row.rank));
    }

    return contractList.map(c => {
      const rank = rankMap.get(c.address) ?? null;
      return rank !== null ? { ...c, deploymentRank: rank } : c;
    });
  } catch (err) {
    // Rank enrichment is non-critical — never crash a listing page over it
    console.warn("[enrichContractsWithRank] failed, returning without ranks:", err);
    return contractList;
  }
}
