/**
 * Data Loader for Ethereum History Contracts
 *
 * Loads contract data from JSON files and transforms it into the format
 * expected by the application.
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import type { Contract, EthereumEra } from "@/types";
import { ERAS, getEraFromBlock } from "@/types";

// Path to the data directory
const DATA_DIR = path.join(process.cwd(), "data");

const DATA_FILES = [
  "contracts_2015.json",
  "contracts_2016_2017_part1.json",
  "contracts_2016_2017_part2.json",
  "contracts_2016_2017_part3.json",
  "contracts_2016_2017_part4.json",
] as const;

const DEBUG = process.env.DATA_LOADER_DEBUG === "1";
function log(...args: unknown[]) {
  if (DEBUG) console.log(...args);
}
function warn(...args: unknown[]) {
  if (DEBUG) console.warn(...args);
}

type GlobalCache = {
  __ethereumhistory_contractsCache?: Map<string, Contract> | null;
  __ethereumhistory_contractsList?: Contract[] | null;
};
const globalCache = globalThis as unknown as GlobalCache;

// Cache for loaded contracts (persist across dev reloads via globalThis)
let contractsCache: Map<string, Contract> | null =
  globalCache.__ethereumhistory_contractsCache ?? null;
let contractsList: Contract[] | null =
  globalCache.__ethereumhistory_contractsList ?? null;

interface RawContract {
  address: string;
  runtime_bytecode?: string;
  deployment_timestamp?: string;
  block_number?: number;
  deployment_block?: number;
  creator?: string;
  deployer_address?: string;
  transaction_hash?: string;
  deployment_tx_hash?: string;
  gas_used?: number;
  gas_price?: number | string;
  decompilation_success?: boolean;
  decompiled_code?: string | null;
  extracted_functions?: string[];
  source_code?: string;
  abi?: string;
  contract_name?: string;
  // Token metadata (from 2016-2018 data)
  token_name?: string;
  token_symbol?: string;
  token_decimals?: number;
  is_token?: boolean;
}

function transformContract(raw: RawContract): Contract {
  const blockNumber = raw.block_number || raw.deployment_block || null;
  const era = blockNumber ? getEraFromBlock(blockNumber) : null;

  return {
    address: raw.address.toLowerCase(),
    runtimeBytecode: raw.runtime_bytecode || null,
    creationBytecode: null,
    deployerAddress: raw.creator || raw.deployer_address || null,
    deploymentTxHash: raw.transaction_hash || raw.deployment_tx_hash || null,
    deploymentBlock: blockNumber,
    deploymentTimestamp: raw.deployment_timestamp || null,
    decompiledCode: raw.decompiled_code || null,
    decompilationSuccess: raw.decompilation_success || false,
    currentBalanceWei: null,
    transactionCount: null,
    lastStateUpdate: null,
    gasUsed: raw.gas_used || null,
    gasPrice: raw.gas_price?.toString() || null,
    codeSizeBytes: raw.runtime_bytecode
      ? Math.floor((raw.runtime_bytecode.length - 2) / 2)
      : null,
    eraId: era?.id || null,
    era: era,
    heuristics: {
      contractType: detectContractType(raw),
      confidence: 0.5,
      isProxy: false,
      hasSelfDestruct: raw.decompiled_code?.toLowerCase().includes("selfdestruct") || false,
      isErc20Like: isErc20Like(raw),
      notes: null,
    },
    ensName: null,
    etherscanVerified: false,
    etherscanContractName: raw.contract_name || null,
    sourceCode: raw.source_code || null,
    abi: raw.abi || null,
    compilerVersion: null,
    tokenName: raw.token_name || null,
    tokenSymbol: raw.token_symbol || null,
    tokenDecimals: raw.token_decimals ?? null,
    tokenTotalSupply: null,
    shortDescription: null,
    description: null,
    historicalSummary: null,
    historicalSignificance: null,
    historicalContext: null,
    verificationStatus: raw.decompilation_success ? "decompiled" : "bytecode_only",
  };
}

function detectContractType(
  raw: RawContract
): Contract["heuristics"]["contractType"] {
  const code = raw.decompiled_code?.toLowerCase() || "";
  const funcs = raw.extracted_functions?.map((f) => f.toLowerCase()) || [];

  // Token patterns
  if (
    funcs.some((f) => ["transfer", "balanceof", "totalsupply", "sendcoin", "coinbalanceof"].includes(f)) ||
    code.includes("transfer") ||
    code.includes("balanceof")
  ) {
    return "token";
  }

  // DAO/Governance patterns
  if (
    funcs.some((f) => ["vote", "proposal", "execute"].includes(f)) ||
    code.includes("vote") ||
    code.includes("proposal")
  ) {
    return "dao";
  }

  // Multisig patterns
  if (
    funcs.some((f) => ["confirm", "revoke", "addowner", "removeowner"].includes(f)) ||
    code.includes("multisig") ||
    code.includes("owners")
  ) {
    return "multisig";
  }

  // Crowdsale patterns
  if (
    code.includes("crowdsale") ||
    code.includes("ico") ||
    (code.includes("buy") && code.includes("token"))
  ) {
    return "crowdsale";
  }

  // Wallet patterns
  if (funcs.some((f) => ["withdraw", "deposit"].includes(f))) {
    return "wallet";
  }

  return "unknown";
}

function isErc20Like(raw: RawContract): boolean {
  const funcs = raw.extracted_functions?.map((f) => f.toLowerCase()) || [];
  const code = raw.decompiled_code?.toLowerCase() || "";

  const erc20Functions = ["transfer", "balanceof", "totalsupply", "approve", "allowance"];
  const matchCount = erc20Functions.filter(
    (f) => funcs.includes(f) || code.includes(f)
  ).length;

  return matchCount >= 2;
}

function loadContractsFromFile(filename: string): RawContract[] {
  const filePath = path.join(DATA_DIR, filename);
  log(`[data-loader] Attempting to load: ${filePath}`);

  if (!existsSync(filePath)) {
    warn(`[data-loader] Data file not found: ${filePath}`);
    return [];
  }

  try {
    log(`[data-loader] Reading file: ${filename}`);
    const data = readFileSync(filePath, "utf-8");
    log(
      `[data-loader] Parsing JSON for ${filename} (${Math.round(
        data.length / 1024 / 1024
      )}MB)`
    );
    const parsed = JSON.parse(data);
    log(`[data-loader] Loaded ${parsed.length} contracts from ${filename}`);
    return parsed;
  } catch (error) {
    console.error(`[data-loader] Error loading data file ${filename}:`, error);
    return [];
  }
}

export function hasLocalDataFiles(): boolean {
  return DATA_FILES.some((f) => existsSync(path.join(DATA_DIR, f)));
}

export function loadAllContracts(): Contract[] {
  if (contractsList) {
    return contractsList;
  }

  const allRawContracts: RawContract[] = [];

  for (const file of DATA_FILES) {
    const contracts = loadContractsFromFile(file);
    allRawContracts.push(...contracts);
  }

  contractsList = allRawContracts.map(transformContract);

  // Also populate the cache
  contractsCache = new Map();
  for (const contract of contractsList) {
    contractsCache.set(contract.address.toLowerCase(), contract);
  }

  globalCache.__ethereumhistory_contractsCache = contractsCache;
  globalCache.__ethereumhistory_contractsList = contractsList;

  log(`Loaded ${contractsList.length} contracts from data files`);
  return contractsList;
}

export function getContractFromData(address: string): Contract | null {
  const normalizedAddress = address.toLowerCase();

  if (!contractsCache) {
    loadAllContracts();
  }

  return contractsCache?.get(normalizedAddress) || null;
}

export function searchContractsInData(
  query: string,
  searchType: "decompiled" | "bytecode" | "all" = "all",
  limit: number = 20
): Contract[] {
  const contracts = loadAllContracts();
  const lowerQuery = query.toLowerCase();
  const results: Contract[] = [];

  for (const contract of contracts) {
    let matched = false;

    // Search decompiled code
    if (
      (searchType === "decompiled" || searchType === "all") &&
      contract.decompiledCode &&
      contract.decompilationSuccess
    ) {
      if (contract.decompiledCode.toLowerCase().includes(lowerQuery)) {
        matched = true;
      }
    }

    // Search bytecode
    if (
      !matched &&
      (searchType === "bytecode" || searchType === "all") &&
      contract.runtimeBytecode
    ) {
      if (contract.runtimeBytecode.toLowerCase().includes(lowerQuery)) {
        matched = true;
      }
    }

    if (matched) {
      results.push(contract);
      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}

export function getContractsByEraFromData(eraId: string, limit: number = 50): Contract[] {
  const contracts = loadAllContracts();
  return contracts.filter((c) => c.eraId === eraId).slice(0, limit);
}

export function getDecompiledContractsCount(): number {
  const contracts = loadAllContracts();
  return contracts.filter((c) => c.decompilationSuccess).length;
}

export function getTotalContractsCount(): number {
  return loadAllContracts().length;
}

export function getFeaturedContractsFromData(limit: number = 6): Contract[] {
  const contracts = loadAllContracts();

  // Prioritize contracts with successful decompilation and detected types
  const featured = contracts
    .filter((c) => c.decompilationSuccess && c.heuristics.contractType !== "unknown")
    .sort((a, b) => {
      // Sort by deployment time (oldest first)
      if (a.deploymentTimestamp && b.deploymentTimestamp) {
        return new Date(a.deploymentTimestamp).getTime() - new Date(b.deploymentTimestamp).getTime();
      }
      return 0;
    })
    .slice(0, limit);

  return featured;
}
