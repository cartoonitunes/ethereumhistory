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
import { contracts, userWallets, walletHoldings } from "@/lib/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getEnsAvatar, getEnsName } from "@/lib/ens";

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
  /** Deployment block, the input to the collector score. */
  deploymentBlock: number | null;
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

  // Wrapper links live on the contract itself (migration 082). Query builder
  // rather than a raw `= ANY(...)`: drizzle's sql template expands a JS array
  // into a parenthesised parameter list, which Postgres rejects for ANY.
  const wrapperRows = await db
    .select({ address: contracts.address, wrapperOf: contracts.wrapperOf })
    .from(contracts)
    .where(and(inArray(contracts.address, scanned), isNotNull(contracts.wrapperOf)));

  const wrappers = new Map<string, { underlyingAddress: string | null }>();
  for (const w of wrapperRows) wrappers.set(w.address, { underlyingAddress: w.wrapperOf });

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
  // is_documented only. A collector card is a claim about the documented
  // archive, so an undocumented match is noise: the holder gets a row with no
  // story attached and nothing to link to. This also drops the WETH and WBTC
  // rows that migration 081 carried purely so a scan could recognise them.
  const archiveRows = await db
    .select({
      address: contracts.address,
      tokenName: contracts.tokenName,
      tokenSymbol: contracts.tokenSymbol,
      tokenDecimals: contracts.tokenDecimals,
      etherscanContractName: contracts.etherscanContractName,
      eraId: contracts.eraId,
      deploymentTimestamp: contracts.deploymentTimestamp,
      deploymentBlock: contracts.deploymentBlock,
    })
    .from(contracts)
    .where(and(inArray(contracts.address, targets), eq(contracts.isDocumented, true)));

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
      deploymentBlock: meta.deploymentBlock ?? null,
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


/**
 * Reference ceiling for the collector score, PINNED ON PURPOSE.
 *
 * The score divides by a fixed constant rather than by the highest block in the
 * archive. If the divisor tracked the archive's current maximum, then indexing
 * one newer contract would silently restate every score already published on
 * every shared card, with no user action and no code change. A published number
 * that moves on its own is the same failure mode as a coverage percentage that
 * swings when a cron happens to finish.
 *
 * Roughly 25M is a little above the present maximum documented block
 * (24,694,283 at the time of writing). Raising it later rescales every score, so
 * treat it as a released constant, not a tuning knob.
 */
export const SCORE_REFERENCE_BLOCK = 25_000_000;

/**
 * Collector score, 0 to 100. Earlier holdings score higher.
 *
 * The whole formula: take the mean deployment block of the documented holdings
 * and invert it against a fixed ceiling. Nothing else feeds in. In particular
 * there is no holder count (an ephemeral market fact that would make a score
 * drift as other people trade), no era coverage (which punished early holders
 * for not owning newer contracts, the precise opposite of the intent), and no
 * wrapper or breadth term.
 *
 * Holdings with no recorded block are skipped rather than counted as zero,
 * which would otherwise hand a perfect score to a wallet full of contracts we
 * simply lack block data for. 12 of ~950k documented contracts are missing one.
 *
 * Note the mean is sensitive to outliers by construction: a single 2026 token
 * pulls an otherwise 2015 portfolio's average up noticeably. That is inherent
 * to averaging deployment order. A median would be steadier if that turns out
 * to matter in practice.
 */
export function computeCollectorScore(
  holdings: { deploymentBlock: number | null }[]
): { score: number; averageBlock: number | null; scoredCount: number } {
  const blocks = holdings
    .map((h) => h.deploymentBlock)
    .filter((b): b is number => typeof b === "number" && b > 0);

  if (blocks.length === 0) return { score: 0, averageBlock: null, scoredCount: 0 };

  const averageBlock = Math.round(blocks.reduce((a, b) => a + b, 0) / blocks.length);
  const ratio = averageBlock / SCORE_REFERENCE_BLOCK;
  const score = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));

  return { score, averageBlock, scoredCount: blocks.length };
}


/**
 * Score tiers.
 *
 * A bare number says nothing about what it means to hold a 2015 contract, so
 * the card leads with a title and keeps the number as supporting detail. The
 * bands are contiguous and cover 0 to 100 with no gaps, so every score resolves
 * to exactly one tier.
 *
 * Every blurb describes what the holder HOLDS, never where they were. The score
 * measures the deployment date of the contracts in a wallet, which says nothing
 * about when the wallet acquired them: a 2022 wallet can hold a 2015 token it
 * bought last week. Earlier wording ("Present for the first contracts ever
 * deployed", "Came through the fork") asserted a history the data cannot
 * support and that is usually false.
 *
 * Ordered high to low; the first band whose `min` is met wins.
 */
