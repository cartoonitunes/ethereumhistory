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

    const rows = await db
      .select({
        address: schema.contracts.address,
        tokenName: schema.contracts.tokenName,
        etherscanContractName: schema.contracts.etherscanContractName,
        shortDescription: schema.contracts.shortDescription,
        eraId: schema.contracts.eraId,
        deploymentTimestamp: schema.contracts.deploymentTimestamp,
        deploymentBlock: schema.contracts.deploymentBlock,
        deploymentTxIndex: schema.contracts.deploymentTxIndex,
        codeSizeBytes: schema.contracts.codeSizeBytes,
        canonicalAddress: schema.contracts.canonicalAddress,
        verificationMethod: schema.contracts.verificationMethod,
        sourceCode: sql<boolean>`(${schema.contracts.sourceCode} IS NOT NULL AND length(${schema.contracts.sourceCode}) > 0)`,
      })
      .from(schema.contracts)
      .where(
        and(
          isNotNull(schema.contracts.deploymentTimestamp),
          dateCondition,
          sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) BETWEEN 2015 AND 2017`
        )
      )
      .orderBy(sql`${schema.contracts.deploymentTimestamp} ASC`)
      .limit(20) as any[];

    // Fetch canonical names for siblings in a second pass
    const canonicalAddresses = [...new Set(rows.map((r: any) => r.canonicalAddress).filter(Boolean))];
    const canonicalMap: Record<string, { name: string | null; description: string | null; verificationMethod: string | null; hasSource: boolean }> = {};
    if (canonicalAddresses.length > 0) {
      const canonRows = await db.execute(sql`
        SELECT address, etherscan_contract_name, token_name, short_description, verification_method,
               (source_code IS NOT NULL AND length(source_code) > 0) as has_source
        FROM contracts WHERE address = ANY(ARRAY[${sql.join(canonicalAddresses.map((a: string) => sql`${a}`), sql`, `)}]::text[])
      `) as any[];
      for (const canon of canonRows) {
        canonicalMap[canon.address] = {
          name: canon.token_name || canon.etherscan_contract_name || null,
          description: canon.short_description || null,
          verificationMethod: canon.verification_method || null,
          hasSource: !!canon.has_source,
        };
      }
    }

    const contracts = rows.map((row: any) => {
      const canon = row.canonicalAddress ? canonicalMap[row.canonicalAddress] : null;
      const name =
        row.tokenName ||
        row.etherscanContractName ||
        canon?.name ||
        null;

      const ts = row.deploymentTimestamp ? new Date(row.deploymentTimestamp) : null;
      const deploymentDate = ts ? ts.toISOString().split("T")[0] : null;
      const deploymentYear = ts ? ts.getFullYear() : null;

      const verificationMethod = row.verificationMethod || canon?.verificationMethod || null;
      const hasSource = !!row.sourceCode || !!canon?.hasSource;

      return {
        address: row.address,
        name,
        shortDescription: row.shortDescription || canon?.description || null,
        eraId: row.eraId || null,
        deploymentDate,
        deploymentYear,
        canonicalAddress: row.canonicalAddress || null,
        verificationMethod,
        isVerified: !!verificationMethod || hasSource,
        isSibling: !!row.canonicalAddress,
        _block: row.deploymentBlock,
        _txIndex: row.deploymentTxIndex,
        _codeSize: row.codeSizeBytes,
      };
    });

    // Batch-compute deployment ranks for this-week contracts
    const rankableAddresses = contracts
      .filter(c => c._txIndex !== null && c._codeSize && c._codeSize > 0)
      .map(c => c.address);

    const rankMap = new Map<string, number>();
    if (rankableAddresses.length > 0) {
      const rankRows = await db.execute<{ address: string; rank: number }>(sql`
        SELECT c1.address,
          (SELECT COUNT(*)::int FROM contracts c2
           WHERE c2.code_size_bytes > 0
             AND c2.runtime_bytecode IS NOT NULL
             AND c2.runtime_bytecode NOT IN ('0x', '')
             AND c2.deployment_tx_index IS NOT NULL
             AND (c2.deployment_block < c1.deployment_block
               OR (c2.deployment_block = c1.deployment_block AND c2.deployment_tx_index < c1.deployment_tx_index))
          ) + 1 AS rank
        FROM contracts c1
        WHERE c1.address = ANY(${rankableAddresses})
      `);
      for (const r of rankRows as any[]) rankMap.set(r.address, Number(r.rank));
    }

    const contractsWithRank = contracts.map(({ _block, _txIndex, _codeSize, ...c }) => ({
      ...c,
      deploymentRank: rankMap.get(c.address) ?? null,
      codeSizeBytes: _codeSize ?? null,
    }));

    return NextResponse.json(
      {
        data: {
          weekRange,
          contracts: contractsWithRank,
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
