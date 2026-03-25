/**
 * Documentation Progress Stats API Route
 *
 * GET /api/stats/progress
 * Returns total and documented contract counts overall, per era, and per year.
 * Also returns community stats (historian count, total edits).
 * "Documented" = has description OR is verified OR is a bytecode sibling of a documented/verified contract.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { sql, eq, and, isNotNull, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;
const YEARS = [2015, 2016, 2017] as const;

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

    const [
      overallTotalResult,
      overallDocumentedResult,
      historianCountResult,
      totalEditsResult,
      ...rest
    ] = await Promise.all([
      // Overall total (contracts with recorded bytecode only)
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.contracts)
        ,

      // Overall documented: has description, is verified (any method), or is a verified sibling
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.contracts)
        .where(
          sql`(
                (short_description IS NOT NULL AND short_description != '')
                OR verification_method IS NOT NULL
                OR canonical_address IS NOT NULL
                OR (
                  deployed_bytecode_hash IS NOT NULL
                  AND deployed_bytecode_hash IN (
                    SELECT DISTINCT deployed_bytecode_hash FROM contracts
                    WHERE (short_description IS NOT NULL AND short_description != '')
                       OR verification_method IS NOT NULL
                       OR canonical_address IS NOT NULL
                  )
                )
              )`
        ),

      // Active historian count
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.historians)
        .where(eq(schema.historians.active, true)),

      // Total edits
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.contractEdits),

      // Per-era: total then documented for each era (total = contracts with recorded bytecode)
      ...ERA_IDS.flatMap((eraId) => [
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contracts)
          .where(and(eq(schema.contracts.eraId, eraId))),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contracts)
          .where(
            and(
              eq(schema.contracts.eraId, eraId),
              sql`(
                (short_description IS NOT NULL AND short_description != '')
                OR verification_method IS NOT NULL
                OR canonical_address IS NOT NULL
                OR (
                  deployed_bytecode_hash IS NOT NULL
                  AND deployed_bytecode_hash IN (
                    SELECT DISTINCT deployed_bytecode_hash FROM contracts
                    WHERE (short_description IS NOT NULL AND short_description != '')
                       OR verification_method IS NOT NULL
                       OR canonical_address IS NOT NULL
                  )
                )
              )`
            )
          ),
      ]),

      // Per-year: total then documented for each year (total = contracts with recorded bytecode)
      ...YEARS.flatMap((year) => [
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contracts)
          .where(
            sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${year}`
          ),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contracts)
          .where(
            and(
              sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${year}`,
              sql`(
                (short_description IS NOT NULL AND short_description != '')
                OR verification_method IS NOT NULL
                OR canonical_address IS NOT NULL
                OR (
                  deployed_bytecode_hash IS NOT NULL
                  AND deployed_bytecode_hash IN (
                    SELECT DISTINCT deployed_bytecode_hash FROM contracts
                    WHERE (short_description IS NOT NULL AND short_description != '')
                       OR verification_method IS NOT NULL
                       OR canonical_address IS NOT NULL
                  )
                )
              )`
            )
          ),
      ]),
    ]);

    const overall = {
      total: overallTotalResult[0]?.count ?? 0,
      documented: overallDocumentedResult[0]?.count ?? 0,
    };

    const community = {
      historians: historianCountResult[0]?.count ?? 0,
      totalEdits: totalEditsResult[0]?.count ?? 0,
    };

    // Parse era results (first 10 items in rest)
    const eraResults = rest.slice(0, ERA_IDS.length * 2);
    const byEra: Record<string, { total: number; documented: number }> = {};
    ERA_IDS.forEach((eraId, i) => {
      const totalResult = eraResults[i * 2];
      const documentedResult = eraResults[i * 2 + 1];
      byEra[eraId] = {
        total: totalResult[0]?.count ?? 0,
        documented: documentedResult[0]?.count ?? 0,
      };
    });

    // Parse year results (next 6 items in rest)
    const yearResults = rest.slice(ERA_IDS.length * 2);
    const byYear: Record<number, { total: number; documented: number }> = {};
    YEARS.forEach((year, i) => {
      const totalResult = yearResults[i * 2];
      const documentedResult = yearResults[i * 2 + 1];
      byYear[year] = {
        total: totalResult[0]?.count ?? 0,
        documented: documentedResult[0]?.count ?? 0,
      };
    });

    return NextResponse.json(
      { data: { overall, byEra, byYear, community }, error: null },
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
