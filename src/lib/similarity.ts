/**
 * Bytecode Similarity Matching Algorithm v2
 *
 * Improved similarity matching that:
 * 1. Normalizes bytecode by removing embedded constants/addresses
 * 2. Extracts and compares function selectors (semantic similarity)
 * 3. Compares opcode skeletons (structural similarity)
 * 4. Uses efficient comparison methods
 */

import type { Contract, ContractSimilarity, SimilarityType } from "@/types";

// =============================================================================
// Bytecode Normalization
// =============================================================================

/**
 * Extract opcodes from bytecode, normalizing PUSH instructions.
 * Returns array of opcodes where PUSH values are replaced with placeholders.
 * This makes comparison independent of embedded addresses/constants.
 */
function extractNormalizedOpcodes(bytecode: string): string[] {
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const opcodes: string[] = [];
  let i = 0;

  while (i < hex.length - 1) {
    const opcode = hex.slice(i, i + 2).toLowerCase();
    const opcodeNum = parseInt(opcode, 16);

    // Handle PUSH instructions (0x60-0x7f push 1-32 bytes)
    if (opcodeNum >= 0x60 && opcodeNum <= 0x7f) {
      const pushBytes = opcodeNum - 0x5f;
      // Normalize: just record the PUSH opcode, skip the data
      opcodes.push(opcode);
      i += 2 + pushBytes * 2;
    } else {
      opcodes.push(opcode);
      i += 2;
    }
  }

  return opcodes;
}

/**
 * Extract function selectors from bytecode.
 * Looks for the dispatcher pattern: PUSH4 <selector> EQ PUSH2 JUMPI
 * Returns set of 4-byte selectors found.
 */
function extractFunctionSelectors(bytecode: string): Set<string> {
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const selectors = new Set<string>();
  let i = 0;

  while (i < hex.length - 10) {
    const opcode = hex.slice(i, i + 2).toLowerCase();

    // Look for PUSH4 (0x63) which typically pushes function selectors
    if (opcode === "63" && i + 10 <= hex.length) {
      const selector = hex.slice(i + 2, i + 10).toLowerCase();
      // Validate it looks like a selector (not all zeros or all f's)
      if (selector !== "00000000" && selector !== "ffffffff") {
        selectors.add(selector);
      }
      i += 10;
    } else {
      // Handle PUSH instructions to skip their data
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

/**
 * Create a "skeleton" of the bytecode - just the opcode types in order.
 * Groups similar opcodes to reduce noise.
 */
function createOpcodeSkeleton(opcodes: string[]): string[] {
  return opcodes.map((op) => {
    const num = parseInt(op, 16);

    // Group PUSH operations
    if (num >= 0x60 && num <= 0x7f) return "PUSH";
    // Group DUP operations
    if (num >= 0x80 && num <= 0x8f) return "DUP";
    // Group SWAP operations
    if (num >= 0x90 && num <= 0x9f) return "SWAP";
    // Group LOG operations
    if (num >= 0xa0 && num <= 0xa4) return "LOG";

    // Return specific opcodes for important operations
    return op;
  });
}

// =============================================================================
// Similarity Metrics
// =============================================================================

/**
 * Calculate Jaccard similarity between two sets
 */
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

/**
 * Calculate function selector similarity.
 * This is the most important metric - contracts with same functions are semantically similar.
 */
function calculateSelectorSimilarity(
  selectorsA: Set<string>,
  selectorsB: Set<string>
): number {
  return jaccardSimilarity(selectorsA, selectorsB);
}

/**
 * Generate n-grams from a sequence
 */
function generateNgrams(sequence: string[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= sequence.length - n; i++) {
    ngrams.add(sequence.slice(i, i + n).join("-"));
  }
  return ngrams;
}

/**
 * Calculate skeleton similarity using n-gram comparison.
 * Uses the normalized opcode skeleton for structural comparison.
 */
function calculateSkeletonSimilarity(
  skeletonA: string[],
  skeletonB: string[]
): number {
  // Use 4-grams for better pattern matching
  const ngramsA = generateNgrams(skeletonA, 4);
  const ngramsB = generateNgrams(skeletonB, 4);
  return jaccardSimilarity(ngramsA, ngramsB);
}

/**
 * Calculate size similarity - contracts of very different sizes are unlikely to be similar.
 */
function calculateSizeSimilarity(sizeA: number, sizeB: number): number {
  const minSize = Math.min(sizeA, sizeB);
  const maxSize = Math.max(sizeA, sizeB);
  if (maxSize === 0) return 1;
  return minSize / maxSize;
}

/**
 * Extract key structural features for quick comparison
 */
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
      case "56": // JUMP
      case "57": // JUMPI
        features.jumpCount++;
        break;
      case "5b": // JUMPDEST
        features.jumpdestCount++;
        break;
      case "54": // SLOAD
        features.sloadCount++;
        break;
      case "55": // SSTORE
        features.sstoreCount++;
        break;
      case "f1": // CALL
      case "f2": // CALLCODE
      case "f4": // DELEGATECALL
      case "fa": // STATICCALL
        features.callCount++;
        break;
      case "a0": // LOG0
      case "a1": // LOG1
      case "a2": // LOG2
      case "a3": // LOG3
      case "a4": // LOG4
        features.logCount++;
        break;
      case "f3": // RETURN
        features.returnCount++;
        break;
      case "fd": // REVERT
        features.revertCount++;
        break;
    }
  }

  return features;
}

