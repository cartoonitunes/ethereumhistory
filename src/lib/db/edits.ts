/**
 * Contract editing, suggestions, and edit history.
 */

import { eq, and, or, desc, inArray, isNull, isNotNull, ne, sql } from "drizzle-orm";
import * as schema from "../schema";
import crypto from "crypto";
import type { Contract as AppContract } from "@/types";
import { getDb } from "./connection";
import { checkAndPromoteTrustedStatusFromDb } from "./historians";

// =============================================================================
// History editing helpers
// =============================================================================

export async function updateContractHistoryFieldsFromDb(
  address: string,
  patch: {
    etherscanContractName?: string | null;
    tokenName?: string | null;
    contractType?: string | null;
    manualCategories?: string[] | null;
    shortDescription?: string | null;
    description?: string | null;
    historicalSignificance?: string | null;
    historicalContext?: string | null;
    sourcifyMatch?: string | null;
  }
): Promise<void> {
  const database = getDb();
  const updates: Partial<schema.NewContract> = { updatedAt: new Date() };
  
  // Track if any fields are being updated (not just updatedAt)
  let hasFieldUpdates = false;
  
  if (patch.etherscanContractName !== undefined) {
    updates.etherscanContractName = patch.etherscanContractName;
    hasFieldUpdates = true;
  }
  if (patch.tokenName !== undefined) {
    updates.tokenName = patch.tokenName;
    hasFieldUpdates = true;
  }
  if (patch.contractType !== undefined) {
    updates.contractType = patch.contractType;
    hasFieldUpdates = true;
  }
  if (patch.manualCategories !== undefined) {
    updates.manualCategories = patch.manualCategories;
    hasFieldUpdates = true;
  }
  if (patch.shortDescription !== undefined) {
    updates.shortDescription = patch.shortDescription;
    hasFieldUpdates = true;
  }
  if (patch.description !== undefined) {
    updates.description = patch.description;
    hasFieldUpdates = true;
  }
  if (patch.historicalSignificance !== undefined) {
    updates.historicalSignificance = patch.historicalSignificance;
    hasFieldUpdates = true;
  }
  if (patch.historicalContext !== undefined) {
    updates.historicalContext = patch.historicalContext;
    hasFieldUpdates = true;
  }
  if (patch.sourcifyMatch !== undefined) {
    updates.sourcifyMatch = patch.sourcifyMatch;
    hasFieldUpdates = true;
  }

  // Only update if there are actual field changes (beyond just updatedAt)
  if (!hasFieldUpdates) return;
  
  await database.update(schema.contracts).set(updates).where(eq(schema.contracts.address, address.toLowerCase()));
}

/**
 * Log a contract edit by a historian.
 * Tracks which fields were changed in a single edit session.
 */
export async function logContractEditFromDb(params: {
  contractAddress: string;
  historianId: number;
  fieldsChanged: string[];
}): Promise<void> {
  const database = getDb();
  const normalized = params.contractAddress.toLowerCase();
  
  // Only log if there are actual field changes
  if (!params.fieldsChanged.length) return;
  
  await database.insert(schema.contractEdits).values({
    contractAddress: normalized,
    historianId: params.historianId,
    editedAt: new Date(),
    fieldsChanged: params.fieldsChanged,
  } as any);
  
  // Check and promote to trusted status if they've reached 30 edits
  // This runs asynchronously and won't block the edit logging
  checkAndPromoteTrustedStatusFromDb(params.historianId).catch((error) => {
    console.error("Error checking auto-trust promotion:", error);
    // Don't throw - this is a background check
  });
}

/**
 * Check if this is a historian's first edit of a contract.
 * Useful for highlighting "first contributions" or onboarding.
 */
export async function isFirstEditFromDb(
  contractAddress: string,
  historianId: number
): Promise<boolean> {
  const database = getDb();
  const normalized = contractAddress.toLowerCase();
  
  const result = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.contractEdits)
    .where(
      and(
        eq(schema.contractEdits.contractAddress, normalized),
        eq(schema.contractEdits.historianId, historianId)
      )
    )
    .limit(1);
  
  return (result[0]?.count ?? 0) === 0;
}

