import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { updateContractEtherscanEnrichmentFromDb, updateContractHistoryFieldsFromDb } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// Verification fields that a bad actor could have set via proofs/history
const VERIFICATION_FIELDS = new Set([
  "verificationMethod",
  "verificationProofUrl",
  "verificationNotes",
  "compilerCommit",
  "compilerLanguage",
  "sourceCode",
]);

// General content fields
const CONTENT_FIELDS = new Set([
  "shortDescription",
  "description",
  "historicalSignificance",
  "historicalContext",
  "etherscanContractName",
  "tokenName",
  "contractType",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<
  NextResponse<
    ApiResponse<{ contractsAffected: number; addresses: string[]; dryRun: boolean }>
  >
> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active || me.role !== "admin") {
    return NextResponse.json({ data: null, error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const historianId = parseInt(id, 10);
  if (isNaN(historianId)) {
    return NextResponse.json({ data: null, error: "Invalid historian ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;

  const db = getDb();

  // Find all edits from this historian
  const edits = await db
    .select()
    .from(schema.contractEdits)
    .where(eq(schema.contractEdits.historianId, historianId))
    .orderBy(desc(schema.contractEdits.editedAt));

  // Get unique contract addresses touched by this historian
  const affectedAddresses = [...new Set(edits.map((e) => e.contractAddress))];

  if (dryRun) {
    return NextResponse.json({
      data: { contractsAffected: affectedAddresses.length, addresses: affectedAddresses, dryRun: true },
      error: null,
    });
  }

  // For each contract, null out the fields this historian changed
  for (const address of affectedAddresses) {
    // Find which fields this historian changed on this contract
    const historianEditsForContract = edits.filter((e) => e.contractAddress === address);
    const fieldsChangedByHistorian = new Set(
      historianEditsForContract.flatMap((e) => e.fieldsChanged ?? [])
    );

    // Check if any other historian has since edited these fields (don't revert those)
    const laterEdits = await db
      .select()
      .from(schema.contractEdits)
      .where(
        and(
          eq(schema.contractEdits.contractAddress, address),
          // Get all edits — we'll filter in code to find edits AFTER the bad actor's last edit
        )
      )
      .orderBy(desc(schema.contractEdits.editedAt));

    const badActorLastEdit = historianEditsForContract[0]?.editedAt ?? new Date(0);
    const laterEditsFromOthers = laterEdits.filter(
      (e) => e.historianId !== historianId && e.editedAt > badActorLastEdit
    );
    const fieldsLaterEditedByOthers = new Set(
      laterEditsFromOthers.flatMap((e) => e.fieldsChanged ?? [])
    );

    // Only revert fields the bad actor changed that haven't been subsequently fixed by others
    const fieldsToRevert = [...fieldsChangedByHistorian].filter(
      (f) => !fieldsLaterEditedByOthers.has(f)
    );

    if (fieldsToRevert.length === 0) continue;

    // Build patches
    const verificationPatch: Record<string, null> = {};
    const contentPatch: Record<string, null> = {};

    for (const field of fieldsToRevert) {
      if (VERIFICATION_FIELDS.has(field)) {
        verificationPatch[field] = null;
      } else if (CONTENT_FIELDS.has(field)) {
        contentPatch[field] = null;
      }
    }

    if (Object.keys(verificationPatch).length > 0) {
      await updateContractEtherscanEnrichmentFromDb(address, verificationPatch as any);
    }
    if (Object.keys(contentPatch).length > 0) {
      await updateContractHistoryFieldsFromDb(address, contentPatch as any);
    }
  }

  return NextResponse.json({
    data: {
      contractsAffected: affectedAddresses.length,
      addresses: affectedAddresses,
      dryRun: false,
    },
    error: null,
  });
}
