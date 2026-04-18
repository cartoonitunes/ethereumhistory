/**
 * POST /api/cron/refresh-stats
 *
 * Refreshes `contract_stats_cache` by calling the `refresh_contract_stats_cache()`
 * Postgres function. The table is an ~20-row precomputed snapshot that backs
 * the homepage progress widget and /api/stats/progress; refreshing it cheaply
 * replaces what would otherwise be a 15–60s aggregation on every page load.
 *
 * Intended as a Vercel cron target (configured via vercel.json) or an
 * on-demand refresh after large ingest runs. Auth: either an admin historian
 * cookie, or a `Bearer ${CRON_SECRET}` Authorization header (Vercel Cron
 * sends this automatically when CRON_SECRET is set as an env var).
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.get("authorization") ?? "";
    if (header === `Bearer ${cronSecret}`) return true;
  }
  const me = await getHistorianMeFromCookies();
  return !!(me && me.active && me.role === "admin");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { data: null, error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const db = getDb();
    const started = Date.now();
    await db.execute(sql`SELECT refresh_contract_stats_cache()`);
    const rowsRaw = await db.execute<{ scope: string; total: number; documented: number; updated_at: string }>(
      sql`SELECT scope, total, documented, updated_at FROM contract_stats_cache ORDER BY scope`
    );
    const rows = Array.isArray(rowsRaw) ? rowsRaw : ((rowsRaw as { rows?: unknown[] }).rows ?? []);
    return NextResponse.json({
      data: {
        elapsedMs: Date.now() - started,
        rows,
      },
      error: null,
    });
  } catch (error) {
    console.error("[cron/refresh-stats] error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to refresh stats cache" },
      { status: 500 }
    );
  }
}

// Vercel Cron issues GET by default; let it work the same way.
export const GET = POST;
