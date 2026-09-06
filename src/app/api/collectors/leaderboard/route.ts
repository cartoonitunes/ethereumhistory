/**
 * GET /api/collectors/leaderboard  top collectors by score.
 *
 * Public and anonymous, so unlike the per user collector card routes this does
 * NOT send NO_STORE_HEADERS. Every caller gets the identical body, which makes
 * it safe and useful to cache at the edge. It is cached briefly rather than not
 * at all because a card can be rebuilt at any moment, and because the score
 * itself is recomputed per request and drifts with wallet age.
 *
 * Returns the same shape the page renders from, so a future client side "show
 * more" can page through this without a second implementation.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db-client";
import { getLeaderboard } from "@/lib/collector-card";

export const dynamic = "force-dynamic";

/** Matches the page. Anything higher is clamped inside getLeaderboard. */
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503 });
  }

  const raw = req.nextUrl.searchParams.get("limit");
  const parsed = raw === null ? DEFAULT_LIMIT : Number.parseInt(raw, 10);
  const limit =
    Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT;

  try {
    const entries = await getLeaderboard(limit);
    return NextResponse.json(
      { data: { entries, count: entries.length, limit } },
      {
        status: 200,
        headers: {
          // Short, for the same reason the page is dynamic: a caller polling this
          // endpoint after a scan is asking whether their row landed, and five
          // minutes of edge cache answered no long after it had.
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[leaderboard] failed:", err);
    return NextResponse.json({ data: null, error: "Could not load the leaderboard" }, { status: 500 });
  }
}
