/**
 * GET /api/collector-card/[slug]/og  social share image
 *
 * Rendered with next/og, which ships with Next 16. The spec named @vercel/og;
 * that package is the standalone predecessor of this exact API, so pulling it
 * in would add a dependency for something already present.
 *
 * Deliberately restrained: an OG image is seen at thumbnail size in a timeline,
 * so it carries the headline numbers and the three oldest holdings rather than
 * trying to reproduce the full card. The holographic treatment belongs on the
 * page, where it can move.
 */

import { ImageResponse } from "next/og";
import { renderShareCard, SHARE_WIDTH, SHARE_HEIGHT } from "@/lib/share-card";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards, historians } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { normalizeCardData, withAccountName, type CardData } from "@/lib/collector-card";

export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

const INK = "#08080c";
const PAPER = "#f4f4f8";
const MUTED = "#8b8b9c";
const ACCENT = "#a4b8fc";

function fallback(message: string): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          color: PAPER,
          fontSize: 40,
        }}
      >
        {message}
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 40, fontWeight: 700, color: accent ? ACCENT : PAPER }}>{value}</span>
      <span style={{ fontSize: 15, letterSpacing: 3, color: MUTED }}>{label}</span>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<ImageResponse> {
  const { slug } = await params;

  if (!isDatabaseConfigured() || !/^[a-z0-9]{6,32}$/.test(slug)) {
    return fallback("Ethereum History");
  }

  const db = getDb();
  const [row] = await db
    .select({
      cardDataJson: collectorCards.cardDataJson,
      historianName: historians.name,
    })
    .from(collectorCards)
    .leftJoin(historians, eq(historians.id, collectorCards.historianId))
    .where(eq(collectorCards.shareSlug, slug));

  if (!row) return fallback("Card not found");

  // The same account name correction the page applies. Without it the shared
  // image keeps the ENS name that was frozen into the stored card, and the
  // picture in the tweet disagrees with the page it links to.
  const card: CardData = withAccountName(normalizeCardData(row.cardDataJson), row.historianName);
  const stats = card.stats;
  const avatar = card.owner?.avatarUrl ?? null;

  // One renderer for both routes.
  //
  // This used to draw its own landscape composition, which meant the unfurl and
  // the downloadable image were two different pictures of the same card, and
  // neither looked like the card on screen. Sharing renderShareCard makes the
  // og image, the download and the page agree, and leaves one place to change
  // when the card changes.
  return new ImageResponse(renderShareCard(card), {
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
