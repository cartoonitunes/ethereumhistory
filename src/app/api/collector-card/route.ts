/**
 * POST /api/collector-card  build or refresh the signed-in user's card
 *
 * Assembles a card from the holdings already stored for the account's VERIFIED
 * wallets. It does not scan: scanning is a separate, rate limited, explicit
 * step, so generating a card is cheap and repeatable.
 *
 * The slug is minted once and then reused, so regenerating a card never breaks
 * a link that has already been posted.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { buildCardData, generateShareSlug } from "@/lib/collector-card";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503 });
  }

  const db = getDb();
  const card = await buildCardData(me.id, { name: me.name, avatarUrl: me.avatarUrl ?? null });

  if (card.holdings.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error:
          "No archive holdings found yet. Add a wallet, verify it, then run a scan before creating a card.",
      },
      { status: 409 }
    );
  }

  const [existing] = await db
    .select({ shareSlug: collectorCards.shareSlug })
    .from(collectorCards)
    .where(eq(collectorCards.historianId, me.id));

  const shareSlug = existing?.shareSlug ?? generateShareSlug();
  const now = new Date();

  const [row] = await db
    .insert(collectorCards)
    .values({ historianId: me.id, shareSlug, cardDataJson: card, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: collectorCards.historianId,
      set: { cardDataJson: card, updatedAt: now },
    })
    .returning();

  return NextResponse.json({
    data: { card: row.cardDataJson, shareSlug: row.shareSlug, url: `/card/${row.shareSlug}` },
    error: null,
    meta: { timestamp: new Date().toISOString(), cached: false },
  });
}
