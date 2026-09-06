/**
 * GET /api/collector-card/me  everything the signed-in user's assets page needs
 *
 * Assets is a first class page, so it loads in one request: the wallets, the
 * holdings from the last scan, and the existing card if there is one. Nothing
 * here scans or rebuilds, so opening the page is cheap and shows the collection
 * straight away rather than making someone press Build first.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards, contracts, userWallets, walletHoldings } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import { normalizeCardData, withAccountName } from "@/lib/collector-card";
import { tokenIdentity } from "@/lib/token-display";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { data: null, error: "Database not configured" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const db = getDb();

  const [card] = await db
    .select({
      shareSlug: collectorCards.shareSlug,
      cardDataJson: collectorCards.cardDataJson,
      updatedAt: collectorCards.updatedAt,
    })
    .from(collectorCards)
    .where(eq(collectorCards.historianId, me.id));

  const wallets = await db
    .select({ id: userWallets.id })
    .from(userWallets)
    .where(eq(userWallets.historianId, me.id));

  let holdings: unknown[] = [];
  if (wallets.length > 0) {
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
        deploymentBlock: contracts.deploymentBlock,
        deploymentTimestamp: contracts.deploymentTimestamp,
        shortDescription: contracts.shortDescription,
        etherscanContractName: contracts.etherscanContractName,
        isDocumented: contracts.isDocumented,
      })
      .from(walletHoldings)
      .leftJoin(contracts, eq(contracts.address, walletHoldings.contractAddress))
      .where(inArray(walletHoldings.walletId, wallets.map((w) => w.id)));

    // One entry per contract even when several wallets hold it, matching the
    // public collection page.
    const merged = new Map<string, Record<string, unknown>>();
    for (const r of rows) {
      if (!r.isDocumented) continue;
      const existing = merged.get(r.contractAddress) as { balance: string; viaWrapper: string | null } | undefined;
      if (existing) {
        existing.balance = (BigInt(existing.balance) + BigInt(r.balance)).toString();
        if (!r.viaWrapper) existing.viaWrapper = null;
        continue;
      }
      merged.set(r.contractAddress, {
        contractAddress: r.contractAddress,
        // Same cleanup the public collection applies, so the owner's private
        // view and the page they share never disagree about a name.
        name: tokenIdentity({
          tokenName: r.tokenName,
          tokenSymbol: r.tokenSymbol,
          contractName: r.etherscanContractName,
          address: r.contractAddress,
        }).name,
        symbol: tokenIdentity({
          tokenName: r.tokenName,
          tokenSymbol: r.tokenSymbol,
          contractName: r.etherscanContractName,
          address: r.contractAddress,
        }).symbol,
        balance: r.balance,
        tokenDecimals: r.tokenDecimals,
        tokenType: r.tokenType,
        viaWrapper: r.viaWrapper,
        deployedYear: r.deploymentTimestamp
          ? new Date(r.deploymentTimestamp).getUTCFullYear()
          : null,
        deploymentBlock: r.deploymentBlock,
        eraId: r.eraId,
        shortDescription: r.shortDescription,
      });
    }
    holdings = [...merged.values()].sort((a, b) => {
      const ab = (a.deploymentBlock as number | null) ?? Number.MAX_SAFE_INTEGER;
      const bb = (b.deploymentBlock as number | null) ?? Number.MAX_SAFE_INTEGER;
      if (ab !== bb) return ab - bb;
      return String(a.contractAddress).localeCompare(String(b.contractAddress));
    });
  }

  return NextResponse.json(
    {
      data: {
        card: card
          ? {
              shareSlug: card.shareSlug,
              // The signed in user is the account, so their current name wins
              // over whatever the stored card froze in.
              data: withAccountName(normalizeCardData(card.cardDataJson), me.name),
              updatedAt: card.updatedAt,
            }
          : null,
        holdings,
      },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    },
    { headers: NO_STORE_HEADERS }
  );
}
