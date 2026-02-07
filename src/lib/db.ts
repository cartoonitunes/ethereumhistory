/**
 * Database connection and query utilities
 *
 * Data source priority:
 * 1. PostgreSQL (Vercel Postgres) - for production
 * 2. JSON files (data/) - for local development
 * 3. Mock data - as final fallback
 */

import type {
  Contract,
  BytecodeAnalysis,
  ContractSimilarity,
  DetectedPattern,
  FunctionSignature,
  ContractPageData,
  EthereumEra,
  SearchResult,
  FeaturedContract,
  BytecodeSearchResult,
  UnifiedSearchResponse,
  UnifiedSearchResult,
} from "@/types";
import { ERAS, getEraFromBlock } from "@/types";
import {
  MOCK_CONTRACTS,
  MOCK_BYTECODE_ANALYSIS,
  MOCK_SIMILARITIES,
  MOCK_PATTERNS,
  MOCK_SIGNATURES,
  MOCK_FEATURED,
} from "./mock-data";
import {
  getContractFromData,
  loadAllContracts,
  searchContractsInData,
  getContractsByEraFromData,
  getFeaturedContractsFromData,
  getTotalContractsCount,
  getDecompiledContractsCount,
  hasLocalDataFiles,
} from "./data-loader";
import {
  isDatabaseConfigured,
  getContractByAddress as dbGetContract,
  updateContractTokenMetadataFromDb as dbUpdateContractTokenMetadata,
  updateContractEtherscanEnrichmentFromDb as dbUpdateContractEtherscanEnrichment,
  updateContractRuntimeBytecodeFromDb as dbUpdateContractRuntimeBytecode,
  updateContractDecompiledCodeFromDb as dbUpdateContractDecompiledCode,
  insertContractIfMissing as dbInsertContractIfMissing,
  updateContractEnsNamesFromDb as dbUpdateContractEnsNames,
  getContractMetadataJsonValueByKeyFromDb as dbGetContractMetadataJsonByKey,
  setContractMetadataJsonValueByKeyFromDb as dbSetContractMetadataJsonByKey,
  getPersonByAddressFromDb as dbGetPersonByAddress,
  getPersonBySlugFromDb as dbGetPersonBySlug,
  getContractsByEra as dbGetContractsByEra,
  getContractsByDeployerFromDb as dbGetContractsByDeployer,
  getRecentContractsFromDb as dbGetRecentContracts,
  getContractsByAddressesFromDb as dbGetContractsByAddresses,
  getFeaturedAddressesFromDb as dbGetFeaturedAddresses,
  searchDecompiledCode as dbSearchDecompiled,
  searchUnifiedFromDb as dbSearchUnified,
  searchPeopleFromDb as dbSearchPeople,
  getTotalContractCount as dbGetTotalCount,
  getDecompiledContractCount as dbGetDecompiledCount,
  getFeaturedContracts as dbGetFeatured,
  getSimilarContractsFromDb,
} from "./db-client";
import { fetchTokenMetadataFromRpc } from "./token-metadata";
import { fetchTxCountsByYearFromAlchemy, type TxCountsByYear } from "./tx-stats";
import {
  fetchRuntimeBytecodeFromRpc,
  findDeploymentBlockFromRpc,
} from "./bytecode";
import {
  fetchEtherscanAbi,
  fetchEtherscanContractCreation,
  fetchEtherscanSourceCode,
} from "./etherscan";
import { getEnsName } from "./ens";
import { decompileContract } from "./evm-decompile";

// =============================================================================
// Data Source Selection
// =============================================================================

/**
 * Check if PostgreSQL database is available and configured.
 * Returns true if POSTGRES_URL is set.
 */
function isDatabaseEnabled(): boolean {
  return isDatabaseConfigured();
}

/**
 * Try to use JSON file data, fall back to mock data if not available.
 */
function hasLocalJsonData(): boolean {
  return hasLocalDataFiles();
}

/**
 * JSON fallback is expensive (parses large files). Default behavior:
 * - If a database is configured, do NOT fall back to JSON unless explicitly enabled.
 * - If no database is configured, allow JSON fallback if local data exists.
 */
function allowJsonFallback(): boolean {
  if (!hasLocalJsonData()) return false;
  if (!isDatabaseEnabled()) return true;
  return process.env.ALLOW_JSON_FALLBACK === "1";
}

const FEATURED_ADDRESSES = [
  "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
  "0xf4eCEd2f682CE333f96f2D8966C613DeD8fC95DD",
  "0x8374f5CC22eDA52e960D9558fb48DD4b7946609a",
  "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
  "0xED6aC8de7c7CA7e3A22952e09C2a2A1232DDef9A",
  "0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413",
  "0x3eddc7ebc7db94f54b72d8ed1f42ce6a527305bb",
  "0xe468D26721b703D224d05563cB64746A7A40E1F4",
  "0xc7e9dDd5358e08417b1C88ed6f1a73149BEeaa32",
  "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
] as const;

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =============================================================================
// Contract Queries
// =============================================================================

export async function getContract(address: string): Promise<Contract | null> {
  const normalizedAddress = address.toLowerCase();
  let fromDb = false;

  // Priority 1: PostgreSQL database (production)
  if (isDatabaseEnabled()) {
    try {
      const dbContract = await dbGetContract(normalizedAddress);
      if (dbContract) {
        fromDb = true;
        const withEns = await ensureEnsNames(dbContract, fromDb);
        return withEns;
      }
    } catch (error) {
      console.error("[db] Database query failed, falling back:", error);
    }

    // If DB is configured, don't accidentally load huge JSON files unless opted in
    if (!allowJsonFallback()) {
      return null;
    }
  }

  // Priority 2: JSON file data (local development)
  if (allowJsonFallback()) {
    const realContract = getContractFromData(normalizedAddress);
    if (realContract) {
      const withEns = await ensureEnsNames(realContract, false);
      return withEns;
    }
  }

  // Priority 3: Mock data (fallback)
  const mock = MOCK_CONTRACTS[normalizedAddress] || null;
  if (mock) {
    return ensureEnsNames(mock, false);
  }
  return null;
}

