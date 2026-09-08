/**
 * POST /api/cron/refresh-turso-totals
 *
 * Refreshes the `turso:*` rows in contract_stats_cache — a full-index scan
 * of the 12M-row Turso contract_index precomputed into Neon so page handlers
 * never touch Turso on the request path (see refreshTursoIndexTotals).
 *
 * Split out from /api/cron/refresh-stats so the two heavy jobs don't stack
 * in one function invocation and blow the 300s Vercel ceiling on cold start.
 * Neon per-scope refresh and this Turso scan now each get their own hour,
 * offset in vercel.json so they never overlap.
 *
 * Auth: either an admin historian cookie, or a `Bearer ${CRON_SECRET}`
 * Authorization header (Vercel Cron sends this automatically when
 * CRON_SECRET is set as an env var).
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { refreshTursoIndexTotals } from "@/lib/progress-stats";

export const dynamic = "force-dynamic";

// This is the whole point of the split: give the Turso pass the full
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
  try {
    await refreshTursoIndexTotals();
    return NextResponse.json({
      data: { elapsedMs: Date.now() - started },
      error: null,
    });
  } catch (error) {
    console.error("[cron/refresh-turso-totals] error:", error);
    return NextResponse.json(
      { data: { elapsedMs: Date.now() - started }, error: "Failed to refresh Turso totals" },
      { status: 500 }
    );
  }
}

// Vercel Cron issues GET by default; let it work the same way.
export const GET = POST;
