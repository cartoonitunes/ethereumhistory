/**
 * Donations fetcher - uses Alchemy for L1 + Base ETH/WETH, Etherscan for USDC.
 */

import { formatEther } from "viem";
import { getEnsName } from "./ens";

const DONATION_WALLET = "0x123bf3b32fB3986C9251C81430d2542D5054F0d2";
const DONATION_WALLET_LOWER = DONATION_WALLET.toLowerCase();
const ETHERSCAN_API_KEY = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const USDC_CONTRACT_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_CONTRACT_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const L1_RPC_URL = process.env.ETHEREUM_RPC_URL ?? "";
const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "";

export interface OnChainDonation {
  txHash: string;
  from: string;
  valueWei: string;
  ethAmount: string;
  tokenSymbol: "ETH" | "USDC";
  tokenAmount: string;
  timestamp: number;
  blockNumber: number;
  chain: "ethereum" | "base";
}

// In-memory cache
let cache: { data: OnChainDonation[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchDonations(): Promise<OnChainDonation[]> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const [l1EthTxs, l1UsdcTxs, baseEthTxs, baseUsdcTxs] = await Promise.all([
    fetchAlchemyEthTransfers(L1_RPC_URL, "ethereum"),
    fetchUsdcTransfers(1, USDC_CONTRACT_ETH, "ethereum"),
    fetchAlchemyEthTransfers(BASE_RPC_URL, "base"),
    fetchUsdcTransfers(8453, USDC_CONTRACT_BASE, "base"),
  ]);

  const seen = new Set<string>();
  const all: OnChainDonation[] = [];
  for (const tx of [...l1EthTxs, ...l1UsdcTxs, ...baseEthTxs, ...baseUsdcTxs]) {
    if (!seen.has(tx.txHash)) {
      seen.add(tx.txHash);
      all.push(tx);
    }
  }

  all.sort((a, b) => b.timestamp - a.timestamp);
  cache = { data: all, expiresAt: Date.now() + CACHE_TTL_MS };
  return all;
}

async function fetchAlchemyEthTransfers(
  rpcUrl: string,
  chain: "ethereum" | "base"
): Promise<OnChainDonation[]> {
  if (!rpcUrl) return [];
  const category = chain === "ethereum"
    ? ["external", "internal", "erc20"]
    : ["external", "erc20"];

  const all: OnChainDonation[] = [];
  let pageKey: string | undefined;

  try {
    do {
      const params: Record<string, unknown> = {
        toAddress: DONATION_WALLET,
        category,
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: "0x64",
        order: "desc",
      };
      if (pageKey) params.pageKey = pageKey;

      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [params],
          id: 1,
        }),
        next: { revalidate: 300 },
      });

      const json = await res.json();
      const result = json?.result ?? {};
      const transfers: Record<string, unknown>[] = result.transfers ?? [];
      pageKey = result.pageKey;

      for (const t of transfers) {
        const asset = t.asset as string;
        if (asset !== "ETH" && asset !== "WETH") continue;

        // Use rawContract.value for precise wei; fall back to float math
        const raw = (t.rawContract as Record<string, string> | undefined)?.value;
        const valueWei = raw && raw !== "0x"
          ? BigInt(raw).toString()
          : BigInt(Math.round(parseFloat(String(t.value ?? 0)) * 1e18)).toString();

        const meta = t.metadata as Record<string, string> | undefined;
        const timestamp = meta?.blockTimestamp
          ? Math.floor(new Date(meta.blockTimestamp).getTime() / 1000)
          : 0;
        const ethAmount = (Number(BigInt(valueWei)) / 1e18).toFixed(6);

        all.push({
          txHash: (t.uniqueId as string) ?? (t.hash as string),
          from: t.from as string,
          valueWei,
          ethAmount,
          tokenSymbol: "ETH" as const,
          tokenAmount: ethAmount,
          timestamp,
          blockNumber: 0,
          chain,
        });
      }
    } while (pageKey);

    return all;
  } catch (err) {
    console.warn(`[donations] Failed to fetch Alchemy ${chain} transfers:`, err);
    return all;
  }
}

async function fetchUsdcTransfers(
  chainId: number,
  contractAddress: string,
  chain: "ethereum" | "base"
): Promise<OnChainDonation[]> {
  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokentx` +
      `&contractaddress=${contractAddress}&address=${DONATION_WALLET}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const json = await res.json();

    if (json.status !== "1" || !Array.isArray(json.result)) return [];

    return json.result
      .filter(
        (tx: Record<string, string>) =>
          tx.to?.toLowerCase() === DONATION_WALLET_LOWER && tx.value !== "0"
      )
      .map((tx: Record<string, string>) => {
        const usdcAmount = (Number(BigInt(tx.value)) / 1e6).toFixed(2);
        return {
          txHash: tx.hash,
          from: tx.from,
          valueWei: "0",
          ethAmount: "0",
          tokenSymbol: "USDC" as const,
          tokenAmount: usdcAmount,
          timestamp: parseInt(tx.timeStamp),
          blockNumber: parseInt(tx.blockNumber),
          chain,
        };
      });
  } catch (err) {
    console.warn(`[donations] Failed to fetch USDC transfers (chain ${chainId}):`, err);
    return [];
  }
}

export { getEnsName };

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
