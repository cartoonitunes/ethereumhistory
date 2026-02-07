/**
 * Historian Public Profile API Route
 *
 * GET /api/historian/:id/profile
 * Returns a historian's public profile including edit history.
 * No auth required.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const historianId = parseInt(id, 10);
  if (isNaN(historianId) || historianId <= 0) {
    return NextResponse.json(
      { data: null, error: "Invalid historian ID" },
      { status: 400 }
    );
  }

  try {
    const database = getDb();

    // 1. Get historian by ID (only if active)
    const historianRows = await database
      .select({
        id: schema.historians.id,
        name: schema.historians.name,
        githubUsername: schema.historians.githubUsername,
        createdAt: schema.historians.createdAt,
      })
      .from(schema.historians)
      .where(
        and(
          eq(schema.historians.id, historianId),
          eq(schema.historians.active, true)
        )
      )
      .limit(1);

    if (!historianRows[0]) {
      return NextResponse.json(
        { data: null, error: "Historian not found" },
        { status: 404 }
      );
    }

    const historian = historianRows[0];

    // 2. Get total edit count
    const totalEditsResult = await database
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.contractEdits)
      .where(eq(schema.contractEdits.historianId, historianId));

    const totalEdits = totalEditsResult[0]?.count || 0;

    // 3. Get unique contracts edited count
    const uniqueContractsResult = await database
      .select({
        count: sql<number>`COUNT(DISTINCT ${schema.contractEdits.contractAddress})::int`,
      })
      .from(schema.contractEdits)
      .where(eq(schema.contractEdits.historianId, historianId));

    const uniqueContracts = uniqueContractsResult[0]?.count || 0;

    // 4. Get recent edits with contract names (limit 50)
    const recentEditRows = await database
      .select({
        contractAddress: schema.contractEdits.contractAddress,
        fieldsChanged: schema.contractEdits.fieldsChanged,
        editedAt: schema.contractEdits.editedAt,
        contractName: schema.contracts.etherscanContractName,
        tokenName: schema.contracts.tokenName,
      })
      .from(schema.contractEdits)
      .innerJoin(
        schema.contracts,
        eq(schema.contractEdits.contractAddress, schema.contracts.address)
      )
      .where(eq(schema.contractEdits.historianId, historianId))
      .orderBy(desc(schema.contractEdits.editedAt))
      .limit(50);

    const recentEdits = recentEditRows.map((row) => ({
      contractAddress: row.contractAddress,
      contractName: row.tokenName || row.contractName || null,
      fieldsChanged: row.fieldsChanged || [],
      editedAt: row.editedAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: {
          id: historian.id,
          name: historian.name,
          githubUsername: historian.githubUsername || null,
          joinedAt: historian.createdAt?.toISOString() || null,
          totalEdits,
          uniqueContracts,
          recentEdits,
        },
        error: null,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[historian-profile] Error fetching profile:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch historian profile" },
      { status: 500 }
    );
  }
}
