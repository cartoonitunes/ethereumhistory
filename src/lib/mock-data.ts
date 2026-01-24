/**
 * Mock data for local development without a database
 *
 * This allows the app to run locally with realistic sample data.
 */

import type {
  Contract,
  BytecodeAnalysis,
  ContractSimilarity,
  DetectedPattern,
  FunctionSignature,
  FeaturedContract,
} from "@/types";
import { ERAS } from "@/types";

// Sample decompiled code for demonstration
const SAMPLE_DECOMPILED_DAO = `# Palkeoramix decompiler.

def storage:
  proposals is mapping of struct at storage 0
  allowedRecipients is mapping of uint8 at storage 1
  totalSupply is uint256 at storage 2
  balanceOf is mapping of uint256 at storage 3

def proposals(uint256 proposalID) payable:
  return proposals[proposalID]

def balanceOf(address tokenOwner) payable:
  return balanceOf[tokenOwner]

#
#  Regular functions
#

def _fallback() payable: # default function
  if call.value > 0:
    balanceOf[caller] += call.value
    log Transfer(
        address from=0,
        address to=caller,
        uint256 amount=call.value)

def splitDAO(uint256 proposalID, address newCurator) payable:
  require proposals[proposalID].votingDeadline < block.timestamp
  require proposals[proposalID].newCurator == newCurator
  # VULNERABLE: External call before state update
  call newCurator with:
     value: balanceOf[caller]
  # State update happens AFTER external call - reentrancy!
  balanceOf[caller] = 0

def vote(uint256 proposalID, bool supportsProposal) payable:
  require block.timestamp < proposals[proposalID].votingDeadline
  if supportsProposal:
    proposals[proposalID].yea += balanceOf[caller]
  else:
    proposals[proposalID].nay += balanceOf[caller]
  log Voted(proposalID, supportsProposal, caller)`;

const SAMPLE_DECOMPILED_TOKEN = `# Palkeoramix decompiler.

def storage:
  coinBalanceOf is mapping of uint256 at storage 0

def coinBalanceOf(address tokenOwner) payable:
  return coinBalanceOf[tokenOwner]

#
#  Regular functions
#

def _fallback() payable: # default function
  stop

def sendCoin(address receiver, uint256 amount) payable:
  if coinBalanceOf[caller] < amount:
      return 0
  coinBalanceOf[caller] -= amount
  coinBalanceOf[address(receiver)] += amount
  log CoinTransfer(
      address sender=caller,
      address receiver=address(receiver),
      uint256 amount=amount)
  return 1

def totalSupply() payable:
  return 1000000`;

