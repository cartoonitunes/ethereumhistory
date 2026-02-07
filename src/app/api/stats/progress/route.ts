/**
 * Documentation Progress Stats API Route
 *
 * GET /api/stats/progress
 * Returns total and documented contract counts overall and per era.
 * "Documented" = short_description IS NOT NULL AND short_description != ''.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { sql, eq, and, isNotNull, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    const emptyEra = { total: 0, documented: 0 };
    return NextResponse.json({
      data: {
        overall: { total: 0, documented: 0 },
        byEra: Object.fromEntries(ERA_IDS.map((id) => [id, emptyEra])),
      },
      error: null,
    });
  }

  try {
    const db = getDb();

    // Build all queries in parallel: overall total, overall documented, per-era total, per-era documented
    const [overallTotalResult, overallDocumentedResult, ...eraResults] =
      await Promise.all([
        // Overall total
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contracts),

        // Overall documented
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contracts)
          .where(
            and(
              isNotNull(schema.contracts.shortDescription),
              ne(schema.contracts.shortDescription, "")
            )
          ),

        // Per-era: total then documented for each era (10 queries)
        ...ERA_IDS.flatMap((eraId) => [
          // Era total
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(schema.contracts)
            .where(eq(schema.contracts.eraId, eraId)),
          // Era documented
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(schema.contracts)
            .where(
              and(
                eq(schema.contracts.eraId, eraId),
                isNotNull(schema.contracts.shortDescription),
                ne(schema.contracts.shortDescription, "")
              )
            ),
        ]),
      ]);

    const overall = {
      total: overallTotalResult[0]?.count ?? 0,
      documented: overallDocumentedResult[0]?.count ?? 0,
    };

    const byEra: Record<string, { total: number; documented: number }> = {};
    ERA_IDS.forEach((eraId, i) => {
      const totalResult = eraResults[i * 2];
      const documentedResult = eraResults[i * 2 + 1];
      byEra[eraId] = {
        total: totalResult[0]?.count ?? 0,
        documented: documentedResult[0]?.count ?? 0,
      };
    });

    return NextResponse.json(
      { data: { overall, byEra }, error: null },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
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
