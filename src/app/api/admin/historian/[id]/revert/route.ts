import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getDb, updateContractHistoryFieldsFromDb, updateContractEtherscanEnrichmentFromDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Fields that should be nulled out when reverting a bad historian's edits. */
const REVERTABLE_HISTORY_FIELDS = new Set([
  "shortDescription",
  "description",
  "historicalSignificance",
  "historicalContext",
]);

const REVERTABLE_ENRICHMENT_FIELDS = new Set([
  "verificationMethod",
  "verificationProofUrl",
  "verificationNotes",
  "compilerCommit",
  "compilerLanguage",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active || me.role !== "admin") {
    return NextResponse.json(
      { data: null, error: "Unauthorized. Admin access required." },
      { status: 403 }
    );
  }

  const { id: idStr } = await params;
  const historianId = Number(idStr);
  if (!Number.isFinite(historianId) || historianId <= 0) {
    return NextResponse.json(
      { data: null, error: "Invalid historian ID." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;

  try {
    const database = getDb();

    // Find all edits by this historian
    const edits = await database
      .select()
      .from(schema.contractEdits)
      .where(eq(schema.contractEdits.historianId, historianId))
      .orderBy(desc(schema.contractEdits.editedAt));

    // Collect unique contract addresses
    const addressSet = new Set<string>();
    for (const edit of edits) {
      addressSet.add(edit.contractAddress);
    }

    if (addressSet.size === 0) {
      return NextResponse.json({
        data: { contractsAffected: 0, addresses: [], dryRun },
        error: null,
      });
    }

    const affectedAddresses: string[] = [];

    for (const contractAddress of addressSet) {
      // Get all edits for this contract, ordered most recent first
      const contractEditsAll = await database
        .select()
        .from(schema.contractEdits)
        .where(eq(schema.contractEdits.contractAddress, contractAddress))
        .orderBy(desc(schema.contractEdits.editedAt));

      // For each revertable field, check if the most recent edit to that field
      // was by this historian
      const fieldsToNull: Set<string> = new Set();

      const allRevertable = new Set([...REVERTABLE_HISTORY_FIELDS, ...REVERTABLE_ENRICHMENT_FIELDS]);

      for (const field of allRevertable) {
        // Find the most recent edit that touched this field
        const lastEdit = contractEditsAll.find(
          (e) => e.fieldsChanged && e.fieldsChanged.includes(field)
        );
        if (lastEdit && lastEdit.historianId === historianId) {
          fieldsToNull.add(field);
        }
      }

      if (fieldsToNull.size === 0) continue;
      affectedAddresses.push(contractAddress);

      if (dryRun) continue;

      // Null out history fields
      const historyPatch: Record<string, null> = {};
      for (const field of fieldsToNull) {
        if (REVERTABLE_HISTORY_FIELDS.has(field)) {
          historyPatch[field] = null;
        }
      }
      if (Object.keys(historyPatch).length > 0) {
        await updateContractHistoryFieldsFromDb(contractAddress, historyPatch as any);
      }

      // Null out enrichment fields
      const enrichmentPatch: Record<string, null> = {};
      for (const field of fieldsToNull) {
        if (REVERTABLE_ENRICHMENT_FIELDS.has(field)) {
          enrichmentPatch[field] = null;
        }
      }
      if (Object.keys(enrichmentPatch).length > 0) {
        await updateContractEtherscanEnrichmentFromDb(contractAddress, enrichmentPatch as any);
      }
    }

    return NextResponse.json({
      data: {
        contractsAffected: affectedAddresses.length,
        addresses: affectedAddresses,
        dryRun,
      },
      error: null,
    });
  } catch (error) {
    console.error("Error reverting historian edits:", error);
    return NextResponse.json(
      { data: null, error: "Failed to revert historian edits." },
      { status: 500 }
    );
  }
}
