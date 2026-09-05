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
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards } from "@/lib/schema";
import { eq } from "drizzle-orm";
import type { CardData } from "@/lib/collector-card";

export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

const INK = "#0b0d12";
const PAPER = "#f7f5f0";
const MUTED = "#6b7280";
const ACCENT = "#5b4bd6";

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
    .select({ cardDataJson: collectorCards.cardDataJson })
    .from(collectorCards)
    .where(eq(collectorCards.shareSlug, slug));

  if (!row) return fallback("Card not found");

  const card = row.cardDataJson as CardData;
  const top = card.holdings.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          color: PAPER,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: ACCENT, textTransform: "uppercase" }}>
            Ethereum History
          </div>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 700, lineHeight: 1.05 }}>
            {card.owner.name}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
            {card.stats.contractCount} historic {card.stats.contractCount === 1 ? "contract" : "contracts"} held
            {card.stats.earliestYear ? `  ·  collecting since ${card.stats.earliestYear}` : ""}
          </div>
        </div>

        {/* Top holdings, oldest first */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {top.map((h) => (
            <div
              key={h.contractAddress}
              style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 92,
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "rgba(91,75,214,0.18)",
                  color: "#b9aefc",
                  fontSize: 24,
                }}
              >
                {h.deployedYear ?? "----"}
              </div>
              <div style={{ display: "flex", color: PAPER }}>{h.tokenName ?? h.contractAddress.slice(0, 10)}</div>
            </div>
          ))}
          {card.stats.contractCount > top.length ? (
            <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
              and {card.stats.contractCount - top.length} more
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: MUTED }}>
          <div style={{ display: "flex" }}>ethereumhistory.com</div>
          <div style={{ display: "flex" }}>
            {card.stats.walletCount} verified {card.stats.walletCount === 1 ? "wallet" : "wallets"}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        // Cards change only when regenerated, so let the scrapers cache.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