// Sample contracts from Ethereum's early history
export const MOCK_CONTRACTS: Record<string, Contract> = {
  "0xbb9bc244d798123fde783fcc1c72d3bb8c189413": {
    address: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413",
    runtimeBytecode: "0x6060604052361561020e5763ffffffff60e060020a...",
    creationBytecode: null,
    deployerAddress: "0x4a574510c7014e4ae985403536074abe582adfc8",
    deploymentTxHash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
    deploymentBlock: 1428757,
    deploymentTimestamp: "2016-04-30T00:00:00Z",
    decompiledCode: SAMPLE_DECOMPILED_DAO,
    decompilationSuccess: true,
    currentBalanceWei: "0",
    transactionCount: 245893,
    lastStateUpdate: "2024-01-01T00:00:00Z",
    gasUsed: 4712388,
    gasPrice: "20000000000",
    codeSizeBytes: 4500,
    eraId: "homestead",
    era: ERAS.homestead,
    heuristics: {
      contractType: "dao",
      confidence: 0.95,
      isProxy: false,
      hasSelfDestruct: false,
      isErc20Like: false,
      notes: "The original DAO contract. Vulnerable to reentrancy.",
    },
    ensName: null,
    etherscanVerified: true,
    etherscanContractName: "The DAO",
    sourceCode: null,
    abi: null,
    compilerVersion: "v0.3.1-2016-04-12-3ad5e82",
    tokenName: null,
    tokenSymbol: null,
    tokenDecimals: null,
    tokenTotalSupply: null,
    shortDescription: "The DAO contract — historical landmark.",
    description: null,
    historicalSummary:
      "The DAO was the most ambitious decentralized autonomous organization ever attempted. It raised over $150 million worth of ETH in a crowdsale, making it the largest crowdfunding project in history at the time. The contract allowed token holders to vote on proposals and allocate funds to projects.",
    historicalSignificance:
      "The DAO hack led directly to the Ethereum / Ethereum Classic split. This was the defining moment that tested Ethereum's governance and community values. The decision to fork and recover funds remains controversial.",
    historicalContext:
      "In early 2016, the Ethereum community was optimistic about the potential of smart contracts to create new forms of organization. The DAO represented the culmination of this vision - a venture fund governed entirely by code.",
    verificationStatus: "verified",
  },
  "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426": {
    address: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
    runtimeBytecode: "0x60606040526004361061006c5763ffffffff7c0100...",
    creationBytecode: null,
    deployerAddress: "0x1234567890123456789012345678901234567890",
    deploymentTxHash: "0xabc123...",
    deploymentBlock: 123456,
    deploymentTimestamp: "2015-08-10T12:34:56Z",
    decompiledCode: SAMPLE_DECOMPILED_TOKEN,
    decompilationSuccess: true,
    currentBalanceWei: "1000000000000000000",
    transactionCount: 5420,
    lastStateUpdate: "2024-01-01T00:00:00Z",
    gasUsed: 176399,
    gasPrice: "54850900507",
    codeSizeBytes: 800,
    eraId: "frontier",
    era: ERAS.frontier,
    heuristics: {
      contractType: "token",
      confidence: 0.75,
      isProxy: false,
      hasSelfDestruct: false,
      isErc20Like: true,
      notes: "Early token contract, predates ERC-20 standard.",
    },
    ensName: null,
    etherscanVerified: false,
    etherscanContractName: "Project Halo",
    sourceCode: null,
    abi: null,
    compilerVersion: null,
    tokenName: "Halo Token",
    tokenSymbol: "HALO",
    tokenDecimals: 0,
    tokenTotalSupply: "1000000",
    shortDescription: "One of the earliest token contracts on Ethereum.",
    description: null,
    historicalSummary:
      "One of the earliest token contracts on Ethereum mainnet. This contract predates the ERC-20 standard by over a year and demonstrates early experimentation with token concepts.",
    historicalSignificance:
      "Demonstrates early experimentation with token concepts before any standards existed. The patterns used here influenced what became ERC-20.",
    historicalContext:
      "In August 2015, Ethereum was barely a month old. Developers were still figuring out what was possible with smart contracts.",
    verificationStatus: "decompiled",
  },
  "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89": {
    address: "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89",
    runtimeBytecode: "0x606060405236156100da5763ffffffff7c0100...",
    creationBytecode: null,
    deployerAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    deploymentTxHash: "0xdef456...",
    deploymentBlock: 1150000,
    deploymentTimestamp: "2016-03-14T08:00:00Z",
    decompiledCode: null,
    decompilationSuccess: false,
    currentBalanceWei: "500000000000000000000",
    transactionCount: 89234,
    lastStateUpdate: "2024-01-01T00:00:00Z",
    gasUsed: 890000,
    gasPrice: "20000000000",
    codeSizeBytes: 3200,
    eraId: "homestead",
    era: ERAS.homestead,
    heuristics: {
      contractType: "token",
      confidence: 0.6,
      isProxy: false,
      hasSelfDestruct: false,
      isErc20Like: true,
      notes: null,
    },
    ensName: null,
    etherscanVerified: true,
    etherscanContractName: "Augur Rep Token",
    sourceCode: null,
    abi: null,
    compilerVersion: null,
    tokenName: "Reputation",
    tokenSymbol: "REP",
    tokenDecimals: 18,
    tokenTotalSupply: "11000000000000000000000000",
    shortDescription: "Augur REP token contract.",
    description: null,
    historicalSummary:
      "The reputation token for the Augur prediction market platform. One of the first major DApps to launch on Ethereum.",
    historicalSignificance:
      "Augur was one of the first projects to demonstrate that complex decentralized applications were possible on Ethereum.",
    historicalContext:
      "The Homestead release marked Ethereum's transition from experimental to production-ready. Augur was ready to capitalize on this stability.",
    verificationStatus: "verified",
  },
  "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5": {
    address: "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5",
    runtimeBytecode: "0x6060604052600436106100c45763ffffffff7c0100...",
    creationBytecode: null,
    deployerAddress: "0xdef1234567890abcdef1234567890abcdef12345",
    deploymentTxHash: "0x789abc...",
    deploymentBlock: 1234567,
    deploymentTimestamp: "2016-03-20T14:00:00Z",
    decompiledCode: null,
    decompilationSuccess: false,
    currentBalanceWei: "0",
    transactionCount: 45678,
    lastStateUpdate: "2024-01-01T00:00:00Z",
    gasUsed: 450000,
    gasPrice: "20000000000",
    codeSizeBytes: 2800,
    eraId: "homestead",
    era: ERAS.homestead,
    heuristics: {
      contractType: "token",
      confidence: 0.85,
      isProxy: false,
      hasSelfDestruct: false,
      isErc20Like: true,
      notes: null,
    },
    ensName: null,
    etherscanVerified: true,
    etherscanContractName: "Digix DGD",
    sourceCode: null,
    abi: null,
    compilerVersion: null,
    tokenName: "DigixDAO",
    tokenSymbol: "DGD",
    tokenDecimals: 9,
    tokenTotalSupply: "2000000000000000",
    shortDescription: "Digix DGD token.",
    description: null,
    historicalSummary:
      "The governance token for Digix, which pioneered tokenization of physical gold on Ethereum.",
    historicalSignificance:
      "First successful attempt to bridge physical assets (gold) with blockchain tokens.",
    historicalContext:
      "Asset tokenization was a major use case being explored in early 2016. Digix showed it was possible to represent real-world assets on Ethereum.",
    verificationStatus: "verified",
  },
  "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591": {
    address: "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591",
    runtimeBytecode: "0x60606040526000357c0100...",
    creationBytecode: null,
    deployerAddress: "0x1111111111111111111111111111111111111111",
    deploymentTxHash: "0x111222...",
    deploymentBlock: 1,
    deploymentTimestamp: "2015-07-30T15:00:00Z",
    decompiledCode: `# Palkeoramix decompiler.

const greeting = Array(len=13, data=mem[256])

#
#  Regular functions
#

def _fallback() payable: # default function
  stop

def greet() payable:
  return greeting

def kill() payable:
  require caller == 0x1111111111111111111111111111111111111111
  selfdestruct(caller)`,
    decompilationSuccess: true,
    currentBalanceWei: "0",
    transactionCount: 12,
    lastStateUpdate: "2024-01-01T00:00:00Z",
    gasUsed: 24000,
    gasPrice: "10000000000000",
    codeSizeBytes: 256,
    eraId: "frontier",
    era: ERAS.frontier,
    heuristics: {
      contractType: "unknown",
      confidence: 0.3,
      isProxy: false,
      hasSelfDestruct: true,
      isErc20Like: false,
      notes: "Contains SELFDESTRUCT opcode. Very early contract.",
    },
    ensName: null,
    etherscanVerified: false,
    etherscanContractName: "Genesis Contract",
    sourceCode: null,
    abi: null,
    compilerVersion: null,
    tokenName: null,
    tokenSymbol: null,
    tokenDecimals: null,
    tokenTotalSupply: null,
    shortDescription: "One of the earliest mainnet contracts.",
    description: null,
    historicalSummary:
      'One of the very first contracts deployed to Ethereum mainnet. A simple "Hello World" style contract.',
    historicalSignificance:
      "Historical significance as one of the earliest contracts. Demonstrates the primitive state of smart contract development.",
    historicalContext:
      "July 30, 2015 - the Frontier release. Ethereum was live, and developers immediately began experimenting.",
    verificationStatus: "bytecode_only",
  },
};