/**
 * Resolve ENS names for contract and deployer when missing; persist to DB when fromDb.
 */
async function ensureEnsNames(
  contract: Contract,
  fromDb: boolean
): Promise<Contract> {
  const needContractName = contract.ensName == null;
  const needDeployerName =
    contract.deployerAddress != null && contract.deployerEnsName == null;
  if (!needContractName && !needDeployerName) return contract;

  try {
    const [ensName, deployerEnsName] = await Promise.all([
      needContractName ? getEnsName(contract.address) : Promise.resolve(null),
      needDeployerName
        ? getEnsName(contract.deployerAddress!)
        : Promise.resolve(null),
    ]);
    const resolvedContract =
      ensName != null || deployerEnsName != null
        ? {
            ...contract,
            ensName: ensName ?? contract.ensName,
            deployerEnsName: deployerEnsName ?? contract.deployerEnsName,
          }
        : contract;
    if (fromDb && (ensName != null || deployerEnsName != null)) {
      await dbUpdateContractEnsNames(contract.address, {
        ensName: resolvedContract.ensName,
        deployerEnsName: resolvedContract.deployerEnsName,
      }).catch((err) =>
        console.warn("[db] Failed to persist ENS names:", err)
      );
    }
    return resolvedContract;
  } catch {
    return contract;
  }
}

/**
 * If token metadata fields are missing in DB, try to fill them via RPC at render time.
 * (No UI button needed; this happens automatically.)
 */
export async function getContractWithTokenMetadata(address: string): Promise<Contract | null> {
  const contract = await getContract(address);
  if (!contract) return null;

  // ---------------------------------------------------------------------------
  // Optional Etherscan enrichment (ABI, verified source, creator + creation tx)
  // ---------------------------------------------------------------------------
  const etherscanKey = process.env.ETHERSCAN_API_KEY;
  const mayNeedEtherscan =
    !contract.abi ||
    !contract.deployerAddress ||
    !contract.deploymentTxHash ||
    !contract.deploymentBlock ||
    !contract.deploymentTimestamp ||
    (!contract.sourceCode && !contract.etherscanContractName);

  if (etherscanKey && mayNeedEtherscan) {
    const patch: Parameters<typeof dbUpdateContractEtherscanEnrichment>[1] = {};
    const merged: Partial<Contract> = {};

    // Deployer + creation tx + block/timestamp
    if (
      !contract.deployerAddress ||
      !contract.deploymentTxHash ||
      !contract.deploymentBlock ||
      !contract.deploymentTimestamp
    ) {
      try {
        const creation = await fetchEtherscanContractCreation(contract.address);
        if (creation) {
          if (!contract.deployerAddress && creation.contractCreator) {
            merged.deployerAddress = creation.contractCreator;
            patch.deployerAddress = creation.contractCreator;
          }
          if (!contract.deploymentTxHash && creation.txHash) {
            merged.deploymentTxHash = creation.txHash;
            patch.deploymentTxHash = creation.txHash;
          }
          if (!contract.deploymentBlock && creation.blockNumber != null) {
            merged.deploymentBlock = creation.blockNumber;
            patch.deploymentBlock = creation.blockNumber;
          }
          if (!contract.deploymentTimestamp && creation.timestamp) {
            merged.deploymentTimestamp = creation.timestamp;
            patch.deploymentTimestamp = new Date(creation.timestamp);
          }
        }
      } catch (error) {
        console.warn("[etherscan] contract creation lookup failed:", error);
      }
    }

    // ABI
    if (!contract.abi) {
      try {
        const abi = await fetchEtherscanAbi(contract.address);
        if (abi) {
          merged.abi = abi;
          patch.abi = abi;
        }
      } catch (error) {
        console.warn("[etherscan] abi lookup failed:", error);
      }
    }

    // Verified source + contract name (only if verified)
    if (!contract.sourceCode || !contract.etherscanContractName) {
      try {
        const source = await fetchEtherscanSourceCode(contract.address);
        if (source?.isVerified) {
          if (!contract.etherscanContractName && source.contractName) {
            merged.etherscanContractName = source.contractName;
            patch.etherscanContractName = source.contractName;
          }
          if (!contract.sourceCode && source.sourceCode) {
            merged.sourceCode = source.sourceCode;
            patch.sourceCode = source.sourceCode;
          }
          // ABI is also returned here; fill if still missing.
          if (!contract.abi && source.abi) {
            merged.abi = source.abi;
            patch.abi = source.abi;
          }
        }
      } catch (error) {
        console.warn("[etherscan] source lookup failed:", error);
      }
    }

    if (Object.keys(merged).length > 0) {
      Object.assign(contract, merged);

      // Persist back to DB so future renders don't need Etherscan calls.
      if (isDatabaseEnabled() && Object.keys(patch).length > 0) {
        try {
          await dbUpdateContractEtherscanEnrichment(contract.address, patch);
        } catch (error) {
          console.warn("[db] Failed to persist Etherscan enrichment:", error);
        }
      }
    }
  }

  const needsTokenMeta =
    (!contract.tokenName && !contract.tokenSymbol && contract.tokenDecimals == null && !contract.tokenLogo) ||
    !contract.tokenLogo ||
    !contract.tokenName ||
    !contract.tokenSymbol ||
    contract.tokenDecimals == null;

  if (!needsTokenMeta) return contract;

  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) return contract;

  const fetched = await fetchTokenMetadataFromRpc(rpcUrl, contract.address);
  if (!fetched) return contract;

  const merged: Contract = {
    ...contract,
    tokenName: contract.tokenName ?? fetched.name,
    tokenSymbol: contract.tokenSymbol ?? fetched.symbol,
    tokenDecimals: contract.tokenDecimals ?? fetched.decimals,
    tokenLogo: contract.tokenLogo ?? fetched.logo,
  };

  // Persist back to DB so future renders don't need RPC calls.
  if (isDatabaseEnabled()) {
    const patch: Parameters<typeof dbUpdateContractTokenMetadata>[1] = {};
    if (contract.tokenName == null && fetched.name != null) patch.tokenName = fetched.name;
    if (contract.tokenSymbol == null && fetched.symbol != null) patch.tokenSymbol = fetched.symbol;
    if (contract.tokenDecimals == null && fetched.decimals != null) patch.tokenDecimals = fetched.decimals;
    if (contract.tokenLogo == null && fetched.logo != null) patch.tokenLogo = fetched.logo;

    if (Object.keys(patch).length > 0) {
      try {
        await dbUpdateContractTokenMetadata(contract.address, patch);
      } catch (error) {
        // Non-fatal: page should still render even if persistence fails.
        console.warn("[db] Failed to persist token metadata:", error);
      }
    }
  }

  return merged;
}

