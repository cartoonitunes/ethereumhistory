import { NextRequest, NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { sql } from "drizzle-orm";

export const revalidate = 600; // 10-minute cache

/**
 * GET /api/visualizations/contracts?era=frontier&limit=5000
 * GET /api/visualizations/contracts?year=2015&year=2016&limit=5000
 *
 * Lightweight endpoint for timeline/network visualizations.
 * Returns minimal fields. Supports era or year filtering.
 * Joins people table for deployer names.
 */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const era = searchParams.get("era");
  const years = searchParams.getAll("year").map(Number).filter(Boolean);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "5000", 10) || 5000, 1), 50000);

  const db = getDb();

  // Filter by era (preferred) or year range
  const rangeFilter = era
    ? sql`AND c.era_id = ${era}`
    : years.length > 0
      ? sql.raw(`AND EXTRACT(YEAR FROM c.deployment_timestamp) IN (${years.join(",")})`)
      : sql`AND c.era_id = 'frontier'`;

  const rows = await db.execute(sql`
    SELECT
      c.address,
      COALESCE(c.etherscan_contract_name, c.token_name) AS name,
      c.deployment_timestamp,
      c.deployer_address,
      COALESCE(p.name, c.deployer_ens_name) AS deployer_name,
      c.verification_method,
      c.era_id
    FROM contracts c
    LEFT JOIN people p ON LOWER(c.deployer_address) = LOWER(p.address)
    WHERE c.deployment_timestamp IS NOT NULL
    ${rangeFilter}
    ORDER BY c.deployment_timestamp ASC
    LIMIT ${limit}
  `);

  const contracts = (rows as unknown as Array<{
    address: string;
    name: string | null;
    deployment_timestamp: Date | string | null;
    deployer_address: string | null;
    deployer_name: string | null;
    verification_method: string | null;
    era_id: string | null;
  }>).map(r => ({
    address: r.address,
    name: r.name ?? null,
    ts: r.deployment_timestamp ? new Date(r.deployment_timestamp).toISOString() : null,
    deployer: r.deployer_address ?? null,
    deployerName: r.deployer_name ?? null,
    method: r.verification_method ?? "unverified",
    era: r.era_id ?? null,
  }));

  return NextResponse.json({
    contracts,
    total: contracts.length,
  });
}