export const MOCK_BYTECODE_ANALYSIS: Record<string, BytecodeAnalysis> = {
  "0xbb9bc244d798123fde783fcc1c72d3bb8c189413": {
    contractAddress: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413",
    opcodeCount: 2500,
    uniqueOpcodeCount: 45,
    jumpCount: 180,
    jumpdestCount: 95,
    branchDensity: 0.072,
    storageOpsCount: 85,
    callOpsCount: 12,
    hasLoops: true,
    loopCount: 8,
    trigramHash: "a1b2c3d4e5f67890",
    controlFlowSignature: "J0180D0095B0720C012S0",
    shapeSignature: "O002500U045R0180",
  },
  "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426": {
    contractAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
    opcodeCount: 450,
    uniqueOpcodeCount: 28,
    jumpCount: 35,
    jumpdestCount: 18,
    branchDensity: 0.078,
    storageOpsCount: 12,
    callOpsCount: 0,
    hasLoops: true,
    loopCount: 2,
    trigramHash: "f0e1d2c3b4a59876",
    controlFlowSignature: "J0035D0018B0780C000S0",
    shapeSignature: "O000450U028R0622",
  },
  "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89": {
    contractAddress: "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89",
    opcodeCount: 1800,
    uniqueOpcodeCount: 42,
    jumpCount: 120,
    jumpdestCount: 65,
    branchDensity: 0.067,
    storageOpsCount: 55,
    callOpsCount: 8,
    hasLoops: true,
    loopCount: 5,
    trigramHash: "b2c3d4e5f6078901",
    controlFlowSignature: "J0120D0065B0670C008S0",
    shapeSignature: "O001800U042R0233",
  },
  "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5": {
    contractAddress: "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5",
    opcodeCount: 1500,
    uniqueOpcodeCount: 38,
    jumpCount: 95,
    jumpdestCount: 50,
    branchDensity: 0.063,
    storageOpsCount: 45,
    callOpsCount: 5,
    hasLoops: true,
    loopCount: 4,
    trigramHash: "c3d4e5f607890123",
    controlFlowSignature: "J0095D0050B0630C005S0",
    shapeSignature: "O001500U038R0253",
  },
  "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591": {
    contractAddress: "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591",
    opcodeCount: 120,
    uniqueOpcodeCount: 18,
    jumpCount: 8,
    jumpdestCount: 5,
    branchDensity: 0.067,
    storageOpsCount: 4,
    callOpsCount: 0,
    hasLoops: false,
    loopCount: 0,
    trigramHash: "d4e5f60789012345",
    controlFlowSignature: "J0008D0005B0670C000S1",
    shapeSignature: "O000120U018R1500",
  },
};