async function enrichTokenMetadataInPlace(
  contract: Contract,
  opts?: { persistToDb?: boolean }
): Promise<Contract> {
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) return contract;

  const needsTokenMeta =
    (!contract.tokenName && !contract.tokenSymbol && contract.tokenDecimals == null && !contract.tokenLogo) ||
    !contract.tokenLogo ||
    !contract.tokenName ||
    !contract.tokenSymbol ||
    contract.tokenDecimals == null;

  if (!needsTokenMeta) return contract;

  const fetched = await fetchTokenMetadataFromRpc(rpcUrl, contract.address);
  if (!fetched) return contract;

  const merged: Contract = {
    ...contract,
    tokenName: contract.tokenName ?? fetched.name,
    tokenSymbol: contract.tokenSymbol ?? fetched.symbol,
    tokenDecimals: contract.tokenDecimals ?? fetched.decimals,
    tokenLogo: contract.tokenLogo ?? fetched.logo,
  };

  const persistToDb = opts?.persistToDb === true;
  if (persistToDb && isDatabaseEnabled()) {
    const patch: Parameters<typeof dbUpdateContractTokenMetadata>[1] = {};
    if (contract.tokenName == null && fetched.name != null) patch.tokenName = fetched.name;
    if (contract.tokenSymbol == null && fetched.symbol != null) patch.tokenSymbol = fetched.symbol;
    if (contract.tokenDecimals == null && fetched.decimals != null) patch.tokenDecimals = fetched.decimals;
    if (contract.tokenLogo == null && fetched.logo != null) patch.tokenLogo = fetched.logo;

    if (Object.keys(patch).length > 0) {
      try {
        await dbUpdateContractTokenMetadata(contract.address, patch);
      } catch (error) {
        console.warn("[db] Failed to persist token metadata:", error);
      }
    }
  }

  return merged;
}

/**
 * If runtime bytecode is missing, try to fill it via RPC at render time.
 * This is needed for any contract records that were seeded without bytecode.
 */
async function getContractWithRuntimeBytecode(contract: Contract): Promise<Contract> {
  if (contract.runtimeBytecode != null) return contract;

  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) return contract;

  try {
    const code = await fetchRuntimeBytecodeFromRpc(rpcUrl, contract.address);
    if (!code) return contract;

    const codeSizeBytes = code.startsWith("0x")
      ? Math.floor((code.length - 2) / 2)
      : Math.floor(code.length / 2);

    const merged: Contract = {
      ...contract,
      runtimeBytecode: code,
      codeSizeBytes: contract.codeSizeBytes ?? codeSizeBytes,
    };

    if (isDatabaseEnabled()) {
      try {
        await dbUpdateContractRuntimeBytecode(contract.address, {
          runtimeBytecode: code,
          codeSizeBytes,
        });
      } catch (error) {
        console.warn("[db] Failed to persist runtime bytecode:", error);
      }
    }

    return merged;
  } catch (error) {
    console.warn("[rpc] eth_getCode failed:", error);
    return contract;
  }
}

type IngestedContractForPage = {
  contract: Contract;
  archiveNotice: string | null;
  persisted: boolean;
};

