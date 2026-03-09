import { NextResponse } from "next/server";
import { fetchDonations, getEnsName, shortAddress } from "@/lib/donations";
import { getDb } from "@/lib/db-client";
import { donationClaims } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import { formatEther } from "viem";

export const dynamic = "force-dynamic";

export interface DonationEntry {
  txHash: string;
  from: string;
  ethAmount: string;
  valueWei: string;
  tokenSymbol: "ETH" | "USDC";
  tokenAmount: string;
  timestamp: number;
  blockNumber: number;
  displayName: string;
  note: string | null;
  isClaimed: boolean;
  hasEns: boolean;
}

export async function GET() {
  try {
    const txs = await fetchDonations();

    if (txs.length === 0) {
      return NextResponse.json({ donations: [], totalEth: "0", donorCount: 0 });
    }

    // Fetch all claimed donations from DB
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
      console.warn("[donations API] DB not available:", err);
    }

    // Resolve ENS for unclaimed addresses (best effort, capped at 20)
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

    // Merge data
    const donations: DonationEntry[] = txs.map((tx) => {
      const claim = claimsMap[tx.txHash];
      const ens = ensMap[tx.from] ?? null;
      return {
        ...tx,
        displayName: claim?.displayName ?? ens ?? shortAddress(tx.from),
        note: claim?.note ?? null,
        isClaimed: !!claim,
        hasEns: !!ens,
      };
    });

    // Total ETH donated (ETH-only txs)
    const totalEthWei = txs
      .filter((t) => t.tokenSymbol === "ETH")
      .reduce((sum, t) => sum + BigInt(t.valueWei), BigInt(0));

    const uniqueDonors = new Set(txs.map((t) => t.from.toLowerCase())).size;

    return NextResponse.json({
      donations,
      totalEth: formatEther(totalEthWei),
      donorCount: uniqueDonors,
    });
  } catch (err) {
    console.error("[donations API] Error:", err);
    return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 });
  }
}
