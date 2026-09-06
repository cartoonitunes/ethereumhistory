/**
 * Carrying a preview across sign in.
 *
 * GET  /api/preview/claim?address=0x...   remembers the address, sends to login
 * POST /api/preview/claim                 signed in: saves it to the account
 *
 * WHY A COOKIE AND NOT A QUERY PARAM
 * ----------------------------------
 * Sign in is not one flow. Token, SIWE, Google and GitHub all end here, and the
 * OAuth two leave the site entirely and come back through a callback. A value
 * threaded through the URL survives the first of those and is lost by the rest,
 * so the address rides in a short lived cookie that does not care which route
 * the user took.
 *
 * WHY GET SETS IT
 * ---------------
 * So the handoff works as a plain link, before any client JavaScript has run
 * and through a full page redirect to an identity provider. It records an
 * intention and writes nothing to the account, which is the part that matters:
 * everything with a lasting effect happens in POST, behind authentication.
 *
 * WHAT SOMEONE ELSE SETTING THIS COOKIE COULD DO
 * ----------------------------------------------
 * At worst, cause an address the user does not control to be attached to their
 * account as an UNVERIFIED claim, which is exactly what the manual add button
 * already produces and what the verify flow exists to distinguish. The claim is
 * reported by address on arrival so it is visible rather than silent, and it can
 * be removed. Nothing here can verify a wallet or forge a badge.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards, userWallets } from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";
import { isValidAddress, normalizeAddress } from "@/lib/utils";
import {
  buildCardData,
  claimPreviewCards,
  generateShareSlug,
  persistScanToWallet,
  scanWallet,
} from "@/lib/collector-card";
import { cached, CACHE_TTL } from "@/lib/cache";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";
/** The claim may have to scan, which is three provider round trips. */
export const maxDuration = 60;

const COOKIE = "eh_claim_wallet";
/** Long enough to create an account and read a confirmation email, no longer. */
const COOKIE_MAX_AGE = 30 * 60;

/** Matches the cap in /api/wallets, so the two cannot disagree. */
const MAX_WALLETS_PER_ACCOUNT = 10;

/** Where the user lands after signing in. The flag is what triggers the POST. */
const RETURN_TO = "/assets?claimed=1";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const raw = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  const login = new URL(
    `/historian/login?next=${encodeURIComponent(RETURN_TO)}`,
    req.nextUrl.origin
  );

  // An unusable address should still get the person to the sign in page. They
  // came here to make an account; losing that because a link was malformed
  // would be the worse failure.
  if (!isValidAddress(raw)) return NextResponse.redirect(login);

  const res = NextResponse.redirect(login);
  res.cookies.set(COOKIE, normalizeAddress(raw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const address = req.cookies.get(COOKIE)?.value ?? "";

  // Nothing pending is the ordinary case, not an error: the page asks on every
  // arrival that carries the flag, and most of those have nothing to claim.
  if (!isValidAddress(address)) {
    return NextResponse.json(
      { data: { claimed: false, reason: "nothing-pending" }, error: null },
      { headers: NO_STORE_HEADERS }
    );
  }

  const db = getDb();
  const clear = (res: NextResponse) => {
    res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  const [already] = await db
    .select({ id: userWallets.id })
    .from(userWallets)
    .where(and(eq(userWallets.historianId, me.id), eq(userWallets.address, address)));

  let walletId = already?.id ?? null;

  if (!walletId) {
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(userWallets)
      .where(eq(userWallets.historianId, me.id));
    if (n >= MAX_WALLETS_PER_ACCOUNT) {
      return clear(
        NextResponse.json(
          { data: { claimed: false, reason: "wallet-limit", address }, error: null },
          { headers: NO_STORE_HEADERS }
        )
      );
    }
    const [row] = await db
      .insert(userWallets)
      .values({ historianId: me.id, address, label: null })
      .returning({ id: userWallets.id });
    walletId = row.id;
  }

  // The preview page stored its scan under this exact key, so an arrival that
  // lands on the same warm instance reuses it and nothing is scanned twice.
  // The cache is per instance and in memory though, and a sign in round trip
  // through an identity provider is precisely the kind of gap that loses it, so
  // a miss recomputes rather than failing. Either way the user gets holdings.
  let scan;
  try {
    scan = await cached(`wallet-scan:${address}`, CACHE_TTL.MEDIUM, () => scanWallet(address));
  } catch {
    scan = null;
  }

  let holdingsSaved = false;
  if (scan) holdingsSaved = await persistScanToWallet(walletId, scan);

  // The address may already have an anonymous preview row and a place on the
  // leaderboard. Claiming it keeps the row, so the record of when the address
  // was first seen survives, and stops it being listed twice: once under the
  // new account name and once as a bare address.
  const claimedPreviews = await claimPreviewCards(me.id, [address]);

  // Build the card from whatever is now stored. If the scan failed the wallet
  // is still attached, and the user can scan from /assets, so a bad provider
  // day costs the card rather than the whole claim.
  let slug: string | null = null;
  try {
    const card = await buildCardData(me.id, { name: me.name, avatarUrl: me.avatarUrl ?? null });
    if (card.holdings.length > 0) {
      const [existing] = await db
        .select({ shareSlug: collectorCards.shareSlug })
        .from(collectorCards)
        .where(eq(collectorCards.historianId, me.id));
      const shareSlug = existing?.shareSlug ?? generateShareSlug();
      const now = new Date();
      await db
        .insert(collectorCards)
        .values({ historianId: me.id, shareSlug, cardDataJson: card, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: collectorCards.historianId,
          set: { cardDataJson: card, updatedAt: now },
        });
      slug = shareSlug;
    }
  } catch (err) {
    console.error("[claim] card build failed:", err);
  }

  return clear(
    NextResponse.json(
      {
        data: {
          claimed: true,
          address,
          alreadyAttached: !!already,
          holdingsSaved,
          holdingCount: scan?.holdings.length ?? 0,
          claimedPreviews,
          degraded: scan?.degraded ?? true,
          shareSlug: slug,
        },
        error: null,
      },
      { headers: NO_STORE_HEADERS }
    )
  );
}