export const MOCK_SIMILARITIES: Record<string, ContractSimilarity[]> = {
  "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426": [
    {
      contractAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      matchedAddress: "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5",
      similarityScore: 0.78,
      ngramSimilarity: 0.82,
      controlFlowSimilarity: 0.71,
      shapeSimilarity: 0.65,
      similarityType: "structural",
      confidenceScore: 78,
      explanation:
        "These contracts share significant structural similarity. Both appear to be token contracts with similar transfer and balance patterns.",
      sharedPatterns: [
        "Shared opcode patterns: 145",
        "PUSH → DUP1 → SSTORE",
        "CALLER → PUSH → EQ",
        "Similar branching structure (35 vs 95 jumps)",
      ],
      matchedContract: {
        deploymentTimestamp: "2016-03-20T14:00:00Z",
        deployerAddress: "0xdef1234567890abcdef1234567890abcdef12345",
        heuristicContractType: "token",
        eraId: "homestead",
      },
    },
    {
      contractAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      matchedAddress: "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89",
      similarityScore: 0.65,
      ngramSimilarity: 0.68,
      controlFlowSimilarity: 0.62,
      shapeSimilarity: 0.58,
      similarityType: "weak",
      confidenceScore: 65,
      explanation:
        "These contracts have some structural overlap. Both use similar token-like patterns but differ in complexity.",
      sharedPatterns: [
        "Shared opcode patterns: 98",
        "PUSH → SLOAD",
        "Both use CALLER for access control",
      ],
      matchedContract: {
        deploymentTimestamp: "2016-03-14T08:00:00Z",
        deployerAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        heuristicContractType: "token",
        eraId: "homestead",
      },
    },
  ],
  "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5": [
    {
      contractAddress: "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5",
      matchedAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      similarityScore: 0.78,
      ngramSimilarity: 0.82,
      controlFlowSimilarity: 0.71,
      shapeSimilarity: 0.65,
      similarityType: "structural",
      confidenceScore: 78,
      explanation:
        "These contracts share significant structural similarity. Both appear to be token contracts with similar transfer and balance patterns.",
      sharedPatterns: [
        "Shared opcode patterns: 145",
        "PUSH → DUP1 → SSTORE",
        "CALLER → PUSH → EQ",
      ],
      matchedContract: {
        deploymentTimestamp: "2015-08-10T12:34:56Z",
        deployerAddress: "0x1234567890123456789012345678901234567890",
        heuristicContractType: "token",
        eraId: "frontier",
      },
    },
  ],
  "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89": [
    {
      contractAddress: "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89",
      matchedAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      similarityScore: 0.65,
      ngramSimilarity: 0.68,
      controlFlowSimilarity: 0.62,
      shapeSimilarity: 0.58,
      similarityType: "weak",
      confidenceScore: 65,
      explanation: "These contracts have some structural overlap.",
      sharedPatterns: ["Shared opcode patterns: 98", "PUSH → SLOAD"],
      matchedContract: {
        deploymentTimestamp: "2015-08-10T12:34:56Z",
        deployerAddress: "0x1234567890123456789012345678901234567890",
        heuristicContractType: "token",
        eraId: "frontier",
      },
    },
  ],
  "0xbb9bc244d798123fde783fcc1c72d3bb8c189413": [],
  "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591": [],
};

