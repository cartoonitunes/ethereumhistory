/**
 * Dynamic OG Image for Compare Pages
 *
 * GET /api/og/compare?a=0x...&b=0x...
 *
 * Generates a 1200x630 PNG showing both contracts side by side.
 * Referenced from the compare page's metadata.
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getContract } from "@/lib/db";
import { isValidAddress, formatAddress } from "@/lib/utils";
import { ERAS } from "@/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const a = request.nextUrl.searchParams.get("a") || "";
  const b = request.nextUrl.searchParams.get("b") || "";

  const ogSize = { width: 1200, height: 630 };

  if (!a || !b || !isValidAddress(a) || !isValidAddress(b)) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#0a0b0f",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>
          Compare Contracts
        </div>
        <div style={{ fontSize: 22, color: "#71717a" }}>
          ethereumhistory.com
        </div>
      </div>,
      { ...ogSize }
    );
  }

  const [contractA, contractB] = await Promise.all([
    getContract(a.toLowerCase()),
    getContract(b.toLowerCase()),
  ]);

  const nameA =
    contractA?.etherscanContractName ||
    contractA?.tokenName ||
    contractA?.ensName ||
    formatAddress(a, 10);
  const nameB =
    contractB?.etherscanContractName ||
    contractB?.tokenName ||
    contractB?.ensName ||
    formatAddress(b, 10);

  const eraA =
    contractA?.eraId && ERAS[contractA.eraId]
      ? ERAS[contractA.eraId].name
      : null;
  const eraB =
    contractB?.eraId && ERAS[contractB.eraId]
      ? ERAS[contractB.eraId].name
      : null;

  const descA = contractA?.shortDescription || "No description yet";
  const descB = contractB?.shortDescription || "No description yet";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        color: "#fff",
        padding: "50px 60px",
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
          background: "linear-gradient(90deg, #626ef1, #8b5cf6)",
        }}
      />

      {/* Site branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "30px",
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
        <span style={{ color: "#71717a", fontSize: "18px" }}>
          ethereumhistory.com
        </span>
        <span
          style={{ color: "#3f3f46", fontSize: "18px", marginLeft: "8px" }}
        >
          / compare
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            fontSize: "42px",
            fontWeight: 800,
            color: "#f4f4f5",
            lineHeight: 1.1,
          }}
        >
          {nameA.length > 24 ? nameA.slice(0, 24) + "…" : nameA}
        </div>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 400,
            color: "#52525b",
            padding: "0 8px",
          }}
        >
          vs
        </div>
        <div
          style={{
            fontSize: "42px",
            fontWeight: 800,
            color: "#f4f4f5",
            lineHeight: 1.1,
          }}
        >
          {nameB.length > 24 ? nameB.slice(0, 24) + "…" : nameB}
        </div>
      </div>

      {/* Two contract cards side by side */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          flex: 1,
        }}
      >
        {/* Card A */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#111118",
            border: "1px solid #27272a",
            borderRadius: "16px",
            padding: "24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#e4e4e7",
              }}
            >
              {nameA.length > 28 ? nameA.slice(0, 28) + "…" : nameA}
            </div>
            {eraA && (
              <div
                style={{
                  background: "rgba(98,110,241,0.15)",
                  color: "#8b9cf7",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                }}
              >
                {eraA}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#a1a1aa",
              lineHeight: 1.5,
              overflow: "hidden",
            }}
          >
            {descA.length > 120 ? descA.slice(0, 120) + "…" : descA}
          </div>
          <div
            style={{
              marginTop: "auto",
              fontSize: "13px",
              color: "#52525b",
              fontFamily: "monospace",
              paddingTop: "12px",
            }}
          >
            {formatAddress(a, 10)}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(98,110,241,0.15)",
              border: "1px solid rgba(98,110,241,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8b9cf7",
              fontSize: "18px",
            }}
          >
            ↔
          </div>
        </div>

        {/* Card B */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#111118",
            border: "1px solid #27272a",
            borderRadius: "16px",
            padding: "24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#e4e4e7",
              }}
            >
              {nameB.length > 28 ? nameB.slice(0, 28) + "…" : nameB}
            </div>
            {eraB && (
              <div
                style={{
                  background: "rgba(98,110,241,0.15)",
                  color: "#8b9cf7",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                }}
              >
                {eraB}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#a1a1aa",
              lineHeight: 1.5,
              overflow: "hidden",
            }}
          >
            {descB.length > 120 ? descB.slice(0, 120) + "…" : descB}
          </div>
          <div
            style={{
              marginTop: "auto",
              fontSize: "13px",
              color: "#52525b",
              fontFamily: "monospace",
              paddingTop: "12px",
            }}
          >
            {formatAddress(b, 10)}
          </div>
        </div>
      </div>
    </div>,
    { ...ogSize }
  );
}
