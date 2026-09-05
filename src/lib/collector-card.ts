/**
 * Collector Card: wallet scanning, cross referencing and card assembly.
 *
 * The flow, end to end:
 *   1. Ask Alchemy what tokens an address holds (ERC-20 balances, ERC-721 NFTs).
 *   2. Keep only the ones that exist in the EH archive.
 *   3. Resolve wrappers, so holding Wrapped Unicorn Meat counts as holding the
 *      2016 original. This is the part a naive balance scan misses, and it is
 *      the reason the registry table exists.
 *   4. Persist to wallet_holdings, then assemble a card from every verified
 *      wallet on the account.
 *
 * ALCHEMY ACCESS
 * --------------
 * The spec asked for alchemy-sdk. This module instead speaks Alchemy's JSON-RPC
 * and NFT REST endpoints directly, which is what the rest of this codebase
 * already does (see token-metadata.ts, tx-stats.ts, donations.ts) using the
 * existing ETHEREUM_RPC_URL. Adding the SDK would introduce a second way to
 * reach the same provider, a second place to configure credentials, and a
 * sizeable dependency, for calls that are three fetches. If the SDK is wanted
 * later, only this file changes.
 */

import { getDb } from "@/lib/db-client";
import { contracts, userWallets, walletHoldings, wrapperRegistry } from "@/lib/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

/** A scan should never hold a request open longer than this per call. */
const RPC_TIMEOUT_MS = 15_000;

/** Alchemy returns at most 100 NFT contracts per page; we cap total pages. */
const MAX_NFT_PAGES = 10;

export interface DetectedHolding {
  contractAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  /** Raw on chain integer as a decimal string. Never a JS number. */
  balance: string;
  tokenDecimals: number | null;
  tokenType: "erc20" | "erc721";
  /** Set when credited through the wrapper registry rather than held directly. */
  viaWrapper: string | null;
  /**
   * Archive context, joined at scan time and not persisted to wallet_holdings.
   *
   * The `contracts` table is not exclusively historic: it holds ~1.37M rows
   * spanning 2015 to the present, so a wallet holding Uniswap (2020) matches
   * the archive just as MistCoin (2015) does. These two fields let the card
   * rank and group by era instead of presenting both as equally historic.
   */
  eraId: string | null;
  deployedYear: number | null;
}

export interface ScanResult {
  holdings: DetectedHolding[];
  firstTxDate: Date | null;
  /** True when the provider was unreachable and results may be incomplete. */
  degraded: boolean;
  warning: string | null;
}

function rpcUrl(): string | null {
  const url = process.env.ETHEREUM_RPC_URL?.trim();
  return url || null;
}

async function jsonRpc<T>(url: string, body: unknown): Promise<T | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result ?? null;
}

/**
 * ERC-20 balances via alchemy_getTokenBalances.
 *
 * "erc20" asks the provider for every token it has seen this address hold,
 * rather than requiring a candidate list up front. Zero balances come back too
 * and are dropped here: a wallet that once held a token but sold it should not
 * appear on a collector card.
 */
async function fetchErc20Balances(
  url: string,
  address: string
): Promise<{ contractAddress: string; balance: string }[]> {
  const result = await jsonRpc<{
    tokenBalances?: { contractAddress: string; tokenBalance: string | null }[];
  }>(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getTokenBalances",
    params: [address, "erc20"],
  });

  const out: { contractAddress: string; balance: string }[] = [];
  for (const t of result?.tokenBalances ?? []) {
    if (!t.contractAddress || !t.tokenBalance) continue;
    // Alchemy returns a 0x-prefixed hex quantity. BigInt keeps full uint256
    // precision; Number would round anything past 2^53.
    let balance: bigint;
    try {
      balance = BigInt(t.tokenBalance);
    } catch {
      continue;
    }
    if (balance === BigInt(0)) continue;
    out.push({ contractAddress: t.contractAddress.toLowerCase(), balance: balance.toString() });
  }
  return out;
}

/**
 * ERC-721 holdings via the Alchemy NFT API.
 *
 * Uses getContractsForOwner rather than getNFTs: the card needs which historic
 * collections a wallet is in and how many of each, not per token metadata for
 * potentially thousands of items.
 */
