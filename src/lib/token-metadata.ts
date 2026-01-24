/**
 * Token metadata fetcher (RPC-first).
 *
 * Primary: Alchemy JSON-RPC method `alchemy_getTokenMetadata` (supports logo).
 * Fallback: raw `eth_call` for name/symbol/decimals (no logo).
 */
export type TokenMetadata = {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
};

// Standard ERC-20 method selectors
const ERC20_SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
};

async function jsonRpc<T>(
  rpcUrl: string,
  body: unknown
): Promise<{ result?: T; error?: { message?: string } }> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * Alchemy token metadata (includes logo URL when available).
 * Works only on Alchemy endpoints; will error on generic JSON-RPC providers.
 */
async function fetchAlchemyTokenMetadata(
  rpcUrl: string,
  address: string
): Promise<TokenMetadata | null> {
  const res = await jsonRpc<{
    name?: string;
    symbol?: string;
    decimals?: number;
    logo?: string;
  }>(rpcUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getTokenMetadata",
    params: [address],
  });

  if (res?.error || !res?.result) return null;

  const name = res.result.name ?? null;
  const symbol = res.result.symbol ?? null;
  const decimals =
    typeof res.result.decimals === "number" ? res.result.decimals : null;
  const logo = res.result.logo ?? null;

  // If Alchemy doesn't recognize it as a token, it often returns null-ish fields.
  if (!name && !symbol && decimals === null && !logo) return null;

  return { name, symbol, decimals, logo };
}

async function ethCall(rpcUrl: string, to: string, data: string): Promise<string | null> {
  try {
    const res = await jsonRpc<string>(rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    });
    if (res?.error || !res?.result || res.result === "0x") return null;
    return res.result;
  } catch {
    return null;
  }
}

function decodeBytes32String(hex: string): string | null {
  try {
    if (!hex || hex === "0x") return null;
    const data = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (data.length !== 64) return null;
    const bytes: number[] = [];
    for (let i = 0; i < 64; i += 2) {
      bytes.push(parseInt(data.slice(i, i + 2), 16));
    }
    // trim trailing nulls
    while (bytes.length && bytes[bytes.length - 1] === 0) bytes.pop();
    const str = String.fromCharCode(...bytes).replace(/\u0000/g, "").trim();
    return str.length ? str : null;
  } catch {
    return null;
  }
}

function decodeAbiString(hex: string): string | null {
  try {
    if (!hex || hex === "0x") return null;

    // Some early tokens return bytes32 instead of string.
    const bytes32 = decodeBytes32String(hex);
    if (bytes32) return bytes32;

    // ABI-encoded dynamic string: offset (32 bytes) + length (32 bytes) + data
    if (hex.length < 2 + 64 * 2) return null;
    const data = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (data.length < 128) return null;

    const lengthHex = data.slice(64, 128);
    const length = parseInt(lengthHex, 16);
    if (!Number.isFinite(length) || length <= 0 || length > 1024) return null;

    const stringHex = data.slice(128, 128 + length * 2);
    if (stringHex.length < length * 2) return null;

    const bytes: number[] = [];
    for (let i = 0; i < stringHex.length; i += 2) {
      bytes.push(parseInt(stringHex.slice(i, i + 2), 16));
    }
    const str = String.fromCharCode(...bytes).replace(/\u0000/g, "").trim();
    return str.length ? str : null;
  } catch {
    return null;
  }
}

function decodeDecimals(hex: string): number | null {
  try {
    if (!hex || hex === "0x") return null;
    const value = parseInt(hex.startsWith("0x") ? hex.slice(2) : hex, 16);
    if (!Number.isFinite(value) || value < 0 || value > 255) return null;
    return value;
  } catch {
    return null;
  }
}

async function fetchErc20MetadataViaEthCall(
  rpcUrl: string,
  address: string
): Promise<Pick<TokenMetadata, "name" | "symbol" | "decimals"> | null> {
  const [nameHex, symbolHex, decimalsHex] = await Promise.all([
    ethCall(rpcUrl, address, ERC20_SELECTORS.name),
    ethCall(rpcUrl, address, ERC20_SELECTORS.symbol),
    ethCall(rpcUrl, address, ERC20_SELECTORS.decimals),
  ]);

  const name = nameHex ? decodeAbiString(nameHex) : null;
  const symbol = symbolHex ? decodeAbiString(symbolHex) : null;
  const decimals = decimalsHex ? decodeDecimals(decimalsHex) : null;

  if (!name && !symbol && decimals === null) return null;
  return { name, symbol, decimals };
}

/**
 * Fetch token metadata using the configured RPC URL.
 */
export async function fetchTokenMetadataFromRpc(
  rpcUrl: string,
  address: string
): Promise<TokenMetadata | null> {
  const normalized = address.toLowerCase();

  // Try Alchemy first (best UX: provides logo).
  try {
    const alchemy = await fetchAlchemyTokenMetadata(rpcUrl, normalized);
    if (alchemy) return alchemy;
  } catch {
    // fall through
  }

  // Fallback: direct eth_call for ERC-20-ish contracts (no logo).
  const basic = await fetchErc20MetadataViaEthCall(rpcUrl, normalized);
  if (!basic) return null;

  return { ...basic, logo: null };
}