async function ingestContractForPageIfMissing(address: string): Promise<IngestedContractForPage | null> {
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) return null;

  // Must have code at latest or it's an EOA / selfdestructed contract.
  const runtimeBytecode = await fetchRuntimeBytecodeFromRpc(rpcUrl, address);
  if (!runtimeBytecode || runtimeBytecode === "0x") return null;

  const codeSizeBytes = runtimeBytecode.startsWith("0x")
    ? Math.floor((runtimeBytecode.length - 2) / 2)
    : Math.floor(runtimeBytecode.length / 2);

  const deployment = await findDeploymentBlockFromRpc(rpcUrl, address);
  const deploymentBlock = deployment?.deploymentBlock ?? null;
  const deploymentTimestamp = deployment?.deploymentTimestamp ?? null;

  const year =
    deploymentTimestamp != null ? new Date(deploymentTimestamp).getUTCFullYear() : null;

  const outOfRange = year != null && year >= 2018;
  let archiveNotice = outOfRange
    ? "This contract appears to have been deployed in 2018 or later. Ethereum History is currently logging 2015–2017; newer years will be added in the future."
    : null;

  const era = deploymentBlock != null ? getEraFromBlock(deploymentBlock) : null;

  // Opportunistically fetch token metadata before persistence so the inserted
  // row is immediately searchable (e.g. searching "punk" after first visit).
  let tokenName: string | null = null;
  let tokenSymbol: string | null = null;
  let tokenDecimals: number | null = null;
  let tokenLogo: string | null = null;
  try {
    const token = await fetchTokenMetadataFromRpc(rpcUrl, address);
    if (token) {
      tokenName = token.name ?? null;
      tokenSymbol = token.symbol ?? null;
      tokenDecimals = token.decimals ?? null;
      tokenLogo = token.logo ?? null;
    }
  } catch (error) {
    console.warn("[rpc] token metadata lookup failed:", error);
  }

  const contract: Contract = {
    address: address.toLowerCase(),
    runtimeBytecode,
    creationBytecode: null,
    deployerAddress: null,
    deploymentTxHash: null,
    deploymentBlock,
    deploymentTimestamp,
    decompiledCode: null,
    decompilationSuccess: false,
    currentBalanceWei: null,
    transactionCount: null,
    lastStateUpdate: null,
    gasUsed: null,
    gasPrice: null,
    codeSizeBytes,
    eraId: era?.id || null,
    era,
    heuristics: {
      contractType: null,
      confidence: 0.5,
      isProxy: false,
      hasSelfDestruct: false,
      isErc20Like: false,
      notes: null,
    },
    ensName: null,
    deployerEnsName: null,
    etherscanVerified: false,
    etherscanContractName: null,
    sourceCode: null,
    abi: null,
    compilerVersion: null,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenLogo,
    tokenTotalSupply: null,
    shortDescription: null,
    description: null,
    historicalSummary: null,
    historicalSignificance: null,
    historicalContext: null,
    verificationStatus: "bytecode_only",
  };

  // Persist whenever DB is enabled (regardless of year).
  const canPersist = isDatabaseEnabled();
  let persisted = false;

  if (canPersist) {
    try {
      await dbInsertContractIfMissing({
        address: contract.address,
        runtimeBytecode: contract.runtimeBytecode,
        deployerAddress: contract.deployerAddress,
        deploymentTxHash: contract.deploymentTxHash,
        deploymentBlock: contract.deploymentBlock,
        deploymentTimestamp: contract.deploymentTimestamp ? new Date(contract.deploymentTimestamp) : null,
        decompiledCode: contract.decompiledCode,
        decompilationSuccess: contract.decompilationSuccess,
        gasUsed: contract.gasUsed,
        gasPrice: contract.gasPrice,
        codeSizeBytes: contract.codeSizeBytes,
        eraId: contract.eraId,
        contractType: null,
        confidence: 0.5,
        isProxy: false,
        hasSelfDestruct: false,
        isErc20Like: false,
        etherscanContractName: null,
        sourceCode: null,
        abi: null,
        tokenName: contract.tokenName,
        tokenSymbol: contract.tokenSymbol,
        tokenDecimals: contract.tokenDecimals,
        tokenLogo: contract.tokenLogo,
        trigramHash: null,
        controlFlowSignature: null,
        shapeSignature: null,
        shortDescription: null,
        description: null,
        historicalSummary: null,
        historicalSignificance: null,
        historicalContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      persisted = true;
    } catch (error) {
      console.warn("[db] Failed to insert new contract row:", error);
      // Help users understand why a refresh "re-pulls" data.
      archiveNotice =
        (archiveNotice ? `${archiveNotice} ` : "") +
        "We couldn’t save this contract to the archive right now (database write failed), so it may need to be looked up again on future visits.";
    }
  }

  // Optional: verified source / ABI / contract name via Etherscan (best-effort).
  // This also helps search discoverability for non-token contracts.
  if (process.env.ETHERSCAN_API_KEY) {
    const patch: Parameters<typeof dbUpdateContractEtherscanEnrichment>[1] = {};
    try {
      const source = await fetchEtherscanSourceCode(contract.address);
      if (source?.isVerified) {
        if (source.contractName) {
          contract.etherscanContractName = source.contractName;
          patch.etherscanContractName = source.contractName;
        }
        if (source.sourceCode) {
          contract.sourceCode = source.sourceCode;
          patch.sourceCode = source.sourceCode;
        }
        if (source.abi) {
          contract.abi = source.abi;
          patch.abi = source.abi;
        }
      }
    } catch (error) {
      console.warn("[etherscan] source lookup failed:", error);
    }

    if (!contract.abi) {
      try {
        const abi = await fetchEtherscanAbi(contract.address);
        if (abi) {
          contract.abi = abi;
          patch.abi = abi;
        }
      } catch (error) {
        console.warn("[etherscan] abi lookup failed:", error);
      }
    }

    // Deployer/creation tx (only if missing)
    if (!contract.deployerAddress || !contract.deploymentTxHash) {
      try {
        const creation = await fetchEtherscanContractCreation(contract.address);
        if (creation) {
          if (!contract.deployerAddress && creation.contractCreator) {
            contract.deployerAddress = creation.contractCreator;
            patch.deployerAddress = creation.contractCreator;
          }
          if (!contract.deploymentTxHash && creation.txHash) {
            contract.deploymentTxHash = creation.txHash;
            patch.deploymentTxHash = creation.txHash;
          }
          if (!contract.deploymentBlock && creation.blockNumber != null) {
            contract.deploymentBlock = creation.blockNumber;
            patch.deploymentBlock = creation.blockNumber;
          }
          if (!contract.deploymentTimestamp && creation.timestamp) {
            contract.deploymentTimestamp = creation.timestamp;
            patch.deploymentTimestamp = new Date(creation.timestamp);
          }
        }
      } catch (error) {
        console.warn("[etherscan] contract creation lookup failed:", error);
      }
    }

    if (persisted && Object.keys(patch).length > 0) {
      try {
        await dbUpdateContractEtherscanEnrichment(contract.address, patch);
      } catch (error) {
        console.warn("[db] Failed to persist Etherscan enrichment:", error);
      }
    }
  }

  return { contract, archiveNotice, persisted };
}

const TX_COUNTS_BY_YEAR_METADATA_KEY = "tx_counts_by_year_external_to_v1";

async function getOrFetchTxCountsByYear(address: string): Promise<TxCountsByYear | null> {
  if (!isDatabaseEnabled()) return null;

  try {
    const existing = await dbGetContractMetadataJsonByKey(address, TX_COUNTS_BY_YEAR_METADATA_KEY);
    if (existing) {
      // Accept either {counts, truncated} or a raw counts record from earlier experiments.
      if (
        typeof existing === "object" &&
        existing !== null &&
        "counts" in (existing as any) &&
        typeof (existing as any).counts === "object"
      ) {
        return existing as TxCountsByYear;
      }
      if (typeof existing === "object" && existing !== null) {
        return { counts: existing as Record<string, number>, truncated: false };
      }
    }
  } catch (error) {
    console.warn("[db] Failed to read tx counts metadata:", error);
  }

  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) return null;

  try {
    const txCounts = await fetchTxCountsByYearFromAlchemy(rpcUrl, address, {
      // Safety valve: early contracts are fine; very active addresses could be huge.
      maxTransfers: 50_000,
    });

    try {
      await dbSetContractMetadataJsonByKey(
        address,
        TX_COUNTS_BY_YEAR_METADATA_KEY,
        txCounts,
        "alchemy_getAssetTransfers"
      );
    } catch (error) {
      console.warn("[db] Failed to persist tx counts metadata:", error);
    }

    return txCounts;
  } catch (error) {
    console.warn("[alchemy] tx counts lookup failed:", error);
    return null;
  }
}