async function fetchNftContracts(
  url: string,
  address: string
): Promise<{ contractAddress: string; balance: string; name: string | null; symbol: string | null }[]> {
  // Derive the NFT endpoint from the configured JSON-RPC URL so there is one
  // credential to manage. Shape: https://<net>.g.alchemy.com/v2/<key>
  const match = url.match(/^(https:\/\/[^/]+)\/v2\/([^/?#]+)/);
  if (!match) return [];
  const [, origin, key] = match;
  const base = `${origin}/nft/v3/${key}/getContractsForOwner`;

  const out: { contractAddress: string; balance: string; name: string | null; symbol: string | null }[] = [];
  let pageKey: string | undefined;

  for (let page = 0; page < MAX_NFT_PAGES; page += 1) {
    const qs = new URLSearchParams({ owner: address, pageSize: "100" });
    if (pageKey) qs.set("pageKey", pageKey);

    const res = await fetch(`${base}?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`NFT API HTTP ${res.status}`);

    const json = (await res.json()) as {
      contracts?: {
        address?: string;
        totalBalance?: number | string;
        numDistinctTokensOwned?: number;
        name?: string | null;
        symbol?: string | null;
        tokenType?: string;
      }[];
      pageKey?: string;
    };

    for (const c of json.contracts ?? []) {
      if (!c.address) continue;
      if (c.tokenType && c.tokenType.toUpperCase() !== "ERC721") continue;
      const count = Number(c.totalBalance ?? c.numDistinctTokensOwned ?? 0);
      if (!Number.isFinite(count) || count <= 0) continue;
      out.push({
        contractAddress: c.address.toLowerCase(),
        balance: String(Math.trunc(count)),
        name: c.name ?? null,
        symbol: c.symbol ?? null,
      });
    }

    pageKey = json.pageKey;
    if (!pageKey) break;
  }

  return out;
}

/**
 * Timestamp of the wallet's first outbound transaction, for the "on chain
 * since" line. Ascending order with maxCount 1 gives the earliest directly, so
 * this stays a single call regardless of how active the wallet is.
 */
async function fetchFirstTxDate(url: string, address: string): Promise<Date | null> {
  const result = await jsonRpc<{
    transfers?: { metadata?: { blockTimestamp?: string } }[];
  }>(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getAssetTransfers",
    params: [
      {
        fromAddress: address,
        category: ["external"],
        order: "asc",
        maxCount: "0x1",
        withMetadata: true,
        excludeZeroValue: false,
      },
    ],
  });

  const ts = result?.transfers?.[0]?.metadata?.blockTimestamp;
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Reduce raw provider output to the holdings that belong on a card.
 *
 * Two passes matter here. First, wrapper addresses are translated to the
 * contract they represent, so Wrapped Unicorn Meat is credited as Unicorn Meat.
 * Second, everything is filtered against the `contracts` table, because a
 * collector card is about the EH archive and a wallet full of modern tokens
 * should produce an empty card rather than a list of unrelated assets.
 *
 * Wrapper rows with a NULL underlying (WETH, WBTC) are dropped: they are in the
 * registry so a scan can recognise them, not so they can appear as history.
 */
export async function crossReferenceAgainstArchive(
  raw: { contractAddress: string; balance: string; tokenType: "erc20" | "erc721"; name?: string | null; symbol?: string | null }[]
): Promise<DetectedHolding[]> {
  if (raw.length === 0) return [];
  const db = getDb();

  const scanned = [...new Set(raw.map((r) => r.contractAddress))];

  // Query builder rather than a raw `= ANY(...)`: drizzle's sql template expands
  // a JS array into a parenthesised parameter list, which Postgres rejects for
  // ANY. inArray emits the correct form.
  const wrapperRows = await db
    .select({
      wrapperAddress: wrapperRegistry.wrapperAddress,
      underlyingAddress: wrapperRegistry.underlyingAddress,
    })
    .from(wrapperRegistry)
    .where(inArray(wrapperRegistry.wrapperAddress, scanned));

  const wrappers = new Map<string, { underlyingAddress: string | null }>();
  for (const w of wrapperRows) wrappers.set(w.wrapperAddress, w);

  // Map each scanned address to the contract it should be credited as.
  type Candidate = { target: string; viaWrapper: string | null; raw: (typeof raw)[number] };
  const candidates: Candidate[] = [];
  for (const r of raw) {
    const w = wrappers.get(r.contractAddress);
    if (w) {
      // A wrapper with no Ethereum underlying is recognised but not collectable.
      if (!w.underlyingAddress) continue;
      candidates.push({ target: w.underlyingAddress, viaWrapper: r.contractAddress, raw: r });
    } else {
      candidates.push({ target: r.contractAddress, viaWrapper: null, raw: r });
    }
  }
  if (candidates.length === 0) return [];

  const targets = [...new Set(candidates.map((c) => c.target))];
  const archiveRows = await db
    .select({
      address: contracts.address,
      tokenName: contracts.tokenName,
      tokenSymbol: contracts.tokenSymbol,
      tokenDecimals: contracts.tokenDecimals,
      etherscanContractName: contracts.etherscanContractName,
      eraId: contracts.eraId,
      deploymentTimestamp: contracts.deploymentTimestamp,
    })
    .from(contracts)
    .where(inArray(contracts.address, targets));

  const archive = new Map<string, (typeof archiveRows)[number]>();
  for (const a of archiveRows) archive.set(a.address, a);

  // Collapse to one row per contract. If a wallet holds both the original and
  // its wrapper, the balances add up and the row is marked as direct, since the
  // holder does genuinely hold the original.
  const merged = new Map<string, DetectedHolding>();
  for (const c of candidates) {
    const meta = archive.get(c.target);
    if (!meta) continue;

    const existing = merged.get(c.target);
    if (existing) {
      existing.balance = (BigInt(existing.balance) + BigInt(c.raw.balance)).toString();
      if (!c.viaWrapper) existing.viaWrapper = null;
      continue;
    }

    merged.set(c.target, {
      contractAddress: c.target,
      tokenName: meta.tokenName ?? meta.etherscanContractName ?? c.raw.name ?? null,
      tokenSymbol: meta.tokenSymbol ?? c.raw.symbol ?? null,
      balance: c.raw.balance,
      tokenDecimals: meta.tokenDecimals,
      tokenType: c.raw.tokenType,
      viaWrapper: c.viaWrapper,
      eraId: meta.eraId ?? null,
      deployedYear: meta.deploymentTimestamp ? new Date(meta.deploymentTimestamp).getUTCFullYear() : null,
    });
  }

  return [...merged.values()];
}

/**
 * Scan one address and return the archive holdings it contains.
 *
 * Provider failure is reported as a degraded result rather than thrown, so a
 * flaky RPC leaves the wallet's previously stored holdings intact instead of
 * wiping them. The caller decides whether to persist.
 */
export async function scanWallet(address: string): Promise<ScanResult> {
  const url = rpcUrl();
  if (!url) {
    return {
      holdings: [],
      firstTxDate: null,
      degraded: true,
      warning: "Token scanning is unavailable because ETHEREUM_RPC_URL is not configured.",
    };
  }

  const normalized = address.toLowerCase();

  const [erc20, nfts, firstTx] = await Promise.allSettled([
    fetchErc20Balances(url, normalized),
    fetchNftContracts(url, normalized),
    fetchFirstTxDate(url, normalized),
  ]);

  const failures: string[] = [];
  const raw: {
    contractAddress: string;
    balance: string;
    tokenType: "erc20" | "erc721";
    name?: string | null;
    symbol?: string | null;
  }[] = [];

  if (erc20.status === "fulfilled") {
    for (const t of erc20.value) raw.push({ ...t, tokenType: "erc20" });
  } else {
    failures.push("ERC-20 balances");
  }

  if (nfts.status === "fulfilled") {
    for (const c of nfts.value) raw.push({ ...c, tokenType: "erc721" });
  } else {
    failures.push("NFT holdings");
  }

  const firstTxDate = firstTx.status === "fulfilled" ? firstTx.value : null;
  if (firstTx.status === "rejected") failures.push("first transaction date");

  // Every provider call failed, so this is not "an empty wallet", it is "no
  // answer". Returning holdings: [] here without the flag would let the caller
  // delete real holdings.
  const holdings = raw.length > 0 ? await crossReferenceAgainstArchive(raw) : [];

  return {
    holdings,
    firstTxDate,
    degraded: failures.length > 0,
    warning: failures.length > 0 ? `Could not read ${failures.join(", ")} from the provider.` : null,
  };
}

/**
 * URL-safe slug for a public card. 12 chars from a 32 symbol alphabet is about
 * 60 bits, far past the point where enumeration is practical, and it avoids
 * exposing a sequential id.
 */
export function generateShareSlug(): string {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/**
 * The exact message a user signs to prove wallet ownership.
 *
 * The address and nonce are both inside the signed text. Without the address a
 * signature captured for one wallet could be replayed to claim another, and
 * without the nonce it could be replayed forever.
 */
export function buildVerificationMessage(address: string, nonce: string): string {
  return [
    "Verify wallet ownership for EthereumHistory.com",
    "",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    "",
    "Signing this proves you control this wallet. It costs no gas and grants no",
    "permission to move funds.",
  ].join("\n");
}

/** Shape persisted in collector_cards.card_data_json and rendered by /card/[slug]. */
export interface CardData {
  version: 1;
  owner: { name: string; avatarUrl: string | null };
  /** Verified wallets only, so a public card never shows an unproven claim. */
  wallets: { address: string; label: string | null; firstTxDate: string | null }[];
  holdings: {
    contractAddress: string;
    tokenName: string | null;
    tokenSymbol: string | null;
    balance: string;
    tokenDecimals: number | null;
    tokenType: string;
    viaWrapper: string | null;
    eraId: string | null;
    deployedYear: number | null;
  }[];
  stats: {
    contractCount: number;
    walletCount: number;
    /** Year of the oldest contract held, the headline number on the card. */
    earliestYear: number | null;
    /** Earliest first-transaction date across the verified wallets. */
    onChainSince: string | null;
    eraCounts: Record<string, number>;
  };
  generatedAt: string;
}

/**
 * Assemble a card from stored holdings for one account.
 *
 * VERIFIED WALLETS ONLY. An unverified wallet is an unproven claim, and a
 * public, shareable card is exactly the wrong place to display one: anyone
 * could otherwise add Vitalik's address and publish a card claiming his
 * holdings. Verification is what the blue badge means.
 *
 * Reads only from wallet_holdings, so this never calls the provider.
 */
export async function buildCardData(
  historianId: number,
  owner: { name: string; avatarUrl: string | null }
): Promise<CardData> {
  const db = getDb();

  const wallets = await db
    .select({
      id: userWallets.id,
      address: userWallets.address,
      label: userWallets.label,
      firstTxDate: userWallets.firstTxDate,
    })
    .from(userWallets)
    .where(and(eq(userWallets.historianId, historianId), isNotNull(userWallets.verifiedAt)));

  if (wallets.length === 0) {
    return {
      version: 1,
      owner,
      wallets: [],
      holdings: [],
      stats: { contractCount: 0, walletCount: 0, earliestYear: null, onChainSince: null, eraCounts: {} },
      generatedAt: new Date().toISOString(),
    };
  }

  const walletIds = wallets.map((w) => w.id);
  const rows = await db
    .select({
      contractAddress: walletHoldings.contractAddress,
      tokenName: walletHoldings.tokenName,
      tokenSymbol: walletHoldings.tokenSymbol,
      balance: walletHoldings.balance,
      tokenDecimals: walletHoldings.tokenDecimals,
      tokenType: walletHoldings.tokenType,
      viaWrapper: walletHoldings.viaWrapper,
      eraId: contracts.eraId,
      deploymentTimestamp: contracts.deploymentTimestamp,
    })
    .from(walletHoldings)
    .leftJoin(contracts, eq(contracts.address, walletHoldings.contractAddress))
    .where(inArray(walletHoldings.walletId, walletIds));

  // One entry per contract even when several wallets on the account hold it.
  const merged = new Map<string, CardData["holdings"][number]>();
  for (const r of rows) {
    const year = r.deploymentTimestamp ? new Date(r.deploymentTimestamp).getUTCFullYear() : null;
    const existing = merged.get(r.contractAddress);
    if (existing) {
      existing.balance = (BigInt(existing.balance) + BigInt(r.balance)).toString();
      if (!r.viaWrapper) existing.viaWrapper = null;
      continue;
    }
    merged.set(r.contractAddress, {
      contractAddress: r.contractAddress,
      tokenName: r.tokenName,
      tokenSymbol: r.tokenSymbol,
      balance: r.balance,
      tokenDecimals: r.tokenDecimals,
      tokenType: r.tokenType,
      viaWrapper: r.viaWrapper,
      eraId: r.eraId,
      deployedYear: year,
    });
  }

  // Oldest first: the whole point of the card is what you held earliest.
  const holdings = [...merged.values()].sort((a, b) => {
    const ay = a.deployedYear ?? 9999;
    const by = b.deployedYear ?? 9999;
    if (ay !== by) return ay - by;
    return (a.tokenName ?? "").localeCompare(b.tokenName ?? "");
  });

  const eraCounts: Record<string, number> = {};
  for (const h of holdings) {
    const key = h.eraId ?? "unknown";
    eraCounts[key] = (eraCounts[key] ?? 0) + 1;
  }

  const years = holdings.map((h) => h.deployedYear).filter((y): y is number => y !== null);
  const firstTxDates = wallets
    .map((w) => w.firstTxDate)
    .filter((d): d is Date => d instanceof Date);

  return {
    version: 1,
    owner,
    wallets: wallets.map((w) => ({
      address: w.address,
      label: w.label,
      firstTxDate: w.firstTxDate ? new Date(w.firstTxDate).toISOString() : null,
    })),
    holdings,
    stats: {
      contractCount: holdings.length,
      walletCount: wallets.length,
      earliestYear: years.length > 0 ? Math.min(...years) : null,
      onChainSince:
        firstTxDates.length > 0
          ? new Date(Math.min(...firstTxDates.map((d) => d.getTime()))).toISOString()
          : null,
      eraCounts,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Human readable balance. Uses integer string maths rather than Number, since a
 * uint256 balance loses precision the moment it becomes a float.
 */
export function formatBalance(balance: string, decimals: number | null): string {
  const d = decimals ?? 0;
  if (d === 0) return balance;
  const negative = balance.startsWith("-");
  const digits = negative ? balance.slice(1) : balance;
  const padded = digits.padStart(d + 1, "0");
  const whole = padded.slice(0, padded.length - d);
  const frac = padded.slice(padded.length - d).replace(/0+$/, "");
  const withSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${withSeparators}${frac ? "." + frac : ""}`;
}