/**
 * Calculate structural feature similarity using cosine similarity
 */
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

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Well-known function selectors for common patterns
 */
const KNOWN_SELECTORS: Record<string, string> = {
  // ERC-20
  "a9059cbb": "transfer(address,uint256)",
  "70a08231": "balanceOf(address)",
  "18160ddd": "totalSupply()",
  "dd62ed3e": "allowance(address,address)",
  "095ea7b3": "approve(address,uint256)",
  "23b872dd": "transferFrom(address,address,uint256)",
  // ERC-721
  "6352211e": "ownerOf(uint256)",
  "42842e0e": "safeTransferFrom(address,address,uint256)",
  "b88d4fde": "safeTransferFrom(address,address,uint256,bytes)",
  // Common
  "8da5cb5b": "owner()",
  "f2fde38b": "transferOwnership(address)",
  "715018a6": "renounceOwnership()",
  "06fdde03": "name()",
  "95d89b41": "symbol()",
  "313ce567": "decimals()",
};

/**
 * Detect shared patterns between two contracts based on selectors and bytecode
 */
function detectSharedPatterns(
  selectorsA: Set<string>,
  selectorsB: Set<string>,
  decompiledA?: string | null,
  decompiledB?: string | null
): string[] {
  const patterns: string[] = [];

  // Find shared known selectors
  const sharedSelectors: string[] = [];
  selectorsA.forEach((sel) => {
    if (selectorsB.has(sel) && KNOWN_SELECTORS[sel]) {
      sharedSelectors.push(KNOWN_SELECTORS[sel]);
    }
  });

  if (sharedSelectors.length > 0) {
    patterns.push(`shared_functions: ${sharedSelectors.slice(0, 3).join(", ")}`);
  }

  // Check for ERC-20 pattern
  const erc20Selectors = ["a9059cbb", "70a08231", "18160ddd"];
  const hasErc20A = erc20Selectors.filter((s) => selectorsA.has(s)).length >= 2;
  const hasErc20B = erc20Selectors.filter((s) => selectorsB.has(s)).length >= 2;
  if (hasErc20A && hasErc20B) {
    patterns.push("erc20_like");
  }

  // Check decompiled code for additional patterns
  if (decompiledA && decompiledB) {
    const lowerA = decompiledA.toLowerCase();
    const lowerB = decompiledB.toLowerCase();

    const codePatterns = [
      { pattern: "selfdestruct", name: "selfdestruct" },
      { pattern: "delegatecall", name: "proxy_pattern" },
      { pattern: "create2", name: "factory_pattern" },
    ];

    for (const { pattern, name } of codePatterns) {
      if (lowerA.includes(pattern) && lowerB.includes(pattern)) {
        patterns.push(name);
      }
    }
  }

  return patterns;
}

