/**
 * Similarity index queries.
 */

import { eq, desc, inArray } from "drizzle-orm";
import * as schema from "../schema";
import type {
  ContractSimilarity,
  HeuristicContractType,
} from "@/types";
import { getDb } from "./connection";

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
