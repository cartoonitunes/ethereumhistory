/**
 * This Week in Ethereum History API Route
 *
 * GET /api/this-week
 * Returns contracts deployed during the same calendar week (month/day range)
 * in previous years (2015-2018).
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { sql, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

const COVERAGE_YEARS = [2015, 2016, 2017, 2018] as const;

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
 * Project the current week's Mon–Sun date range onto each coverage year,
 * returning a list of [start, end] timestamp pairs. This gives us a set of
 * simple `deployment_timestamp BETWEEN start AND end` predicates that the
 * existing `contracts_deployment_idx` can serve directly — vastly faster
 * than `EXTRACT(MONTH/DAY/YEAR)` comparisons, which force a full seq scan
 * because function results aren't indexable.
 *
 * Edge case: if the current week spans a year boundary (e.g. Dec 29 – Jan 4),
 * that produces two disjoint ranges per target year, one anchored at each
 * end. Handled by returning multiple pairs per year.
 */
function buildYearWeekRanges(start: Date, end: Date): Array<{ start: Date; end: Date }> {
  const ranges: Array<{ start: Date; end: Date }> = [];
  const spansYearBoundary = end.getMonth() < start.getMonth();

  for (const year of COVERAGE_YEARS) {
    if (spansYearBoundary) {
      // Dec tail of this year (start -> Dec 31)
      const tailStart = new Date(year, start.getMonth(), start.getDate(), 0, 0, 0, 0);
      const tailEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      ranges.push({ start: tailStart, end: tailEnd });

      // Jan head of next year (Jan 1 -> end), only if next year still fits
      // Year boundary weeks are rare, so we just include them here even if
      // the "next" year is outside coverage — no row matches in that case.
      const headStart = new Date(year + 1, 0, 1, 0, 0, 0, 0);
      const headEnd = new Date(year + 1, end.getMonth(), end.getDate(), 23, 59, 59, 999);
      ranges.push({ start: headStart, end: headEnd });
    } else {
      const yearStart = new Date(year, start.getMonth(), start.getDate(), 0, 0, 0, 0);
      const yearEnd = new Date(year, end.getMonth(), end.getDate(), 23, 59, 59, 999);
      ranges.push({ start: yearStart, end: yearEnd });
    }
  }

  return ranges;
}

export async function GET(): Promise<NextResponse> {
  try {
    const db = getDb();
    const { start, end } = getCurrentWeekRange();
    const weekRange = `${formatShortDate(start)} - ${formatShortDate(end)}`;

    const yearRanges = buildYearWeekRanges(start, end);
    const rangeClauses = yearRanges.map(
      (r) => sql`(${schema.contracts.deploymentTimestamp} >= ${r.start} AND ${schema.contracts.deploymentTimestamp} <= ${r.end})`
    );
    const dateCondition = or(...rangeClauses)!;

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
      .where(dateCondition)
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

    // Read precomputed deployment ranks from the stored column (migration 057)
    const allAddresses = contracts.map(c => c.address);
    const rankMap = new Map<string, number>();
    if (allAddresses.length > 0) {
      const rankRows = await db.execute(sql`
        SELECT address, deployment_rank FROM contracts
        WHERE address = ANY(ARRAY[${sql.join(allAddresses.map(a => sql`${a}`), sql`, `)}]::text[])
          AND deployment_rank IS NOT NULL
      `);
      for (const r of rankRows as any[]) {
        if (r.deployment_rank != null) rankMap.set(r.address, Number(r.deployment_rank));
      }
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[this-week] Error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch this week in Ethereum history", detail: message },
      { status: 500 }
    );
  }
}
