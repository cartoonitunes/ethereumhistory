import { ImageResponse } from "next/og";
import { isDatabaseConfigured, getCollectionsListFromDb } from "@/lib/db-client";

export const runtime = "nodejs";
export const revalidate = 300;

const SIZE = { width: 1200, height: 630 };
const ACCENT = "#6366f1";

function Logo() {
  return (
    <div
      style={{
        display: "flex",
        width: 38,
        height: 38,
        borderRadius: 10,
        background: "linear-gradient(135deg, #6366f1, #4338ca)",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
        <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
      </svg>
    </div>
  );
}

export async function GET() {
  let collections: { title: string; contractCount: number; subtitle: string | null }[] = [];
  if (isDatabaseConfigured()) {
    try {
      const list = await getCollectionsListFromDb();
      collections = list.map((c) => ({
        title: c.title,
        contractCount: c.contractCount,
        subtitle: c.subtitle,
      }));
    } catch {}
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Left accent stripe */}
      <div style={{ display: "flex", width: 8, height: "100%", background: ACCENT, flexShrink: 0 }} />

      {/* Left glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 400,
          height: "100%",
          background: `linear-gradient(90deg, ${ACCENT}14 0%, transparent 100%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "44px 60px 44px 56px",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Branding */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo />
            <span style={{ fontSize: 17, color: "#52525b", letterSpacing: "0.06em", fontWeight: 500 }}>
              ETHEREUM HISTORY
            </span>
          </div>
          <div
            style={{
              display: "flex",
              background: `${ACCENT}18`,
              border: `1.5px solid ${ACCENT}45`,
              borderRadius: 10,
              padding: "7px 18px",
            }}
          >
            <span style={{ fontSize: 17, color: ACCENT, fontWeight: 700 }}>COLLECTIONS</span>
          </div>
        </div>

        {/* Title + subtitle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            flex: 1,
            justifyContent: "center",
            paddingTop: 28,
            paddingBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#fafafa",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
            }}
          >
            Ethereum's Earliest Builders
          </span>
          <span style={{ fontSize: 26, color: "#8c8c9e", lineHeight: 1.4, maxWidth: 900 }}>
            Every contract deployed by Ethereum's earliest builders, documented and verified in one place.
          </span>
        </div>

        {/* Collection chips */}
        {collections.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {collections.slice(0, 4).map((c) => (
              <div
                key={c.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#13141a",
                  border: "1px solid #252534",
                  borderRadius: 9,
                  padding: "7px 16px",
                }}
              >
                <span style={{ fontSize: 14, color: "#a1a1aa", fontWeight: 600 }}>{c.title}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: "#3f3f52",
                    background: "#1e1e2c",
                    borderRadius: 5,
                    padding: "2px 8px",
                  }}
                >
                  {c.contractCount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    { ...SIZE }
  );
}
