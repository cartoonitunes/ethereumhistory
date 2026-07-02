/**
 * Documentation-progress stats — shared by the homepage (SSR) and
 * /api/stats/progress (client fetch on the browse page).
 *
 * WHY THIS EXISTS
 * ---------------
 * The progress widget needs an "overall total" across the full 12M-row Turso
 * `contract_index`, broken down by era and by year. Running
 * `COUNT(*)` / `GROUP BY` over that table scans every row, and Turso bills by
 * rows read. The in-memory cache (see lib/cache) is per-serverless-instance and
 * dies with the instance, so under real traffic every cold start re-ran those
 * full-table scans — which is what was burning the Turso read quota and, when
 * the scans timed out, left the widget rendering nothing.
 *
 * FIX
 * ---
 * The expensive Turso aggregation now runs ONLY from the hourly cron
 * (`/api/cron/refresh-stats`, which executes in Node where Turso is reachable).
 * It writes the results into Neon's tiny `contract_stats_cache` table under
 * `turso:*` scopes. The request path (`getProgressStats`) reads ONLY Neon
 * (~20-40 rows, indexed) and never touches Turso. The scan happens at most once
 * per hour globally instead of once per cold request.
 */

import { getDb } from "@/lib/db-client";
import { isTursoConfigured, turso } from "@/lib/turso";
import * as schema from "@/lib/schema";
import { sql, eq } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export interface ProgressStats {
  overall: { total: number; documented: number };
  byEra: Record<string, { total: number; documented: number }>;
  byYear: Record<string, { total: number; documented: number }>;
  community: { historians: number; totalEdits: number };
}

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"] as const;
const YEARS = [2015, 2016, 2017, 2018] as const;

// Turso stores verbose era names; map to app-canonical short IDs.
const TURSO_ERA_TO_APP: Record<string, string> = {
  "frontier-thawing": "frontier",
  "dao-fork": "dao",
  "tangerine-whistle": "tangerine",
  "spurious-dragon": "spurious",
};

type CacheRow = { scope: string; total: number | string; documented: number | string };

function toRows<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : (((raw as { rows?: T[] }).rows) ?? []);
}

/**
 * Recompute the full-index totals from Turso and persist them into Neon's
 * `contract_stats_cache` under `turso:overall`, `turso:era:<id>`,
 * `turso:year:<yyyy>` scopes. Expensive (full-table scan) — call ONLY from the
 * scheduled cron, never from a request handler. No-op if Turso isn't configured.
 */
export async function refreshTursoIndexTotals(): Promise<void> {
  if (!isTursoConfigured()) return;
  const db = getDb();

  const [overallRes, eraRes, yearRes] = await Promise.all([
    turso.execute(`SELECT COUNT(*) AS total FROM contract_index`),
    turso.execute(`SELECT era, COUNT(*) AS total FROM contract_index WHERE era IS NOT NULL GROUP BY era`),
    turso.execute(`SELECT year, COUNT(*) AS total FROM contract_index WHERE year IS NOT NULL GROUP BY year`),
  ]);

  const overall = Number((overallRes.rows[0] as unknown as { total: number | bigint })?.total ?? 0);

  // Collapse verbose Turso era names into app era IDs (summing any collisions).
  const eraTotals = new Map<string, number>();
  for (const r of eraRes.rows as unknown as { era: string; total: number | bigint }[]) {
    const appEra = TURSO_ERA_TO_APP[r.era] ?? r.era;
    if (!(ERA_IDS as readonly string[]).includes(appEra)) continue;
    eraTotals.set(appEra, (eraTotals.get(appEra) ?? 0) + Number(r.total));
  }

  const yearTotals = new Map<number, number>();
  for (const r of yearRes.rows as unknown as { year: number; total: number | bigint }[]) {
    const y = Number(r.year);
    if (!(YEARS as readonly number[]).includes(y)) continue;
    yearTotals.set(y, Number(r.total));
  }

  const upserts: { scope: string; total: number }[] = [
    { scope: "turso:overall", total: overall },
    ...ERA_IDS.map((id) => ({ scope: `turso:era:${id}`, total: eraTotals.get(id) ?? 0 })),
    ...YEARS.map((y) => ({ scope: `turso:year:${y}`, total: yearTotals.get(y) ?? 0 })),
  ];

  // Skip writing rows we couldn't compute (e.g. a partial Turso failure) so we
  // never clobber a good cached value with a zero.
  for (const { scope, total } of upserts) {
    if (total <= 0 && scope !== "turso:overall") continue;
    await db.execute(sql`
      INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
      VALUES (${scope}, ${total}, 0, now())
      ON CONFLICT (scope) DO UPDATE
        SET total = EXCLUDED.total, updated_at = EXCLUDED.updated_at
    `);
  }
}

/**
 * Assemble the progress stats for the widget. Reads ONLY Neon:
 *  - documented counts + Neon totals from the `contract_stats_cache` base scopes
 *  - full-index totals from the `turso:*` scopes (populated by the cron)
 *  - live historian / edit counts (small, indexed)
 *
 * Never queries Turso. Wrapped in the in-memory cache so repeated hits within a
 * warm instance don't even touch Neon.
 */
export async function getProgressStats(): Promise<ProgressStats> {
  return cached<ProgressStats>("stats:progress:v7", CACHE_TTL.LONG, async () => {
    const db = getDb();

    const [cacheRowsRaw, historianCountResult, totalEditsResult] = await Promise.all([
      db.execute<CacheRow>(sql`SELECT scope, total, documented FROM contract_stats_cache`),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.historians)
        .where(eq(schema.historians.active, true)),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contractEdits),
    ]);

    const rows = toRows<CacheRow>(cacheRowsRaw);
    const documented = new Map<string, number>(); // base scope -> documented
    const neonTotal = new Map<string, number>(); // base scope -> Neon total (fallback)
    const tursoTotal = new Map<string, number>(); // base scope -> full-index total
    for (const r of rows) {
      if (r.scope.startsWith("turso:")) {
        tursoTotal.set(r.scope.slice("turso:".length), Number(r.total));
      } else {
        documented.set(r.scope, Number(r.documented));
        neonTotal.set(r.scope, Number(r.total));
      }
    }

    // Prefer the full-index Turso total; fall back to the Neon total (which is
    // populated on every cron run) until the first Turso refresh lands.
    const totalFor = (scope: string): number => tursoTotal.get(scope) ?? neonTotal.get(scope) ?? 0;

    const byEra: Record<string, { total: number; documented: number }> = {};
    for (const id of ERA_IDS) {
      byEra[id] = { total: totalFor(`era:${id}`), documented: documented.get(`era:${id}`) ?? 0 };
    }

    const byYear: Record<string, { total: number; documented: number }> = {};
    for (const y of YEARS) {
      byYear[String(y)] = { total: totalFor(`year:${y}`), documented: documented.get(`year:${y}`) ?? 0 };
    }

    return {
      overall: { total: totalFor("overall"), documented: documented.get("overall") ?? 0 },
      byEra,
      byYear,
      community: {
        historians: historianCountResult[0]?.count ?? 0,
        totalEdits: totalEditsResult[0]?.count ?? 0,
      },
    };
  });
}
