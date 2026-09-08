/**
 * POST /api/cron/refresh-stats
 *
 * Refreshes `contract_stats_cache` scope-by-scope, each in its own
 * transaction, so a Vercel cron timeout can't roll back the whole refresh.
 * Scopes are processed cheapest first (overall, per-era, then per-year);
 * anything not completed within the request budget is skipped and picked
 * up on the next hourly tick.
 *
 * Also refreshes the Turso-side full-index totals (see refreshTursoIndexTotals)
 * so request handlers don't have to scan the 12M-row contract_index on every
 * page load. Runs last: if the Neon refresh dominated the budget, the Turso
 * totals are simply skipped and retried next tick.
 *
 * Backed by the per-scope Postgres functions in migration 070
 * (refresh_contract_stats_overall / _era / _year_single). The old
 * refresh_contract_stats_cache() wrapper still exists for manual callers.
 *
 * Auth: either an admin historian cookie, or a `Bearer ${CRON_SECRET}`
 * Authorization header (Vercel Cron sends this automatically when
 * CRON_SECRET is set as an env var).
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { refreshTursoIndexTotals } from "@/lib/progress-stats";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// The Turso leg of this job scans the full 12M-row contract_index. Under the
// platform default the function was killed mid-scan on almost every run, so the
// `turso:*` totals only landed once every day or so. The scan is now a single
// pass (see refreshTursoIndexTotals) which brings it to ~1-2 min; this gives
// it the full ceiling so it has room to finish even on a slow replica.
export const maxDuration = 300;

// Overall request budget. Leaves ~25s margin under maxDuration for response
// flushing and connection cleanup. Overridable via env for Hobby tier tests.
const BUDGET_MS = Number(process.env.REFRESH_STATS_BUDGET_MS ?? 275_000);

// Static year list matches /api/stats/progress. Cheap to update as new
// years are added; the underlying function is a no-op for years with no rows.
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020];

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.get("authorization") ?? "";
    if (header === `Bearer ${cronSecret}`) return true;
  }
  const me = await getHistorianMeFromRequest(req);
  return !!(me && me.active && me.role === "admin");
}

type ScopeResult =
  | { scope: string; status: "ok"; elapsedMs: number }
  | { scope: string; status: "error"; elapsedMs: number; error: string }
  | { scope: string; status: "skipped"; reason: "budget-exhausted" };

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

  const db = getDb();
  const started = Date.now();
  const deadline = started + BUDGET_MS;
  const results: ScopeResult[] = [];

  // Cheapest scopes first: if the year branch times out, overall + era are
  // already committed and visible to the cache.
  const scopes: Array<{ name: string; run: () => Promise<unknown> }> = [
    { name: "overall", run: () => db.execute(sql`SELECT refresh_contract_stats_overall()`) },
    { name: "era",     run: () => db.execute(sql`SELECT refresh_contract_stats_era()`) },
    ...YEARS.map((y) => ({
      name: `year:${y}`,
      run: () => db.execute(sql`SELECT refresh_contract_stats_year_single(${y})`),
    })),
  ];

  for (const s of scopes) {
    if (Date.now() >= deadline) {
      results.push({ scope: s.name, status: "skipped", reason: "budget-exhausted" });
      continue;
    }
    const t0 = Date.now();
    try {
      await s.run();
      results.push({ scope: s.name, status: "ok", elapsedMs: Date.now() - t0 });
    } catch (error) {
      console.error(`[cron/refresh-stats] scope=${s.name} failed:`, error);
      results.push({
        scope: s.name,
        status: "error",
        elapsedMs: Date.now() - t0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Turso index totals: runs last since it's the longest single step (~1-2 min).
  // Skipped if the Neon scopes exhausted the budget; the next cron tick
  // reorders naturally because the completed Neon scopes are cheap on rerun.
  let tursoError: string | null = null;
  let tursoSkipped = false;
  if (Date.now() >= deadline) {
    tursoSkipped = true;
  } else {
    try {
      await refreshTursoIndexTotals();
    } catch (err) {
      tursoError = err instanceof Error ? err.message : String(err);
      console.error("[cron/refresh-stats] Turso index totals refresh failed:", err);
    }
  }

  let rows: unknown[] = [];
  try {
    const rowsRaw = await db.execute<{ scope: string; total: number; documented: number; updated_at: string }>(
      sql`SELECT scope, total, documented, updated_at FROM contract_stats_cache ORDER BY scope`
    );
    rows = Array.isArray(rowsRaw) ? rowsRaw : ((rowsRaw as { rows?: unknown[] }).rows ?? []);
  } catch (error) {
    console.error("[cron/refresh-stats] cache readback failed:", error);
  }

  return NextResponse.json({
    data: {
      elapsedMs: Date.now() - started,
      budgetMs: BUDGET_MS,
      scopes: results,
      tursoError,
      tursoSkipped,
      rows,
    },
    error: null,
  });
}

// Vercel Cron issues GET by default; let it work the same way.
export const GET = POST;
