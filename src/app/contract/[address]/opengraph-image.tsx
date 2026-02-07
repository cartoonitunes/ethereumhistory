import { ImageResponse } from "next/og";
import { getContractWithTokenMetadata } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = "Ethereum History Contract";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Era colors for the accent bar
const ERA_COLORS: Record<string, string> = {
  frontier: "#6366f1",
  homestead: "#8b5cf6",
  dao_fork: "#ef4444",
  tangerine_whistle: "#f97316",
  spurious_dragon: "#22c55e",
};

export default async function OGImage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  if (!isValidAddress(address)) {
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
        Invalid Address
      </div>,
      { ...size }
    );
  }

  const contract = await getContractWithTokenMetadata(address.toLowerCase());

  const name =
    contract?.tokenName ||
    contract?.etherscanContractName ||
    `Contract ${address.slice(0, 10)}...`;
  const symbol = contract?.tokenSymbol || null;
  const shortDesc = contract?.shortDescription || contract?.historicalSummary || null;
  const eraId = contract?.eraId || "frontier";
  const deploymentDate = contract?.deploymentTimestamp
    ? new Date(contract.deploymentTimestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const accentColor = ERA_COLORS[eraId] || "#6366f1";
  const eraLabel = eraId ? eraId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        color: "#e5e5e5",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div style={{ display: "flex", height: 6, width: "100%", background: accentColor }} />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "48px 64px",
          justifyContent: "space-between",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Ethereum diamond */}
          <div
            style={{
              display: "flex",
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
              <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
            </svg>
          </div>
          <span style={{ fontSize: 20, color: "#71717a" }}>ethereumhistory.com</span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 52, fontWeight: 700, color: "#fafafa", lineHeight: 1.1 }}>
              {name.length > 40 ? name.slice(0, 40) + "..." : name}
            </span>
            {symbol && (
              <span
                style={{
                  fontSize: 28,
                  color: accentColor,
                  background: `${accentColor}15`,
                  padding: "4px 16px",
                  borderRadius: 8,
                }}
              >
                {symbol}
              </span>
            )}
          </div>
          {shortDesc && (
            <span style={{ fontSize: 24, color: "#a1a1aa", lineHeight: 1.4, maxWidth: 900 }}>
              {shortDesc.length > 120 ? shortDesc.slice(0, 120) + "..." : shortDesc}
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontSize: 18, color: "#52525b", fontFamily: "monospace" }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            {deploymentDate && (
              <span style={{ fontSize: 18, color: "#52525b" }}>Deployed {deploymentDate}</span>
            )}
          </div>
          {eraLabel && (
            <span
              style={{
                fontSize: 16,
                color: accentColor,
                border: `1px solid ${accentColor}40`,
                padding: "4px 12px",
                borderRadius: 6,
              }}
            >
              {eraLabel}
            </span>
          )}
        </div>
      </div>
    </div>,
    { ...size }
  );
}