/**
 * Check if a contract has been documented for the first time.
 * Returns true if there are no previous contract_edits for this contract address.
 */
export async function isFirstContractDocumentation(
  contractAddress: string
): Promise<boolean> {
  const database = getDb();
  const normalized = contractAddress.toLowerCase();
  
  // Check if this specific contract has been documented before
  const result = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.contractEdits)
    .where(eq(schema.contractEdits.contractAddress, normalized))
    .limit(1);
  
  if ((result[0]?.count ?? 0) > 0) return false;

  // Also check if any other contract with the same runtime bytecode hash has already
  // been documented. If so, this is a duplicate deployment and the bot already fired.
  const contractRow = await database
    .select({ runtimeBytecodeHash: schema.contracts.runtimeBytecodeHash })
    .from(schema.contracts)
    .where(eq(schema.contracts.address, normalized))
    .limit(1);

  const hash = contractRow[0]?.runtimeBytecodeHash;
  if (!hash) return true; // no bytecode hash — treat as first

  // Find all contracts with the same bytecode hash that have been edited (documented)
  const siblings = await database
    .select({ contractAddress: schema.contractEdits.contractAddress })
    .from(schema.contractEdits)
    .innerJoin(
      schema.contracts,
      eq(schema.contractEdits.contractAddress, schema.contracts.address)
    )
    .where(eq(schema.contracts.runtimeBytecodeHash, hash))
    .limit(1);

  // If any sibling has been documented, this is not the first — skip the bot
  return siblings.length === 0;
}

/**
 * Send contract documentation event to social media bot service.
 * This is called when a contract is documented for the first time.
 */
