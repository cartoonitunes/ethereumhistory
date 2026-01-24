#!/usr/bin/env npx tsx
/**
 * Similarity Index Builder for Ethereum History
 *
 * Pre-computes bytecode similarity scores between contracts
 * and stores them in the database for fast retrieval.
 *
 * Uses the improved v2 algorithm:
 * - Function selector matching (semantic similarity)
 * - Normalized opcode skeleton comparison
 * - Structural feature comparison
 *
 * Run with: npx tsx scripts/build-similarity-index.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { isNotNull } from "drizzle-orm";
import * as schema from "../src/lib/schema";

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false });
const db = drizzle(client, { schema });

// =============================================================================
// Similarity Algorithm v2 (matching src/lib/similarity.ts)
// =============================================================================

function extractNormalizedOpcodes(bytecode: string): string[] {
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const opcodes: string[] = [];
  let i = 0;

  while (i < hex.length - 1) {
    const opcode = hex.slice(i, i + 2).toLowerCase();
    const opcodeNum = parseInt(opcode, 16);

    if (opcodeNum >= 0x60 && opcodeNum <= 0x7f) {
      const pushBytes = opcodeNum - 0x5f;
      opcodes.push(opcode);
      i += 2 + pushBytes * 2;
    } else {
      opcodes.push(opcode);
      i += 2;
    }
  }

  return opcodes;
}

function extractFunctionSelectors(bytecode: string): Set<string> {
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const selectors = new Set<string>();
  let i = 0;

  while (i < hex.length - 10) {
    const opcode = hex.slice(i, i + 2).toLowerCase();

    if (opcode === "63" && i + 10 <= hex.length) {
      const selector = hex.slice(i + 2, i + 10).toLowerCase();
      if (selector !== "00000000" && selector !== "ffffffff") {
        selectors.add(selector);
      }
      i += 10;
    } else {
      const opcodeNum = parseInt(opcode, 16);
      if (opcodeNum >= 0x60 && opcodeNum <= 0x7f) {
        const pushBytes = opcodeNum - 0x5f;
        i += 2 + pushBytes * 2;
      } else {
        i += 2;
      }
    }
  }

  return selectors;
}

function createOpcodeSkeleton(opcodes: string[]): string[] {
  return opcodes.map((op) => {
    const num = parseInt(op, 16);
    if (num >= 0x60 && num <= 0x7f) return "PUSH";
    if (num >= 0x80 && num <= 0x8f) return "DUP";
    if (num >= 0x90 && num <= 0x9f) return "SWAP";
    if (num >= 0xa0 && num <= 0xa4) return "LOG";
    return op;
  });
}

interface StructuralFeatures {
  jumpCount: number;
  jumpdestCount: number;
  sloadCount: number;
  sstoreCount: number;
  callCount: number;
  logCount: number;
  returnCount: number;
  revertCount: number;
}

function extractStructuralFeatures(opcodes: string[]): StructuralFeatures {
  const features: StructuralFeatures = {
    jumpCount: 0,
    jumpdestCount: 0,
    sloadCount: 0,
    sstoreCount: 0,
    callCount: 0,
    logCount: 0,
    returnCount: 0,
    revertCount: 0,
  };

  for (const op of opcodes) {
    switch (op) {
      case "56":
      case "57":
        features.jumpCount++;
        break;
      case "5b":
        features.jumpdestCount++;
        break;
      case "54":
        features.sloadCount++;
        break;
      case "55":
        features.sstoreCount++;
        break;
      case "f1":
      case "f2":
      case "f4":
      case "fa":
        features.callCount++;
        break;
      case "a0":
      case "a1":
      case "a2":
      case "a3":
      case "a4":
        features.logCount++;
        break;
      case "f3":
        features.returnCount++;
        break;
      case "fd":
        features.revertCount++;
        break;
    }
  }

  return features;
}

interface ContractFeatures {
  address: string;
  skeleton: string[];
  selectors: Set<string>;
  structuralFeatures: StructuralFeatures;
  byteSize: number;
}

function extractContractFeatures(
  address: string,
  bytecode: string
): ContractFeatures {
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const normalizedOpcodes = extractNormalizedOpcodes(bytecode);

  return {
    address,
    skeleton: createOpcodeSkeleton(normalizedOpcodes),
    selectors: extractFunctionSelectors(bytecode),
    structuralFeatures: extractStructuralFeatures(normalizedOpcodes),
    byteSize: hex.length / 2,
  };
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  setA.forEach((x) => {
    if (setB.has(x)) intersectionCount++;
  });

  const unionSize = setA.size + setB.size - intersectionCount;
  return intersectionCount / unionSize;
}

function generateNgrams(sequence: string[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= sequence.length - n; i++) {
    ngrams.add(sequence.slice(i, i + n).join("-"));
  }
  return ngrams;
}

function calculateFeatureSimilarity(
  featuresA: StructuralFeatures,
  featuresB: StructuralFeatures
): number {
  const vectorA = Object.values(featuresA);
  const vectorB = Object.values(featuresB);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

const KNOWN_SELECTORS: Record<string, string> = {
  a9059cbb: "transfer(address,uint256)",
  "70a08231": "balanceOf(address)",
  "18160ddd": "totalSupply()",
  dd62ed3e: "allowance(address,address)",
  "095ea7b3": "approve(address,uint256)",
  "23b872dd": "transferFrom(address,address,uint256)",
  "06fdde03": "name()",
  "95d89b41": "symbol()",
  "313ce567": "decimals()",
};

interface SimilarityResult {
  score: number;
  selectorSimilarity: number;
  skeletonSimilarity: number;
  featureSimilarity: number;
  sizeSimilarity: number;
  type: "exact" | "structural" | "weak" | "none";
  explanation: string;
  sharedPatterns: string[];
}

function calculateSimilarity(
  featuresA: ContractFeatures,
  featuresB: ContractFeatures
): SimilarityResult | null {
  // Size filter
  const minSize = Math.min(featuresA.byteSize, featuresB.byteSize);
  const maxSize = Math.max(featuresA.byteSize, featuresB.byteSize);
  const sizeSimilarity = maxSize > 0 ? minSize / maxSize : 1;

  if (sizeSimilarity < 0.2) {
    return null;
  }

  // Function selector similarity
  const selectorSimilarity = jaccardSimilarity(
    featuresA.selectors,
    featuresB.selectors
  );

  // Skeleton similarity (4-grams)
  const ngramsA = generateNgrams(featuresA.skeleton, 4);
  const ngramsB = generateNgrams(featuresB.skeleton, 4);
  const skeletonSimilarity = jaccardSimilarity(ngramsA, ngramsB);

  // Structural feature similarity
  const featureSimilarity = calculateFeatureSimilarity(
    featuresA.structuralFeatures,
    featuresB.structuralFeatures
  );

  // Weighted score
  const score =
    selectorSimilarity * 0.4 +
    skeletonSimilarity * 0.35 +
    featureSimilarity * 0.15 +
    sizeSimilarity * 0.1;

  if (score < 0.35) {
    return null;
  }

  // Classification
  let type: "exact" | "structural" | "weak" | "none";
  if (score >= 0.9) type = "exact";
  else if (score >= 0.65) type = "structural";
  else if (score >= 0.4) type = "weak";
  else type = "none";

  // Generate explanation
  const parts: string[] = [];
  if (selectorSimilarity >= 0.8) parts.push("Nearly identical function interfaces");
  else if (selectorSimilarity >= 0.5) parts.push("Similar function interfaces");
  else if (selectorSimilarity > 0) parts.push("Some shared functions");

  if (skeletonSimilarity >= 0.7) parts.push("very similar code structure");
  else if (skeletonSimilarity >= 0.4) parts.push("similar code patterns");

  // Shared patterns
  const sharedPatterns: string[] = [];
  const sharedSelectors: string[] = [];
  featuresA.selectors.forEach((sel) => {
    if (featuresB.selectors.has(sel) && KNOWN_SELECTORS[sel]) {
      sharedSelectors.push(KNOWN_SELECTORS[sel]);
    }
  });
  if (sharedSelectors.length > 0) {
    sharedPatterns.push(
      `shared_functions: ${sharedSelectors.slice(0, 3).join(", ")}`
    );
  }

  // ERC-20 check
  const erc20Selectors = ["a9059cbb", "70a08231", "18160ddd"];
  const hasErc20A =
    erc20Selectors.filter((s) => featuresA.selectors.has(s)).length >= 2;
  const hasErc20B =
    erc20Selectors.filter((s) => featuresB.selectors.has(s)).length >= 2;
  if (hasErc20A && hasErc20B) {
    sharedPatterns.push("erc20_like");
  }

  return {
    score,
    selectorSimilarity,
    skeletonSimilarity,
    featureSimilarity,
    sizeSimilarity,
    type,
    explanation: parts.join("; ") || "Minor structural similarities",
    sharedPatterns,
  };
}

// =============================================================================
// Index Building
// =============================================================================

async function buildSimilarityIndex() {
  console.log("\n=== Building Similarity Index (v2 Algorithm) ===\n");

  // Fetch all contracts with bytecode
  console.log("Fetching contracts with bytecode...");
  const contracts = await db
    .select({
      address: schema.contracts.address,
      runtimeBytecode: schema.contracts.runtimeBytecode,
    })
    .from(schema.contracts)
    .where(isNotNull(schema.contracts.runtimeBytecode));

  console.log(`Found ${contracts.length} contracts with bytecode\n`);

  if (contracts.length === 0) {
    console.log("No contracts found. Import contracts first.");
    return;
  }

  // Pre-compute features for all contracts
  console.log("Pre-computing contract features...");
  const contractFeatures: ContractFeatures[] = [];

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    if (c.runtimeBytecode) {
      contractFeatures.push(extractContractFeatures(c.address, c.runtimeBytecode));
    }
    if ((i + 1) % 5000 === 0) {
      console.log(`  Features extracted: ${i + 1}/${contracts.length}`);
    }
  }
  console.log(`  Features extracted: ${contractFeatures.length} contracts\n`);

  // Build index - compare each contract against nearby contracts
  const maxComparisonsPerContract = 200;
  const minSimilarityThreshold = 0.35;

  let totalRecords = 0;
  let batchRecords: schema.NewSimilarityRecord[] = [];
  const batchSize = 100;

  console.log("Computing similarity scores...");

  for (let i = 0; i < contractFeatures.length; i++) {
    const contractA = contractFeatures[i];

    // Compare against a sample of other contracts
    const sampleIndices: number[] = [];

    // Include nearby contracts (similar deployment time)
    for (
      let j = Math.max(0, i - 50);
      j < Math.min(contractFeatures.length, i + 50);
      j++
    ) {
      if (j !== i) sampleIndices.push(j);
    }

    // Add random samples
    const maxSamples = Math.min(
      maxComparisonsPerContract,
      contractFeatures.length - 1
    );
    while (sampleIndices.length < maxSamples) {
      const randomIdx = Math.floor(Math.random() * contractFeatures.length);
      if (randomIdx !== i && !sampleIndices.includes(randomIdx)) {
        sampleIndices.push(randomIdx);
      }
    }

    for (const j of sampleIndices) {
      const contractB = contractFeatures[j];

      const similarity = calculateSimilarity(contractA, contractB);

      if (similarity && similarity.score >= minSimilarityThreshold) {
        batchRecords.push({
          contractAddress: contractA.address,
          matchedAddress: contractB.address,
          similarityScore: similarity.score,
          ngramSimilarity: similarity.skeletonSimilarity,
          controlFlowSimilarity: similarity.featureSimilarity,
          shapeSimilarity: similarity.sizeSimilarity,
          similarityType: similarity.type,
          explanation: similarity.explanation,
          sharedPatterns: JSON.stringify(similarity.sharedPatterns),
        });

        if (batchRecords.length >= batchSize) {
          try {
            await db
              .insert(schema.similarityIndex)
              .values(batchRecords)
              .onConflictDoNothing();
            totalRecords += batchRecords.length;
          } catch (error) {
            console.error("Error inserting batch:", error);
          }
          batchRecords = [];
        }
      }
    }

    if ((i + 1) % 500 === 0 || i === contractFeatures.length - 1) {
      console.log(
        `  Progress: ${i + 1}/${contractFeatures.length} contracts (${totalRecords} similarity records)`
      );
    }
  }

  // Insert remaining records
  if (batchRecords.length > 0) {
    try {
      await db
        .insert(schema.similarityIndex)
        .values(batchRecords)
        .onConflictDoNothing();
      totalRecords += batchRecords.length;
    } catch (error) {
      console.error("Error inserting final batch:", error);
    }
  }

  console.log(`\n✓ Index built: ${totalRecords} similarity records created`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log("Ethereum History Similarity Index Builder v2");
  console.log("============================================");

  try {
    await buildSimilarityIndex();
  } catch (error) {
    console.error("\n✗ Index building failed:", error);
    await client.end();
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

main();
