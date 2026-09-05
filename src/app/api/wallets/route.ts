/**
 * GET  /api/wallets  list the signed-in user's wallets, with holding counts
 * POST /api/wallets  attach a wallet address to the account
 *
 * Adding a wallet is an unverified claim. It becomes verified only after the
 * challenge/signature round trip in ./[address]/verify, and only verified
 * wallets are eligible for a public collector card.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { userWallets, walletHoldings } from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";
import { isValidAddress, normalizeAddress } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";

/** Guardrail against one account hoarding addresses and hammering the scanner. */
const MAX_WALLETS_PER_ACCOUNT = 25;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const db = getDb();

  // Aggregate over a LEFT JOIN rather than correlated subqueries. The previous
  // version embedded `SELECT ... WHERE wh.wallet_id = ${userWallets.id}` inside
  // a raw sql template; the interpolated column did not correlate to the outer
  // row, so every wallet reported holdingCount 0 and lastScannedAt null no
  // matter how many holdings it had. That is what made a successful scan still
  // read as "0 holdings, never scanned" until the row was inspected directly.
  //
  // COUNT over the joined id, not COUNT(*): a LEFT JOIN with no match still
  // yields one row, and COUNT(*) would report 1 holding for an unscanned
  // wallet. Grouping by the primary key lets the other columns come along.
  const rows = await db
    .select({
      id: userWallets.id,
      address: userWallets.address,
      label: userWallets.label,
      verifiedAt: userWallets.verifiedAt,
      firstTxDate: userWallets.firstTxDate,
      addedAt: userWallets.addedAt,
      holdingCount: sql<number>`COUNT(${walletHoldings.id})::int`,
      lastScannedAt: sql<string | null>`MAX(${walletHoldings.lastScannedAt})`,
    })
    .from(userWallets)
    .leftJoin(walletHoldings, eq(walletHoldings.walletId, userWallets.id))
    .where(eq(userWallets.historianId, me.id))
    .groupBy(userWallets.id)
    .orderBy(userWallets.addedAt);

  return NextResponse.json(
    {
      data: { wallets: rows },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const body = await req.json().catch(() => null);
  const rawAddress = typeof body?.address === "string" ? body.address.trim() : "";
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 60) || null : null;

  if (!isValidAddress(rawAddress)) {
    return NextResponse.json(
      { data: null, error: "A valid 0x-prefixed 40 character address is required." },
      { status: 400 }
    );
  }
  const address = normalizeAddress(rawAddress);

  const db = getDb();

  const existing = await db
    .select({ id: userWallets.id })
    .from(userWallets)
    .where(and(eq(userWallets.historianId, me.id), eq(userWallets.address, address)));
  if (existing.length > 0) {
    return NextResponse.json(
      { data: null, error: "That wallet is already on your account." },
      { status: 409 }
    );
  }

  const count = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(userWallets)
    .where(eq(userWallets.historianId, me.id));
  if ((count[0]?.n ?? 0) >= MAX_WALLETS_PER_ACCOUNT) {
    return NextResponse.json(
      { data: null, error: `You can attach at most ${MAX_WALLETS_PER_ACCOUNT} wallets.` },
      { status: 409 }
    );
  }

  const [row] = await db
    .insert(userWallets)
    .values({ historianId: me.id, address, label })
    .returning();

  // Deliberately no scan here. Scanning is explicit (POST .../scan) so adding a
  // wallet stays instant and cannot be used to drive provider calls for free.
  return NextResponse.json(
    {
      data: { wallet: { ...row, holdingCount: 0, lastScannedAt: null } },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    },
    { status: 201, headers: NO_STORE_HEADERS }
  );
}
