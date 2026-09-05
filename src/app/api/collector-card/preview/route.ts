/**
 * POST /api/collector-card/preview  build a card for any address, unauthenticated
 *
 * The acquisition funnel: paste an address, see your card, no account needed.
 * Nothing is persisted, so there is no row to clean up and no way for a
 * stranger's address to end up stored against an account.
 *
 * Rate limited by IP because, unlike every other route in this feature, anyone
 * can call it and each distinct address costs a live provider scan. Results are
 * cached per address so a shared preview link does not rescan on every view.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildEphemeralCard } from "@/lib/collector-card";
import { checkRateLimit } from "@/lib/rate-limit";
import { cached, CACHE_TTL } from "@/lib/cache";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limit = checkRateLimit(`card-preview:${clientKey(req)}`, {
    windowSeconds: 60,
    maxRequests: 8,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: "Too many previews. Try again in a minute." },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
        },
      }
    );
  }

  const body = await req.json().catch(() => null);
  const input = typeof body?.address === "string" ? body.address.trim() : "";
  if (!input || input.length > 128) {
    return NextResponse.json(
      { data: null, error: "Enter a wallet address or ENS name." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  // Cached per address, not per caller, so a preview link shared around does
  // not trigger a fresh scan for every visitor.
  const result = await cached(`card-preview:${input.toLowerCase()}`, CACHE_TTL.MEDIUM, () =>
    buildEphemeralCard(input)
  );

  if ("error" in result) {
    return NextResponse.json(
      { data: null, error: result.error },
      { status: 422, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      data: { card: result.card, address: result.address, ephemeral: true },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    },
    { headers: NO_STORE_HEADERS }
  );
}
