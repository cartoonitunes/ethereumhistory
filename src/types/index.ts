/**
 * Type definitions for ethereumhistory.com
 *
 * These types map to the database schema and API responses.
 * Heuristic fields are explicitly marked to ensure the UI
 * properly communicates uncertainty.
 */

// =============================================================================
// Ethereum Eras
// =============================================================================

export interface EthereumEra {
  id: string;
  name: string;
  startBlock: number;
  endBlock: number | null;
  startDate: string;
  endDate: string | null;
  description: string;
  color: string;
}

export const ERAS: Record<string, EthereumEra> = {
  frontier: {
    id: "frontier",
    name: "Frontier",
    startBlock: 0,
    endBlock: 1149999,
    startDate: "2015-07-30",
    endDate: "2016-03-14",
    description: "The initial release of Ethereum. A bare-bones implementation for technical users.",
    color: "#8b5cf6",
  },
  homestead: {
    id: "homestead",
    name: "Homestead",
    startBlock: 1150000,
    endBlock: 1919999,
    startDate: "2016-03-14",
    endDate: "2016-07-20",
    description: "The first planned hard fork. Removed the canary contract, adjusted gas costs.",
    color: "#3b82f6",
  },
  dao: {
    id: "dao",
    name: "DAO Fork",
    startBlock: 1920000,
    endBlock: 2462999,
    startDate: "2016-07-20",
    endDate: "2016-10-18",
    description: "The controversial fork to recover funds from The DAO hack.",
    color: "#ef4444",
  },
  tangerine: {
    id: "tangerine",
    name: "Tangerine Whistle",
    startBlock: 2463000,
    endBlock: 2674999,
    startDate: "2016-10-18",
    endDate: "2016-11-22",
    description: "Emergency fork to address DoS attacks. Repriced IO-heavy opcodes.",
    color: "#f97316",
  },
  spurious: {
    id: "spurious",
    name: "Spurious Dragon",
    startBlock: 2675000,
    endBlock: 4369999,
    startDate: "2016-11-22",
    endDate: "2017-10-16",
    description: "Continued DoS protection. State trie clearing.",
    color: "#eab308",
  },
};

export function getEraFromBlock(blockNumber: number): EthereumEra | null {
  for (const era of Object.values(ERAS)) {
    if (blockNumber >= era.startBlock && (era.endBlock === null || blockNumber <= era.endBlock)) {
      return era;
    }
  }
  return null;
}

// =============================================================================
// Contract
// =============================================================================

export type VerificationStatus = "verified" | "decompiled" | "partial" | "bytecode_only";

export type HeuristicContractType =
  | "token"
  | "multisig"
  | "crowdsale"
  | "exchange"
  | "wallet"
  | "registry"
  | "dao"
  | "game"
  | "unknown";

export interface Contract {
  // Primary identifier
  address: string;

  // On-chain data (factual)
  runtimeBytecode: string | null;
  creationBytecode: string | null;
  deployerAddress: string | null;
  deploymentTxHash: string | null;
  deploymentBlock: number | null;
  deploymentTimestamp: string | null;

  // Decompiled code (from Panoramix/Palkeoramix or similar)
  decompiledCode: string | null;
  decompilationSuccess: boolean;

  // Current state (factual, may be stale)
  currentBalanceWei: string | null;
  transactionCount: number | null;
  lastStateUpdate: string | null;

  // Gas info from deployment
  gasUsed: number | null;
  gasPrice: string | null;

  // Derived data
  codeSizeBytes: number | null;
  eraId: string | null;
  era: EthereumEra | null;

  // Heuristic data (EXPLICITLY UNCERTAIN)
  heuristics: {
    contractType: HeuristicContractType | null;
    confidence: number; // 0.0-1.0
    isProxy: boolean;
    hasSelfDestruct: boolean;
    isErc20Like: boolean;
    notes: string | null;
  };

  // External data (from Etherscan, on-chain calls)
  ensName: string | null;
  etherscanVerified: boolean;
  etherscanContractName: string | null;
  sourceCode: string | null;
  abi: string | null;
  compilerVersion: string | null;

  // Token metadata (from on-chain calls)
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  tokenTotalSupply: string | null;

  // Editorial fields (human-written)
  shortDescription: string | null;
  description: string | null;

  // Historical narrative (editorial)
  historicalSummary: string | null;
  historicalSignificance: string | null;
  historicalContext: string | null;

  // Verification status
  verificationStatus: VerificationStatus;
}

// =============================================================================
// Bytecode Analysis
// =============================================================================

