/**
 * This Week in Ethereum History API Route
 *
 * GET /api/this-week
 * Returns contracts deployed during the same calendar week (month/day range)
 * in previous years (2015-2017).
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { sql, and, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Get the Monday and Sunday of the current week.
 */
function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Adjust so Monday=0, Tuesday=1, ..., Sunday=6
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * Format a date as "Mon D" (e.g. "Feb 3").
 */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Build date range conditions that handle weeks spanning month boundaries.
 * For example, a week from Jan 29 to Feb 4 generates two OR conditions:
 *   (month=1 AND day BETWEEN 29 AND 31) OR (month=2 AND day BETWEEN 1 AND 4)
 */
function buildDateRangeConditions(start: Date, end: Date) {
  const startMonth = start.getMonth() + 1; // 1-indexed
  const endMonth = end.getMonth() + 1;
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    // Same month — simple case
    return sql`(
      EXTRACT(MONTH FROM ${schema.contracts.deploymentTimestamp}) = ${startMonth}
      AND EXTRACT(DAY FROM ${schema.contracts.deploymentTimestamp}) BETWEEN ${startDay} AND ${endDay}
    )`;
  }

  // Week spans two months
  // Get last day of the start month
  const lastDayOfStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

  return sql`(
    (
      EXTRACT(MONTH FROM ${schema.contracts.deploymentTimestamp}) = ${startMonth}
      AND EXTRACT(DAY FROM ${schema.contracts.deploymentTimestamp}) BETWEEN ${startDay} AND ${lastDayOfStartMonth}
    )
    OR
    (
      EXTRACT(MONTH FROM ${schema.contracts.deploymentTimestamp}) = ${endMonth}
      AND EXTRACT(DAY FROM ${schema.contracts.deploymentTimestamp}) BETWEEN 1 AND ${endDay}
    )
  )`;
}

export async function GET(): Promise<NextResponse> {
  try {
    const db = getDb();
    const { start, end } = getCurrentWeekRange();
    const weekRange = `${formatShortDate(start)} - ${formatShortDate(end)}`;

    const dateCondition = buildDateRangeConditions(start, end);

    const rows = await db.execute(sql`
      SELECT
        c.address,
        c.token_name,
        c.etherscan_contract_name,
        c.short_description,
        c.era_id,
        c.deployment_timestamp,
        c.canonical_address,
        canon.etherscan_contract_name AS canonical_name,
        canon.token_name AS canonical_token_name,
        canon.short_description AS canonical_description
      FROM contracts c
      LEFT JOIN contracts canon ON canon.address = c.canonical_address
      WHERE
        c.deployment_timestamp IS NOT NULL
        AND EXTRACT(YEAR FROM c.deployment_timestamp) BETWEEN 2015 AND 2017
        AND ${dateCondition}
      ORDER BY c.deployment_timestamp ASC
      LIMIT 20
    `) as any[];

    const contracts = rows.map((row: any) => {
      const name =
        row.token_name ||
        row.etherscan_contract_name ||
        row.canonical_token_name ||
        row.canonical_name ||
        null;

      const ts = row.deployment_timestamp ? new Date(row.deployment_timestamp) : null;
      const deploymentDate = ts ? ts.toISOString().split("T")[0] : null;
      const deploymentYear = ts ? ts.getFullYear() : null;

      return {
        address: row.address,
        name,
        shortDescription: row.short_description || row.canonical_description || null,
        eraId: row.era_id || null,
        deploymentDate,
        deploymentYear,
        canonicalAddress: row.canonical_address || null,
      };
    });

    return NextResponse.json(
      {
        data: {
          weekRange,
          contracts,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("[this-week] Error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch this week in Ethereum history" },
      { status: 500 }
    );
  }
}