// =============================================================================
// Main Similarity Calculation
// =============================================================================

/**
 * Classify similarity type based on score
 */
function classifySimilarity(score: number): SimilarityType {
  if (score >= 0.9) return "exact";
  if (score >= 0.65) return "structural";
  if (score >= 0.4) return "weak";
  return "none";
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  selectorSim: number,
  skeletonSim: number,
  featureSim: number,
  sharedPatterns: string[]
): string {
  const parts: string[] = [];

  if (selectorSim >= 0.8) {
    parts.push("Nearly identical function interfaces");
  } else if (selectorSim >= 0.5) {
    parts.push("Similar function interfaces");
  } else if (selectorSim > 0) {
    parts.push("Some shared functions");
  }

  if (skeletonSim >= 0.7) {
    parts.push("very similar code structure");
  } else if (skeletonSim >= 0.4) {
    parts.push("similar code patterns");
  }

  if (featureSim >= 0.9) {
    parts.push("matching complexity profile");
  }

  if (sharedPatterns.length > 0) {
    parts.push(sharedPatterns.slice(0, 2).join(", "));
  }

  if (parts.length === 0) {
    return "Minor structural similarities detected.";
  }

  return parts.join("; ") + ".";
}

/**
 * Pre-computed features for a contract to enable efficient comparisons
 */
export interface ContractFeatures {
  normalizedOpcodes: string[];
  skeleton: string[];
  selectors: Set<string>;
  structuralFeatures: StructuralFeatures;
  byteSize: number;
}

/**
 * Extract all features from a contract for similarity comparison
 */
export function extractContractFeatures(bytecode: string): ContractFeatures {
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const normalizedOpcodes = extractNormalizedOpcodes(bytecode);

  return {
    normalizedOpcodes,
    skeleton: createOpcodeSkeleton(normalizedOpcodes),
    selectors: extractFunctionSelectors(bytecode),
    structuralFeatures: extractStructuralFeatures(normalizedOpcodes),
    byteSize: hex.length / 2,
  };
}

/**
 * Calculate similarity between two contracts using pre-computed features
 */
export function calculateSimilarityFromFeatures(
  addressA: string,
  featuresA: ContractFeatures,
  addressB: string,
  featuresB: ContractFeatures,
  decompiledA?: string | null,
  decompiledB?: string | null
): ContractSimilarity | null {
  // Skip same contract
  if (addressA.toLowerCase() === addressB.toLowerCase()) {
    return null;
  }

  // Quick size filter - very different sizes unlikely to be similar
  const sizeSim = calculateSizeSimilarity(featuresA.byteSize, featuresB.byteSize);
  if (sizeSim < 0.2) {
    return null;
  }

  // Calculate individual similarity metrics
  const selectorSimilarity = calculateSelectorSimilarity(
    featuresA.selectors,
    featuresB.selectors
  );

  const skeletonSimilarity = calculateSkeletonSimilarity(
    featuresA.skeleton,
    featuresB.skeleton
  );

  const featureSimilarity = calculateFeatureSimilarity(
    featuresA.structuralFeatures,
    featuresB.structuralFeatures
  );

  // Weighted combination:
  // - Function selectors are most important (semantic similarity)
  // - Skeleton similarity captures structural patterns
  // - Feature similarity captures complexity profile
  // - Size similarity is a sanity check
  const similarityScore =
    selectorSimilarity * 0.4 +
    skeletonSimilarity * 0.35 +
    featureSimilarity * 0.15 +
    sizeSim * 0.1;

  // Skip low similarity matches
  if (similarityScore < 0.3) {
    return null;
  }

  // Detect shared patterns
  const sharedPatterns = detectSharedPatterns(
    featuresA.selectors,
    featuresB.selectors,
    decompiledA,
    decompiledB
  );

  const similarityType = classifySimilarity(similarityScore);
  const explanation = generateExplanation(
    selectorSimilarity,
    skeletonSimilarity,
    featureSimilarity,
    sharedPatterns
  );

  return {
    contractAddress: addressA,
    matchedAddress: addressB,
    similarityScore,
    ngramSimilarity: skeletonSimilarity, // Using skeleton similarity as "ngram"
    controlFlowSimilarity: featureSimilarity, // Using feature similarity
    shapeSimilarity: sizeSim,
    similarityType,
    confidenceScore: Math.round(similarityScore * 100),
    explanation,
    sharedPatterns,
  };
}

