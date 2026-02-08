import { ImageResponse } from "next/og";
import { ERAS } from "@/types";

export const runtime = "nodejs";
export const alt = "Ethereum History Era";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ERA_COLORS: Record<string, string> = {
  olympic: "#10b981",
  frontier: "#6366f1",
  homestead: "#8b5cf6",
  "dao-fork": "#ef4444",
  "tangerine-whistle": "#f97316",
  "spurious-dragon": "#22c55e",
};

export default async function OGImage({ params }: { params: Promise<{ eraId: string }> }) {
  const { eraId } = await params;
  const era = ERAS[eraId];

  if (!era) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#0a0b0f",
          color: "#fff",
          fontSize: 48,
        }}
      >
        Unknown Era
      </div>,
      { ...size }
    );
  }

  const accentColor = ERA_COLORS[eraId] || "#6366f1";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        color: "#fff",
        padding: "60px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "6px",
          background: accentColor,
        }}
      />

      {/* Site branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #626ef1, #4338ca)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
            <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
          </svg>
        </div>
        <span style={{ color: "#71717a", fontSize: "18px" }}>ethereumhistory.com</span>
      </div>

      {/* Era badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: `${accentColor}22`,
            border: `1px solid ${accentColor}44`,
            borderRadius: "9999px",
            padding: "6px 16px",
            fontSize: "16px",
            fontWeight: 600,
            color: accentColor,
          }}
        >
          {era.name} Era
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: "56px",
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: "20px",
          background: `linear-gradient(135deg, #f4f4f5, ${accentColor})`,
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {era.name}
      </div>

      {/* Date range */}
      <div
        style={{
          fontSize: "22px",
          color: "#a1a1aa",
          marginBottom: "16px",
        }}
      >
        {era.startDate} — {era.endDate || "present"} · Blocks {era.startBlock.toLocaleString()} – {era.endBlock?.toLocaleString() || "..."}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: "18px",
          color: "#71717a",
          lineHeight: 1.6,
          maxWidth: "800px",
          overflow: "hidden",
        }}
      >
        Explore historical Ethereum smart contracts from the {era.name} era.
      </div>
    </div>,
    { ...size }
  );
}
