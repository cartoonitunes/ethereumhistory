import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ data: { beta: true, capabilities: [], evidence: [] }, error: null });
    }

    const { address: rawAddress } = await context.params;
    const address = rawAddress.toLowerCase();
    const db = getDb();

    const capabilities = await db.execute(sql`
      SELECT capability_key AS "capabilityKey", status, confidence, primary_evidence_type AS "primaryEvidenceType", detector_version AS "detectorVersion"
      FROM contract_capabilities
      WHERE contract_address = ${address}
      ORDER BY capability_key ASC
    `);

    const evidence = await db.execute(sql`
      SELECT capability_key AS "capabilityKey", evidence_type AS "evidenceType", evidence_key AS "evidenceKey", evidence_value AS "evidenceValue", snippet, confidence, detector_version AS "detectorVersion", created_at AS "createdAt"
      FROM capability_evidence
      WHERE contract_address = ${address}
      ORDER BY capability_key ASC, confidence DESC
      LIMIT 500
    `);

    return NextResponse.json({
      data: {
        beta: true,
        capabilities,
        evidence,
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/capabilities/[address]]", error);
    return NextResponse.json(
      { data: null, error: "Failed to load contract capabilities" },
      { status: 500 }
    );
  }
}