export async function getContractsByDeployer(deployerAddress: string): Promise<Contract[]> {
  const normalizedAddress = deployerAddress.toLowerCase();

  // Priority 1: PostgreSQL database
  if (isDatabaseEnabled()) {
    try {
      return await dbGetContractsByDeployer(normalizedAddress, 200);
    } catch (error) {
      console.error("[db] Database query failed, falling back:", error);
    }

    if (!allowJsonFallback()) {
      return [];
    }
  }

  if (allowJsonFallback()) {
    const contracts = loadAllContracts();
    return contracts.filter(
      (c) => c.deployerAddress?.toLowerCase() === normalizedAddress
    );
  }

  return Object.values(MOCK_CONTRACTS).filter(
    (c) => c.deployerAddress?.toLowerCase() === normalizedAddress
  );
}

export async function getContractsByEra(eraId: string, limit = 50): Promise<Contract[]> {
  // Priority 1: PostgreSQL database
  if (isDatabaseEnabled()) {
    try {
      return await dbGetContractsByEra(eraId, limit);
    } catch (error) {
      console.error("[db] Database query failed, falling back:", error);
    }

    if (!allowJsonFallback()) {
      return [];
    }
  }

  // Priority 2: JSON file data
  if (allowJsonFallback()) {
    return getContractsByEraFromData(eraId, limit);
  }

  // Priority 3: Mock data
  return Object.values(MOCK_CONTRACTS)
    .filter((c) => c.eraId === eraId)
    .slice(0, limit);
}

export async function getRecentContracts(limit = 10): Promise<Contract[]> {
  // Priority 1: PostgreSQL database
  if (isDatabaseEnabled()) {
    try {
      return await dbGetRecentContracts(limit);
    } catch (error) {
      console.error("[db] Database query failed, falling back:", error);
    }

    if (!allowJsonFallback()) {
      return [];
    }
  }

  if (allowJsonFallback()) {
    const contracts = loadAllContracts();
    return contracts
      .sort((a, b) => {
        if (a.deploymentTimestamp && b.deploymentTimestamp) {
          return new Date(b.deploymentTimestamp).getTime() - new Date(a.deploymentTimestamp).getTime();
        }
        return 0;
      })
      .slice(0, limit);
  }

  return Object.values(MOCK_CONTRACTS).slice(0, limit);
}

// =============================================================================
// Bytecode Analysis Queries
// =============================================================================

export async function getBytecodeAnalysis(address: string): Promise<BytecodeAnalysis | null> {
  const normalizedAddress = address.toLowerCase();

  // For now, generate basic analysis from contract data if available
  const contract = await getContract(normalizedAddress);
  if (contract && contract.runtimeBytecode) {
    const bytecode = contract.runtimeBytecode;
    const hexStr = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;

    // Basic bytecode analysis
    return {
      contractAddress: normalizedAddress,
      opcodeCount: Math.floor(hexStr.length / 2),
      uniqueOpcodeCount: new Set(hexStr.match(/.{2}/g) || []).size,
      jumpCount: (hexStr.match(/56|57/g) || []).length,
      jumpdestCount: (hexStr.match(/5b/g) || []).length,
      branchDensity: 0.05,
      storageOpsCount: (hexStr.match(/54|55/g) || []).length,
      callOpsCount: (hexStr.match(/f1|f2|f4|fa/g) || []).length,
      hasLoops: contract.decompiledCode?.includes("while") || contract.decompiledCode?.includes("for") || false,
      loopCount: 0,
      trigramHash: hexStr.slice(0, 16),
      controlFlowSignature: `J${(hexStr.match(/56|57/g) || []).length}D${(hexStr.match(/5b/g) || []).length}`,
      shapeSignature: `O${Math.floor(hexStr.length / 2)}`,
    };
  }

  return MOCK_BYTECODE_ANALYSIS[normalizedAddress] || null;
}

// =============================================================================
// Similarity Queries
// =============================================================================

import { findSimilarContracts } from "./similarity";

export async function getSimilarContracts(
  address: string,
  limit = 10
): Promise<ContractSimilarity[]> {
  const normalizedAddress = address.toLowerCase();

  // Priority 1: Pre-computed similarity index from database
  if (isDatabaseEnabled()) {
    try {
      const dbSimilarities = await getSimilarContractsFromDb(normalizedAddress, limit);
      if (dbSimilarities.length > 0) {
        return dbSimilarities;
      }
    } catch (error) {
      console.error("[db] Database similarity query failed, falling back:", error);
    }
  }

  // Priority 2: Real-time similarity matching using JSON data
  if (allowJsonFallback()) {
    const targetContract = await getContract(normalizedAddress);
    if (targetContract && targetContract.runtimeBytecode) {
      const allContracts = loadAllContracts();
      // Limit candidates to improve performance - sample contracts with bytecode
      const candidates = allContracts
        .filter((c) => c.runtimeBytecode && c.address !== normalizedAddress)
        .slice(0, 500); // Limit to 500 for performance

      const similarities = findSimilarContracts(targetContract, candidates, limit);
      if (similarities.length > 0) {
        return similarities;
      }
    }
  }

  // Priority 3: Mock similarities
  return (MOCK_SIMILARITIES[normalizedAddress] || []).slice(0, limit);
}