export async function sendContractDocumentationEvent(
  contract: AppContract
): Promise<void> {
  const socialMediaBotUrl = process.env.SOCIAL_MEDIA_BOT_URL;
  if (!socialMediaBotUrl) {
    console.warn("[social-media-bot] SOCIAL_MEDIA_BOT_URL not configured, skipping event");
    return;
  }

  // Only send if contract has a name (etherscanContractName or tokenName)
  const contractName = contract.etherscanContractName || contract.tokenName;
  if (!contractName) {
    return;
  }

  const contractUrl = `https://ethereumhistory.com/contract/${contract.address}`;

  try {
    const response = await fetch(`${socialMediaBotUrl}/contractdocumentation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contract_address: contract.address,
        contract_name: contractName,
        deployment_timestamp: contract.deploymentTimestamp || null,
        short_description: contract.shortDescription || null,
        contract_url: contractUrl,
      }),
    });

    if (!response.ok) {
      console.error(
        `[social-media-bot] Failed to send contract documentation event: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    // Log but don't throw - this is a background notification
    console.error("[social-media-bot] Error sending contract documentation event:", error);
  }
}

export async function upsertHistoricalLinkFromDb(params: {
  id?: number | null;
  contractAddress: string;
  title: string | null;
  url: string;
  source: string | null;
  note: string | null;
  historianId: number;
}): Promise<void> {
  const database = getDb();
  const normalized = params.contractAddress.toLowerCase();

  if (params.id) {
    await database
      .update(schema.historicalLinks)
      .set({
        title: params.title,
        url: params.url,
        source: params.source,
        note: params.note,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(schema.historicalLinks.id, params.id), eq(schema.historicalLinks.contractAddress, normalized)));
    return;
  }

  await database.insert(schema.historicalLinks).values({
    contractAddress: normalized,
    title: params.title,
    url: params.url,
    source: params.source,
    note: params.note,
    createdBy: params.historianId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
}

export async function deleteHistoricalLinksFromDb(params: {
  contractAddress: string;
  ids: number[];
}): Promise<void> {
  const database = getDb();
  const normalized = params.contractAddress.toLowerCase();
  if (!params.ids.length) return;
  await database
    .delete(schema.historicalLinks)
    .where(and(eq(schema.historicalLinks.contractAddress, normalized), inArray(schema.historicalLinks.id, params.ids)));
}

// =============================================================================
// Edit Suggestions
// =============================================================================

/**
 * Insert an anonymous edit suggestion.
 */
export async function insertEditSuggestionFromDb(params: {
  contractAddress: string;
  fieldName: string;
  suggestedValue: string;
  reason?: string | null;
  submitterGithub?: string | null;
  submitterName?: string | null;
  submitterHistorianId?: number | null;
  batchId?: string | null;
}): Promise<{ id: number }> {
  const database = getDb();
  const [result] = await database
    .insert(schema.editSuggestions)
    .values({
      contractAddress: params.contractAddress.toLowerCase(),
      fieldName: params.fieldName,
      suggestedValue: params.suggestedValue,
      reason: params.reason || null,
      submitterGithub: params.submitterGithub || null,
      submitterName: params.submitterName || null,
      submitterHistorianId: params.submitterHistorianId || null,
      batchId: params.batchId || null,
      status: "pending",
      createdAt: new Date(),
    })
    .returning({ id: schema.editSuggestions.id });
  return { id: result.id };
}

/**
 * Insert a batch of edit suggestions (one per changed field) with a shared batchId.
 * Auto-supersedes any previous pending suggestions from the same historian for the same contract+field.
 */
export async function insertBatchEditSuggestionsFromDb(params: {
  contractAddress: string;
  submitterHistorianId: number;
  submitterName: string;
  submitterGithub?: string | null;
  fields: Array<{ fieldName: string; suggestedValue: string }>;
  reason?: string | null;
}): Promise<{ batchId: string; ids: number[] }> {
  const database = getDb();
  const normalized = params.contractAddress.toLowerCase();
  const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  // Supersede any previous pending suggestions from this historian for these fields
  const fieldNames = params.fields.map((f) => f.fieldName);
  if (fieldNames.length > 0) {
    await database
      .update(schema.editSuggestions)
      .set({ status: "superseded" })
      .where(
        and(
          eq(schema.editSuggestions.contractAddress, normalized),
          eq(schema.editSuggestions.submitterHistorianId, params.submitterHistorianId),
          eq(schema.editSuggestions.status, "pending"),
          inArray(schema.editSuggestions.fieldName, fieldNames)
        )
      );
  }

  const ids: number[] = [];
  for (const field of params.fields) {
    const [result] = await database
      .insert(schema.editSuggestions)
      .values({
        contractAddress: normalized,
        fieldName: field.fieldName,
        suggestedValue: field.suggestedValue,
        reason: params.reason || null,
        submitterGithub: params.submitterGithub || null,
        submitterName: params.submitterName,
        submitterHistorianId: params.submitterHistorianId,
        batchId,
        status: "pending",
        createdAt: new Date(),
      })
      .returning({ id: schema.editSuggestions.id });
    ids.push(result.id);
  }

  return { batchId, ids };
}

/**
 * Get a single edit suggestion by ID.
 */
export async function getEditSuggestionByIdFromDb(id: number): Promise<schema.EditSuggestion | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.editSuggestions)
    .where(eq(schema.editSuggestions.id, id))
    .limit(1);
  return rows[0] || null;
}

/**
 * Get pending suggestions for a specific historian (for "my pending edits" view).
 */
export async function getPendingSuggestionsForHistorianFromDb(
  historianId: number,
  contractAddress?: string
): Promise<schema.EditSuggestion[]> {
  const database = getDb();
  const conditions: ReturnType<typeof eq>[] = [
    eq(schema.editSuggestions.submitterHistorianId, historianId),
    eq(schema.editSuggestions.status, "pending"),
  ];
  if (contractAddress) {
    conditions.push(eq(schema.editSuggestions.contractAddress, contractAddress.toLowerCase()));
  }
  return database
    .select()
    .from(schema.editSuggestions)
    .where(and(...conditions))
    .orderBy(desc(schema.editSuggestions.createdAt))
    .limit(100);
}

/**
 * Get pending suggestions for the review dashboard (for trusted historians).
 * Includes submitter information via join.
 */
export async function getEditSuggestionsForReviewFromDb(params: {
  limit?: number;
  offset?: number;
}): Promise<Array<schema.EditSuggestion & { submitterHistorianName: string | null; submitterHistorianGithub: string | null }>> {
  const database = getDb();
  const rows = await database
    .select({
      id: schema.editSuggestions.id,
      contractAddress: schema.editSuggestions.contractAddress,
      fieldName: schema.editSuggestions.fieldName,
      suggestedValue: schema.editSuggestions.suggestedValue,
      reason: schema.editSuggestions.reason,
      submitterGithub: schema.editSuggestions.submitterGithub,
      submitterName: schema.editSuggestions.submitterName,
      submitterHistorianId: schema.editSuggestions.submitterHistorianId,
      batchId: schema.editSuggestions.batchId,
      status: schema.editSuggestions.status,
      reviewedBy: schema.editSuggestions.reviewedBy,
      reviewedAt: schema.editSuggestions.reviewedAt,
      createdAt: schema.editSuggestions.createdAt,
      submitterHistorianName: schema.historians.name,
      submitterHistorianGithub: schema.historians.githubUsername,
    })
    .from(schema.editSuggestions)
    .leftJoin(schema.historians, eq(schema.editSuggestions.submitterHistorianId, schema.historians.id))
    .where(eq(schema.editSuggestions.status, "pending"))
    .orderBy(desc(schema.editSuggestions.createdAt))
    .limit(params.limit ?? 100)
    .offset(params.offset ?? 0);

  return rows.map((r) => ({
    id: r.id,
    contractAddress: r.contractAddress,
    fieldName: r.fieldName,
    suggestedValue: r.suggestedValue,
    reason: r.reason,
    submitterGithub: r.submitterGithub,
    submitterName: r.submitterName,
    submitterHistorianId: r.submitterHistorianId,
    batchId: r.batchId,
    status: r.status,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
    submitterHistorianName: r.submitterHistorianName || null,
    submitterHistorianGithub: r.submitterHistorianGithub || null,
  }));
}

/**
 * Apply an approved suggestion: update the contract field and log the edit.
 * Used when a trusted historian approves an untrusted historian's suggestion.
 */
export async function applyApprovedSuggestionFromDb(params: {
  suggestionId: number;
  reviewerId: number;
}): Promise<void> {
  // Get the suggestion (must be pending)
  const suggestion = await getEditSuggestionByIdFromDb(params.suggestionId);
  if (!suggestion || suggestion.status !== "pending") {
    throw new Error("Suggestion not found or already processed");
  }

  // Map field names to contract fields
  const fieldMapping: Record<string, string> = {
    description: "description",
    short_description: "shortDescription",
    shortDescription: "shortDescription",
    historical_significance: "historicalSignificance",
    historicalSignificance: "historicalSignificance",
    historical_context: "historicalContext",
    historicalContext: "historicalContext",
    etherscanContractName: "etherscanContractName",
    tokenName: "tokenName",
    contractType: "contractType",
    manualCategories: "manualCategories",
  };

  const contractField = fieldMapping[suggestion.fieldName];
  if (!contractField) {
    throw new Error(`Cannot auto-apply field: ${suggestion.fieldName}`);
  }

  // Apply the change to the contract
  const patch: Record<string, unknown> = {};
  if (contractField === "manualCategories") {
    try {
      patch[contractField] = JSON.parse(suggestion.suggestedValue || "[]");
    } catch {
      patch[contractField] = [];
    }
  } else {
    patch[contractField] = suggestion.suggestedValue;
  }
  await updateContractHistoryFieldsFromDb(suggestion.contractAddress, patch as any);

  // Mark suggestion as approved
  await updateEditSuggestionStatusFromDb({
    id: params.suggestionId,
    status: "approved",
    reviewedBy: params.reviewerId,
  });

  // Log the edit under the submitter's historian ID (if they have one)
  const editHistorianId = suggestion.submitterHistorianId || params.reviewerId;
  await logContractEditFromDb({
    contractAddress: suggestion.contractAddress,
    historianId: editHistorianId,
    fieldsChanged: [suggestion.fieldName],
  });
}

/**
 * Get count of pending suggestions (for review badge).
 */
export async function getPendingSuggestionsCountFromDb(): Promise<number> {
  const database = getDb();
  const result = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.editSuggestions)
    .where(eq(schema.editSuggestions.status, "pending"));
  return result[0]?.count || 0;
}

