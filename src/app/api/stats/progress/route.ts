/**
 * Documentation Progress Stats API Route
 *
 * GET /api/stats/progress
 *
 * Returns total and documented contract counts overall, per era, and per year,
 * plus community stats (historian count, total edits).
 *
 * "Documented" is served from the precomputed `is_documented` column on
 * contracts, maintained by the trigger installed in migration 067. That flag
 * already encodes the sibling-propagation logic (a contract counts as
 * documented if any canonical/bytecode sibling has a description or
 * verification_method), so this endpoint is a trivial index-aware aggregate.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { sql, eq } from "drizzle-orm";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"] as const;
const YEARS = [2015, 2016, 2017, 2018] as const;

// Render on request (not at build), but the Cache-Control header below still
// lets the Vercel CDN cache the response for 10 minutes across users. ISR's
// build-time pre-render was exceeding Next.js's 60s static-generation budget
// on 1.4M rows; CDN caching gives us the same effective hit rate after the
// first request in each region.
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    const emptyEra = { total: 0, documented: 0 };
    const emptyYear = { total: 0, documented: 0 };
    return NextResponse.json({
      data: {
        overall: { total: 0, documented: 0 },
        byEra: Object.fromEntries(ERA_IDS.map((id) => [id, emptyEra])),
        byYear: Object.fromEntries(YEARS.map((y) => [y, emptyYear])),
        community: { historians: 0, totalEdits: 0 },
      },
      error: null,
    });
  }

  try {
    const db = getDb();

    // One aggregation query covers overall + per-era + per-year thanks to
    // GROUPING SETS. Previously this route fired 18 separate COUNT(*) queries
    // with correlated subqueries on every request.
    const aggregationRowsPromise = db.execute<{
      era_id: string | null;
      year: number | null;
      total: number | string;
      documented: number | string;
      grouping_bits: number | string;
    }>(sql`
      SELECT
        c.era_id,
        EXTRACT(YEAR FROM c.deployment_timestamp)::int AS year,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE c.is_documented)::int AS documented,
        GROUPING(c.era_id, EXTRACT(YEAR FROM c.deployment_timestamp))::int AS grouping_bits
      FROM contracts c
      GROUP BY GROUPING SETS (
        (),
        (c.era_id),
        (EXTRACT(YEAR FROM c.deployment_timestamp))
      )
    `);

    const historianPromise = db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.historians)
      .where(eq(schema.historians.active, true));

    const editsPromise = db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.contractEdits);

    const [aggregationRows, historianCountResult, totalEditsResult] =
      await Promise.all([aggregationRowsPromise, historianPromise, editsPromise]);

    const byEra: Record<string, { total: number; documented: number }> = {};
    const byYear: Record<number, { total: number; documented: number }> = {};
    for (const eraId of ERA_IDS) byEra[eraId] = { total: 0, documented: 0 };
    for (const year of YEARS) byYear[year] = { total: 0, documented: 0 };

    let overall = { total: 0, documented: 0 };

    const rows = Array.isArray(aggregationRows)
      ? aggregationRows
      : ((aggregationRows as { rows?: typeof aggregationRows }).rows ?? []);

    for (const row of rows) {
      const total = Number(row.total);
      const documented = Number(row.documented);
      const bits = Number(row.grouping_bits);
      // bits: 3 = overall, 1 = per era, 2 = per year. See homepage for the derivation.
      if (bits === 3) {
        overall = { total, documented };
      } else if (bits === 1 && row.era_id && (ERA_IDS as readonly string[]).includes(row.era_id)) {
        byEra[row.era_id] = { total, documented };
      } else if (bits === 2 && row.year != null) {
        const y = Number(row.year);
        if ((YEARS as readonly number[]).includes(y)) {
          byYear[y] = { total, documented };
        }
      }
    }

    const community = {
      historians: historianCountResult[0]?.count ?? 0,
      totalEdits: totalEditsResult[0]?.count ?? 0,
    };

    return NextResponse.json(
      { data: { overall, byEra, byYear, community }, error: null },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (error) {
    console.error("[stats/progress] Error fetching progress stats:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch progress stats" },
      { status: 500 }
    );
  }
}
