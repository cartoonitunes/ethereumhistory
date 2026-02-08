/**
 * Embeddable Contract Card (Route Handler)
 *
 * GET /embed/contract/[address]?theme=dark|light
 *
 * Returns a self-contained HTML page designed for iframe embedding.
 * Uses a Route Handler instead of a page component to bypass Next.js
 * root layout wrapping (which would add global CSS, Analytics, etc.).
 *
 * Usage:
 *   <iframe src="https://www.ethereumhistory.com/embed/contract/0x..."
 *           width="420" height="200" frameborder="0"
 *           style="border-radius:12px;overflow:hidden;"
 *           loading="lazy"></iframe>
 */

import { NextRequest, NextResponse } from "next/server";
import { getContract } from "@/lib/db";
import { isValidAddress, formatAddress, formatDate } from "@/lib/utils";
import { ERAS } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<Response> {
  const { address } = await params;
  const theme =
    request.nextUrl.searchParams.get("theme") === "light" ? "light" : "dark";

  if (!isValidAddress(address)) {
    return new Response("Invalid address", { status: 400 });
  }

  const contract = await getContract(address.toLowerCase());
  if (!contract) {
    return new Response("Contract not found", { status: 404 });
  }

  const name =
    contract.etherscanContractName ||
    contract.tokenName ||
    contract.ensName ||
    formatAddress(contract.address, 10);

  const eraName =
    contract.eraId && ERAS[contract.eraId] ? ERAS[contract.eraId].name : null;
  const contractUrl = `https://www.ethereumhistory.com/contract/${contract.address}`;

  const isDark = theme === "dark";

  // Escape HTML entities
  const esc = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const deployedDate = contract.deploymentTimestamp
    ? formatDate(contract.deploymentTimestamp.split("T")[0])
    : "";

  const typeBadge = contract.heuristics?.contractType
    ? `<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:9999px;background:${isDark ? "rgba(113,113,122,0.15)" : "rgba(113,113,122,0.1)"};color:${isDark ? "#a1a1aa" : "#71717a"};margin-left:6px;">${esc(contract.heuristics.contractType)}</span>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${esc(name)} — Ethereum History</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      margin: 0;
      padding: 8px;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    a { text-decoration: none; }
    .card {
      background: ${isDark ? "#0a0a0f" : "#ffffff"};
      color: ${isDark ? "#e4e4e7" : "#18181b"};
      border-radius: 12px;
      border: 1px solid ${isDark ? "#27272a" : "#e4e4e7"};
      padding: 16px 20px;
      max-width: 480px;
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .name {
      font-weight: 700;
      font-size: 16px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: ${isDark ? "#f4f4f5" : "#09090b"};
    }
    .name:hover { color: ${isDark ? "#8b9cf7" : "#626ef1"}; }
    .era-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      padding: 3px 8px;
      border-radius: 9999px;
      background: ${isDark ? "rgba(98,110,241,0.15)" : "rgba(98,110,241,0.1)"};
      color: ${isDark ? "#8b9cf7" : "#626ef1"};
      white-space: nowrap;
      flex-shrink: 0;
    }
    .description {
      font-size: 13px;
      line-height: 1.5;
      color: ${isDark ? "#a1a1aa" : "#71717a"};
      margin-bottom: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: ${isDark ? "#71717a" : "#a1a1aa"};
    }
    .address {
      font-family: "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: ${isDark ? "#52525b" : "#d4d4d8"};
    }
    .footer-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .view-link {
      font-size: 11px;
      color: #626ef1;
      font-weight: 500;
    }
    .view-link:hover { color: #8b9cf7; }
    .branding {
      margin-top: 8px;
      border-top: 1px solid ${isDark ? "#1c1c22" : "#f4f4f5"};
      padding-top: 6px;
    }
    .branding a {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: ${isDark ? "#52525b" : "#a1a1aa"};
    }
    .branding a:hover { color: ${isDark ? "#71717a" : "#52525b"}; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <a href="${esc(contractUrl)}" target="_blank" rel="noopener noreferrer" class="name">
        ${esc(name)}
      </a>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
        ${eraName ? `<span class="era-badge">${esc(eraName)}</span>` : ""}
        ${typeBadge}
      </div>
    </div>

    ${contract.shortDescription ? `<div class="description">${esc(contract.shortDescription)}</div>` : ""}

    <div class="footer">
      <span class="address">${esc(formatAddress(contract.address, 8))}</span>
      <div class="footer-right">
        ${deployedDate ? `<span>${esc(deployedDate)}</span>` : ""}
        <a href="${esc(contractUrl)}" target="_blank" rel="noopener noreferrer" class="view-link">
          View on Ethereum History &rarr;
        </a>
      </div>
    </div>

    <div class="branding">
      <a href="https://www.ethereumhistory.com" target="_blank" rel="noopener noreferrer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="${isDark ? "#52525b" : "#a1a1aa"}">
          <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
          <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
        </svg>
        ethereumhistory.com
      </a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Frame-Options": "ALLOWALL",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