export const MOCK_PATTERNS: Record<string, DetectedPattern[]> = {
  "0xbb9bc244d798123fde783fcc1c72d3bb8c189413": [
    {
      id: 1,
      contractAddress: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413",
      patternName: "reentrancy_vulnerable",
      patternCategory: "security",
      bytecodeOffset: 1234,
      matchedSignature: "CALL...SSTORE",
      confidence: 0.9,
      description:
        "Contract appears to have a call pattern that may be vulnerable to reentrancy.",
      historicalNote:
        "This contract contained the infamous reentrancy vulnerability that was exploited in The DAO hack.",
    },
    {
      id: 2,
      contractAddress: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413",
      patternName: "proposal_voting",
      patternCategory: "governance",
      bytecodeOffset: null,
      matchedSignature: null,
      confidence: 0.85,
      description: "Contains patterns consistent with proposal/voting mechanisms.",
      historicalNote: "The DAO used an on-chain voting system for fund allocation.",
    },
  ],
  "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426": [
    {
      id: 3,
      contractAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      patternName: "token_transfer",
      patternCategory: "token",
      bytecodeOffset: null,
      matchedSignature: null,
      confidence: 0.92,
      description: "Implements basic token transfer functionality.",
      historicalNote: "This predates ERC-20 but implements similar concepts.",
    },
  ],
  "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591": [
    {
      id: 4,
      contractAddress: "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591",
      patternName: "selfdestruct",
      patternCategory: "lifecycle",
      bytecodeOffset: 100,
      matchedSignature: "SELFDESTRUCT",
      confidence: 1.0,
      description: "Contains SELFDESTRUCT opcode.",
      historicalNote:
        "Early contracts often included kill switches. This practice is now discouraged.",
    },
  ],
};