/**
 * Get edit suggestions for a contract (for review by historians).
 */
export async function getEditSuggestionsFromDb(params: {
  contractAddress?: string | null;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<schema.EditSuggestion[]> {
  const database = getDb();
  const conditions: ReturnType<typeof eq>[] = [];
  if (params.contractAddress) {
    conditions.push(eq(schema.editSuggestions.contractAddress, params.contractAddress.toLowerCase()));
  }
  if (params.status) {
    conditions.push(eq(schema.editSuggestions.status, params.status));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return database
    .select()
    .from(schema.editSuggestions)
    .where(whereClause ?? sql`true`)
    .orderBy(desc(schema.editSuggestions.createdAt))
    .limit(params.limit ?? 50)
    .offset(params.offset ?? 0);
}

/**
 * Update suggestion status (approve/reject).
 */
export async function updateEditSuggestionStatusFromDb(params: {
  id: number;
  status: "approved" | "rejected";
  reviewedBy: number;
}): Promise<void> {
  const database = getDb();
  await database
    .update(schema.editSuggestions)
    .set({
      status: params.status,
      reviewedBy: params.reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(schema.editSuggestions.id, params.id));
}

/**
 * Get recent contract edits for the activity feed.
 */
export async function getRecentEditsFromDb(limit = 20): Promise<
  Array<{
    contractAddress: string;
    historianName: string;
    fieldsChanged: string[] | null;
    editedAt: string;
    contractName: string | null;
  }>
> {
  const database = getDb();
  const rows = await database
    .select({
      contractAddress: schema.contractEdits.contractAddress,
      historianName: schema.historians.name,
      fieldsChanged: schema.contractEdits.fieldsChanged,
      editedAt: schema.contractEdits.editedAt,
      contractName: schema.contracts.etherscanContractName,
      tokenName: schema.contracts.tokenName,
    })
    .from(schema.contractEdits)
    .innerJoin(schema.historians, eq(schema.contractEdits.historianId, schema.historians.id))
    .innerJoin(schema.contracts, eq(schema.contractEdits.contractAddress, schema.contracts.address))
    .orderBy(desc(schema.contractEdits.editedAt))
    .limit(limit);

  return rows.map((r) => ({
    contractAddress: r.contractAddress,
    historianName: r.historianName,
    fieldsChanged: r.fieldsChanged,
    editedAt: r.editedAt.toISOString(),
    contractName: r.tokenName || r.contractName || null,
  }));
}

/**
 * Get edit history for a specific contract
 */
export async function getEditsForContractFromDb(
  contractAddress: string,
  limit = 20
): Promise<
  Array<{
    historianName: string;
    historianAvatarUrl: string | null;
    fieldsChanged: string[] | null;
    editedAt: string;
  }>
> {
  const database = getDb();
  const rows = await database
    .select({
      historianName: schema.historians.name,
      historianAvatarUrl: schema.historians.avatarUrl,
      fieldsChanged: schema.contractEdits.fieldsChanged,
      editedAt: schema.contractEdits.editedAt,
    })
    .from(schema.contractEdits)
    .innerJoin(
      schema.historians,
      eq(schema.contractEdits.historianId, schema.historians.id)
    )
    .where(eq(schema.contractEdits.contractAddress, contractAddress.toLowerCase()))
    .orderBy(desc(schema.contractEdits.editedAt))
    .limit(limit);

  return rows.map((r) => ({
    historianName: r.historianName,
    historianAvatarUrl: r.historianAvatarUrl,
    fieldsChanged: r.fieldsChanged,
    editedAt: r.editedAt.toISOString(),
  }));
}
