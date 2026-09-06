/**
 * The shareable card image, shared by the saved and preview routes.
 *
 * This is a deliberate reproduction of the on screen card in
 * app/card/[slug]/HolographicCard.tsx, not a separate landscape design. The
 * download and the unfurl should look like a screenshot of the card someone is
 * looking at, so the geometry, the type scale, the palette and the decoration
 * are all carried across rather than reinterpreted.
 *
 * WHAT SATORI CANNOT DO, AND WHAT IS USED INSTEAD
 * ----------------------------------------------
 * The interactive card leans on four things the renderer does not support, so
 * each is approximated with something it does:
 *
 *   conic-gradient on the avatar ring  ->  a 140deg linear gradient through the
 *       same five stops, which reads almost identically on a thin ring.
 *   mix-blend-mode foil and sheen      ->  one diagonal linear gradient overlay
 *       at low opacity. The interactive version only shows these under the
 *       pointer anyway, so the still frame takes the resting state plus a hint.
 *   radial-gradient outer glow         ->  layered box-shadows in the accent
 *       colour, which spread the same way and are reliable here.
 *   radial-gradient sparkle dots       ->  solid dots with a soft box-shadow.
 *
 * Everything else, the border gradient, the radii, the tier panel, the stats
 * rule, is the real thing rather than a stand in.
 *
 * SIZING
 * ------
 * The card is drawn at 1.25x its desktop width and centred on the page's own
 * background, so the image is the card sitting on the site rather than the card
 * stretched into a letterbox. The empty space either side is the glow, which is
 * what the page looks like.
 */

import type { CardData } from "@/lib/collector-card";

export const SHARE_WIDTH = 1200;
/**
 * 630, not 675, to match every other og:image on the site.
 *
 * X sizes summary_large_image at roughly 1.91:1. At 675 the preview card, which
 * is the most shared surface of the three, was the one image that got cropped
 * or letterboxed while /card, /assets and /collectors all sat at 630.
 */
export const SHARE_HEIGHT = 630;

/** Straight from tailwind.config.ts, so the image cannot drift from the site. */
const PAGE = "#18181b"; // obsidian-950, the page behind the card
const CARD = "#0b0b10"; // the card body
const OBSIDIAN_50 = "#f7f7f8";
const OBSIDIAN_300 = "#b8b8c1";
const OBSIDIAN_400 = "#91919f";
const ETHER_200 = "#c7d4fe";
const ETHER_300 = "#a4b8fc";
const ETHER_400 = "#8093f8";
const ETHER_500 = "#626ef1";

/** Card geometry. 1.25x the 23rem desktop card. */
const CARD_W = 420;
const SCALE = 1.14;
const R = 20 * SCALE; // rounded-[1.25rem]

/**
 * Tailwind tier classes resolved to hex.
 *
 * The tier carries its colour as a class name, which means nothing to a
 * renderer with no stylesheet, so it is mapped here. Anything unrecognised
 * falls back to the same ether-200 the card uses.
 */
const TIER_HEX: Record<string, string> = {
  "text-yellow-400": "#facc15",
  "text-ether-200": ETHER_200,
  "text-ether-300": ETHER_300,
  "text-obsidian-200": "#d9d9de",
  "text-obsidian-300": OBSIDIAN_300,
  "text-obsidian-400": OBSIDIAN_400,
};

/** Same five positions as SPARKS on the interactive card. */
const SPARKS = [
  { top: "6%", left: "8%", size: 9 },
  { top: "13%", left: "89%", size: 6 },
  { top: "44%", left: "4%", size: 5 },
  { top: "72%", left: "93%", size: 8 },
  { top: "88%", left: "12%", size: 6 },
];

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: accent ? ETHER_300 : OBSIDIAN_50,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12, letterSpacing: 1.6, color: OBSIDIAN_400 }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

