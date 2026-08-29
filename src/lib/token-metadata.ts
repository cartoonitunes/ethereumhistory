/**
 * Token metadata fetcher (RPC-first).
 *
 * Primary: Alchemy JSON-RPC method `alchemy_getTokenMetadata` (supports logo).
 * Fallback: raw `eth_call` for name/symbol/decimals (no logo).
 */
import { disassemble, extractSelectors, extractEventTopics } from "./evm-analyzer";

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

/** A single metadata probe should never hold a page render open longer than this. */
const RPC_TIMEOUT_MS = 8_000;

async function jsonRpc<T>(
  rpcUrl: string,
  body: unknown
): Promise<{ result?: T; error?: { message?: string } }> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  // A rate-limited provider answers 429 with an HTML body; parsing that throws,
  // and every caller here treats a throw as "no metadata", which is the right
  // outcome — token metadata is enrichment, never a reason to fail the request.
  if (!response.ok) {
    throw new Error(`RPC error: HTTP ${response.status}`);
  }
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

  // Alchemy is usually clean, but it reads the same contracts we do — run its
  // strings through the same filter so one bad provider response can't slip
  // past the guards on the eth_call path.
  const name = sanitizeTokenString(res.result.name ?? null);
  const symbol = sanitizeTokenString(res.result.symbol ?? null);
  const decimals =
    typeof res.result.decimals === "number" ? res.result.decimals : null;
  const logo = res.result.logo ?? null;

  // If Alchemy doesn't recognize it as a token, it often returns null-ish fields.
  if (!name && !symbol && decimals === null && !logo) return null;

  return { name, symbol, decimals, logo };
}

/** `eth_getCode`, used only to decide whether a probe is worth making. */
async function fetchCode(rpcUrl: string, address: string): Promise<string | null> {
  try {
    const res = await jsonRpc<string>(rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [address, "latest"],
    });
    if (res?.error || !res?.result || res.result === "0x") return null;
    return res.result;
  } catch {
    return null;
  }
}

function strip0x(hex: string): string {
  if (!hex) return "";
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

function hexToBytes(hex: string): number[] | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  return bytes;
}

/**
 * Contracts without a real `name()`/`symbol()` (wallet proxies, multisigs,
 * registries) still answer the call: execution falls through to the fallback
 * function, which typically returns the calldata it was handed. So a
 * `name()` probe comes back as `0x06fdde03` right-padded to a word — the
 * selector itself. Decoding that yields printable-but-meaningless bytes
 * (`ýÞ`), which is how garbage token names ended up in the DB.
 */
function isSelectorEcho(resultHex: string, callData: string): boolean {
  const result = strip0x(resultHex).toLowerCase();
  const selector = strip0x(callData).toLowerCase();
  if (!selector) return false;
  // Left-aligned echo: `0x06fdde0300…00`.
  if (result.startsWith(selector) && /^0*$/.test(result.slice(selector.length))) return true;
  // Right-aligned echo: `0x00…0006fdde03`.
  if (result.endsWith(selector) && /^0*$/.test(result.slice(0, result.length - selector.length))) {
    return true;
  }
  return false;
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
    if (isSelectorEcho(res.result, data)) return null;
    return res.result;
  } catch {
    return null;
  }
}

/**
 * Decode raw bytes as UTF-8, refusing anything that isn't valid UTF-8.
 *
 * The old decoder used `String.fromCharCode` per byte, i.e. latin-1. That
 * never fails, so arbitrary bytes always produced *some* string — which is
 * how `0xfd 0xde` became "ýÞ". A strict UTF-8 decode rejects those byte
 * sequences outright while still handling genuinely non-ASCII token names.
 */
function decodeUtf8Strict(bytes: number[]): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}

/**
 * Reject decoded strings that are structurally text but semantically noise.
 *
 * Deliberately narrow. Genuine 2015-2018 token symbols include `%`, `^`, `#`,
 * `\u2665`, `\u{1F984}` and `\u03FE` — a "must contain a letter or digit" or
 * dictionary-word rule would delete real, curated records. The discriminating
 * signals are instead: replacement characters, control characters (a real name
 * has none; the pre-fix latin-1 decoder produced them constantly), and absurd
 * length. Everything else is caught upstream by the selector-echo guard, the
 * bytecode gate, and the strict UTF-8 decode.
 */
