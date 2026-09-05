/**
 * Social image for /collectors.
 *
 * Uses the file convention already used by the era, type and historian pages,
 * so Next wires og:image and twitter:image automatically and the size and type
 * are declared in one place rather than repeated as a hardcoded URL.
 *
 * Drawn to match the collector card: dark ground, the accent ring, the same
 * tier vocabulary. Someone who sees this in a timeline and then opens a card
 * should recognise them as the same thing.
 */

import { ImageResponse } from "next/og";
import { allTiers } from "@/lib/collector-card";

export const runtime = "nodejs";
export const alt = "Check any wallet against the Ethereum History archive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#08080c";
const PAPER = "#f4f4f8";
const MUTED = "#8b8b9c";
const ACCENT = "#a4b8fc";

export default async function OGImage() {
  // Top three tiers, so the image shows what is actually on offer.
  const tiers = allTiers().slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: INK,
          color: PAPER,
          padding: "0 84px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient glow, echoing the card's */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            right: -140,
            top: 80,
            width: 620,
            height: 470,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(98,110,241,0.34) 0%, rgba(98,110,241,0) 70%)",
          }}
        />

        <div style={{ display: "flex", fontSize: 21, letterSpacing: 8, color: ACCENT }}>
          ETHEREUM HISTORY
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            marginTop: 16,
            maxWidth: 900,
          }}
        >
          Do you hold a piece of Ethereum history?
        </div>

        <div style={{ display: "flex", fontSize: 27, color: MUTED, marginTop: 20, maxWidth: 820 }}>
          Check any wallet against the archive and see which documented early contracts it
          holds. No account needed.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
          {tiers.map((t) => (
            <div
              key={t.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(164,184,252,0.22)",
                fontSize: 23,
              }}
            >
              <span style={{ display: "flex", color: "#c9bdff" }}>{t.label}</span>
              <span style={{ display: "flex", color: MUTED, fontSize: 18 }}>{t.threshold}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 20, color: "#5a5a68", marginTop: 44 }}>
          ethereumhistory.com/collectors
        </div>
      </div>
    ),
    { ...size }
  );
}