export function renderShareCard(card: CardData) {
  const stats = card.stats;
  const avatar = card.owner?.avatarUrl ?? null;
  const isEmpty = (stats?.contractCount ?? 0) === 0;
  const tierColor = TIER_HEX[card.tier?.color ?? ""] ?? ETHER_200;

  const primary = card.owner?.name ?? "Collector";
  const subline = card.owner?.ensName && card.owner.ensName !== primary ? card.owner.ensName : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: PAGE,
      }}
    >
      {/* Gradient border, the 1px padded wrapper from the real card, plus the
          outer glow that sits behind it on the page. */}
      <div
        style={{
          display: "flex",
          padding: 1.5,
          borderRadius: R,
          background:
            "linear-gradient(145deg, rgba(164,184,252,0.85), rgba(98,110,241,0.35) 35%, rgba(255,255,255,0.08) 60%, rgba(164,184,252,0.6))",
          boxShadow:
            "0 0 140px 40px rgba(98,110,241,0.20), 0 26px 60px -26px rgba(0,0,0,0.85)",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: CARD_W,
            padding: "24px 30px 22px",
            borderRadius: R - 1,
            background: CARD,
          }}
        >
          {/* Holographic hint. The interactive foil only appears under the
              pointer, so a still frame takes a whisper of it rather than the
              full spectrum, which would look like a rendering fault. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: R - 1,
              background:
                "linear-gradient(115deg, rgba(255,77,122,0.07) 0%, rgba(255,210,61,0.05) 18%, rgba(61,255,168,0.05) 34%, rgba(61,168,255,0.07) 52%, rgba(178,61,255,0.06) 70%, rgba(255,77,122,0.05) 100%)",
            }}
          />
          {/* Specular sheen, resting state. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 220,
              borderRadius: R - 1,
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0) 100%)",
            }}
          />

          {SPARKS.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: s.top,
                left: s.left,
                width: s.size * SCALE,
                height: s.size * SCALE,
                borderRadius: 999,
                // Resting opacity, not the hover value. At 0.9 these read as
                // blemishes sitting on top of the text rather than as the faint
                // motes the card actually shows when nobody is pointing at it.
                background: "rgba(255,255,255,0.34)",
                boxShadow: "0 0 6px 1px rgba(255,255,255,0.12)",
              }}
            />
          ))}

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: 4.2,
                color: ETHER_400,
                display: "flex",
              }}
            >
              ETHEREUM HISTORY
            </div>

            {/* Portrait with its gradient ring. */}
            <div
              style={{
                display: "flex",
                marginTop: 16,
                padding: 3,
                borderRadius: 999,
                background: `linear-gradient(140deg, ${ETHER_300}, ${ETHER_500} 28%, #b23dff 55%, #3da8ff 78%, ${ETHER_300})`,
                boxShadow: "0 0 34px 10px rgba(130,145,255,0.30)",
              }}
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  width={132}
                  height={132}
                  style={{ width: 132, height: 132, borderRadius: 999, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: 132,
                    height: 132,
                    borderRadius: 999,
                    background: "#15151d",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 52,
                    color: ETHER_300,
                  }}
                >
                  {primary.replace(/^0x/i, "").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 15,
                fontSize: 27,
                fontWeight: 600,
                color: OBSIDIAN_50,
                letterSpacing: -0.6,
                display: "flex",
                maxWidth: CARD_W - 60,
              }}
            >
              {primary}
            </div>

            {subline ? (
              <div style={{ marginTop: 4, fontSize: 14, color: OBSIDIAN_400, display: "flex" }}>
                {subline}
              </div>
            ) : null}

            {/* Tier panel. */}
            <div
              style={{
                marginTop: 16,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "13px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 600,
                  letterSpacing: -0.4,
                  color: isEmpty ? OBSIDIAN_300 : tierColor,
                  display: "flex",
                }}
              >
                {isEmpty ? "Not collecting yet" : card.tier.label}
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 13,
                  lineHeight: 1.35,
                  color: OBSIDIAN_400,
                  display: "flex",
                  textAlign: "center",
                }}
              >
                {isEmpty
                  ? "Nothing in this wallet appears in the archive so far"
                  : card.tier.blurb}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 15,
                lineHeight: 1.4,
                color: OBSIDIAN_300,
                display: "flex",
                textAlign: "center",
                maxWidth: 320,
              }}
            >
              {card.headline}
            </div>

            {/* The rule above the stats, as a gradient rather than a flat
                hairline so it carries the accent the way the card does. */}
            <div
              style={{
                marginTop: 18,
                width: "100%",
                height: 1,
                display: "flex",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(164,184,252,0.45) 50%, rgba(255,255,255,0.02))",
              }}
            />

            <div
              style={{
                marginTop: 14,
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Stat label="Score" value={String(stats?.score ?? 0)} accent />
              <Stat label="Held" value={String(stats?.contractCount ?? 0)} />
              <Stat label="Oldest" value={stats?.earliestYear ? String(stats.earliestYear) : "n/a"} />
              <Stat
                label="Onchain"
                value={stats?.walletAgeYears !== null && stats?.walletAgeYears !== undefined
                  ? `${stats.walletAgeYears}y`
                  : "n/a"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
