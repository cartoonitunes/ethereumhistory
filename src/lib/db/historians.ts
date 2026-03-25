/**
 * Historian auth, invitations, auto-trust, and profile queries.
 */

import { eq, desc, sql } from "drizzle-orm";
import * as schema from "../schema";
import crypto from "crypto";
import type { HistorianMe } from "@/types";
import { getDb } from "./connection";

// =============================================================================
// Historian Auth
// =============================================================================

export async function getHistorianByEmailFromDb(email: string): Promise<schema.Historian | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.historians)
    // Be forgiving: historically some rows may have mixed-case or whitespace.
    .where(sql`lower(trim(${schema.historians.email})) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return rows[0] || null;
}

export async function getHistorianByIdFromDb(id: number): Promise<schema.Historian | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.historians)
    .where(eq(schema.historians.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function createHistorianFromDb(params: {
  email: string;
  name: string;
  tokenHash: string;
}): Promise<void> {
  const database = getDb();
  await database.insert(schema.historians).values({
    email: params.email.trim().toLowerCase(),
    name: params.name,
    tokenHash: params.tokenHash,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export function historianRowToMe(row: schema.Historian): HistorianMe {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    active: row.active ?? true,
    trusted: row.trusted ?? false,
    role: row.role || null,
    avatarUrl: row.avatarUrl || null,
    bio: row.bio || null,
    websiteUrl: row.websiteUrl || null,
    githubUsername: row.githubUsername || null,
    ethereumAddress: row.ethereumAddress || null,
    baseAddress: row.baseAddress || null,
  };
}

/**
 * Find historian by GitHub ID (for OAuth login).
 */
export async function getHistorianByGithubIdFromDb(githubId: string): Promise<schema.Historian | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.historians)
    .where(eq(schema.historians.githubId, githubId))
    .limit(1);
  return rows[0] || null;
}

/**
 * Create a historian from GitHub OAuth (no password token needed).
 */
export async function createHistorianFromGithubFromDb(params: {
  email: string;
  name: string;
  githubId: string;
  githubUsername: string;
}): Promise<schema.Historian> {
  const database = getDb();
  const [result] = await database
    .insert(schema.historians)
    .values({
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      githubId: params.githubId,
      githubUsername: params.githubUsername,
      active: true,
      trusted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result;
}

// =============================================================================
// Historian Invitations
// =============================================================================

/**
 * Create a new historian invitation
 */
export async function createHistorianInvitationFromDb(params: {
  inviterId: number;
  invitedEmail?: string | null;
  invitedName?: string | null;
  notes?: string | null;
  expiresInDays?: number;
}): Promise<{ id: number; inviteToken: string }> {
  const database = getDb();
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const expiresInDays = params.expiresInDays ?? parseInt(process.env.HISTORIAN_INVITE_EXPIRY_DAYS || "30", 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [result] = await database
    .insert(schema.historianInvitations)
    .values({
      inviterId: params.inviterId,
      inviteToken,
      invitedEmail: params.invitedEmail ? params.invitedEmail.trim().toLowerCase() : null,
      invitedName: params.invitedName?.trim() || null,
      notes: params.notes?.trim() || null,
      expiresAt,
      createdAt: new Date(),
    })
    .returning({ id: schema.historianInvitations.id, inviteToken: schema.historianInvitations.inviteToken });

  return { id: result.id, inviteToken: result.inviteToken };
}

/**
 * Get invitation by token (for validation and acceptance)
 * Returns invitation with inviter's name
 */
export async function getHistorianInvitationByTokenFromDb(
  token: string
): Promise<(schema.HistorianInvitation & { inviterName?: string }) | null> {
  const database = getDb();
  const rows = await database
    .select({
      id: schema.historianInvitations.id,
      inviterId: schema.historianInvitations.inviterId,
      inviteeId: schema.historianInvitations.inviteeId,
      inviteToken: schema.historianInvitations.inviteToken,
      invitedEmail: schema.historianInvitations.invitedEmail,
      invitedName: schema.historianInvitations.invitedName,
      createdAt: schema.historianInvitations.createdAt,
      acceptedAt: schema.historianInvitations.acceptedAt,
      expiresAt: schema.historianInvitations.expiresAt,
      notes: schema.historianInvitations.notes,
      inviterName: schema.historians.name,
    })
    .from(schema.historianInvitations)
    .innerJoin(schema.historians, eq(schema.historianInvitations.inviterId, schema.historians.id))
    .where(eq(schema.historianInvitations.inviteToken, token))
    .limit(1);
  
  if (!rows[0]) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    inviterId: row.inviterId,
    inviteeId: row.inviteeId,
    inviteToken: row.inviteToken,
    invitedEmail: row.invitedEmail,
    invitedName: row.invitedName,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    expiresAt: row.expiresAt,
    notes: row.notes,
    inviterName: row.inviterName,
  };
}

/**
 * Accept an invitation and create a historian account
 */
export async function acceptHistorianInvitationFromDb(params: {
  invitationId: number;
  email: string;
  name: string;
  tokenHash: string;
}): Promise<{ historianId: number }> {
  const database = getDb();
  
  // Create the historian account
  const [historian] = await database
    .insert(schema.historians)
    .values({
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      tokenHash: params.tokenHash,
      active: true,
      trusted: false, // Invitees start untrusted
      trustedOverride: null, // Auto-managed
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.historians.id });

  // Update the invitation to mark it as accepted
  await database
    .update(schema.historianInvitations)
    .set({
      inviteeId: historian.id,
      acceptedAt: new Date(),
    })
    .where(eq(schema.historianInvitations.id, params.invitationId));

  return { historianId: historian.id };
}

/**
 * Get all invitations created by a historian
 */
export async function getHistorianInvitationsByInviterFromDb(
  inviterId: number
): Promise<schema.HistorianInvitation[]> {
  const database = getDb();
  return await database
    .select()
    .from(schema.historianInvitations)
    .where(eq(schema.historianInvitations.inviterId, inviterId))
    .orderBy(desc(schema.historianInvitations.createdAt));
}

// =============================================================================
// Auto-Trust System
// =============================================================================

/**
 * Get total edit count for a historian
 */
export async function getEditCountForHistorianFromDb(historianId: number): Promise<number> {
  const database = getDb();
  const result = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.contractEdits)
    .where(eq(schema.contractEdits.historianId, historianId));
  return result[0]?.count || 0;
}

/**
 * Count how many contracts this historian was the FIRST to document
 * (first edit ever on that contract address)
 */
export async function getFirstDocumentationCountFromDb(historianId: number): Promise<number> {
  const database = getDb();

  // For each contract this historian edited, check if their earliest edit
  // on that contract predates any other historian's edit on the same contract
  const result = await database.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT ce.contract_address
      FROM contract_edits ce
      WHERE ce.historian_id = ${historianId}
        AND ce.edited_at = (
          SELECT MIN(ce2.edited_at)
          FROM contract_edits ce2
          WHERE ce2.contract_address = ce.contract_address
        )
      GROUP BY ce.contract_address
    ) first_docs
  `);

  return (result as unknown as Array<{ count: number }>)[0]?.count || 0;
}

