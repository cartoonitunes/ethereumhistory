/**
 * Contract of the Day API Route
 *
 * GET /api/contract-of-the-day
 * Returns a deterministic "contract of the day" based on the current date.
 * Same contract for everyone on the same day. Rotates daily.
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import { contracts } from "@/lib/schema";
import { isNotNull, ne, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: null });
  }

  try {
    const db = getDb();

    // Get all documented contracts (have a short_description)
    const documented = await db
      .select({
        address: contracts.address,
        etherscanContractName: contracts.etherscanContractName,
        tokenName: contracts.tokenName,
        tokenSymbol: contracts.tokenSymbol,
        shortDescription: contracts.shortDescription,
        description: contracts.description,
        eraId: contracts.eraId,
        deploymentTimestamp: contracts.deploymentTimestamp,
        historicalSignificance: contracts.historicalSignificance,
      })
      .from(contracts)
      .where(and(isNotNull(contracts.shortDescription), ne(contracts.shortDescription, "")))
      .orderBy(asc(contracts.deploymentTimestamp));

    if (documented.length === 0) {
      return NextResponse.json({ data: null, error: null });
    }

    // Deterministic selection based on date
    const today = new Date();
    const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
    const index = daysSinceEpoch % documented.length;
    const contract = documented[index];

    return NextResponse.json({
      data: {
        address: contract.address,
        name: contract.tokenName || contract.etherscanContractName || `Contract ${contract.address.slice(0, 10)}...`,
        shortDescription: contract.shortDescription,
        description: contract.description,
        eraId: contract.eraId,
        deploymentDate: contract.deploymentTimestamp?.toISOString().split("T")[0] || null,
        historicalSignificance: contract.historicalSignificance,
        totalDocumented: documented.length,
      },
      error: null,
    }, {
      headers: {
        // Cache for 1 hour at CDN level
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("[contract-of-the-day] Error:", error);
    return NextResponse.json({ data: null, error: "Failed to fetch contract of the day" }, { status: 500 });
  }
}
