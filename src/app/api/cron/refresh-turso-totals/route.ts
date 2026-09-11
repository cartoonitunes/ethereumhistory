/**
 * POST /api/cron/refresh-turso-totals
 *
 * Refreshes the full-index rows in contract_stats_cache — a scan of all 12M
 * rows precomputed into Neon so page handlers never scan the index on the
 * request path (see refreshTursoIndexTotals).
 *
 * Which backend is scanned, and which scope prefix is written, both follow
 * INDEX_SOURCE: `turso:*` from Turso by default, `index:*` from
 * neon_contract_index when INDEX_SOURCE=neon. The route name predates the
 * flag and is kept so the vercel.json cron entry stays valid.
 *
 * Split out from /api/cron/refresh-stats so the two heavy jobs don't stack
 * in one function invocation and blow the 300s Vercel ceiling on cold start.
 * Neon per-scope refresh and this index scan now each get their own hour,
 * offset in vercel.json so they never overlap.
 *
 * Auth: either an admin historian cookie, or a `Bearer ${CRON_SECRET}`
 * Authorization header (Vercel Cron sends this automatically when
 * CRON_SECRET is set as an env var).
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { refreshTursoIndexTotals } from "@/lib/progress-stats";
import { getIndexSource } from "@/lib/index-source";

export const dynamic = "force-dynamic";

// This is the whole point of the split: give the index pass the full
// function ceiling, isolated from the Neon aggregates.
export const maxDuration = 300;

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.get("authorization") ?? "";
    if (header === `Bearer ${cronSecret}`) return true;
  }
  const me = await getHistorianMeFromRequest(req);
  return !!(me && me.active && me.role === "admin");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  // Reported so a cutover can be confirmed from the response alone: after
  // flipping the flag this must read "neon", otherwise the run just rewrote
  // the `turso:*` scopes and the `index:*` ones readers now want are absent.
  const indexSource = getIndexSource();

  try {
    await refreshTursoIndexTotals();
    return NextResponse.json({
      data: {
        elapsedMs: Date.now() - started,
        indexSource,
        // Kept under its original key so existing monitoring keeps working;
        // it now reports the active index source's error, whichever that is.
        tursoError: null,
      },
      error: null,
    });
  } catch (error) {
    console.error(`[cron/refresh-turso-totals] ${indexSource} index totals refresh failed:`, error);
    return NextResponse.json(
      {
        data: {
          elapsedMs: Date.now() - started,
          indexSource,
          tursoError: error instanceof Error ? error.message : String(error),
        },
        error: "Failed to refresh index totals",
      },
      { status: 500 }
    );
  }
}

// Vercel Cron issues GET by default; let it work the same way.
export const GET = POST;
