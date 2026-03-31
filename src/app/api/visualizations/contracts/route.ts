import { NextRequest, NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { sql } from "drizzle-orm";

export const revalidate = 600;

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const era = searchParams.get("era") ?? "frontier";
  const minContracts = Math.max(1, parseInt(searchParams.get("min") ?? "3", 10));
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "5000", 10) || 5000, 1), 50000);

  const db = getDb();

  const rows = await db.execute(sql`
    WITH deployer_counts AS (
      SELECT deployer_address, COUNT(*) AS cnt
      FROM contracts
      WHERE deployment_timestamp IS NOT NULL
        AND era_id = ${era}
      GROUP BY deployer_address
      HAVING COUNT(*) >= ${minContracts}
    )
    SELECT
      c.address,
      COALESCE(c.etherscan_contract_name, c.token_name) AS name,
      c.deployment_timestamp,
      c.deployer_address,
      COALESCE(p.name, c.deployer_ens_name) AS deployer_name,
      c.verification_method,
      c.era_id
    FROM contracts c
    INNER JOIN deployer_counts dc ON dc.deployer_address = c.deployer_address
    LEFT JOIN people p ON LOWER(c.deployer_address) = LOWER(p.address)
    WHERE c.deployment_timestamp IS NOT NULL
      AND c.era_id = ${era}
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

  return NextResponse.json({ contracts, total: contracts.length });
}