// =============================================================================
// Pattern Detection Queries
// =============================================================================

export async function getDetectedPatterns(address: string): Promise<DetectedPattern[]> {
  const normalizedAddress = address.toLowerCase();

  // Generate patterns from decompiled code if available
  const contract = await getContract(normalizedAddress);
  if (contract && contract.decompiledCode && contract.decompilationSuccess) {
    const patterns: DetectedPattern[] = [];
    const code = contract.decompiledCode.toLowerCase();

    if (code.includes("selfdestruct")) {
      patterns.push({
        id: 1,
        contractAddress: normalizedAddress,
        patternName: "selfdestruct",
        patternCategory: "lifecycle",
        bytecodeOffset: null,
        matchedSignature: "SELFDESTRUCT",
        confidence: 1.0,
        description: "Contains SELFDESTRUCT opcode - contract can be destroyed.",
        historicalNote: "Early contracts often included kill switches.",
      });
    }

    if (code.includes("transfer") || code.includes("sendcoin")) {
      patterns.push({
        id: 2,
        contractAddress: normalizedAddress,
        patternName: "token_transfer",
        patternCategory: "token",
        bytecodeOffset: null,
        matchedSignature: null,
        confidence: 0.85,
        description: "Implements token transfer functionality.",
        historicalNote: null,
      });
    }

    if (code.includes("owner") || code.includes("require caller ==")) {
      patterns.push({
        id: 3,
        contractAddress: normalizedAddress,
        patternName: "owner_check",
        patternCategory: "access_control",
        bytecodeOffset: null,
        matchedSignature: null,
        confidence: 0.8,
        description: "Has owner/admin access control pattern.",
        historicalNote: null,
      });
    }

    if (patterns.length > 0) {
      return patterns;
    }
  }

  return MOCK_PATTERNS[normalizedAddress] || [];
}

// =============================================================================
// Function Signature Queries
// =============================================================================

export async function getFunctionSignatures(address: string): Promise<FunctionSignature[]> {
  const normalizedAddress = address.toLowerCase();

  // Extract function signatures from decompiled code if available
  const contract = await getContract(normalizedAddress);
  if (contract && contract.decompiledCode && contract.decompilationSuccess) {
    const signatures: FunctionSignature[] = [];
    const funcPattern = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
    let match;
    let id = 1;

    while ((match = funcPattern.exec(contract.decompiledCode)) !== null) {
      const funcName = match[1];
      const params = match[2];

      // Skip fallback
      if (funcName === "_fallback") continue;

      signatures.push({
        id: id++,
        contractAddress: normalizedAddress,
        selector: "0x" + funcName.slice(0, 8).padEnd(8, "0"),
        signature: `${funcName}(${params})`,
        source: "decompiled",
        confidence: 0.85,
        appearsToBeDescription: null,
        callCount: null,
      });
    }

    if (signatures.length > 0) {
      return signatures;
    }
  }

  return MOCK_SIGNATURES[normalizedAddress] || [];
}

// =============================================================================
// Full Contract Page Data
// =============================================================================

export async function getContractPageData(address: string): Promise<ContractPageData | null> {
  let contract = await getContractWithTokenMetadata(address);
  let archiveNotice: string | null = null;

  if (!contract) {
    // Not in DB — try to fetch enough data to render the page.
    const ingested = await ingestContractForPageIfMissing(address);
    if (!ingested) return null;
    // Token metadata is fetched inside ingest to make the row immediately searchable;
    // this is a no-op if already present.
    contract = await enrichTokenMetadataInPlace(ingested.contract, { persistToDb: ingested.persisted });
    archiveNotice = ingested.archiveNotice;
  }

  // Ensure bytecode exists (some seed sources only have decompiled code).
  contract = await getContractWithRuntimeBytecode(contract);

  // On-the-fly decompilation when no source and no decompiled code
  if (
    contract.runtimeBytecode &&
    !contract.sourceCode &&
    !contract.decompiledCode
  ) {
    try {
      const decompileResult = decompileContract(contract.runtimeBytecode);
      if (decompileResult.success && decompileResult.decompiledCode) {
        contract = {
          ...contract,
          decompiledCode: decompileResult.decompiledCode,
          decompilationSuccess: true,
        };

        // Persist to DB so future loads are instant (fire-and-forget)
        if (isDatabaseEnabled()) {
          dbUpdateContractDecompiledCode(contract.address, {
            decompiledCode: decompileResult.decompiledCode,
            decompilationSuccess: true,
          }).catch((err) =>
            console.warn("[decompile] Failed to persist decompilation:", err)
          );
        }
      }
    } catch (err) {
      console.warn("[decompile] On-the-fly decompilation failed:", err);
    }
  }

  const deployerPersonPromise =
    contract.deployerAddress && isDatabaseEnabled()
      ? (async () => {
          try {
            return await dbGetPersonByAddress(contract.deployerAddress!);
          } catch (error) {
            console.warn("[db] Failed to load deployer person:", error);
            return null;
          }
        })()
      : Promise.resolve(null);

  const [bytecodeAnalysis, similarContracts, detectedPatterns, functionSignatures, txCountsByYear] =
    await Promise.all([
      getBytecodeAnalysis(address),
      getSimilarContracts(address),
      getDetectedPatterns(address),
      getFunctionSignatures(address),
      getOrFetchTxCountsByYear(contract.address),
    ]);

  return {
    contract,
    bytecodeAnalysis,
    similarContracts,
    detectedPatterns,
    functionSignatures,
    deployerPerson: await deployerPersonPromise,
    txCountsByYear,
    archiveNotice,
  };
}

export async function getPersonBySlug(slug: string) {
  if (!isDatabaseEnabled()) return null;
  try {
    return await dbGetPersonBySlug(slug);
  } catch (error) {
    console.warn("[db] Failed to load person by slug:", error);
    return null;
  }
}

