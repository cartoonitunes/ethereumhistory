/**
 * GET /api/collector-card/preview/[address]/share
 *
 * The share image for an ephemeral preview card, at the same 1200x630 as a
 * saved card's. Recomputed rather than read from storage, and cached per
 * address so an unfurl does not trigger a fresh provider scan every time.
 */

import { ImageResponse } from "next/og";
import { buildEphemeralCard, type CardData } from "@/lib/collector-card";
import { cached, CACHE_TTL } from "@/lib/cache";
import { renderShareCard, SHARE_WIDTH, SHARE_HEIGHT } from "@/lib/share-card";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
): Promise<ImageResponse | Response> {
  const { address } = await params;
  const key = decodeURIComponent(address).trim().toLowerCase();
  if (!key || key.length > 128) return new Response("Not found", { status: 404 });

  const result = await cached(`card-preview:${key}`, CACHE_TTL.MEDIUM, () =>
    buildEphemeralCard(key)
  );
  if ("error" in result) return new Response("Not found", { status: 404 });

  const card: CardData = result.card;
  return new ImageResponse(renderShareCard(card), {
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