export interface Tier {
  label: string;
  blurb: string;
  min: number;
}

const TIERS: Tier[] = [
  { min: 95, label: "Genesis Architect", blurb: "Holds tokens from Ethereum's earliest contracts" },
  { min: 85, label: "Frontier Pioneer", blurb: "Holds tokens from the first contracts ever deployed" },
  { min: 70, label: "DAO Survivor", blurb: "Holds tokens that came through the fork" },
  { min: 50, label: "Chain Historian", blurb: "Curating the early record one contract at a time" },
  { min: 30, label: "Block Explorer", blurb: "Digging through the archive for what mattered" },
  { min: 0, label: "Ethereum Apprentice", blurb: "Just beginning to collect the early chain" },
];

export function tierForScore(score: number): Tier {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return TIERS.find((t) => clamped >= t.min) ?? TIERS[TIERS.length - 1];
}

/**
 * A highlighted holding with the story attached.
 *
 * `headline` is derived from structured facts we hold (era, deploy year,
 * whether it is held through a wrapper, token type). `story` is the contract's
 * own editorial text, never invented here. That split matters: the headline can
 * be generated safely because it only restates data, and the story is real
 * because a historian wrote it.
 */
export interface Standout {
  contractAddress: string;
  name: string;
  headline: string;
  story: string | null;
  year: number | null;
  eraId: string | null;
}

const ERA_LABEL: Record<string, string> = {
  frontier: "Frontier",
  homestead: "Homestead",
  dao: "DAO fork",
  tangerine: "Tangerine Whistle",
  spurious: "Spurious Dragon",
  byzantium: "Byzantium",
};

/**
 * First sentence of an editorial field, trimmed to fit a card.
 *
 * Em and en dashes are folded to a comma for DISPLAY ONLY. The stored
 * editorial text is untouched; this only affects what the card renders, so the
 * card holds to the project's no-dash convention without rewriting anything a
 * historian actually wrote.
 */