export interface BytecodeAnalysis {
  contractAddress: string;

  // Opcode metrics
  opcodeCount: number;
  uniqueOpcodeCount: number;

  // Control flow metrics
  jumpCount: number;
  jumpdestCount: number;
  branchDensity: number;
  storageOpsCount: number;
  callOpsCount: number;

  // Heuristic loop detection
  hasLoops: boolean;
  loopCount: number;

  // Fingerprints
  trigramHash: string;
  controlFlowSignature: string;
  shapeSignature: string;
}

// =============================================================================
// Similarity
// =============================================================================

export type SimilarityType = "exact" | "structural" | "weak" | "none";

export interface ContractSimilarity {
  contractAddress: string;
  matchedAddress: string;

  // Scores
  similarityScore: number;
  ngramSimilarity: number;
  controlFlowSimilarity: number;
  shapeSimilarity: number;

  // Classification
  similarityType: SimilarityType;
  confidenceScore: number; // 0-100

  // Explainability
  explanation: string;
  sharedPatterns: string[];

  // Matched contract summary (joined data)
  matchedContract?: {
    deploymentTimestamp: string | null;
    deployerAddress: string | null;
    heuristicContractType: HeuristicContractType | null;
    eraId: string | null;
  };
}

// =============================================================================
// Detected Patterns
// =============================================================================

export interface DetectedPattern {
  id: number;
  contractAddress: string;
  patternName: string;
  patternCategory: string;
  bytecodeOffset: number | null;
  matchedSignature: string | null;
  confidence: number;
  description: string;
  historicalNote: string | null;
}

// =============================================================================
// Function Signatures
// =============================================================================

export interface FunctionSignature {
  id: number;
  contractAddress: string;
  selector: string; // e.g., "0xa9059cbb"
  signature: string | null; // e.g., "transfer(address,uint256)"
  source: "decompiled" | "4byte_directory" | "verified_source" | "manual";
  confidence: number;
  appearsToBeDescription: string | null;
  callCount: number | null;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    timestamp: string;
    cached: boolean;
  };
}

export interface ContractPageData {
  contract: Contract;
  bytecodeAnalysis: BytecodeAnalysis | null;
  similarContracts: ContractSimilarity[];
  detectedPatterns: DetectedPattern[];
  functionSignatures: FunctionSignature[];
}

// =============================================================================
// Search Types (for bytecode/decompiled code search)
// =============================================================================

export interface BytecodeSearchResult {
  address: string;
  matchType: "bytecode" | "decompiled" | "function_name";
  matchContext: string; // Snippet of matched text with context
  deploymentTimestamp: string | null;
  heuristicContractType: HeuristicContractType | null;
  eraId: string | null;
  decompiledSnippet?: string;
}

// =============================================================================
// Search
// =============================================================================

export interface SearchResult {
  address: string;
  isContract: boolean;
  deploymentBlock: number | null;
  eraId: string | null;
  heuristicContractType: HeuristicContractType | null;
  ensName: string | null;
}

// =============================================================================
// Historical Events
// =============================================================================

export interface HistoricalEvent {
  id: number;
  eventDate: string;
  title: string;
  description: string;
  relatedContracts: string[];
  relatedAddresses: string[];
  eventType: "deployment" | "hack" | "fork" | "milestone";
  eraId: string | null;
  sources: string[];
}

// =============================================================================
// Featured Content
// =============================================================================

export interface FeaturedContract {
  address: string;
  name: string;
  shortDescription: string;
  eraId: string;
  deploymentDate: string;
  significance: string;
}

export interface HistoricalLink {
  id: number;
  contractAddress: string;
  title: string | null;
  url: string;
  source: string | null;
  note: string | null;
  createdAt: string;
}

export interface ContractMetadataItem {
  id: number;
  contractAddress: string;
  key: string;
  value: string | null;
  jsonValue: unknown | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface ContractHistoryData {
  links: HistoricalLink[];
  metadata: ContractMetadataItem[];
}

// =============================================================================
// External Contract Data (fetched from APIs)
// =============================================================================

export interface ExternalContractData {
  // From Etherscan
  contractName: string | null;
  compilerVersion: string | null;
  optimizationUsed: boolean | null;
  sourceCode: string | null;
  abi: string | null;
  constructorArguments: string | null;
  evmVersion: string | null;
  library: string | null;
  licenseType: string | null;
  isVerified: boolean;

  // From on-chain calls (ERC-20/721 standard)
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  totalSupply: string | null;

  // Fetch metadata
  fetchedAt: string;
  fetchErrors: string[];
}