/**
 * Check and promote historian to trusted status based on contribution quality.
 * Auto-promotion criteria (either condition):
 *   - 2+ contracts where they were the first ever documenter, OR
 *   - 10+ total edits
 * Manual override (trustedOverride=false) blocks auto-promotion permanently.
 * Returns true if promoted, false otherwise.
 */
export async function checkAndPromoteTrustedStatusFromDb(historianId: number): Promise<boolean> {
  const database = getDb();
  
  // Get current historian status
  const historian = await getHistorianByIdFromDb(historianId);
  if (!historian) return false;
  
  // If already trusted, no need to check
  if (historian.trusted) return false;
  
  // If manually overridden to untrusted, don't auto-promote
  if (historian.trustedOverride === false) return false;
  
  // Check total edits
  const editCount = await getEditCountForHistorianFromDb(historianId);

  // Check first-documentation count (first ever edit on a contract)
  const firstDocCount = await getFirstDocumentationCountFromDb(historianId);

  const shouldPromote = firstDocCount >= 2 || editCount >= 10;

  if (shouldPromote) {
    await database
      .update(schema.historians)
      .set({
        trusted: true,
        trustedOverride: null, // Keep as auto-managed
        updatedAt: new Date(),
      })
      .where(eq(schema.historians.id, historianId));
    return true;
  }
  
  return false;
}

