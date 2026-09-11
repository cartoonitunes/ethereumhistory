/**
 * POST /api/cron/refresh-stats
 *
 * Refreshes the Neon `contract_stats_cache` base scopes, each in its own
 * transaction, so a Vercel cron timeout can't roll back the whole refresh.
 *
 * ONE GROUP PER TICK
 * ------------------
 * The three groups cost roughly 200s (overall), 204s (era) and 96s (all
 * years together) against this project's Neon compute. Any two of them exceed
 * the 300s function ceiling, so the previous "cheapest first, stop when the
 * budget runs out" loop could never finish: it spent ~200s on `overall`, found
 * ~75s of budget left, started `era` anyway — the deadline is only checked
 * BETWEEN scopes, and nothing can interrupt a query already running — and was
 * killed mid-scan. `era` and every year scope went stale for days while
 * `overall` alone kept refreshing.
 *
 * So each invocation now runs exactly one group: whichever is stalest by its
 * oldest `updated_at`. With the hourly schedule every group refreshes about
 * every three hours, and no invocation can stack two heavy scans.
 *
 * Neon-only: the full-index scan lives in /api/cron/refresh-turso-totals,
 * which is a separate cron slot (and far cheaper — one grouped pass, ~15s).
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
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const maxDuration = 300;

// Overall request budget. Leaves ~25s margin under maxDuration for response
// flushing and connection cleanup. Overridable via env for Hobby tier tests.
const BUDGET_MS = Number(process.env.REFRESH_STATS_BUDGET_MS ?? 275_000);

// Static year list matches /api/stats/progress. Cheap to update as new
// years are added; the underlying function is a no-op for years with no rows.
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020];

type GroupName = "overall" | "era" | "years";

/** The base scopes each group owns, used to measure how stale it is. */
const GROUP_SCOPES: Record<GroupName, string[]> = {
  overall: ["overall"],
  era: ["era:frontier", "era:homestead", "era:dao", "era:tangerine", "era:spurious", "era:byzantium"],
  years: YEARS.map((y) => `year:${y}`),
};

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

/**
 * Pick the group with the oldest `updated_at` among the scopes it owns.
 *
 * A scope that has never been written has no row at all, which must count as
 * maximally stale — otherwise a group that has never run would never be
 * chosen, which is the one case rotation most needs to cover.
 */
async function stalestGroup(db: ReturnType<typeof getDb>): Promise<GroupName> {
  const raw = await db.execute<{ scope: string; updated_at: string }>(
    sql`SELECT scope, updated_at FROM contract_stats_cache`
  );
  const rows = (Array.isArray(raw) ? raw : ((raw as { rows?: unknown[] }).rows ?? [])) as {
    scope: string;
    updated_at: string;
  }[];
  const seen = new Map(rows.map((r) => [r.scope, new Date(r.updated_at).getTime()]));

  let stalest: GroupName = "overall";
  let oldest = Infinity;
  for (const group of Object.keys(GROUP_SCOPES) as GroupName[]) {
    const times = GROUP_SCOPES[group].map((s) => seen.get(s) ?? 0);
    const groupOldest = Math.min(...times);
    if (groupOldest < oldest) {
      oldest = groupOldest;
      stalest = group;
    }
  }
  return stalest;
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

  const db = getDb();
  const started = Date.now();
  const deadline = started + BUDGET_MS;
  const results: ScopeResult[] = [];

  // Allow a specific group to be forced, for backfills and for testing the
  // rotation without waiting for it to come round.
  const requested = new URL(req.url).searchParams.get("group");
  const group: GroupName =
    requested === "overall" || requested === "era" || requested === "years"
      ? requested
      : await stalestGroup(db);

  const scopes: Array<{ name: string; run: () => Promise<unknown> }> =
    group === "overall"
      ? [{ name: "overall", run: () => db.execute(sql`SELECT refresh_contract_stats_overall()`) }]
      : group === "era"
        ? [{ name: "era", run: () => db.execute(sql`SELECT refresh_contract_stats_era()`) }]
        : YEARS.map((y) => ({
            name: `year:${y}`,
            run: () => db.execute(sql`SELECT refresh_contract_stats_year_single(${y})`),
          }));

  for (const s of scopes) {
    // Only meaningful for the years group, which is several statements; the
    // single-statement groups can't be interrupted once started, which is
    // exactly why they get a tick to themselves.
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
      // Which group this tick picked, so a stuck rotation is visible from the
      // response rather than only from updated_at drift.
      group,
      scopes: results,
      rows,
    },
    error: null,
  });
}

// Vercel Cron issues GET by default; let it work the same way.
export const GET = POST;