/**
 * Calculate full similarity between two contracts
 */
export function calculateSimilarity(
  contractA: Contract,
  contractB: Contract
): ContractSimilarity | null {
  if (!contractA.runtimeBytecode || !contractB.runtimeBytecode) {
    return null;
  }

  const featuresA = extractContractFeatures(contractA.runtimeBytecode);
  const featuresB = extractContractFeatures(contractB.runtimeBytecode);

  const result = calculateSimilarityFromFeatures(
    contractA.address,
    featuresA,
    contractB.address,
    featuresB,
    contractA.decompiledCode,
    contractB.decompiledCode
  );

  if (result) {
    result.matchedContract = {
      deploymentTimestamp: contractB.deploymentTimestamp,
      deployerAddress: contractB.deployerAddress,
      heuristicContractType: contractB.heuristics.contractType,
      eraId: contractB.eraId,
    };
  }

  return result;
}

/**
 * Find similar contracts from a list
 */
export function findSimilarContracts(
  targetContract: Contract,
  candidates: Contract[],
  limit: number = 10,
  minSimilarity: number = 0.3
): ContractSimilarity[] {
  if (!targetContract.runtimeBytecode) {
    return [];
  }

  // Pre-compute target features once
  const targetFeatures = extractContractFeatures(targetContract.runtimeBytecode);
  const similarities: ContractSimilarity[] = [];

  for (const candidate of candidates) {
    if (
      !candidate.runtimeBytecode ||
      candidate.address.toLowerCase() === targetContract.address.toLowerCase()
    ) {
      continue;
    }

    const candidateFeatures = extractContractFeatures(candidate.runtimeBytecode);

    const similarity = calculateSimilarityFromFeatures(
      targetContract.address,
      targetFeatures,
      candidate.address,
      candidateFeatures,
      targetContract.decompiledCode,
      candidate.decompiledCode
    );

    if (similarity && similarity.similarityScore >= minSimilarity) {
      similarity.matchedContract = {
        deploymentTimestamp: candidate.deploymentTimestamp,
        deployerAddress: candidate.deployerAddress,
        heuristicContractType: candidate.heuristics.contractType,
        eraId: candidate.eraId,
      };
      similarities.push(similarity);
    }
  }

  // Sort by similarity score and return top matches
  return similarities
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

/**
 * Build similarity index for efficient lookups
 */
export function buildSimilarityIndex(
  contracts: Contract[],
  topK: number = 5
): Map<string, ContractSimilarity[]> {
  const index = new Map<string, ContractSimilarity[]>();
  const withBytecode = contracts.filter((c) => c.runtimeBytecode);

  console.log(`Building similarity index for ${withBytecode.length} contracts...`);

  for (let i = 0; i < withBytecode.length; i++) {
    const contract = withBytecode[i];
    const similarities = findSimilarContracts(contract, withBytecode, topK);
    index.set(contract.address.toLowerCase(), similarities);

    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1}/${withBytecode.length} contracts`);
    }
  }

  return index;
}
