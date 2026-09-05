/**
 * GET /api/collector-card/[slug]/share  the card as a downloadable image
 *
 * 1200x675, which is the 16:9 size X uses for media in a compose box. The OG
 * route stays at 1200x630 because that is what link unfurls expect; these are
 * two different jobs and sharing one size would compromise both.
 *
 * WHY SERVER RENDERED, NOT html2canvas
 * ------------------------------------
 * The obvious approach is to rasterise the live DOM node. It does not work for
 * THIS card. html2canvas reimplements a subset of CSS in canvas, and the card's
 * whole look is built from the parts it does not support: mix-blend-mode for
 * the foil and sheen, mask-image to confine them to the pointer, and
 * conic-gradient for the portrait ring. Rasterising it would produce a flat,
 * visibly broken copy of a card whose selling point is the finish.
 *
 * Rendering here instead gives a deterministic image that does not depend on
 * the viewer's browser, needs no client dependency, and is identical whether
 * the user is on a phone or a desktop.
 */

import { ImageResponse } from "next/og";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { normalizeCardData, type CardData } from "@/lib/collector-card";
import { renderShareCard, SHARE_WIDTH, SHARE_HEIGHT } from "@/lib/share-card";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<ImageResponse | Response> {
  const { slug } = await params;

  if (!isDatabaseConfigured() || !/^[a-z0-9]{6,32}$/.test(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const db = getDb();
  const [row] = await db
    .select({ cardDataJson: collectorCards.cardDataJson })
    .from(collectorCards)
    .where(eq(collectorCards.shareSlug, slug));

  if (!row) return new Response("Not found", { status: 404 });

  const card: CardData = normalizeCardData(row.cardDataJson);

  return new ImageResponse(renderShareCard(card), {
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Disposition": `inline; filename="ethereum-history-card-${slug}.png"`,
    },
  });
}
