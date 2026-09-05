import { NextResponse } from "next/server";
import type { ApiResponse, HistorianMe } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

/**
 * Session responses must never be cached or shared.
 *
 * Without these, the platform served this route as
 * `cache-control: public, max-age=0, must-revalidate` with no `Vary: Cookie`.
 * Marking a per-user authenticated response `public` and keying it without the
 * cookie lets any shared cache store it, so a stale logged-out body can be
 * replayed to a signed-in user. That reads exactly like "it logged me out
 * again", and it shows up on mobile first because carrier and CDN
 * intermediaries are far more common on mobile networks than on a desktop LAN.
 *
 * `private, no-store` stops it being stored at all; `Vary: Cookie` is belt and
 * braces for anything that ignores no-store.
 */
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Vary: "Cookie",
} as const;

export async function GET(): Promise<NextResponse<ApiResponse<HistorianMe | null>>> {
  try {
    const me = await getHistorianMeFromCookies();
    return NextResponse.json(
      {
        data: me,
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { data: null, error: "Failed to load historian session." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

