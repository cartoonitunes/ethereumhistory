/**
 * ABI resolution and verified contracts.
 */

import { eq, and, ne, inArray, isNotNull, asc, sql } from "drizzle-orm";
import * as schema from "../schema";
import type { Contract as AppContract } from "@/types";
import { getDb } from "./connection";
import { dbRowToContract } from "./contracts";

// =============================================================================
// ABI Resolution
// =============================================================================

export type AbiResult = {
  abi: string;
  source: "direct" | "sibling";
  siblingAddress?: string;
} | null;

/**
 * Resolve the ABI for a given contract address.
 * 1. If the contract itself is verified and has an ABI, return it directly.
 * 2. If not, look for a sibling with the same runtime_bytecode_hash that is verified and has an ABI.
 */
export async function getContractAbiFromDb(address: string): Promise<AbiResult> {
  const database = getDb();
  const normalizedAddress = address.toLowerCase();

  // Step 1: Check if the contract itself is directly verified with an ABI
  const directRows = await database
    .select({
      abi: schema.contracts.abi,
      verificationMethod: schema.contracts.verificationMethod,
      runtimeBytecodeHash: schema.contracts.runtimeBytecodeHash,
    })
    .from(schema.contracts)
    .where(eq(schema.contracts.address, normalizedAddress))
    .limit(1);

  const direct = directRows[0];
  if (!direct) return null;

  const isDirectVerified =
    direct.verificationMethod === "exact_bytecode_match" ||
    direct.verificationMethod === "etherscan_verified" ||
    direct.verificationMethod === "source_reconstructed" ||
    direct.verificationMethod === "author_published";

  if (isDirectVerified && direct.abi) {
    return { abi: direct.abi, source: "direct" };
  }

  // Step 2: Look for a sibling with matching runtime_bytecode_hash that has an ABI
  if (direct.runtimeBytecodeHash) {
    const siblingRows = await database
      .select({
        address: schema.contracts.address,
        abi: schema.contracts.abi,
      })
      .from(schema.contracts)
      .where(
        and(
          eq(schema.contracts.runtimeBytecodeHash, direct.runtimeBytecodeHash),
          ne(schema.contracts.address, normalizedAddress),
          inArray(schema.contracts.verificationMethod, [
            "exact_bytecode_match",
            "etherscan_verified",
            "source_reconstructed",
            "author_published",
          ]),
          isNotNull(schema.contracts.abi)
        )
      )
      .limit(1);

    const sibling = siblingRows[0];
    if (sibling?.abi) {
      return {
        abi: sibling.abi,
        source: "sibling",
        siblingAddress: sibling.address,
      };
    }
  }

  return null;
}

// =============================================================================
// Verified Contracts
// =============================================================================

export async function getVerifiedContractsFromDb(): Promise<AppContract[]> {
  const database = getDb();

  // Step 1: Get one address per unique bytecode (earliest documented+verified deployment).
  // Using a subquery so we can join back through Drizzle ORM and get properly typed rows.
  const dedupedAddresses = await database.execute(sql`
    SELECT DISTINCT ON (COALESCE(runtime_bytecode_hash, address)) address
    FROM contracts
    WHERE verification_method IN ('exact_bytecode_match', 'author_published_source', 'near_exact_match', 'source_reconstructed', 'author_published')
      AND source_code IS NOT NULL
    ORDER BY COALESCE(runtime_bytecode_hash, address), deployment_timestamp ASC NULLS LAST
  `);

  const addresses = (dedupedAddresses as unknown as Array<{ address: string }>).map((r) => r.address);
  if (addresses.length === 0) return [];

  // Step 2: Fetch full rows via Drizzle ORM so dbRowToContract gets properly mapped fields.
  const results = await database
    .select()
    .from(schema.contracts)
    .where(inArray(schema.contracts.address, addresses))
    .orderBy(asc(schema.contracts.deploymentTimestamp));

  // Deduplicate by bytecode hash: only keep the earliest deploy per bytecode family.
  // Results are already ordered by deploymentTimestamp asc, so the first seen is the earliest.
  // Contracts without a hash are always included individually.
  const seenHashes = new Set<string>();
  const deduped = results.filter((row) => {
    const hash = row.runtimeBytecodeHash;
    if (!hash) return true;
    if (seenHashes.has(hash)) return false;
    seenHashes.add(hash);
    return true;
  });

  return deduped.map(dbRowToContract);
}

// =============================================================================
// Sibling Counts
// =============================================================================

/**
 * Returns a map of address -> sibling count for contracts that share the same runtime_bytecode_hash.
 * Used by the /proofs page to show "×N" badges.
 */
export async function getSiblingCountsForAddresses(
  addresses: string[]
): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};
  const database = getDb();

  // Get bytecode hashes for the given addresses (prefer deployed, fall back to runtime)
  const hashRows = await database
    .select({
      address: schema.contracts.address,
      deployedBytecodeHash: schema.contracts.deployedBytecodeHash,
      runtimeBytecodeHash: schema.contracts.runtimeBytecodeHash,
    })
    .from(schema.contracts)
    .where(inArray(schema.contracts.address, addresses));

  const hashToAddresses: Record<string, string[]> = {};
  for (const row of hashRows) {
    const hash = row.deployedBytecodeHash ?? row.runtimeBytecodeHash;
    if (!hash) continue;
    if (!hashToAddresses[hash]) {
      hashToAddresses[hash] = [];
    }
    hashToAddresses[hash].push(row.address);
  }

  const uniqueHashes = Object.keys(hashToAddresses);
  if (uniqueHashes.length === 0) return {};

  // Count contracts per hash using deployed_bytecode_hash (with fallback via COALESCE)
  const countRows = await database
    .select({
      hash: sql<string>`COALESCE(deployed_bytecode_hash, runtime_bytecode_hash)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.contracts)
    .where(sql`COALESCE(deployed_bytecode_hash, runtime_bytecode_hash) IN (${sql.join(uniqueHashes.map(h => sql`${h}`), sql`, `)})`)
    .groupBy(sql`COALESCE(deployed_bytecode_hash, runtime_bytecode_hash)`);

  const hashToTotal: Record<string, number> = {};
  for (const row of countRows) {
    if (row.hash) {
      hashToTotal[row.hash] = row.count;
    }
  }

  // Build address -> sibling count (total minus 1 = siblings)
  const result: Record<string, number> = {};
  for (const row of hashRows) {
    const hash = row.deployedBytecodeHash ?? row.runtimeBytecodeHash;
    if (!hash) continue;
    const total = hashToTotal[hash] ?? 1;
    result[row.address] = total - 1; // siblings = total minus self
  }
  return result;
}