export const MOCK_SIGNATURES: Record<string, FunctionSignature[]> = {
  "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426": [
    {
      id: 1,
      contractAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      selector: "0x18160ddd",
      signature: "totalSupply()",
      source: "decompiled",
      confidence: 0.95,
      appearsToBeDescription: "Returns the total token supply",
      callCount: 12500,
    },
    {
      id: 2,
      contractAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      selector: "0x70a08231",
      signature: "balanceOf(address)",
      source: "decompiled",
      confidence: 0.95,
      appearsToBeDescription: "Returns token balance of an address",
      callCount: 45000,
    },
    {
      id: 3,
      contractAddress: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
      selector: "0xa9059cbb",
      signature: "transfer(address,uint256)",
      source: "decompiled",
      confidence: 0.95,
      appearsToBeDescription: "Transfers tokens to an address",
      callCount: 8900,
    },
  ],
  "0xbb9bc244d798123fde783fcc1c72d3bb8c189413": [
    {
      id: 4,
      contractAddress: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413",
      selector: "0x0221038a",
      signature: "proposals(uint256)",
      source: "verified_source",
      confidence: 1.0,
      appearsToBeDescription: "Returns proposal details by ID",
      callCount: 5600,
    },
    {
      id: 5,
      contractAddress: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413",
      selector: "0x237e9492",
      signature: "executeProposal(uint256,bytes)",
      source: "verified_source",
      confidence: 1.0,
      appearsToBeDescription: "Executes a passed proposal",
      callCount: 234,
    },
  ],
};

export const MOCK_FEATURED: FeaturedContract[] = [
  {
    address: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413",
    name: "The DAO",
    shortDescription:
      "The original decentralized autonomous organization. Its hack led to the Ethereum Classic fork.",
    eraId: "homestead",
    deploymentDate: "2016-04-30",
    significance:
      "The most significant smart contract failure in Ethereum history. Resulted in the DAO Fork.",
  },
  {
    address: "0xd1ceeeefa68a6af0a5f6046132d986066c7f9426",
    name: "Project Halo",
    shortDescription:
      "One of the earliest token contracts on Ethereum, predating ERC-20.",
    eraId: "frontier",
    deploymentDate: "2015-08-10",
    significance:
      "Demonstrates early experimentation with token concepts before standardization.",
  },
  {
    address: "0xc0ee9db1a9e07ca63e4ff0d5fb6f86bf68d47b89",
    name: "Augur Rep Token",
    shortDescription:
      "Early prediction market platform. Pioneered decentralized oracles.",
    eraId: "homestead",
    deploymentDate: "2016-03-14",
    significance:
      "One of the first major DApps, demonstrating complex on-chain logic.",
  },
  {
    address: "0x48c80f1f4d53d5951e5d5438b54cba84f29f32a5",
    name: "Digix DGD",
    shortDescription:
      "Early governance token for gold-backed tokens on Ethereum.",
    eraId: "homestead",
    deploymentDate: "2016-03-20",
    significance: "Pioneered tokenization of real-world assets.",
  },
  {
    address: "0xafc3cebb24f2b7a7e84052c90d0f6cd8cadd7591",
    name: "Genesis Contract",
    shortDescription:
      "One of the first contracts deployed on Ethereum mainnet.",
    eraId: "frontier",
    deploymentDate: "2015-07-30",
    significance:
      "Historical significance as one of the earliest mainnet deployments.",
  },
];
