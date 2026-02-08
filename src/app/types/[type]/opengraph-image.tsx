import { ImageResponse } from "next/og";
import { getContractTypeLabel } from "@/lib/utils";
import type { HeuristicContractType } from "@/types";

export const runtime = "nodejs";
export const alt = "Ethereum History Contract Type";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TYPE_COLORS: Record<string, string> = {
  token: "#f59e0b",
  multisig: "#8b5cf6",
  crowdsale: "#10b981",
  exchange: "#3b82f6",
  wallet: "#6366f1",
  registry: "#ec4899",
  dao: "#ef4444",
  game: "#14b8a6",
  unknown: "#71717a",
};

const TYPE_ICONS: Record<string, string> = {
  token: "🪙",
  multisig: "🔐",
  crowdsale: "📊",
  exchange: "🔄",
  wallet: "👛",
  registry: "📋",
  dao: "🏛️",
  game: "🎮",
  unknown: "❓",
};

const VALID_TYPES: HeuristicContractType[] = [
  "token", "multisig", "crowdsale", "exchange", "wallet", "registry", "dao", "game", "unknown",
];

export default async function OGImage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!VALID_TYPES.includes(type as HeuristicContractType)) {
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
        Unknown Type
      </div>,
      { ...size }
    );
  }

  const label = getContractTypeLabel(type as HeuristicContractType);
  const accentColor = TYPE_COLORS[type] || "#71717a";
  const icon = TYPE_ICONS[type] || "📄";

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

      {/* Icon + Type badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
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
          Contract Type
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
        {label} Contracts
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: "22px",
          color: "#a1a1aa",
          lineHeight: 1.6,
          maxWidth: "800px",
        }}
      >
        Browse early Ethereum {label.toLowerCase()} contracts from the historical archive (2015–2017).
      </div>
    </div>,
    { ...size }
  );
}