function firstSentence(text: string | null, max = 150): string | null {
  if (!text) return null;
  const flat = text
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return null;
  const match = flat.match(/^(.{20,}?[.!?])(\s|$)/);
  const sentence = match ? match[1] : flat;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

function buildHeadline(h: {
  year: number | null;
  eraId: string | null;
  viaWrapper: string | null;
  tokenType: string;
  balance: string;
  isEarliest: boolean;
}): string {
  const era = h.eraId ? ERA_LABEL[h.eraId] ?? null : null;

  // Earliest by deploy date outranks everything, since that is what the card is
  // ordered by and what makes a holding notable.
  if (h.isEarliest && h.year) {
    // Describes the contract's deploy date, not when the wallet acquired it,
    // which we do not know and must not imply.
    return h.viaWrapper
      ? `Their earliest holding by deploy date, ${h.year}, held through its wrapper`
      : `Their earliest holding by deploy date, ${h.year}`;
  }
  if (h.viaWrapper) {
    return h.year
      ? `Holds the ${h.year} original through its wrapper`
      : "Holds the original through its wrapper";
  }
  if (h.tokenType === "erc721") {
    const n = Number(h.balance);
    return Number.isFinite(n) && n > 1
      ? `Owns ${n} from this collection`
      : "Owns a piece of this collection";
  }
  // Name the era and the year, and stop. An earlier version appended "from
  // Ethereum's first months" to anything Frontier, which is false for most of
  // that era: Frontier ran to block 1,150,000 in March 2016, so a contract
  // deployed eight months in was still Frontier and still not early.
  if (era && h.year) return `${era} era contract, deployed ${h.year}`;
  if (era) return `${era} era contract`;
  if (h.year) return `Deployed in ${h.year}`;
  return "From the documented archive";
}

/**
 * Pick the two or three holdings worth putting on the card.
 *
 * Ranked by what makes a card interesting rather than by balance: oldest first,
 * then whatever carries a real story. A card with three well chosen entries
 * reads better than one listing everything, which is what the flat list did.
 */
export function pickStandouts(
  holdings: {
    contractAddress: string;
    tokenName: string | null;
    tokenSymbol: string | null;
    balance: string;
    tokenType: string;
    viaWrapper: string | null;
    eraId: string | null;
    deployedYear: number | null;
    deploymentBlock?: number | null;
    significance?: string | null;
    shortDescription?: string | null;
  }[],
  limit = 3
): Standout[] {
  if (holdings.length === 0) return [];

  // The single earliest contract by block, so "earliest holding" names one
  // specific contract rather than everything sharing the earliest year.
  const earliestAddress = holdings.reduce<string | null>((acc, h) => {
    if (h.deploymentBlock == null) return acc;
    const best = holdings.find((x) => x.contractAddress === acc);
    if (!best || best.deploymentBlock == null) return h.contractAddress;
    return h.deploymentBlock < best.deploymentBlock ? h.contractAddress : acc;
  }, null);

  // Strict chronological order by deployment block, earliest first. Nothing
  // else outranks it.
  //
  // The previous ranking put "has a story" first and then fell back to
  // deployment YEAR and finally to the token name alphabetically. Two effects,
  // both wrong: a 2015 contract could be outranked by a 2018 one that happened
  // to carry editorial text, and within a shared year the order was decided by
  // spelling. That is how a "bitcoin" token minted late in 2015 by a passer-by
  // sorted above MistCoin from November 2015, purely because b precedes m.
  //
  // Block number rather than year because year is far too coarse: hundreds of
  // documented contracts share 2015, and the block is the only field that
  // actually orders them. Contracts with no recorded block sort last rather
  // than to the front, since an unknown block is not evidence of being early.
  const ranked = [...holdings].sort((a, b) => {
    const ab = a.deploymentBlock ?? Number.MAX_SAFE_INTEGER;
    const bb = b.deploymentBlock ?? Number.MAX_SAFE_INTEGER;
    if (ab !== bb) return ab - bb;
    // Same block is effectively a tie; fall back to year, then to a stable
    // address comparison so the order never depends on display text.
    const ay = a.deployedYear ?? 9999;
    const by = b.deployedYear ?? 9999;
    if (ay !== by) return ay - by;
    return a.contractAddress.localeCompare(b.contractAddress);
  });

  return ranked.slice(0, limit).map((h) => {
    const isEarliest = earliestAddress !== null && h.contractAddress === earliestAddress;
    return {
      contractAddress: h.contractAddress,
      name: h.tokenName ?? h.contractAddress.slice(0, 10),
      headline: buildHeadline({
        year: h.deployedYear,
        eraId: h.eraId,
        viaWrapper: h.viaWrapper,
        tokenType: h.tokenType,
        balance: h.balance,
        isEarliest,
      }),
      story: firstSentence(h.significance ?? null) ?? firstSentence(h.shortDescription ?? null),
      year: h.deployedYear,
      eraId: h.eraId,
    };
  });
}

/** Shape persisted in collector_cards.card_data_json and rendered by /card/[slug]. */
export interface CardData {
  /** 2 since the redesign. Readers should tolerate 1 rows still in the table. */
  version: 2;
  owner: {
    /** ENS name when we have one, otherwise the historian's display name. */
    name: string;
    /** ENS name specifically, for the @handle line. Null when there is none. */
    ensName: string | null;
    avatarUrl: string | null;
    avatarSource: "profile" | "ens" | "generated";
    verified: boolean;
  };
  tier: Tier;
  standouts: Standout[];
  wallets: { address: string; label: string | null; firstTxDate: string | null; verified: boolean }[];
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
    deploymentBlock: number | null;
  }[];
  stats: {
    contractCount: number;
    walletCount: number;
    verifiedWalletCount: number;
    allWalletsVerified: boolean;
    earliestYear: number | null;
    onChainSince: string | null;
    /** Whole years since the earliest first transaction. Null if unknown. */
    walletAgeYears: number | null;
    eraCounts: Record<string, number>;
    score: number;
    averageBlock: number | null;
  };
  generatedAt: string;
}

