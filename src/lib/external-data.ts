/**
 * External Data Fetcher
 *
 * Fetches contract metadata from external sources:
 * - Etherscan API: verified source code, contract name, ABI
 * - On-chain calls: name(), symbol(), decimals() for tokens
 *
 * Note: Requires ETHERSCAN_API_KEY and optionally ETHEREUM_RPC_URL
 * environment variables.
 */

import type { Contract } from "@/types";

// External data that can be fetched
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

// Etherscan API response types
interface EtherscanSourceResponse {
  status: string;
  message: string;
  result: Array<{
    SourceCode: string;
    ABI: string;
    ContractName: string;
    CompilerVersion: string;
    OptimizationUsed: string;
    Runs: string;
    ConstructorArguments: string;
    EVMVersion: string;
    Library: string;
    LicenseType: string;
    Proxy: string;
    Implementation: string;
  }>;
}

// Standard ERC-20 method selectors
const ERC20_SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
};

/**
 * Fetch verified source code from Etherscan
 */
async function fetchEtherscanSource(
  address: string,
  apiKey: string
): Promise<Partial<ExternalContractData>> {
  const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data: EtherscanSourceResponse = await response.json();

    if (data.status !== "1" || !data.result || data.result.length === 0) {
      return {
        isVerified: false,
        fetchErrors: [`Etherscan: ${data.message || "No data"}`],
      };
    }

    const result = data.result[0];

    // Check if actually verified (empty ABI means not verified)
    if (!result.ABI || result.ABI === "Contract source code not verified") {
      return {
        isVerified: false,
      };
    }

    return {
      contractName: result.ContractName || null,
      compilerVersion: result.CompilerVersion || null,
      optimizationUsed: result.OptimizationUsed === "1",
      sourceCode: result.SourceCode || null,
      abi: result.ABI || null,
      constructorArguments: result.ConstructorArguments || null,
      evmVersion: result.EVMVersion || null,
      library: result.Library || null,
      licenseType: result.LicenseType || null,
      isVerified: true,
    };
  } catch (error) {
    return {
      isVerified: false,
      fetchErrors: [`Etherscan error: ${error instanceof Error ? error.message : "Unknown"}`],
    };
  }
}

/**
 * Make an eth_call to read contract data
 */
async function ethCall(
  rpcUrl: string,
  to: string,
  data: string
): Promise<string | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });

    const result = await response.json();
    if (result.error || !result.result || result.result === "0x") {
      return null;
    }

    return result.result;
  } catch {
    return null;
  }
}

/**
 * Decode a string from ABI-encoded response
 */
function decodeString(hex: string): string | null {
  try {
    if (!hex || hex === "0x" || hex.length < 130) return null;

    // Remove 0x prefix
    const data = hex.slice(2);

    // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
    // Skip offset, read length
    const lengthHex = data.slice(64, 128);
    const length = parseInt(lengthHex, 16);

    if (length === 0 || length > 1000) return null;

    // Read string data
    const stringHex = data.slice(128, 128 + length * 2);
    const bytes = [];
    for (let i = 0; i < stringHex.length; i += 2) {
      bytes.push(parseInt(stringHex.slice(i, i + 2), 16));
    }

    return String.fromCharCode(...bytes);
  } catch {
    return null;
  }
}

/**
 * Decode a uint256 from hex
 */
function decodeUint256(hex: string): string | null {
  try {
    if (!hex || hex === "0x") return null;
    const data = hex.slice(2).padStart(64, "0");
    const value = BigInt("0x" + data);
    return value.toString();
  } catch {
    return null;
  }
}

/**
 * Decode decimals (uint8)
 */
function decodeDecimals(hex: string): number | null {
  try {
    if (!hex || hex === "0x") return null;
    const value = parseInt(hex.slice(2), 16);
    if (value > 255) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Fetch token metadata via eth_call
 */
async function fetchTokenMetadata(
  address: string,
  rpcUrl: string
): Promise<Partial<ExternalContractData>> {
  const results: Partial<ExternalContractData> = {};
  const errors: string[] = [];

  // Try to fetch name
  const nameResult = await ethCall(rpcUrl, address, ERC20_SELECTORS.name);
  if (nameResult) {
    results.tokenName = decodeString(nameResult);
  }

  // Try to fetch symbol
  const symbolResult = await ethCall(rpcUrl, address, ERC20_SELECTORS.symbol);
  if (symbolResult) {
    results.tokenSymbol = decodeString(symbolResult);
  }

  // Try to fetch decimals
  const decimalsResult = await ethCall(rpcUrl, address, ERC20_SELECTORS.decimals);
  if (decimalsResult) {
    results.tokenDecimals = decodeDecimals(decimalsResult);
  }

  // Try to fetch totalSupply
  const supplyResult = await ethCall(rpcUrl, address, ERC20_SELECTORS.totalSupply);
  if (supplyResult) {
    results.totalSupply = decodeUint256(supplyResult);
  }

  if (errors.length > 0) {
    results.fetchErrors = errors;
  }

  return results;
}

/**
 * Fetch all available external data for a contract
 */
export async function fetchExternalContractData(
  address: string
): Promise<ExternalContractData> {
  const normalizedAddress = address.toLowerCase();
  const errors: string[] = [];

  const result: ExternalContractData = {
    contractName: null,
    compilerVersion: null,
    optimizationUsed: null,
    sourceCode: null,
    abi: null,
    constructorArguments: null,
    evmVersion: null,
    library: null,
    licenseType: null,
    isVerified: false,
    tokenName: null,
    tokenSymbol: null,
    tokenDecimals: null,
    totalSupply: null,
    fetchedAt: new Date().toISOString(),
    fetchErrors: [],
  };

  // Fetch from Etherscan if API key is available
  const etherscanKey = process.env.ETHERSCAN_API_KEY;
  if (etherscanKey) {
    const etherscanData = await fetchEtherscanSource(normalizedAddress, etherscanKey);
    Object.assign(result, etherscanData);
  } else {
    errors.push("ETHERSCAN_API_KEY not configured");
  }

  // Fetch token metadata if RPC URL is available
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (rpcUrl) {
    const tokenData = await fetchTokenMetadata(normalizedAddress, rpcUrl);
    Object.assign(result, tokenData);
  } else {
    errors.push("ETHEREUM_RPC_URL not configured - skipping on-chain calls");
  }

  result.fetchErrors = [...errors, ...(result.fetchErrors || [])];
  return result;
}

/**
 * Check if external data APIs are configured
 */
export function getExternalDataStatus(): {
  etherscanConfigured: boolean;
  rpcConfigured: boolean;
} {
  return {
    etherscanConfigured: !!process.env.ETHERSCAN_API_KEY,
    rpcConfigured: !!process.env.ETHEREUM_RPC_URL,
  };
}

/**
 * Format token supply with decimals
 */
export function formatTokenSupply(
  totalSupply: string | null,
  decimals: number | null
): string | null {
  if (!totalSupply) return null;

  try {
    const supply = BigInt(totalSupply);
    const dec = decimals || 0;

    if (dec === 0) {
      return supply.toString();
    }

    const divisor = BigInt(10 ** dec);
    const whole = supply / divisor;
    const remainder = supply % divisor;

    if (remainder === BigInt(0)) {
      return whole.toLocaleString();
    }

    const remainderStr = remainder.toString().padStart(dec, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${remainderStr}`;
  } catch {
    return totalSupply;
  }
}