function sanitizeTokenString(raw: string | null): string | null {
  if (!raw) return null;

  // U+FFFD means a lossy decode happened somewhere upstream.
  if (raw.includes("\uFFFD")) return null;

  // C0 controls, DEL, C1 controls. Reject rather than strip: their presence
  // means the bytes were never text to begin with.
  if (/[\u0000-\u001F\u007F-\u009F]/.test(raw)) return null;

  // Zero-width / BOM / directional marks are invisible padding, not content.
  const cleaned = raw.replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, "").trim();

  if (!cleaned) return null;
  // Generous: one real 2017 token uses a 298-character emoji copypasta as its
  // symbol. The cap exists to stop a malformed decode filling a column, not to
  // second-guess what a deployer chose to call their token.
  if (cleaned.length > 512) return null;

  return cleaned;
}

function decodeBytes32String(hex: string): string | null {
  try {
    const data = strip0x(hex);
    if (data.length !== 64) return null;
    const bytes = hexToBytes(data);
    if (!bytes) return null;
    // trim trailing nulls (bytes32 names are right-padded)
    while (bytes.length && bytes[bytes.length - 1] === 0) bytes.pop();
    if (!bytes.length) return null;
    return sanitizeTokenString(decodeUtf8Strict(bytes));
  } catch {
    return null;
  }
}

function decodeAbiString(hex: string): string | null {
  try {
    const data = strip0x(hex);
    if (!data) return null;

    // Some early tokens return bytes32 instead of string.
    const bytes32 = decodeBytes32String(hex);
    if (bytes32) return bytes32;

    // ABI-encoded dynamic string: offset (32 bytes) + length (32 bytes) + data
    if (data.length < 128) return null;

    const length = parseInt(data.slice(64, 128), 16);
    if (!Number.isFinite(length) || length <= 0 || length > 1024) return null;

    const stringHex = data.slice(128, 128 + length * 2);
    if (stringHex.length < length * 2) return null;

    const bytes = hexToBytes(stringHex);
    if (!bytes) return null;
    return sanitizeTokenString(decodeUtf8Strict(bytes));
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

  if (!name && !symbol) return null;
  return { name, symbol, decimals };
}

/** ERC-20 selectors used to decide whether a contract is even token-shaped. */
const ERC20_SHAPE_SELECTORS = {
  balanceOf: "70a08231",
  transfer: "a9059cbb",
  totalSupply: "18160ddd",
  approve: "095ea7b3",
  allowance: "dd62ed3e",
  transferFrom: "23b872dd",
};

/** First 4 bytes of keccak("Transfer(address,address,uint256)"). */
const TRANSFER_EVENT_PREFIX = "ddf252ad";

/**
 * Is this bytecode plausibly a token at all?
 *
 * Wallets, multisigs, registries and DAOs have no ERC-20 surface, but they
 * still *answer* `name()`/`symbol()` through their fallback function. Probing
 * them is what produced the garbage metadata in the first place, so skip the
 * probe entirely unless the dispatcher actually exposes token functions.
 *
 * Proxies are exempt: their bytecode delegates everything, so the real ERC-20
 * surface lives in an implementation we can't see from here.
 */
export function looksLikeTokenContract(runtimeBytecode: string | null | undefined): boolean {
  if (!runtimeBytecode) return false;
  const code = strip0x(runtimeBytecode);
  if (!code || code === "0") return false;

  let opcodes;
  try {
    opcodes = disassemble(runtimeBytecode);
  } catch {
    return false;
  }
  if (!opcodes.length) return false;

  // Proxy: the token surface is behind the delegatecall, not in this code.
  if (opcodes.some((op) => op.name === "DELEGATECALL")) return true;

  const selectors = extractSelectors(opcodes);
  if (selectors.has(ERC20_SHAPE_SELECTORS.balanceOf)) return true;

  const eventTopics = extractEventTopics(opcodes);
  if (eventTopics.has(TRANSFER_EVENT_PREFIX)) return true;

  const coreMatches = Object.values(ERC20_SHAPE_SELECTORS).filter((sel) =>
    selectors.has(sel)
  ).length;
  return coreMatches >= 2;
}

/**
 * Fetch token metadata using the configured RPC URL.
 *
 * Pass `runtimeBytecode` whenever it's already on hand: contracts with no
 * ERC-20 surface are skipped outright rather than probed and mis-decoded.
 */
export async function fetchTokenMetadataFromRpc(
  rpcUrl: string,
  address: string,
  opts?: { runtimeBytecode?: string | null }
): Promise<TokenMetadata | null> {
  const normalized = address.toLowerCase();

  // Bytecode gate: a wallet or registry has no token metadata to find, and
  // asking anyway is what yields fallback garbage. Callers that don't already
  // hold the bytecode get one eth_getCode; if even that fails we stay
  // permissive and rely on the decode-side guards below.
  const runtimeBytecode = opts?.runtimeBytecode ?? (await fetchCode(rpcUrl, normalized));
  if (runtimeBytecode && !looksLikeTokenContract(runtimeBytecode)) return null;

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

