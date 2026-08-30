/**
 * OG image for /coverage — renders the live coverage split so a shared link
 * shows the actual dashboard numbers, not a generic site card.
 */

import { ImageResponse } from "next/og";
import { getCoverageStats } from "@/lib/coverage-stats";

export const runtime = "nodejs";
/** Match the layout's ISR window so the card and the meta tags never disagree. */
export const revalidate = 3600;
export const alt = "Ethereum History coverage dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0b0f";
const DOCUMENTED = "#6366f1";
const UNCOVERED = "#f59e0b";
const INDEXED = "#3f3f52";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export default async function OGImage() {
  let pct = 0;
  let documented = 0;
  let uncovered = 0;
  let indexed = 0;
  let total = 0;
  let ok = false;

  try {
    const { summary } = await getCoverageStats();
    pct = summary.documentedPct;
    documented = summary.documented;
    uncovered = summary.uncovered;
    indexed = summary.indexed;
    total = summary.total;
    ok = total > 0;
  } catch {
    ok = false;
  }

  // Percentages for the stacked bar; guard against a zero total.
  const denom = ok ? total : 1;
  const docW = (documented / denom) * 100;
  const uncW = (uncovered / denom) * 100;
  const idxW = (indexed / denom) * 100;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: BG,
          color: "#fff",
          padding: "64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: DOCUMENTED,
          }}
        />

        <div style={{ display: "flex", fontSize: 26, color: "#8b8ba7", letterSpacing: "0.08em" }}>
          ETHEREUMHISTORY.COM
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
          <div style={{ display: "flex", fontSize: 66, fontWeight: 700, lineHeight: 1.1 }}>
            Coverage Dashboard
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#a6a6c0", marginTop: 14 }}>
            {ok
              ? `${pct}% of early Ethereum documented`
              : "How much of early Ethereum is documented"}
          </div>
        </div>

        {ok ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <div
              style={{
                display: "flex",
                width: "100%",
                height: 34,
                borderRadius: 17,
                overflow: "hidden",
                background: INDEXED,
              }}
            >
              {docW > 0 && <div style={{ display: "flex", width: `${docW}%`, background: DOCUMENTED }} />}
              {uncW > 0 && <div style={{ display: "flex", width: `${uncW}%`, background: UNCOVERED }} />}
              {idxW > 0 && <div style={{ display: "flex", width: `${idxW}%`, background: INDEXED }} />}
            </div>

            <div style={{ display: "flex", gap: 44, marginTop: 30 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: DOCUMENTED }}>
                  {fmt(documented)}
                </div>
                <div style={{ display: "flex", fontSize: 24, color: "#8b8ba7" }}>documented</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: UNCOVERED }}>
                  {fmt(uncovered)}
                </div>
                <div style={{ display: "flex", fontSize: 24, color: "#8b8ba7" }}>source uncovered</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: "#c9c9dd" }}>
                  {fmt(total)}
                </div>
                <div style={{ display: "flex", fontSize: 24, color: "#8b8ba7" }}>contracts indexed</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 28, color: "#8b8ba7", marginTop: "auto" }}>
            Era-by-era and year-by-year documentation coverage
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
