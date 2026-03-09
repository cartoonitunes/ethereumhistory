/**
 * Donations fetcher - scans Etherscan for incoming ETH + USDC transactions
 * to the EthereumHistory donation wallet.
 */

import { formatEther } from "viem";
import { getEnsName } from "./ens";

const DONATION_WALLET = "0x123bf3b32fB3986C9251C81430d2542D5054F0d2";
const DONATION_WALLET_LOWER = DONATION_WALLET.toLowerCase();
const ETHERSCAN_API_KEY = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

export interface OnChainDonation {
  txHash: string;
  from: string;
  valueWei: string; // ETH value in wei (string to avoid bigint serialization issues)
  ethAmount: string; // human-readable ETH
  tokenSymbol: "ETH" | "USDC";
  tokenAmount: string; // human-readable amount
  timestamp: number;
  blockNumber: number;
}

// In-memory cache
let cache: { data: OnChainDonation[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchDonations(): Promise<OnChainDonation[]> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const [ethTxs, usdcTxs] = await Promise.all([
    fetchEthTransactions(),
    fetchUsdcTransfers(),
  ]);

  // Deduplicate by txHash (a tx could appear in both lists in edge cases)
  const seen = new Set<string>();
  const all: OnChainDonation[] = [];
  for (const tx of [...ethTxs, ...usdcTxs]) {
    if (!seen.has(tx.txHash)) {
      seen.add(tx.txHash);
      all.push(tx);
    }
  }

  // Sort by timestamp descending
  all.sort((a, b) => b.timestamp - a.timestamp);

  cache = { data: all, expiresAt: Date.now() + CACHE_TTL_MS };
  return all;
}

async function fetchEthTransactions(): Promise<OnChainDonation[]> {
  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist` +
      `&address=${DONATION_WALLET}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    if (json.status !== "1" || !Array.isArray(json.result)) {
      return [];
    }

    return json.result
      .filter(
        (tx: Record<string, string>) =>
          tx.to?.toLowerCase() === DONATION_WALLET_LOWER &&
          tx.value !== "0" &&
          tx.isError === "0"
      )
      .map((tx: Record<string, string>) => ({
        txHash: tx.hash,
        from: tx.from,
        valueWei: tx.value,
        ethAmount: formatEther(BigInt(tx.value)),
        tokenSymbol: "ETH" as const,
        tokenAmount: formatEther(BigInt(tx.value)),
        timestamp: parseInt(tx.timeStamp),
        blockNumber: parseInt(tx.blockNumber),
      }));
  } catch (err) {
    console.warn("[donations] Failed to fetch ETH transactions:", err);
    return [];
  }
}

async function fetchUsdcTransfers(): Promise<OnChainDonation[]> {
  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx` +
      `&contractaddress=${USDC_CONTRACT}&address=${DONATION_WALLET}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    if (json.status !== "1" || !Array.isArray(json.result)) {
      return [];
    }

    return json.result
      .filter(
        (tx: Record<string, string>) =>
          tx.to?.toLowerCase() === DONATION_WALLET_LOWER && tx.value !== "0"
      )
      .map((tx: Record<string, string>) => {
        // USDC has 6 decimals
        const rawAmount = BigInt(tx.value);
        const usdcAmount = (Number(rawAmount) / 1e6).toFixed(2);
        return {
          txHash: tx.hash,
          from: tx.from,
          valueWei: "0",
          ethAmount: "0",
          tokenSymbol: "USDC" as const,
          tokenAmount: usdcAmount,
          timestamp: parseInt(tx.timeStamp),
          blockNumber: parseInt(tx.blockNumber),
        };
      });
  } catch (err) {
    console.warn("[donations] Failed to fetch USDC transfers:", err);
    return [];
  }
}

export { getEnsName };

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