/**
 * Assemble a card from stored holdings for one account.
 *
 * Every wallet on the account counts, verified or not. Verification is a badge,
 * not a gate: it decorates the card rather than deciding what appears on it.
 *
 * That is a deliberate product choice with a real consequence worth stating
 * plainly, because this is a PUBLIC artefact: nothing stops someone adding an
 * address they do not control and publishing a card that displays its holdings.
 * The card is therefore a claim, and the badge is what turns a claim into
 * proof. `allWalletsVerified` is exposed so the UI can show the difference.
 *
 * Reads stored holdings, so it never calls the token provider. It may make one
 * ENS lookup per wallet, but only for wallets never checked before, and the
 * result is cached on the row.
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
      verifiedAt: userWallets.verifiedAt,
      ensName: userWallets.ensName,
      ensAvatarUrl: userWallets.ensAvatarUrl,
      ensCheckedAt: userWallets.ensCheckedAt,
    })
    .from(userWallets)
    .where(eq(userWallets.historianId, historianId));

  const identity = await resolveIdentity(wallets, owner);

  const emptyStats = {
    contractCount: 0,
    walletCount: wallets.length,
    verifiedWalletCount: wallets.filter((w) => w.verifiedAt !== null).length,
    allWalletsVerified: false,
    earliestYear: null,
    onChainSince: null,
    walletAgeYears: null,
    eraCounts: {},
    score: 0,
    averageBlock: null,
  } as CardData["stats"];

  if (wallets.length === 0) {
    return {
      version: 2,
      owner: { ...identity, verified: false },
      tier: tierForScore(0),
      standouts: [],
      wallets: [],
      holdings: [],
      stats: emptyStats,
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
      deploymentBlock: contracts.deploymentBlock,
      isDocumented: contracts.isDocumented,
      significance: contracts.historicalSignificance,
      shortDescription: contracts.shortDescription,
    })
    .from(walletHoldings)
    .leftJoin(contracts, eq(contracts.address, walletHoldings.contractAddress))
    .where(inArray(walletHoldings.walletId, walletIds));

  type Enriched = CardData["holdings"][number] & {
    significance: string | null;
    shortDescription: string | null;
  };
  const merged = new Map<string, Enriched>();
  for (const r of rows) {
    // Re-checked here, not just at scan time: wallet_holdings can hold rows
    // stored before this rule existed, or whose contract has since lost its
    // documented flag. The card is the published surface, so it filters.
    if (!r.isDocumented) continue;
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
      deploymentBlock: r.deploymentBlock,
      significance: r.significance,
      shortDescription: r.shortDescription,
    });
  }

  const enriched = [...merged.values()].sort((a, b) => {
    const ay = a.deployedYear ?? 9999;
    const by = b.deployedYear ?? 9999;
    if (ay !== by) return ay - by;
    return (a.tokenName ?? "").localeCompare(b.tokenName ?? "");
  });

  const eraCounts: Record<string, number> = {};
  for (const h of enriched) {
    const key = h.eraId ?? "unknown";
    eraCounts[key] = (eraCounts[key] ?? 0) + 1;
  }

  const verifiedCount = wallets.filter((w) => w.verifiedAt !== null).length;
  const scoring = computeCollectorScore(enriched);
  const years = enriched.map((h) => h.deployedYear).filter((y): y is number => y !== null);
  const firstTxDates = wallets.map((w) => w.firstTxDate).filter((d): d is Date => d instanceof Date);
  const onChainSince =
    firstTxDates.length > 0 ? new Date(Math.min(...firstTxDates.map((d) => d.getTime()))) : null;

  return {
    version: 2,
    owner: { ...identity, verified: verifiedCount > 0 && verifiedCount === wallets.length },
    tier: tierForScore(scoring.score),
    standouts: pickStandouts(enriched),
    wallets: wallets.map((w) => ({
      address: w.address,
      label: w.label,
      firstTxDate: w.firstTxDate ? new Date(w.firstTxDate).toISOString() : null,
      verified: w.verifiedAt !== null,
    })),
    // Kept in the payload for the API and any future view. The card itself no
    // longer renders a flat list of these.
    holdings: enriched.map(({ significance, shortDescription, ...h }) => {
      void significance;
      void shortDescription;
      return h;
    }),
    stats: {
      contractCount: enriched.length,
      walletCount: wallets.length,
      verifiedWalletCount: verifiedCount,
      allWalletsVerified: verifiedCount > 0 && verifiedCount === wallets.length,
      earliestYear: years.length > 0 ? Math.min(...years) : null,
      onChainSince: onChainSince ? onChainSince.toISOString() : null,
      walletAgeYears: onChainSince
        ? Math.max(0, Math.floor((Date.now() - onChainSince.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
        : null,
      eraCounts,
      score: scoring.score,
      averageBlock: scoring.averageBlock,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Work out who the card belongs to: name, handle and avatar.
 *
 * Avatar order is EH profile image, then an ENS avatar from any wallet, then
 * nothing, in which case the UI draws a generated one from the address. The EH
 * image comes first because it is the one the person deliberately chose here.
 *
 * ENS is resolved at most once per wallet and cached on the row, including the
 * negative result. Failures are swallowed: a card without an avatar is fine, a
 * card that fails to build because a resolver timed out is not.
 */