// =============================================================================
// Search
// =============================================================================

export async function searchAddress(query: string): Promise<SearchResult | null> {
  const normalized = query.toLowerCase().trim();

  // Check if it looks like an address
  if (!normalized.startsWith("0x") || normalized.length !== 42) {
    return null;
  }

  const contract = await getContract(normalized);
  if (contract) {
    return {
      address: contract.address,
      isContract: true,
      deploymentBlock: contract.deploymentBlock,
      eraId: contract.eraId,
      heuristicContractType: contract.heuristics.contractType,
      ensName: contract.ensName,
    };
  }

  return {
    address: normalized,
    isContract: false,
    deploymentBlock: null,
    eraId: null,
    heuristicContractType: null,
    ensName: null,
  };
}

// =============================================================================
// Featured Content
// =============================================================================

export async function getFeaturedContracts(): Promise<FeaturedContract[]> {
  // Priority 1: PostgreSQL database
  if (isDatabaseEnabled()) {
    try {
      // Use featured flag from DB; fall back to hardcoded list if none set.
      let addresses = await dbGetFeaturedAddresses();
      if (addresses.length === 0) {
        addresses = [...FEATURED_ADDRESSES];
      }
      const randomizedAddresses = shuffle(addresses);
      const featured = (await dbGetContractsByAddresses(randomizedAddresses)).slice(0, 6);
      return featured.map((c) => ({
        address: c.address,
        name: c.etherscanContractName || `Contract ${c.address.slice(0, 10)}...`,
        shortDescription:
          c.shortDescription ||
          c.historicalSummary ||
          (c.decompiledCode
            ? `Decompiled contract with ${c.heuristics.contractType} patterns detected.`
            : "Early Ethereum contract from the Frontier/Homestead era."),
        eraId: c.eraId || "frontier",
        deploymentDate: c.deploymentTimestamp?.split("T")[0] || "Unknown",
        significance: c.historicalSignificance || "Historical early Ethereum contract.",
      }));
    } catch (error) {
      console.error("[db] Database featured query failed, falling back:", error);
    }

    if (!allowJsonFallback()) {
      return MOCK_FEATURED;
    }
  }

  // Priority 2: JSON file data
  if (allowJsonFallback()) {
    const featured = getFeaturedContractsFromData(6);
    return featured.map((c) => ({
      address: c.address,
      name: c.etherscanContractName || `Contract ${c.address.slice(0, 10)}...`,
      shortDescription: c.decompiledCode
        ? `Decompiled contract with ${c.heuristics.contractType} patterns detected.`
        : "Early Ethereum contract from the Frontier/Homestead era.",
      eraId: c.eraId || "frontier",
      deploymentDate: c.deploymentTimestamp?.split("T")[0] || "Unknown",
      significance: c.historicalSignificance || "Historical early Ethereum contract.",
    }));
  }

  // Priority 3: Mock data
  return MOCK_FEATURED;
}

// =============================================================================
// Bytecode/Decompiled Code Search
// =============================================================================

