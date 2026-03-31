import { NextRequest, NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { sql } from "drizzle-orm";

export const revalidate = 600; // 10-minute cache

/**
 * GET /api/visualizations/contracts?year=2015&year=2016&limit=2000
 *
 * Lightweight endpoint for timeline/network visualizations.
 * Returns minimal fields, supports multi-year filtering, higher limits.
 */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const years = searchParams.getAll("year").map(Number).filter(Boolean);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "2000", 10) || 2000, 1), 5000);

  const db = getDb();

  const yearFilter = years.length > 0
    ? sql.raw(`AND EXTRACT(YEAR FROM deployment_timestamp) IN (${years.join(",")})`)
    : sql`AND EXTRACT(YEAR FROM deployment_timestamp) BETWEEN 2015 AND 2017`;

  const rows = await db.execute(sql`
    SELECT
      c.address,
      COALESCE(c.etherscan_contract_name, c.token_name) AS name,
      c.deployment_timestamp,
      c.deployer_address,
      c.deployer_ens_name,
      c.verification_method
    FROM contracts c
    WHERE c.deployment_timestamp IS NOT NULL
    ${yearFilter}
    ORDER BY c.deployment_timestamp ASC
    LIMIT ${limit}
  `);

  const contracts = (rows as unknown as Array<{
    address: string;
    name: string | null;
    deployment_timestamp: Date | string | null;
    deployer_address: string | null;
    deployer_ens_name: string | null;
    verification_method: string | null;
  }>).map(r => ({
    address: r.address,
    name: r.name ?? null,
    ts: r.deployment_timestamp ? new Date(r.deployment_timestamp).toISOString() : null,
    deployer: r.deployer_address ?? null,
    deployerEns: r.deployer_ens_name ?? null,
    method: r.verification_method ?? "unverified",
  }));

  return NextResponse.json({
    contracts,
    total: contracts.length,
    years: years.length > 0 ? years : [2015, 2016, 2017],
  });
}
