/**
 * Browse types API: distinct contract types for documented contracts
 *
 * GET /api/browse/types
 * Returns unique contract_type values from the DB (documented contracts only).
 */

import { NextResponse } from "next/server";
import { isDatabaseConfigured, getDocumentedContractTypesFromDb } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { data: { types: [] }, meta: { timestamp: new Date().toISOString(), cached: false } },
      { status: 200 }
    );
  }

  const types = await getDocumentedContractTypesFromDb();

  return NextResponse.json({
    data: { types },
    meta: { timestamp: new Date().toISOString(), cached: false },
  });
}
