/**
 * Dynamic OG Image for Contract Pages
 *
 * GET /api/og/contract/[address]
 *
 * Generates a 1200×630 PNG share card with the contract's story hook,
 * era badge, verification status, and EH branding.
 */

import { ImageResponse } from "next/og";
import { getContractWithTokenMetadata } from "@/lib/db";
import { getDeploymentRank } from "@/lib/db/contracts";
import { isValidAddress } from "@/lib/utils";

export const runtime = "nodejs";
export const revalidate = 600;

const SIZE = { width: 1200, height: 630 };

const ERA_COLORS: Record<string, string> = {
  frontier: "#6366f1",
  homestead: "#8b5cf6",
  dao_fork: "#ef4444",
  tangerine_whistle: "#f97316",
  spurious_dragon: "#22c55e",
  byzantium: "#06b6d4",
  constantinople: "#3b82f6",
  istanbul: "#ec4899",
  berlin: "#14b8a6",
  london: "#f59e0b",
  arrow_glacier: "#a855f7",
  gray_glacier: "#6366f1",
  paris: "#8b5cf6",
};

function eraLabel(eraId: string): string {
  return eraId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " Era";
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max).trimEnd() + "…";
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
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
            <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
          </svg>
        </div>
        <span style={{ fontSize: 28, color: "#71717a" }}>ethereumhistory.com</span>
      </div>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return new ImageResponse(<Fallback />, { ...SIZE });
  }

  const addr = address.toLowerCase();

  const [contract, rankResult] = await Promise.all([
    getContractWithTokenMetadata(addr).catch(() => null),
    getDeploymentRank(addr).catch(() => null),
  ]);

  if (!contract) {
    return new ImageResponse(<Fallback />, { ...SIZE });
  }

  // --- Data extraction ---
  const name = truncate(
    contract.tokenName ||
    contract.etherscanContractName ||
    contract.ensName ||
    `Contract ${addr.slice(0, 6)}…${addr.slice(-4)}`,
    42
  );
  const symbol = contract.tokenSymbol || null;

  // Story hook: prefer shortDescription (concise), fall back to historicalSignificance, then ogSnippet
  const rawHook =
    contract.shortDescription?.trim() ||
    contract.historicalSignificance?.trim() ||
    rankResult?.ogSnippet?.trim() ||
    null;
  const hook = rawHook ? truncate(rawHook.replace(/\n+/g, " "), 150) : null;

  const eraId = contract.eraId || null;
  const accentColor = (eraId && ERA_COLORS[eraId]) || "#6366f1";
  const era = eraId ? eraLabel(eraId) : null;

  const deployDate = contract.deploymentTimestamp
    ? new Date(contract.deploymentTimestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const isVerified =
    contract.verificationStatus === "verified" ||
    contract.verificationMethod === "exact_bytecode_match" ||
    contract.verificationMethod === "near_exact_match" ||
    contract.verificationMethod === "author_published_source" ||
    contract.verificationMethod === "author_published" ||
    contract.verificationMethod === "etherscan_verified";

  const rankTag = rankResult?.rankTag ?? null;
  const shortAddr = `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  // --- Responsive font size for long names ---
  const nameFontSize = name.length > 32 ? 52 : name.length > 22 ? 64 : 72;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Left era-color accent stripe */}
      <div
        style={{
          display: "flex",
          width: 8,
          height: "100%",
          background: accentColor,
          flexShrink: 0,
        }}
      />

      {/* Subtle left glow from accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 320,
          height: "100%",
          background: `linear-gradient(90deg, ${accentColor}12 0%, transparent 100%)`,
        }}
      />

      {/* Main content */}
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
        {/* TOP ROW: branding + era badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* EH logo + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <span
              style={{
                fontSize: 17,
                color: "#52525b",
                letterSpacing: "0.06em",
                fontWeight: 500,
              }}
            >
              ETHEREUM HISTORY
            </span>
          </div>

          {/* Era badge */}
          {era && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: `${accentColor}18`,
                border: `1.5px solid ${accentColor}45`,
                borderRadius: 10,
                padding: "7px 16px",
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: accentColor,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 17, color: accentColor, fontWeight: 700 }}>{era}</span>
            </div>
          )}
        </div>

        {/* CENTER: name + hook */}
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
          {/* Name + symbol */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: nameFontSize,
                fontWeight: 800,
                color: "#fafafa",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
              }}
            >
              {name}
            </span>
            {symbol && (
              <div
                style={{
                  display: "flex",
                  background: `${accentColor}22`,
                  border: `1.5px solid ${accentColor}45`,
                  borderRadius: 10,
                  padding: "7px 18px",
                  marginBottom: 6,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 26, color: accentColor, fontWeight: 700 }}>{symbol}</span>
              </div>
            )}
          </div>

          {/* Story hook */}
          {hook && (
            <span
              style={{
                fontSize: 26,
                color: "#8c8c9e",
                lineHeight: 1.45,
                maxWidth: 1000,
              }}
            >
              {hook}
            </span>
          )}
        </div>

        {/* BOTTOM ROW: address + date + badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left: address + deploy date */}
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <span
              style={{
                fontSize: 16,
                color: "#3f3f52",
                fontFamily: "monospace",
              }}
            >
              {shortAddr}
            </span>
            {deployDate && (
              <>
                <span style={{ fontSize: 16, color: "#2a2a3a" }}>·</span>
                <span style={{ fontSize: 16, color: "#3f3f52" }}>
                  Deployed {deployDate}
                </span>
              </>
            )}
          </div>

          {/* Right: verified + rank badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isVerified && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#14532d22",
                  border: "1.5px solid #16a34a45",
                  borderRadius: 8,
                  padding: "5px 14px",
                }}
              >
                <span style={{ fontSize: 14, color: "#22c55e", fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: "#22c55e", fontWeight: 600 }}>
                  Verified
                </span>
              </div>
            )}
            {rankTag && (
              <div
                style={{
                  display: "flex",
                  background: "#4c1d9522",
                  border: "1.5px solid #7c3aed45",
                  borderRadius: 8,
                  padding: "5px 14px",
                }}
              >
                <span style={{ fontSize: 14, color: "#a78bfa", fontWeight: 700 }}>
                  {rankTag}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    { ...SIZE }
  );
}
