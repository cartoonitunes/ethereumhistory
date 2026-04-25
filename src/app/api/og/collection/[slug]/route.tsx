import { ImageResponse } from "next/og";
import { isDatabaseConfigured, getCollectionBySlugFromDb } from "@/lib/db-client";

export const runtime = "nodejs";
export const revalidate = 300;

const SIZE = { width: 1200, height: 630 };
const ACCENT = "#6366f1";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max).trimEnd() + "…";
}

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

function Fallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Logo />
        <span style={{ fontSize: 28, color: "#71717a" }}>ethereumhistory.com</span>
      </div>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isDatabaseConfigured()) {
    return new ImageResponse(<Fallback />, { ...SIZE });
  }

  const collection = await getCollectionBySlugFromDb(slug).catch(() => null);
  if (!collection) {
    return new ImageResponse(<Fallback />, { ...SIZE });
  }

  const contractCount = collection.contractAddresses?.length ?? 0;
  const title = truncate(collection.title, 40);
  const subtitle = collection.subtitle ? truncate(collection.subtitle, 80) : null;
  const shortAddr = collection.deployerAddress
    ? `${collection.deployerAddress.slice(0, 6)}…${collection.deployerAddress.slice(-4)}`
    : null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.ethereumhistory.com";
  const coverUrl = collection.coverImageUrl ? `${siteUrl}${collection.coverImageUrl}` : null;

  const titleFontSize = title.length > 32 ? 52 : title.length > 22 ? 62 : 72;

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

      {/* Content column */}
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
        {/* Branding + COLLECTION badge */}
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
            <span style={{ fontSize: 17, color: ACCENT, fontWeight: 700 }}>COLLECTION</span>
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
              fontSize: titleFontSize,
              fontWeight: 800,
              color: "#fafafa",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              maxWidth: coverUrl ? 680 : 1040,
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: 26,
                color: "#8c8c9e",
                lineHeight: 1.45,
                maxWidth: coverUrl ? 640 : 1000,
              }}
            >
              {subtitle}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#13141a",
              border: "1px solid #252534",
              borderRadius: 9,
              padding: "7px 18px",
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fafafa" }}>
              {contractCount.toLocaleString()}
            </span>
            <span style={{ fontSize: 16, color: "#52525b" }}>contracts</span>
          </div>
          {shortAddr && (
            <span style={{ fontSize: 15, color: "#3f3f52", fontFamily: "monospace" }}>
              {shortAddr}
            </span>
          )}
        </div>
      </div>

      {/* Right: cover image panel */}
      {coverUrl && (
        <div
          style={{
            display: "flex",
            width: 340,
            height: "100%",
            position: "relative",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            width={340}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              opacity: 0.45,
            }}
          />
          {/* Left-to-right fade so title is readable */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "60%",
              height: "100%",
              background: "linear-gradient(90deg, #0a0b0f 0%, transparent 100%)",
            }}
          />
        </div>
      )}
    </div>,
    { ...SIZE }
  );
}
