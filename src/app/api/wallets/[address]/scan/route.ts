/**
 * POST /api/wallets/[address]/scan
 *
 * Runs an Alchemy scan for one wallet, cross references the result against the
 * EH archive, and stores the outcome in wallet_holdings.
 *
 * Scans are explicit and rate limited because each one costs several provider
 * calls. Results are cached in the table until the user asks again, which is
 * why nothing else in this feature triggers a scan implicitly.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { userWallets, walletHoldings } from "@/lib/schema";
import { and, eq, notInArray } from "drizzle-orm";
import { isValidAddress, normalizeAddress } from "@/lib/utils";
import { scanWallet } from "@/lib/collector-card";
import { checkRateLimit } from "@/lib/rate-limit";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";

// Three provider round trips per scan, so give it room without letting a stuck
// request occupy a function for the full platform ceiling.
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const { address: raw } = await params;
  if (!isValidAddress(raw)) {
    return NextResponse.json({ data: null, error: "Invalid address." }, { status: 400 });
  }
  const address = normalizeAddress(raw);

  const limit = checkRateLimit(`wallet-scan:${me.id}`, {
    windowSeconds: 60,
    maxRequests: 10,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: "Too many scans. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  const db = getDb();
  const [wallet] = await db
    .select({ id: userWallets.id })
    .from(userWallets)
    .where(and(eq(userWallets.historianId, me.id), eq(userWallets.address, address)));
  if (!wallet) {
    return NextResponse.json(
      { data: null, error: "That wallet is not on your account." },
      { status: 404 }
    );
  }

  const result = await scanWallet(address);

  // A fully degraded scan tells us nothing, so leave the previous holdings in
  // place rather than replacing real data with an empty set.
  if (result.degraded && result.holdings.length === 0) {
    return NextResponse.json(
      {
        data: { holdings: [], scanned: false },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          cached: false,
          degraded: true,
          warning: result.warning ?? "The token provider was unavailable. Existing holdings were kept.",
        },
      },
      { status: 200 }
    );
  }

  const now = new Date();
  for (const h of result.holdings) {
    await db
      .insert(walletHoldings)
      .values({
        walletId: wallet.id,
        contractAddress: h.contractAddress,
        tokenSymbol: h.tokenSymbol,
        tokenName: h.tokenName,
        balance: h.balance,
        tokenDecimals: h.tokenDecimals,
        tokenType: h.tokenType,
        viaWrapper: h.viaWrapper,
        lastScannedAt: now,
      })
      .onConflictDoUpdate({
        target: [walletHoldings.walletId, walletHoldings.contractAddress],
        set: {
          tokenSymbol: h.tokenSymbol,
          tokenName: h.tokenName,
          balance: h.balance,
          tokenDecimals: h.tokenDecimals,
          tokenType: h.tokenType,
          viaWrapper: h.viaWrapper,
          lastScannedAt: now,
        },
      });
  }

  // Drop anything the wallet no longer holds. Only safe on a clean scan, which
  // the degraded branch above has already returned for.
  const keep = result.holdings.map((h) => h.contractAddress);
  await db
    .delete(walletHoldings)
    .where(
      keep.length > 0
        ? and(eq(walletHoldings.walletId, wallet.id), notInArray(walletHoldings.contractAddress, keep))
        : eq(walletHoldings.walletId, wallet.id)
    );

  if (result.firstTxDate) {
    await db
      .update(userWallets)
      .set({ firstTxDate: result.firstTxDate })
      .where(eq(userWallets.id, wallet.id));
  }

  return NextResponse.json({
    data: {
      scanned: true,
      holdings: result.holdings,
      firstTxDate: result.firstTxDate,
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      cached: false,
      degraded: result.degraded,
      warning: result.warning ?? undefined,
    },
  });
}