export async function searchBytecodeContent(
  query: string,
  searchType: "decompiled" | "bytecode" | "all" = "all",
  limit: number = 20
): Promise<BytecodeSearchResult[]> {
  const results: BytecodeSearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Determine data source
  let contracts: Contract[] = [];

  // Priority 1: PostgreSQL database (for decompiled code search)
  if (isDatabaseEnabled() && (searchType === "decompiled" || searchType === "all")) {
    try {
      contracts = await dbSearchDecompiled(query, limit * 2);
    } catch (error) {
      console.error("[db] Database search failed, falling back:", error);
    }
  }

  // Priority 2: JSON file data
  if (contracts.length === 0 && allowJsonFallback()) {
    contracts = searchContractsInData(query, searchType, limit * 2);
  }

  // Priority 3: Mock data
  if (contracts.length === 0) {
    contracts = Object.values(MOCK_CONTRACTS);
  }

  for (const contract of contracts) {
    let matchType: "bytecode" | "decompiled" | "function_name" | null = null;
    let matchContext = "";

    // Search decompiled code
    if (
      (searchType === "decompiled" || searchType === "all") &&
      contract.decompiledCode &&
      contract.decompilationSuccess
    ) {
      const lowerDecompiled = contract.decompiledCode.toLowerCase();
      const matchIndex = lowerDecompiled.indexOf(lowerQuery);

      if (matchIndex !== -1) {
        // Check if it's a function name match
        const funcMatch = contract.decompiledCode.match(
          new RegExp(`def\\s+(${query}[a-zA-Z0-9_]*)\\s*\\(`, "i")
        );
        if (funcMatch) {
          matchType = "function_name";
          const funcIndex = lowerDecompiled.indexOf(funcMatch[0].toLowerCase());
          const start = Math.max(0, funcIndex);
          const end = Math.min(contract.decompiledCode.length, funcIndex + 200);
          matchContext = contract.decompiledCode.slice(start, end).trim();
        } else {
          matchType = "decompiled";
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(contract.decompiledCode.length, matchIndex + query.length + 100);
          matchContext = contract.decompiledCode.slice(start, end).trim();
          if (start > 0) matchContext = "..." + matchContext;
          if (end < contract.decompiledCode.length) matchContext = matchContext + "...";
        }
      }
    }

    // Search bytecode (hex patterns)
    if (
      !matchType &&
      (searchType === "bytecode" || searchType === "all") &&
      contract.runtimeBytecode
    ) {
      const lowerBytecode = contract.runtimeBytecode.toLowerCase();
      const matchIndex = lowerBytecode.indexOf(lowerQuery);

      if (matchIndex !== -1) {
        matchType = "bytecode";
        const start = Math.max(0, matchIndex - 20);
        const end = Math.min(contract.runtimeBytecode.length, matchIndex + query.length + 40);
        matchContext = contract.runtimeBytecode.slice(start, end);
        if (start > 0) matchContext = "..." + matchContext;
        if (end < contract.runtimeBytecode.length) matchContext = matchContext + "...";
      }
    }

    if (matchType) {
      results.push({
        address: contract.address,
        matchType,
        matchContext,
        deploymentTimestamp: contract.deploymentTimestamp,
        heuristicContractType: contract.heuristics.contractType,
        eraId: contract.eraId,
        decompiledSnippet:
          matchType !== "bytecode" && contract.decompiledCode
            ? contract.decompiledCode.slice(0, 300)
            : undefined,
      });

      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}

// =============================================================================
// Unified Search
// =============================================================================

export async function searchUnifiedContracts(
  query: string,
  page: number,
  limit: number = 20
): Promise<UnifiedSearchResponse> {
  const q = query.trim();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const offset = (safePage - 1) * safeLimit;

  // Priority 1: PostgreSQL database
  if (isDatabaseEnabled()) {
    // People results are small; show them first, then contracts.
    const people = await dbSearchPeople(q, 100);
    const peopleCount = people.length;

    const peopleSlice = offset < peopleCount ? people.slice(offset, offset + safeLimit) : [];
    const remaining = safeLimit - peopleSlice.length;

    const contractOffset = Math.max(0, offset - peopleCount);
    const contractRows =
      remaining > 0 ? await dbSearchUnified(q, remaining + 1, contractOffset) : [];

    const contracts = remaining > 0 ? contractRows.slice(0, remaining) : [];

    const hasMore =
      offset + safeLimit < peopleCount || (remaining > 0 && contractRows.length > remaining);

    return { query: q, page: safePage, results: [...peopleSlice, ...contracts], hasMore };
  }

  // Priority 2: JSON fallback (may be expensive; only when allowed)
  if (allowJsonFallback()) {
    const lower = q.toLowerCase();
    const all = loadAllContracts();
    const matches: UnifiedSearchResult[] = [];

    for (const c of all) {
      const fields: Array<{ type: UnifiedSearchResult["matchType"]; value: string | null }> = [
        { type: "address", value: c.address },
        { type: "token_name", value: c.tokenName },
        { type: "token_symbol", value: c.tokenSymbol },
        { type: "contract_name", value: c.etherscanContractName },
        { type: "decompiled_code", value: c.decompiledCode },
        { type: "source_code", value: c.sourceCode },
        { type: "abi", value: c.abi },
      ];

      const match = fields.find((f) => f.value && f.value.toLowerCase().includes(lower));
      if (!match) continue;

      const title =
        c.tokenName || c.etherscanContractName || (c.tokenSymbol ? `Token ${c.tokenSymbol}` : `Contract ${c.address.slice(0, 10)}...`);

      const idx = match.value!.toLowerCase().indexOf(lower);
      const snippet =
        idx >= 0
          ? match.value!.slice(Math.max(0, idx - 40), Math.min(match.value!.length, idx + lower.length + 100))
          : null;

      matches.push({
        entityType: "contract",
        address: c.address,
        title,
        subtitle: c.tokenSymbol ? c.tokenSymbol : null,
        matchType: match.type,
        matchSnippet: snippet ? snippet.replace(/\s+/g, " ").trim() : null,
        deploymentTimestamp: c.deploymentTimestamp,
        eraId: c.eraId,
        heuristicContractType: c.heuristics.contractType,
        verificationStatus: c.verificationStatus,
        personSlug: null,
      });
    }

    // Deterministic ordering
    matches.sort((a, b) => (a.deploymentTimestamp || "").localeCompare(b.deploymentTimestamp || ""));
    const pageSlice = matches.slice(offset, offset + safeLimit + 1);
    const hasMore = pageSlice.length > safeLimit;
    const results = pageSlice.slice(0, safeLimit);
    return { query: q, page: safePage, results, hasMore };
  }

  return { query: q, page: safePage, results: [], hasMore: false };
}

// =============================================================================
// Era Information
// =============================================================================

export async function getAllEras(): Promise<EthereumEra[]> {
  return Object.values(ERAS);
}

export async function getEra(eraId: string): Promise<EthereumEra | null> {
  return ERAS[eraId] || null;
}

export async function getEraStats(eraId: string): Promise<{
  contractCount: number;
  firstContract: string | null;
  lastContract: string | null;
} | null> {
  if (allowJsonFallback()) {
    const contracts = getContractsByEraFromData(eraId, 10000);
    return {
      contractCount: contracts.length,
      firstContract: contracts[0]?.address || null,
      lastContract: contracts[contracts.length - 1]?.address || null,
    };
  }

  const contracts = Object.values(MOCK_CONTRACTS).filter((c) => c.eraId === eraId);
  return {
    contractCount: contracts.length,
    firstContract: contracts[0]?.address || null,
    lastContract: contracts[contracts.length - 1]?.address || null,
  };
}

// =============================================================================
// Stats
// =============================================================================

export async function getStats(): Promise<{
  totalContracts: number;
  decompiledContracts: number;
}> {
  // Priority 1: PostgreSQL database
  if (isDatabaseEnabled()) {
    try {
      const [total, decompiled] = await Promise.all([
        dbGetTotalCount(),
        dbGetDecompiledCount(),
      ]);
      return {
        totalContracts: total,
        decompiledContracts: decompiled,
      };
    } catch (error) {
      console.error("[db] Database stats query failed, falling back:", error);
    }

    if (!allowJsonFallback()) {
      const contracts = Object.values(MOCK_CONTRACTS);
      return {
        totalContracts: contracts.length,
        decompiledContracts: contracts.filter((c) => c.decompilationSuccess).length,
      };
    }
  }

  // Priority 2: JSON file data
  if (allowJsonFallback()) {
    return {
      totalContracts: getTotalContractsCount(),
      decompiledContracts: getDecompiledContractsCount(),
    };
  }

  // Priority 3: Mock data
  const contracts = Object.values(MOCK_CONTRACTS);
  return {
    totalContracts: contracts.length,
    decompiledContracts: contracts.filter((c) => c.decompilationSuccess).length,
  };
}
