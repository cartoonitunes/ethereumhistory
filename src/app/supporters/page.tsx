import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { fetchDonations, getEnsName, shortAddress } from "@/lib/donations";
import { getDb } from "@/lib/db-client";
import { donationClaims } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import { formatEther } from "viem";
import { ClaimButton } from "./SupportersClient";

export const metadata: Metadata = {
  title: "Supporters - Ethereum History",
  description:
    "The people who keep Ethereum History running. View our donors and support the free, open archive.",
};

// Revalidate every 5 minutes
export const revalidate = 300;

const HISTORY_TOKEN = "0xD67A9266D0ae84839f62197713B2D2A9f3a62Ba3";
const AIRLOCK = "0x660eaaedebc968f8f3694354fa8ec0b4c5ba8d12";
const INTEGRATOR = "0x123bf3b32fB3986C9251C81430d2542D5054F0d2";
const WETH_BASE = "0x4200000000000000000000000000000000000006";

interface HistoryTokenStats {
  priceUsd: string;
  fdv: number;
  volume24h: number;
  liquidity: number;
  claimableEth: number;
  graduated: boolean;
}

async function fetchHistoryTokenStats(): Promise<HistoryTokenStats | null> {
  try {
    const [dexRes, claimableRes, migratedRes] = await Promise.all([
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${HISTORY_TOKEN}`, { cache: "no-store" }),
      // getIntegratorFees(integrator, WETH)
      fetch("https://base-rpc.publicnode.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", method: "eth_call",
          params: [{
            to: AIRLOCK,
            data: "0xe7f0d8f1" +
              "000000000000000000000000" + INTEGRATOR.slice(2) +
              "000000000000000000000000" + WETH_BASE.slice(2),
          }, "latest"],
          id: 1,
        }),
        cache: "no-store",
      }),
      // getAssetData to check migrationPool != 0xdead
      fetch("https://base-rpc.publicnode.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", method: "eth_call",
          params: [{ to: AIRLOCK, data: "0x1652e7b7" + "000000000000000000000000" + HISTORY_TOKEN.slice(2) }, "latest"],
          id: 2,
        }),
        cache: "no-store",
      }),
    ]);

    const dex = await dexRes.json();
    const pair = dex?.pairs?.[0];
    if (!pair) return null;

    const claimJson = await claimableRes.json();
    const claimRaw = claimJson?.result ?? "0x0";
    const claimableEth = parseInt(claimRaw, 16) / 1e18;

    const migratedJson = await migratedRes.json();
    const migratedData = migratedJson?.result ?? "";
    // migrationPool is chunk index 6 (0-indexed) in AssetData
    const chunks = (migratedData.slice(2).match(/.{64}/g) ?? []);
    const migrationPool = chunks[6] ? "0x" + chunks[6].slice(24) : "0x";
    const graduated = migrationPool !== "0x" &&
      !migrationPool.toLowerCase().startsWith("0xdead") &&
      migrationPool !== "0x0000000000000000000000000000000000000000";

    return {
      priceUsd: parseFloat(pair.priceUsd ?? "0").toFixed(10).replace(/\.?0+$/, ""),
      fdv: pair.fdv ?? 0,
      volume24h: pair.volume?.h24 ?? 0,
      liquidity: pair.liquidity?.usd ?? 0,
      claimableEth,
      graduated,
    };
  } catch {
    return null;
  }
}

type Tier = "philanthropist" | "benefactor" | "sponsor" | "patron" | "supporter";

function getTier(ethAmount: number): Tier {
  if (ethAmount >= 1.0) return "philanthropist";
  if (ethAmount >= 0.1) return "benefactor";
  if (ethAmount >= 0.05) return "sponsor";
  if (ethAmount >= 0.01) return "patron";
  return "supporter";
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; border: string; threshold: string }> = {
  philanthropist: {
    label: "Philanthropist",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    threshold: "1.0+ ETH",
  },
  benefactor: {
    label: "Benefactor",
    color: "text-ether-300",
    bg: "bg-ether-500/10",
    border: "border-ether-500/30",
    threshold: "0.1+ ETH",
  },
  sponsor: {
    label: "Sponsor",
    color: "text-obsidian-200",
    bg: "bg-obsidian-700/30",
    border: "border-obsidian-500/30",
    threshold: "0.05+ ETH",
  },
  patron: {
    label: "Patron",
    color: "text-obsidian-400",
    bg: "bg-obsidian-800/40",
    border: "border-obsidian-600/30",
    threshold: "0.01+ ETH",
  },
  supporter: {
    label: "Supporter",
    color: "text-obsidian-500",
    bg: "bg-obsidian-900/40",
    border: "border-obsidian-700/30",
    threshold: "any amount",
  },
};

interface DonationRow {
  txHash: string;
  from: string;
  ethAmount: number;
  tokenSymbol: "ETH" | "USDC";
  tokenAmount: string;
  timestamp: number;
  displayName: string;
  note: string | null;
  isClaimed: boolean;
  tier: Tier;
  isFounding: boolean;
  chain: "ethereum" | "base";
}

async function getDonationData(): Promise<{
  donations: DonationRow[];
  totalEth: string;
  donorCount: number;
}> {
  const txs = await fetchDonations();

  if (txs.length === 0) {
    return { donations: [], totalEth: "0.0000", donorCount: 0 };
  }

  // Fetch claims from DB
  let claimsMap: Record<string, { displayName: string; note: string | null }> = {};
  try {
    const db = getDb();
    const txHashes = txs.map((t) => t.txHash);
    const claims = await db
      .select()
      .from(donationClaims)
      .where(inArray(donationClaims.txHash, txHashes));
    claimsMap = Object.fromEntries(
      claims.map((c) => [c.txHash, { displayName: c.displayName, note: c.note }])
    );
  } catch (err) {
    console.warn("[supporters page] DB not available:", err);
  }

  // Resolve ENS for unclaimed addresses (best effort, capped)
  const ensMap: Record<string, string | null> = {};
  const unclaimedAddresses = [
    ...new Set(txs.filter((t) => !claimsMap[t.txHash]).map((t) => t.from)),
  ].slice(0, 20);

  await Promise.allSettled(
    unclaimedAddresses.map(async (addr) => {
      const name = await getEnsName(addr);
      ensMap[addr] = name;
    })
  );

  // Determine founding supporters: first 10 unique donor addresses by timestamp
  const seenAddresses = new Set<string>();
  const foundingAddresses = new Set<string>();
  const sorted = [...txs].sort((a, b) => a.timestamp - b.timestamp);
  for (const tx of sorted) {
    const addrLower = tx.from.toLowerCase();
    if (!seenAddresses.has(addrLower)) {
      seenAddresses.add(addrLower);
      if (seenAddresses.size <= 10) {
        foundingAddresses.add(addrLower);
      }
    }
  }

  // Build rows
  const rows: DonationRow[] = txs.map((tx) => {
    const claim = claimsMap[tx.txHash];
    const ens = ensMap[tx.from] ?? null;
    const ethAmount = tx.tokenSymbol === "ETH" ? parseFloat(tx.ethAmount) : 0;
    return {
      txHash: tx.txHash,
      from: tx.from,
      ethAmount,
      tokenSymbol: tx.tokenSymbol,
      tokenAmount: tx.tokenAmount,
      timestamp: tx.timestamp,
      displayName: claim?.displayName ?? ens ?? shortAddress(tx.from),
      note: claim?.note ?? null,
      isClaimed: !!claim,
      tier: getTier(ethAmount),
      isFounding: foundingAddresses.has(tx.from.toLowerCase()),
      chain: tx.chain,
    };
  });

  // Sort by ETH amount descending (leaderboard order)
  rows.sort((a, b) => b.ethAmount - a.ethAmount || a.timestamp - b.timestamp);

  // Total ETH
  const totalEthWei = txs
    .filter((t) => t.tokenSymbol === "ETH")
    .reduce((sum, t) => sum + BigInt(t.valueWei), BigInt(0));

  const uniqueDonors = new Set(txs.map((t) => t.from.toLowerCase())).size;

  return {
    donations: rows,
    totalEth: parseFloat(formatEther(totalEthWei)).toFixed(4),
    donorCount: uniqueDonors,
  };
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SupportersPage() {
  const [{ donations, totalEth, donorCount }, historyStats] = await Promise.all([
    getDonationData(),
    fetchHistoryTokenStats(),
  ]);

  return (
    <div className="min-h-screen bg-obsidian-950">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-obsidian-50 mb-4">
            Supporters
          </h1>
          <p className="text-obsidian-400 text-lg max-w-xl mx-auto leading-relaxed mb-8">
            These donors keep EthereumHistory running. No ads. No paywalls. Just people who believe the history of Ethereum is worth preserving.
          </p>

          {/* Stats */}
          <div className="inline-grid grid-cols-2 gap-px bg-obsidian-800 rounded-2xl overflow-hidden border border-obsidian-800">
            <div className="bg-obsidian-950 px-8 py-5">
              <p className="text-3xl font-bold text-ether-400">{totalEth} ETH</p>
              <p className="text-xs text-obsidian-600 uppercase tracking-widest mt-1">Total donated</p>
            </div>
            <div className="bg-obsidian-950 px-8 py-5">
              <p className="text-3xl font-bold text-obsidian-100">{donorCount}</p>
              <p className="text-xs text-obsidian-600 uppercase tracking-widest mt-1">Unique donors</p>
            </div>
          </div>
        </div>

        {/* HISTORY token banner */}
        {historyStats && (
          <div className="mb-10 rounded-2xl border border-obsidian-700 bg-obsidian-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-obsidian-100">HISTORY Token</span>
                  <a
                    href={`https://dexscreener.com/base/${HISTORY_TOKEN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-obsidian-500 hover:text-ether-400 transition-colors"
                  >
                    Base ↗
                  </a>
                </div>
                <p className="text-xs text-obsidian-500 mt-0.5">
                  {historyStats.graduated
                    ? "Trading fees claimable by ethereumhistory.eth"
                    : "1% of trading fees accrue to ethereumhistory.eth at graduation"}
                </p>
              </div>
              {historyStats.claimableEth > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-ether-500/15 text-ether-300 border border-ether-500/30">
                  {historyStats.claimableEth.toFixed(4)} ETH claimable
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-obsidian-950/60 rounded-xl px-4 py-3">
                <p className="text-xs text-obsidian-600 uppercase tracking-widest mb-1">Price</p>
                <p className="text-sm font-semibold text-obsidian-100">${historyStats.priceUsd}</p>
              </div>
              <div className="bg-obsidian-950/60 rounded-xl px-4 py-3">
                <p className="text-xs text-obsidian-600 uppercase tracking-widest mb-1">FDV</p>
                <p className="text-sm font-semibold text-obsidian-100">${historyStats.fdv.toLocaleString()}</p>
              </div>
              <div className="bg-obsidian-950/60 rounded-xl px-4 py-3">
                <p className="text-xs text-obsidian-600 uppercase tracking-widest mb-1">24h Volume</p>
                <p className="text-sm font-semibold text-obsidian-100">${historyStats.volume24h.toLocaleString()}</p>
              </div>
              <div className="bg-obsidian-950/60 rounded-xl px-4 py-3">
                <p className="text-xs text-obsidian-600 uppercase tracking-widest mb-1">Liquidity</p>
                <p className="text-sm font-semibold text-obsidian-100">${historyStats.liquidity.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tier legend */}
        <div className="flex flex-wrap items-center gap-3 mb-8 justify-center">
          {(["philanthropist", "benefactor", "sponsor", "patron", "supporter"] as Tier[]).map((tier) => {
            const cfg = TIER_CONFIG[tier];
            return (
              <span
                key={tier}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}
              >
                <TierDot tier={tier} />
                {cfg.label}
                <span className="text-obsidian-600 font-normal">{cfg.threshold}</span>
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-ether-500/10 text-ether-400 border-ether-500/30">
            Founding Supporter: first 10 donors
          </span>
        </div>

        {/* Leaderboard */}
        {donations.length === 0 ? (
          <div className="text-center py-20 text-obsidian-600">
            No donations yet. Be the first!
          </div>
        ) : (
          <div className="space-y-3 mb-16">
            {donations.map((d, idx) => (
              <DonationCard key={d.txHash} donation={d} rank={idx + 1} />
            ))}
          </div>
        )}

        {/* Claim section */}
        <div className="border-t border-obsidian-800 pt-12 text-center">
          <h2 className="text-2xl font-bold text-obsidian-100 mb-3">
            Did you donate?
          </h2>
          <p className="text-obsidian-400 mb-6 max-w-md mx-auto">
            Sign a message with your wallet to claim your donation and add your name to the log.
          </p>
          <ClaimButton />
          <p className="text-xs text-obsidian-700 mt-4">
            Signing is free. No gas required.
          </p>
        </div>
      </main>
    </div>
  );
}

function TierDot({ tier }: { tier: Tier }) {
  const colors: Record<Tier, string> = {
    philanthropist: "bg-yellow-400",
    benefactor: "bg-ether-300",
    sponsor: "bg-obsidian-200",
    patron: "bg-obsidian-400",
    supporter: "bg-obsidian-600",
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[tier]}`} />;
}

function DonationCard({ donation: d, rank }: { donation: DonationRow; rank: number }) {
  const cfg = TIER_CONFIG[d.tier];
  const date = formatDate(d.timestamp);
  const explorerUrl = d.chain === "base"
    ? `https://basescan.org/tx/${d.txHash}`
    : `https://etherscan.io/tx/${d.txHash}`;

  return (
    <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-obsidian-900/50 border border-obsidian-800 hover:border-obsidian-700 transition-colors">
      {/* Rank */}
      <div className="shrink-0 w-8 text-center">
        <span className="text-lg font-bold text-obsidian-700">{rank}</span>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-obsidian-100 truncate">{d.displayName}</span>
          {/* Tier badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}
          >
            <TierDot tier={d.tier} />
            {cfg.label}
          </span>
          {/* Founding badge */}
          {d.isFounding && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ether-500/10 text-ether-400 border border-ether-500/30">
              Founding Supporter
            </span>
          )}

        </div>

        {d.note && (
          <p className="text-sm text-obsidian-500 mt-1 italic">&ldquo;{d.note}&rdquo;</p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="text-xs text-obsidian-600">{date}</span>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-obsidian-700 hover:text-ether-400 transition-colors font-mono"
          >
            {d.txHash.slice(0, 10)}...
          </a>
        </div>
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right">
        <p className="font-semibold text-obsidian-100">
          {d.tokenSymbol === "ETH"
            ? `${parseFloat(d.tokenAmount).toFixed(4)} ETH`
            : `${d.tokenAmount} USDC`}
        </p>
        {d.isClaimed && (
          <p className="text-xs text-ether-600 mt-0.5">Claimed</p>
        )}
      </div>
    </div>
  );
}
