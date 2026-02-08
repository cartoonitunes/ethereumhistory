/**
 * Embed Code API
 *
 * GET /api/embed/[address]?theme=dark|light
 * Returns the HTML embed snippet and iframe URL for a contract card.
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidAddress } from "@/lib/utils";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.ethereumhistory.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  const { address } = await params;
  const theme = request.nextUrl.searchParams.get("theme") === "light" ? "light" : "dark";

  if (!isValidAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address format." },
      { status: 400 }
    );
  }

  const embedUrl = `${BASE_URL}/embed/contract/${address.toLowerCase()}?theme=${theme}`;

  const iframeSnippet = `<iframe src="${embedUrl}" width="400" height="180" frameborder="0" style="border-radius:12px;overflow:hidden;" loading="lazy"></iframe>`;

  const jsSnippet = `<!-- Ethereum History Contract Card -->
<div id="eth-history-${address.toLowerCase().slice(0, 10)}" data-address="${address.toLowerCase()}" data-theme="${theme}"></div>
<script>
(function(){var d=document,c=d.getElementById("eth-history-${address.toLowerCase().slice(0, 10)}"),i=d.createElement("iframe");i.src="${embedUrl}";i.width="400";i.height="180";i.frameBorder="0";i.style.borderRadius="12px";i.style.overflow="hidden";i.loading="lazy";c.appendChild(i)})();
</script>`;

  return NextResponse.json(
    {
      data: {
        address: address.toLowerCase(),
        theme,
        embedUrl,
        iframe: iframeSnippet,
        javascript: jsSnippet,
      },
      error: null,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
