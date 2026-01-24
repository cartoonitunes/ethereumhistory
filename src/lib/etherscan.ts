/**
 * Etherscan enrichment helpers (optional).
 *
 * Uses Etherscan "v2" unified endpoint:
 * - getabi
 * - getsourcecode
 * - getcontractcreation
 *
 * Requires ETHERSCAN_API_KEY.
 */

export type EtherscanCreationInfo = {
  contractCreator: string;
  txHash: string;
  blockNumber: number | null;
  timestamp: string | null; // ISO string
};

type EtherscanV2Response<T> = {
  status: string;
  message: string;
  result: T;
};

type EtherscanSourceItem = {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  CompilerType: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  ContractFileName: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
  SimilarMatch: string;
};

const CHAIN_ID = "1";
const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function buildUrl(params: Record<string, string>): string {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    throw new Error("ETHERSCAN_API_KEY not configured");
  }

  const search = new URLSearchParams({
    apikey: apiKey,
    chainid: CHAIN_ID,
    ...params,
  });

  return `${ETHERSCAN_V2_BASE}?${search.toString()}`;
}

export async function fetchEtherscanAbi(address: string): Promise<string | null> {
  const normalized = address.toLowerCase();
  if (!isValidAddress(normalized)) return null;

  const url = buildUrl({
    module: "contract",
    action: "getabi",
    address: normalized,
  });

  const res = await fetch(url, { method: "GET" });
  const data = (await res.json()) as EtherscanV2Response<string>;

  if (data?.status !== "1") return null;
  if (!data.result || typeof data.result !== "string") return null;
  return data.result;
}

export async function fetchEtherscanSourceCode(address: string): Promise<{
  isVerified: boolean;
  contractName: string | null;
  compilerVersion: string | null;
  sourceCode: string | null;
  abi: string | null;
} | null> {
  const normalized = address.toLowerCase();
  if (!isValidAddress(normalized)) return null;

  const url = buildUrl({
    module: "contract",
    action: "getsourcecode",
    address: normalized,
  });

  const res = await fetch(url, { method: "GET" });
  const data = (await res.json()) as EtherscanV2Response<EtherscanSourceItem[]>;

  if (data?.status !== "1") return null;
  const first = data.result?.[0];
  if (!first) return null;

  const abi = first.ABI && first.ABI !== "Contract source code not verified" ? first.ABI : null;
  const sourceCode = first.SourceCode?.trim() ? first.SourceCode : null;
  const contractName = first.ContractName?.trim() ? first.ContractName : null;
  const compilerVersion = first.CompilerVersion?.trim() ? first.CompilerVersion : null;
  const isVerified = !!abi;

  return { isVerified, contractName, compilerVersion, sourceCode, abi };
}

export async function fetchEtherscanContractCreation(
  address: string
): Promise<EtherscanCreationInfo | null> {
  const normalized = address.toLowerCase();
  if (!isValidAddress(normalized)) return null;

  const url = buildUrl({
    module: "contract",
    action: "getcontractcreation",
    contractaddresses: normalized,
  });

  const res = await fetch(url, { method: "GET" });
  const data = (await res.json()) as EtherscanV2Response<
    Array<{
      contractAddress: string;
      contractCreator: string;
      txHash: string;
      blockNumber: string;
      timestamp: string;
    }>
  >;

  if (data?.status !== "1") return null;
  const first = data.result?.[0];
  if (!first?.contractCreator || !first?.txHash) return null;

  const blockNumber = first.blockNumber ? Number(first.blockNumber) : null;
  const tsSeconds = first.timestamp ? Number(first.timestamp) : null;
  const timestamp =
    tsSeconds && Number.isFinite(tsSeconds) ? new Date(tsSeconds * 1000).toISOString() : null;

  return {
    contractCreator: first.contractCreator.toLowerCase(),
    txHash: first.txHash.toLowerCase(),
    blockNumber: blockNumber && Number.isFinite(blockNumber) ? blockNumber : null,
    timestamp,
  };
}

