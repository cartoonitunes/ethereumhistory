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

export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 675;

const INK = "#08080c";
const PAPER = "#f4f4f8";
const MUTED = "#8b8b9c";
const ACCENT = "#a4b8fc";

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 44, fontWeight: 700, color: accent ? ACCENT : PAPER }}>{value}</span>
      <span style={{ fontSize: 15, letterSpacing: 3, color: MUTED }}>{label}</span>
    </div>
  );
}

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
  const stats = card.stats;
  const avatar = card.owner?.avatarUrl ?? null;

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
          position: "relative",
        }}
      >
        {/* Ambient glow behind the card */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 900,
            height: 560,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(98,110,241,0.32) 0%, rgba(98,110,241,0) 70%)",
          }}
        />

        {/* The card itself, as a bordered panel */}
        <div
          style={{
            display: "flex",
            width: 1030,
            height: 545,
            borderRadius: 26,
            padding: 2,
            background: "linear-gradient(140deg, #a4b8fc, rgba(98,110,241,0.4) 40%, rgba(255,255,255,0.08) 65%, #a4b8fc)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              borderRadius: 24,
              background: "#0b0b10",
              padding: "34px 44px",
              alignItems: "center",
              gap: 40,
            }}
          >
            {/* Portrait */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: 300 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 210,
                  height: 210,
                  borderRadius: 999,
                  background: "linear-gradient(140deg, #a4b8fc, #626ef1 45%, #b23dff)",
                }}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    width={198}
                    height={198}
                    style={{ width: 198, height: 198, borderRadius: 999, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 198,
                      height: 198,
                      borderRadius: 999,
                      background: "#12121a",
                      fontSize: 78,
                      color: ACCENT,
                    }}
                  >
                    {(card.owner?.name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 700,
                  color: PAPER,
                  maxWidth: 300,
                  overflow: "hidden",
                }}
              >
                {card.owner?.name ?? "Collector"}
              </div>
              <div style={{ display: "flex", fontSize: 15, letterSpacing: 5, color: ACCENT }}>
                ETHEREUM HISTORY
              </div>
            </div>

            {/* Detail column */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: "#c9bdff" }}>
                  {card.tier?.label ?? "Collector"}
                </span>
                <span
                  style={{
                    display: "flex",
                    padding: "3px 13px",
                    borderRadius: 8,
                    background: "rgba(98,110,241,0.22)",
                    color: ACCENT,
                    fontSize: 22,
                  }}
                >
                  {stats.score}
                </span>
              </div>
              <div style={{ display: "flex", fontSize: 18, color: MUTED }}>
                {card.tier?.blurb ?? ""}
              </div>

              {/* One line, then the numbers. No holdings list: the card is
                  about the person, the assets page is the portfolio. */}
              <div style={{ display: "flex", fontSize: 22, color: MUTED, marginTop: 6, maxWidth: 620 }}>
                {card.headline}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 48,
                  marginTop: 30,
                  paddingTop: 24,
                  borderTop: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <Stat label="HOLDINGS" value={String(stats.contractCount)} />
                <Stat label="EARLIEST" value={stats.earliestYear ? String(stats.earliestYear) : "n/a"} />
                <Stat
                  label="ONCHAIN"
                  value={
                    stats.walletAgeYears !== null && stats.walletAgeYears !== undefined
                      ? `${stats.walletAgeYears}y`
                      : "n/a"
                  }
                />
                {stats.allWalletsVerified ? <Stat label="STATUS" value="Verified" accent /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Disposition": `inline; filename="ethereum-history-card-${slug}.png"`,
      },
    }
  );
}