async function resolveIdentity(
  wallets: {
    id: number;
    address: string;
    ensName: string | null;
    ensAvatarUrl: string | null;
    ensCheckedAt: Date | null;
  }[],
  owner: { name: string; avatarUrl: string | null }
): Promise<Omit<CardData["owner"], "verified">> {
  const db = getDb();

  for (const w of wallets) {
    if (w.ensCheckedAt) continue;
    try {
      const name = await getEnsName(w.address);
      const avatar = name ? await getEnsAvatar(name) : null;
      w.ensName = name;
      w.ensAvatarUrl = avatar;
      await db
        .update(userWallets)
        .set({ ensName: name, ensAvatarUrl: avatar, ensCheckedAt: new Date() })
        .where(eq(userWallets.id, w.id));
    } catch {
      // Leave ensCheckedAt unset so a transient failure is retried later.
    }
  }

  const ensName = wallets.find((w) => w.ensName)?.ensName ?? null;
  const ensAvatar = wallets.find((w) => w.ensAvatarUrl)?.ensAvatarUrl ?? null;

  const avatarUrl = owner.avatarUrl || ensAvatar || null;
  const avatarSource: CardData["owner"]["avatarSource"] = owner.avatarUrl
    ? "profile"
    : ensAvatar
      ? "ens"
      : "generated";

  return {
    name: ensName || owner.name,
    ensName,
    avatarUrl,
    avatarSource,
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

/**
 * Bring a stored card up to the current shape.
 *
 * Cards persisted before the redesign have no `tier` and no `standouts`, and
 * their `owner` lacks `ensName` and `avatarUrl`. The renderer reads all of
 * those, so serving a stored row untouched would throw on anyone's existing
 * card the moment this deploys.
 *
 * Pure and read-only: it derives what it can from what the old row already
 * holds (tier from the score, standouts from the holdings) and fills the rest
 * with safe defaults. No database write, so viewing an old card cannot fail
 * and cannot mutate someone else's row. The next time the owner rebuilds, they
 * get a real v2 card with editorial stories attached.
 */
export function normalizeCardData(raw: unknown): CardData {
  const c = (raw ?? {}) as Partial<CardData> & Record<string, unknown>;
  const stats = (c.stats ?? {}) as Partial<CardData["stats"]>;
  const owner = (c.owner ?? {}) as Partial<CardData["owner"]>;
  const holdings = Array.isArray(c.holdings) ? (c.holdings as CardData["holdings"]) : [];
  const wallets = Array.isArray(c.wallets) ? (c.wallets as CardData["wallets"]) : [];
  const score = typeof stats.score === "number" ? stats.score : 0;

  const walletCount = stats.walletCount ?? wallets.length;
  const verifiedWalletCount =
    stats.verifiedWalletCount ?? wallets.filter((w) => w.verified).length;

  return {
    version: 2,
    owner: {
      name: owner.name ?? "Collector",
      ensName: owner.ensName ?? null,
      avatarUrl: owner.avatarUrl ?? null,
      avatarSource: owner.avatarSource ?? "generated",
      verified: owner.verified ?? stats.allWalletsVerified ?? false,
    },
    // Tier and standouts are DERIVED, so they are always recomputed here rather
    // than trusted from the stored row.
    //
    // Freezing them at build time means any later correction to the tier
    // wording or the ranking never reaches a card that already exists, and the
    // owner sees stale text with no way to know they must rebuild. Both are
    // pure functions of data the row already carries (the score, and the
    // holdings), so recomputing costs nothing and every card self-corrects on
    // the next view.
    //
    // Stories are the exception: they come from the contracts table at build
    // time and stored holdings do not carry them, so any story already computed
    // is carried across by contract address rather than thrown away.
    tier: tierForScore(score),
    standouts: mergeStories(
      pickStandouts(holdings),
      Array.isArray(c.standouts) ? (c.standouts as Standout[]) : []
    ),
    wallets,
    holdings,
    stats: {
      contractCount: stats.contractCount ?? holdings.length,
      walletCount,
      verifiedWalletCount,
      allWalletsVerified:
        stats.allWalletsVerified ?? (walletCount > 0 && verifiedWalletCount === walletCount),
      earliestYear: stats.earliestYear ?? null,
      onChainSince: stats.onChainSince ?? null,
      walletAgeYears:
        stats.walletAgeYears ??
        (stats.onChainSince
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(stats.onChainSince).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
              )
            )
          : null),
      eraCounts: stats.eraCounts ?? {},
      score,
      averageBlock: stats.averageBlock ?? null,
    },
    generatedAt: c.generatedAt ?? new Date().toISOString(),
  };
}

/** Carry stories from a previously built card onto freshly ranked standouts. */
function mergeStories(fresh: Standout[], stored: Standout[]): Standout[] {
  if (stored.length === 0) return fresh;
  const byAddress = new Map(stored.map((s) => [s.contractAddress, s]));
  return fresh.map((s) => (s.story ? s : { ...s, story: byAddress.get(s.contractAddress)?.story ?? null }));
}
