/**
 * OG image for /coverage — renders the live coverage split so a shared link
 * shows the actual dashboard numbers, not a generic site card.
 */

import { ImageResponse } from "next/og";
import { getCoverageStats } from "@/lib/coverage-stats";

export const runtime = "nodejs";
/**
 * Rendered on request, not at build.
 *
 * This used to be `revalidate = 3600`, which makes Next prerender the image
 * during the build. Drawing it needs getCoverageStats(), which runs four
 * aggregates over the ~1.4M-row `contracts` table — currently ~75s against this
 * project's Neon compute, well past the 60s budget Next allows a single page
 * during static generation. Every build failed on this route, three attempts
 * each, and took the whole deployment down with it: a shareable social card was
 * blocking releases.
 *
 * Serving it per-request removes it from the build's critical path entirely. The
 * hourly cache the ISR window was there to provide is preserved by the
 * Cache-Control header below, so the card and the layout's meta tags still agree
 * within the same window, and the CDN still absorbs the traffic.
 */
export const dynamic = "force-dynamic";
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

  // Hard timeout so a slow contract_stats_cache read (see the batched
  // refresh in migration 070) can't blow the 60s static-generation cap
  // during builds. On timeout we fall through to the generic fallback
  // card; the ISR revalidate then re-tries with fresh numbers.
  try {
    const summary = await Promise.race([
      getCoverageStats().then((s) => s.summary),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("coverage stats fetch timed out")), 20_000)
      ),
    ]);
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
    {
      ...size,
      headers: {
        // Same one-hour window the ISR setting used to give this route, now
        // enforced at the CDN instead of at build time. stale-while-revalidate
        // means a cold hour boundary serves the previous card rather than
        // waiting on the aggregates.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
