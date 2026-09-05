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
import { normalizeCardData, type CardData } from "@/lib/collector-card";

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

  const card: CardData = normalizeCardData(row.cardDataJson);
  const stats = card.stats;
  // Two standouts, not three: at timeline thumbnail size a third row is noise.
  const standouts = (card.standouts ?? []).slice(0, 2);
  const avatar = card.owner?.avatarUrl ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: INK,
          color: PAPER,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient glow behind the portrait, the same energy as the live card. */}
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 120,
            width: 420,
            height: 420,
            display: "flex",
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(98,110,241,0.42) 0%, rgba(98,110,241,0) 70%)",
          }}
        />

        {/* Portrait */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 470,
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 268,
              height: 268,
              borderRadius: 999,
              background: "linear-gradient(140deg, #a4b8fc, #626ef1 45%, #b23dff)",
            }}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                width={256}
                height={256}
                style={{ width: 256, height: 256, borderRadius: 999, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 256,
                  height: 256,
                  borderRadius: 999,
                  background: "#12121a",
                  fontSize: 96,
                  color: ACCENT,
                }}
              >
                {(card.owner?.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Text column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingRight: 72,
            gap: 6,
          }}
        >
          <div style={{ display: "flex", fontSize: 19, letterSpacing: 7, color: ACCENT }}>
            ETHEREUM HISTORY
          </div>

          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.1 }}>
            {card.owner?.name ?? "Collector"}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
            <span style={{ fontSize: 38, fontWeight: 700, color: "#c9bdff" }}>
              {card.tier?.label ?? "Collector"}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 14px",
                borderRadius: 8,
                background: "rgba(98,110,241,0.22)",
                color: ACCENT,
                fontSize: 24,
              }}
            >
              {stats.score}
            </span>
          </div>

          {standouts.map((s) => (
            <div
              key={s.contractAddress}
              style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 22 }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 74,
                  padding: "3px 10px",
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.06)",
                  color: ACCENT,
                  fontSize: 19,
                }}
              >
                {s.year ?? "----"}
              </span>
              <span style={{ display: "flex", color: PAPER }}>{s.name}</span>
            </div>
          ))}

          <div style={{ display: "flex", gap: 26, marginTop: 22, fontSize: 20, color: MUTED }}>
            <span style={{ display: "flex" }}>
              {stats.contractCount} documented
            </span>
            <span style={{ display: "flex" }}>
              {stats.earliestYear ? `oldest ${stats.earliestYear}` : "no dated holdings"}
            </span>
            {stats.walletAgeYears !== null && stats.walletAgeYears !== undefined ? (
              <span style={{ display: "flex" }}>{stats.walletAgeYears}y onchain</span>
            ) : null}
            {stats.allWalletsVerified ? (
              <span style={{ display: "flex", color: ACCENT }}>verified</span>
            ) : null}
          </div>

          <div style={{ display: "flex", marginTop: 20, fontSize: 18, color: "#5a5a68" }}>
            ethereumhistory.com
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
