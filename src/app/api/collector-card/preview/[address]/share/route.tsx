/**
 * GET /api/collector-card/preview/[address]/share
 *
 * The share image for a preview card, at the same 1200x630 as a saved card's.
 *
 * Reads the persisted row first, so an unfurl of a shared link costs a database
 * read rather than a provider scan. Falls back to scanning only when the
 * address has never been looked up, which is the case where somebody pasted the
 * image URL before the page it belongs to.
 */

import { ImageResponse } from "next/og";
import {
  buildEphemeralCard,
  getPreviewCard,
  persistPreviewCard,
  type CardData,
} from "@/lib/collector-card";
import { isDatabaseConfigured } from "@/lib/db-client";
import { isValidAddress } from "@/lib/utils";
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

  let card: CardData | null = null;

  if (isDatabaseConfigured() && isValidAddress(key)) {
    const stored = await getPreviewCard(key);
    if (stored) card = stored.card;
  }

  if (!card) {
    const result = await cached(`card-preview:${key}`, CACHE_TTL.MEDIUM, () =>
      buildEphemeralCard(key)
    );
    if ("error" in result) return new Response("Not found", { status: 404 });
    await persistPreviewCard(result.address, result.card);
    card = result.card;
  }
  return new ImageResponse(renderShareCard(card), {
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