/**
 * Update historian trusted status (for manual override)
 */
export async function updateHistorianTrustedStatusFromDb(params: {
  historianId: number;
  trusted: boolean;
  trustedOverride: boolean | null; // null = auto, true/false = manual
}): Promise<void> {
  const database = getDb();
  await database
    .update(schema.historians)
    .set({
      trusted: params.trusted,
      trustedOverride: params.trustedOverride,
      updatedAt: new Date(),
    })
    .where(eq(schema.historians.id, params.historianId));
}

/**
 * Update historian profile fields (avatar, bio, website).
 */
export async function updateHistorianProfileFromDb(
  historianId: number,
  patch: {
    avatarUrl?: string | null;
    bio?: string | null;
    websiteUrl?: string | null;
    ethereumAddress?: string | null;
    baseAddress?: string | null;
  }
): Promise<void> {
  const database = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (patch.avatarUrl !== undefined) updates.avatarUrl = patch.avatarUrl;
  if (patch.bio !== undefined) updates.bio = patch.bio;
  if (patch.websiteUrl !== undefined) updates.websiteUrl = patch.websiteUrl;
  if (patch.ethereumAddress !== undefined) updates.ethereumAddress = patch.ethereumAddress;
  if (patch.baseAddress !== undefined) updates.baseAddress = patch.baseAddress;

  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.historians)
    .set(updates as any)
    .where(eq(schema.historians.id, historianId));
}

/**
 * Get top editors by edit count.
 * Returns historian name, total edit count, and count of new pages (first edits).
 */
export async function getTopEditorsFromDb(limit = 10): Promise<Array<{ historianId: number; name: string; avatarUrl: string | null; editCount: number; newPagesCount: number }>> {
  const database = getDb();

  // Use Drizzle query builder for consistency, with sql template for the complex correlated subquery
  // The subquery identifies first edits by checking if edited_at is the minimum for that contract+historian pair
  const results = await database
    .select({
      historianId: schema.contractEdits.historianId,
      name: schema.historians.name,
      avatarUrl: schema.historians.avatarUrl,
      editCount: sql<number>`COUNT(*)::int`,
      newPagesCount: sql<number>`
        COUNT(DISTINCT CASE
          WHEN ${schema.contractEdits.editedAt} = (
            SELECT MIN(ce2.edited_at)
            FROM contract_edits ce2
            WHERE ce2.contract_address = ${schema.contractEdits.contractAddress}
              AND ce2.historian_id = ${schema.contractEdits.historianId}
          )
          THEN ${schema.contractEdits.contractAddress}
        END)::int
      `,
    })
    .from(schema.contractEdits)
    .innerJoin(schema.historians, eq(schema.contractEdits.historianId, schema.historians.id))
    .where(eq(schema.historians.active, true))
    .groupBy(schema.contractEdits.historianId, schema.historians.name, schema.historians.avatarUrl)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);

  return results.map(r => ({
    historianId: r.historianId,
    name: r.name,
    avatarUrl: r.avatarUrl || null,
    editCount: r.editCount,
    newPagesCount: r.newPagesCount,
  }));
}
