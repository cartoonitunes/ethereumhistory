/**
 * Database Client for Ethereum History
 *
 * Uses Drizzle ORM (postgres-js) for all environments.
 */

import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, like, ilike, desc, asc, and, or, SQL, sql, inArray, isNotNull, ne, isNull, lt } from "drizzle-orm";
import * as schema from "./schema";
import crypto from "crypto";
import type {
  Contract as AppContract,
  ContractSimilarity,
  HeuristicContractType,
  HistoricalLink,
  ContractMetadataItem,
  UnifiedSearchResult,
  UnifiedMatchType,
  Person as AppPerson,
  HistorianMe,
} from "@/types";
import { ERAS } from "@/types";

// =============================================================================
// Database Connection
// =============================================================================

// Create drizzle instance (singleton per runtime instance)
let db: ReturnType<typeof drizzlePostgres<typeof schema>> | null = null;

function getDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

function isPoolerUrl(dbUrl: string): boolean {
  try {
    const host = new URL(dbUrl).hostname;
    return host.includes("pooler");
  } catch {
    return dbUrl.includes("pooler");
  }
}

export function getDb() {
  if (!db) {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error("POSTGRES_URL (or DATABASE_URL) not configured");
    }

    // In serverless, keep pool tiny to avoid connection explosion
    // For Neon pooler/pgbouncer, disable prepared statements.
    const client = postgres(dbUrl, { max: 1, prepare: !isPoolerUrl(dbUrl) });
    db = drizzlePostgres(client, { schema });
  }
  return db;
}

/**
 * Check if database is configured and available
 */
export function isDatabaseConfigured(): boolean {
  return !!getDatabaseUrl();
}

// =============================================================================
// Contract Queries
// =============================================================================

/**
 * Transform database row to app Contract type
 */
function dbRowToContract(row: schema.Contract): AppContract {
  const era = row.eraId ? ERAS[row.eraId] || null : null;

  return {
    address: row.address,
    runtimeBytecode: row.runtimeBytecode,
    creationBytecode: null,
    deployerAddress: row.deployerAddress,
    deploymentTxHash: row.deploymentTxHash,
    deploymentBlock: row.deploymentBlock,
    deploymentTimestamp: row.deploymentTimestamp?.toISOString() || null,
    decompiledCode: row.decompiledCode,
    decompilationSuccess: row.decompilationSuccess || false,
    currentBalanceWei: null,
    transactionCount: null,
    lastStateUpdate: null,
    gasUsed: row.gasUsed,
    gasPrice: row.gasPrice,
    codeSizeBytes: row.codeSizeBytes,
    eraId: row.eraId,
    era,
    heuristics: {
      contractType: (row.contractType as HeuristicContractType) || null,
      confidence: row.confidence || 0.5,
      isProxy: row.isProxy || false,
      hasSelfDestruct: row.hasSelfDestruct || false,
      isErc20Like: row.isErc20Like || false,
      notes: null,
    },
    ensName: null,
    etherscanVerified: !!row.sourceCode,
    etherscanContractName: row.etherscanContractName,
    sourceCode: row.sourceCode,
    abi: row.abi,
    compilerVersion: null,
    tokenName: row.tokenName,
    tokenSymbol: row.tokenSymbol,
    tokenDecimals: row.tokenDecimals,
    tokenLogo: row.tokenLogo,
    tokenTotalSupply: null,
    shortDescription: row.shortDescription,
    description: row.description,
    historicalSummary: row.historicalSummary,
    historicalSignificance: row.historicalSignificance,
    historicalContext: row.historicalContext,
    verificationStatus: row.sourceCode
      ? "verified"
      : row.decompilationSuccess
      ? "decompiled"
      : "bytecode_only",
  };
}

/**
 * Get a single contract by address
 */
export async function getContractByAddress(
  address: string
): Promise<AppContract | null> {
  const database = getDb();
  const result = await database
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.address, address.toLowerCase()))
    .limit(1);

  return result.length > 0 ? dbRowToContract(result[0]) : null;
}

/**
 * Update token metadata fields for a contract (idempotent).
 * Useful for filling in missing DB fields using RPC lookups.
 */
export async function updateContractTokenMetadataFromDb(
  address: string,
  patch: {
    tokenName?: string | null;
    tokenSymbol?: string | null;
    tokenDecimals?: number | null;
    tokenLogo?: string | null;
  }
): Promise<void> {
  const database = getDb();

  const updates: Partial<schema.NewContract> = {
    updatedAt: new Date(),
  };

  if (patch.tokenName !== undefined) updates.tokenName = patch.tokenName;
  if (patch.tokenSymbol !== undefined) updates.tokenSymbol = patch.tokenSymbol;
  if (patch.tokenDecimals !== undefined) updates.tokenDecimals = patch.tokenDecimals;
  if (patch.tokenLogo !== undefined) updates.tokenLogo = patch.tokenLogo;

  // Nothing to update besides updatedAt
  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
}

/**
 * Update runtime bytecode fields for a contract (idempotent).
 * Useful for filling in missing DB fields using RPC `eth_getCode`.
 */
export async function updateContractRuntimeBytecodeFromDb(
  address: string,
  patch: {
    runtimeBytecode?: string | null;
    codeSizeBytes?: number | null;
  }
): Promise<void> {
  const database = getDb();

  const updates: Partial<schema.NewContract> = {
    updatedAt: new Date(),
  };

  if (patch.runtimeBytecode !== undefined) updates.runtimeBytecode = patch.runtimeBytecode;
  if (patch.codeSizeBytes !== undefined) updates.codeSizeBytes = patch.codeSizeBytes;

  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
}

/**
 * Update optional Etherscan-enriched fields for a contract (idempotent).
 */
export async function updateContractEtherscanEnrichmentFromDb(
  address: string,
  patch: {
    deployerAddress?: string | null;
    deploymentTxHash?: string | null;
    deploymentBlock?: number | null;
    deploymentTimestamp?: Date | null;
    etherscanContractName?: string | null;
    abi?: string | null;
    sourceCode?: string | null;
  }
): Promise<void> {
  const database = getDb();

  const updates: Partial<schema.NewContract> = {
    updatedAt: new Date(),
  };

  if (patch.deployerAddress !== undefined) updates.deployerAddress = patch.deployerAddress;
  if (patch.deploymentTxHash !== undefined) updates.deploymentTxHash = patch.deploymentTxHash;
  if (patch.deploymentBlock !== undefined) updates.deploymentBlock = patch.deploymentBlock;
  if (patch.deploymentTimestamp !== undefined) updates.deploymentTimestamp = patch.deploymentTimestamp;
  if (patch.etherscanContractName !== undefined) updates.etherscanContractName = patch.etherscanContractName;
  if (patch.abi !== undefined) updates.abi = patch.abi;
  if (patch.sourceCode !== undefined) updates.sourceCode = patch.sourceCode;

  if (Object.keys(updates).length <= 1) return;

  await database
    .update(schema.contracts)
    .set(updates)
    .where(eq(schema.contracts.address, address.toLowerCase()));
}

// =============================================================================
// People
// =============================================================================

function dbRowToPerson(row: schema.Person): AppPerson {
  return {
    address: row.address,
    name: row.name,
    slug: row.slug,
    role: row.role,
    shortBio: row.shortBio,
    bio: row.bio,
    highlights: (row.highlights as unknown as string[] | null) ?? null,
    websiteUrl: row.websiteUrl,
    wallets: [],
  };
}

async function getWalletsForPersonFromDb(personAddress: string): Promise<Array<{ address: string; label: string | null }>> {
  const database = getDb();
  const rows = await database
    .select({ address: schema.peopleWallets.address, label: schema.peopleWallets.label })
    .from(schema.peopleWallets)
    .where(eq(schema.peopleWallets.personAddress, personAddress.toLowerCase()))
    .orderBy(asc(schema.peopleWallets.label), asc(schema.peopleWallets.address));
  return rows.map((r) => ({ address: r.address, label: r.label }));
}

/**
 * Add a wallet address to a person's wallets if it doesn't already exist.
 * If the address is the person's primary address, it's already in people table, so skip.
 */
export async function addWalletToPersonFromDb(
  personAddress: string,
  walletAddress: string,
  label?: string | null
): Promise<void> {
  const database = getDb();
  const normalizedPerson = personAddress.toLowerCase();
  const normalizedWallet = walletAddress.toLowerCase();
  
  // Skip if this is the person's primary address (it's already in people table)
  if (normalizedPerson === normalizedWallet) return;
  
  // Check if wallet already exists for this person
  const existing = await database
    .select()
    .from(schema.peopleWallets)
    .where(
      and(
        eq(schema.peopleWallets.address, normalizedWallet),
        eq(schema.peopleWallets.personAddress, normalizedPerson)
      )
    )
    .limit(1);
  
  if (existing[0]) return; // Already exists
  
  // Insert the wallet
  await database.insert(schema.peopleWallets).values({
    address: normalizedWallet,
    personAddress: normalizedPerson,
    label: label?.trim() || null,
    createdAt: new Date(),
  } as any);
}

export async function getPersonByAddressFromDb(address: string): Promise<AppPerson | null> {
  const database = getDb();
  const normalized = address.toLowerCase();

  // 1) Primary address match
  const direct = await database
    .select()
    .from(schema.people)
    .where(eq(schema.people.address, normalized))
    .limit(1);
  if (direct[0]) {
    const person = dbRowToPerson(direct[0]);
    person.wallets = await getWalletsForPersonFromDb(person.address);
    return person;
  }

  // 2) Secondary wallet match
  const joined = await database
    .select({ person: schema.people })
    .from(schema.peopleWallets)
    .innerJoin(schema.people, eq(schema.peopleWallets.personAddress, schema.people.address))
    .where(eq(schema.peopleWallets.address, normalized))
    .limit(1);

  if (!joined[0]?.person) return null;
  const person = dbRowToPerson(joined[0].person);
  person.wallets = await getWalletsForPersonFromDb(person.address);
  return person;
}

export async function getPersonBySlugFromDb(slug: string): Promise<AppPerson | null> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.people)
    .where(eq(schema.people.slug, slug))
    .limit(1);
  if (!rows[0]) return null;
  const person = dbRowToPerson(rows[0]);
  person.wallets = await getWalletsForPersonFromDb(person.address);
  return person;
}

/**
 * Get all people for dropdown selection.
 * Returns list sorted by name.
 */
export async function getAllPeopleFromDb(): Promise<Array<{ address: string; name: string; slug: string }>> {
  const database = getDb();
  const rows = await database
    .select({
      address: schema.people.address,
      name: schema.people.name,
      slug: schema.people.slug,
    })
    .from(schema.people)
    .orderBy(asc(schema.people.name));
  return rows;
}

/**
 * Generate a slug from a name: lowercase, special chars removed, spaces to underscores.
 */
export function generateSlugFromName(name: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/-+/g, "_") // Replace hyphens with underscores
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
  
  // Ensure slug is not empty (fallback to a default if all characters were removed)
  if (!slug || slug.length === 0) {
    slug = "person_" + Date.now().toString(36);
  }
  
  return slug;
}

/**
 * Create or update a person.
 * If address exists, updates; otherwise creates new.
 */
export async function upsertPersonFromDb(params: {
  address: string;
  name: string;
  slug?: string | null; // Auto-generated if not provided
  role?: string | null;
  shortBio?: string | null;
  bio?: string | null;
  highlights?: string[] | null;
  websiteUrl?: string | null;
}): Promise<AppPerson> {
  const database = getDb();
  const normalized = params.address.toLowerCase();
  const slug = params.slug?.trim() || generateSlugFromName(params.name);
  
  // Check if person exists
  const existing = await database
    .select()
    .from(schema.people)
    .where(eq(schema.people.address, normalized))
    .limit(1);
  
  if (existing[0]) {
    // Update existing
    await database
      .update(schema.people)
      .set({
        name: params.name.trim(),
        slug: slug,
        role: params.role?.trim() || null,
        shortBio: params.shortBio?.trim() || null,
        bio: params.bio?.trim() || null,
        highlights: params.highlights || null,
        websiteUrl: params.websiteUrl?.trim() || null,
        updatedAt: new Date(),
      } as any)
      .where(eq(schema.people.address, normalized));
  } else {
    // Create new
    await database.insert(schema.people).values({
      address: normalized,
      name: params.name.trim(),
      slug: slug,
      role: params.role?.trim() || null,
      shortBio: params.shortBio?.trim() || null,
      bio: params.bio?.trim() || null,
      highlights: params.highlights || null,
      websiteUrl: params.websiteUrl?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }
  
  // Return the updated/created person
  const result = await database
    .select()
    .from(schema.people)
    .where(eq(schema.people.address, normalized))
    .limit(1);
  
  if (!result[0]) throw new Error("Failed to create/update person");
  
  const person = dbRowToPerson(result[0]);
  person.wallets = await getWalletsForPersonFromDb(person.address);
  return person;
}

export async function searchPeopleFromDb(
  query: string,
  limit = 50
): Promise<UnifiedSearchResult[]> {
  const database = getDb();
  const q = query.trim();
  const pattern = `%${q}%`;

  // Match by name/role/bio, or any wallet address partial match.
  const rows = await database
    .select({
      address: schema.people.address,
      name: schema.people.name,
      slug: schema.people.slug,
      role: schema.people.role,
      shortBio: schema.people.shortBio,
      websiteUrl: schema.people.websiteUrl,
      walletAddress: schema.peopleWallets.address,
    })
    .from(schema.people)
    .leftJoin(schema.peopleWallets, eq(schema.peopleWallets.personAddress, schema.people.address))
    .where(
      or(
        ilike(schema.people.name, pattern),
        ilike(schema.people.role, pattern),
        ilike(schema.people.shortBio, pattern),
        ilike(schema.people.bio, pattern),
        ilike(schema.people.websiteUrl, pattern),
        ilike(schema.peopleWallets.address, pattern),
        ilike(schema.people.slug, pattern)
      )
    )
    .limit(limit);

  // De-dupe by person address (left join can create duplicates).
  const map = new Map<string, UnifiedSearchResult>();
  for (const r of rows) {
    const key = r.address.toLowerCase();
    if (map.has(key)) continue;

    const matchType: UnifiedSearchResult["matchType"] =
      r.walletAddress && r.walletAddress.toLowerCase().includes(q.toLowerCase())
        ? "person_wallet"
        : "person_name";

    map.set(key, {
      entityType: "person",
      address: r.address,
      title: r.name,
      subtitle: r.role || r.shortBio || null,
      matchType,
      matchSnippet: r.websiteUrl || null,
      deploymentTimestamp: null,
      eraId: null,
      heuristicContractType: null,
      verificationStatus: null,
      personSlug: r.slug,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Get contracts by era with pagination
 */
export async function getContractsByEra(
  eraId: string,
  limit = 50,
  offset = 0
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.eraId, eraId))
    .orderBy(asc(schema.contracts.deploymentTimestamp))
    .limit(limit)
    .offset(offset);

  return results.map(dbRowToContract);
}

/**
 * Get addresses of contracts marked as featured (for homepage).
 */
export async function getFeaturedAddressesFromDb(): Promise<string[]> {
  const database = getDb();
  const rows = await database
    .select({ address: schema.contracts.address })
    .from(schema.contracts)
    .where(eq(schema.contracts.featured, true));
  return rows.map((r) => r.address);
}

/**
 * Fetch a specific set of contracts by address.
 * Returned array preserves the order of the input addresses.
 */
export async function getContractsByAddressesFromDb(
  addresses: string[]
): Promise<AppContract[]> {
  const normalized = addresses.map((a) => a.toLowerCase());
  const database = getDb();

  if (normalized.length === 0) return [];

  const results = await database
    .select()
    .from(schema.contracts)
    .where(inArray(schema.contracts.address, normalized));

  const map = new Map(results.map((r) => [r.address.toLowerCase(), r]));
  return normalized
    .map((a) => map.get(a))
    .filter((r): r is schema.Contract => !!r)
    .map(dbRowToContract);
}

export async function getHistoricalLinksForContractFromDb(
  address: string,
  limit = 50
): Promise<HistoricalLink[]> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.historicalLinks)
    .where(eq(schema.historicalLinks.contractAddress, address.toLowerCase()))
    .orderBy(desc(schema.historicalLinks.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    contractAddress: r.contractAddress,
    title: r.title,
    url: r.url,
    source: r.source,
    note: r.note,
    createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

// =============================================================================
// Historians (auth)
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
  };
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
 * Check and promote historian to trusted status if they have 30+ edits
 * Returns true if promoted, false otherwise
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
  
  // Count edits
  const editCount = await getEditCountForHistorianFromDb(historianId);
  
  // If >= 30 edits and not manually blocked, promote
  // At this point, trustedOverride is either null (auto) or true (manual trusted)
  if (editCount >= 30) {
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

// =============================================================================
// History editing helpers
// =============================================================================

export async function updateContractHistoryFieldsFromDb(
  address: string,
  patch: {
    etherscanContractName?: string | null;
    tokenName?: string | null;
    contractType?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    historicalSummary?: string | null;
    historicalSignificance?: string | null;
    historicalContext?: string | null;
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
  if (patch.shortDescription !== undefined) {
    updates.shortDescription = patch.shortDescription;
    hasFieldUpdates = true;
  }
  if (patch.description !== undefined) {
    updates.description = patch.description;
    hasFieldUpdates = true;
  }
  if (patch.historicalSummary !== undefined) {
    updates.historicalSummary = patch.historicalSummary;
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
 * Get top editors by edit count.
 * Returns historian name, total edit count, and count of new pages (first edits).
 */
export async function getTopEditorsFromDb(limit = 10): Promise<Array<{ historianId: number; name: string; editCount: number; newPagesCount: number }>> {
  const database = getDb();
  
  // Use Drizzle query builder for consistency, with sql template for the complex correlated subquery
  // The subquery identifies first edits by checking if edited_at is the minimum for that contract+historian pair
  const results = await database
    .select({
      historianId: schema.contractEdits.historianId,
      name: schema.historians.name,
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
    .groupBy(schema.contractEdits.historianId, schema.historians.name)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
  
  return results.map(r => ({
    historianId: r.historianId,
    name: r.name,
    editCount: r.editCount,
    newPagesCount: r.newPagesCount,
  }));
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
  
  const result = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.contractEdits)
    .where(eq(schema.contractEdits.contractAddress, normalized))
    .limit(1);
  
  return (result[0]?.count ?? 0) === 0;
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

export async function updateContractTokenLogoFromDb(
  address: string,
  tokenLogo: string | null
): Promise<void> {
  await updateContractTokenMetadataFromDb(address, { tokenLogo });
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

export async function getContractMetadataFromDb(
  address: string,
  limit = 200
): Promise<ContractMetadataItem[]> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.contractMetadata)
    .where(eq(schema.contractMetadata.contractAddress, address.toLowerCase()))
    .orderBy(asc(schema.contractMetadata.key), desc(schema.contractMetadata.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    contractAddress: r.contractAddress,
    key: r.key,
    value: r.value,
    jsonValue: (r.jsonValue as unknown) ?? null,
    sourceUrl: r.sourceUrl,
    createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

export async function getContractMetadataJsonValueByKeyFromDb(
  address: string,
  key: string
): Promise<unknown | null> {
  const database = getDb();
  const rows = await database
    .select({ jsonValue: schema.contractMetadata.jsonValue })
    .from(schema.contractMetadata)
    .where(
      and(
        eq(schema.contractMetadata.contractAddress, address.toLowerCase()),
        eq(schema.contractMetadata.key, key)
      )
    )
    .orderBy(desc(schema.contractMetadata.createdAt))
    .limit(1);

  return (rows[0]?.jsonValue as unknown) ?? null;
}

export async function setContractMetadataJsonValueByKeyFromDb(
  address: string,
  key: string,
  jsonValue: unknown,
  sourceUrl: string | null = null
): Promise<void> {
  const database = getDb();
  const normalized = address.toLowerCase();

  // Ensure we only keep one row per (contract, key)
  await database
    .delete(schema.contractMetadata)
    .where(
      and(
        eq(schema.contractMetadata.contractAddress, normalized),
        eq(schema.contractMetadata.key, key)
      )
    );

  await database.insert(schema.contractMetadata).values({
    contractAddress: normalized,
    key,
    value: null,
    jsonValue: jsonValue as any,
    sourceUrl,
    createdAt: new Date(),
  });
}

/**
 * Get most recently deployed contracts
 */
export async function getRecentContractsFromDb(
  limit = 10
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .orderBy(desc(schema.contracts.deploymentTimestamp))
    .limit(limit);

  return results.map(dbRowToContract);
}

/**
 * Get contracts by deployer address
 */
export async function getContractsByDeployerFromDb(
  deployerAddress: string,
  limit = 200
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.deployerAddress, deployerAddress.toLowerCase()))
    .orderBy(desc(schema.contracts.deploymentTimestamp))
    .limit(limit);

  return results.map(dbRowToContract);
}

/**
 * Search contracts in decompiled code
 */
export async function searchDecompiledCode(
  query: string,
  limit = 20,
  offset = 0
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(
      and(
        eq(schema.contracts.decompilationSuccess, true),
        ilike(schema.contracts.decompiledCode, `%${query}%`)
      )
    )
    .orderBy(asc(schema.contracts.deploymentTimestamp))
    .limit(limit)
    .offset(offset);

  return results.map(dbRowToContract);
}

/**
 * Unified text search across:
 * - address (partial)
 * - contract name (etherscan_contract_name)
 * - token name/symbol
 * - decompiled code
 * - verified source code
 * - abi
 *
 * Pagination: limit + offset. Callers can use limit+1 to determine "hasMore".
 */
export async function searchUnifiedFromDb(
  query: string,
  limit = 20,
  offset = 0
): Promise<UnifiedSearchResult[]> {
  const database = getDb();
  const q = query.trim();
  const pattern = `%${q}%`;
  const qLower = q.toLowerCase();

  const matchTypeExpr = sql<UnifiedMatchType>`CASE
    WHEN ${schema.contracts.address} ILIKE ${pattern} THEN 'address'
    WHEN ${schema.contracts.tokenName} ILIKE ${pattern} THEN 'token_name'
    WHEN ${schema.contracts.tokenSymbol} ILIKE ${pattern} THEN 'token_symbol'
    WHEN ${schema.contracts.etherscanContractName} ILIKE ${pattern} THEN 'contract_name'
    WHEN ${schema.contracts.decompiledCode} ILIKE ${pattern} THEN 'decompiled_code'
    WHEN ${schema.contracts.sourceCode} ILIKE ${pattern} THEN 'source_code'
    WHEN ${schema.contracts.abi} ILIKE ${pattern} THEN 'abi'
    ELSE 'address'
  END`;

  const matchRankExpr = sql<number>`CASE
    WHEN ${schema.contracts.tokenName} ILIKE ${pattern} THEN 1
    WHEN ${schema.contracts.tokenSymbol} ILIKE ${pattern} THEN 2
    WHEN ${schema.contracts.etherscanContractName} ILIKE ${pattern} THEN 3
    WHEN ${schema.contracts.decompiledCode} ILIKE ${pattern} THEN 4
    WHEN ${schema.contracts.sourceCode} ILIKE ${pattern} THEN 5
    WHEN ${schema.contracts.abi} ILIKE ${pattern} THEN 6
    WHEN ${schema.contracts.address} ILIKE ${pattern} THEN 7
    ELSE 99
  END`;

  const snippetExpr = sql<string | null>`CASE
    WHEN ${schema.contracts.tokenName} ILIKE ${pattern} THEN ${schema.contracts.tokenName}
    WHEN ${schema.contracts.tokenSymbol} ILIKE ${pattern} THEN ${schema.contracts.tokenSymbol}
    WHEN ${schema.contracts.etherscanContractName} ILIKE ${pattern} THEN ${schema.contracts.etherscanContractName}
    WHEN ${schema.contracts.decompiledCode} ILIKE ${pattern} THEN substring(${schema.contracts.decompiledCode} from greatest(strpos(lower(${schema.contracts.decompiledCode}), ${qLower}) - 40, 1) for 140)
    WHEN ${schema.contracts.sourceCode} ILIKE ${pattern} THEN substring(${schema.contracts.sourceCode} from greatest(strpos(lower(${schema.contracts.sourceCode}), ${qLower}) - 40, 1) for 140)
    WHEN ${schema.contracts.abi} ILIKE ${pattern} THEN substring(${schema.contracts.abi} from greatest(strpos(lower(${schema.contracts.abi}), ${qLower}) - 40, 1) for 140)
    WHEN ${schema.contracts.address} ILIKE ${pattern} THEN ${schema.contracts.address}
    ELSE NULL
  END`;

  const rows = await database
    .select({
      address: schema.contracts.address,
      deploymentTimestamp: schema.contracts.deploymentTimestamp,
      eraId: schema.contracts.eraId,
      contractType: schema.contracts.contractType,
      tokenName: schema.contracts.tokenName,
      tokenSymbol: schema.contracts.tokenSymbol,
      etherscanContractName: schema.contracts.etherscanContractName,
      hasSourceCode: sql<boolean>`(${schema.contracts.sourceCode} is not null and length(${schema.contracts.sourceCode}) > 0)`,
      decompilationSuccess: schema.contracts.decompilationSuccess,
      matchType: matchTypeExpr,
      matchSnippet: snippetExpr,
      matchRank: matchRankExpr,
    })
    .from(schema.contracts)
    .where(
      or(
        ilike(schema.contracts.address, pattern),
        ilike(schema.contracts.tokenName, pattern),
        ilike(schema.contracts.tokenSymbol, pattern),
        ilike(schema.contracts.etherscanContractName, pattern),
        ilike(schema.contracts.decompiledCode, pattern),
        ilike(schema.contracts.sourceCode, pattern),
        ilike(schema.contracts.abi, pattern)
      )
    )
    .orderBy(asc(matchRankExpr), asc(schema.contracts.deploymentTimestamp), asc(schema.contracts.address))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => {
    const title =
      r.tokenName ||
      r.etherscanContractName ||
      (r.tokenSymbol ? `Token ${r.tokenSymbol}` : `Contract ${r.address.slice(0, 10)}...`);

    const subtitleParts: string[] = [];
    if (r.tokenSymbol) subtitleParts.push(r.tokenSymbol);
    if (r.etherscanContractName && r.tokenName && r.etherscanContractName !== r.tokenName) {
      subtitleParts.push(`Etherscan: ${r.etherscanContractName}`);
    }
    const subtitle = subtitleParts.length ? subtitleParts.join(" • ") : null;

    return {
      entityType: "contract",
      address: r.address,
      title,
      subtitle,
      matchType: r.matchType,
      matchSnippet: r.matchSnippet ? String(r.matchSnippet).replace(/\s+/g, " ").trim() : null,
      deploymentTimestamp: r.deploymentTimestamp?.toISOString() || null,
      eraId: r.eraId,
      heuristicContractType: (r.contractType as HeuristicContractType) || null,
      verificationStatus: r.hasSourceCode
        ? "verified"
        : r.decompilationSuccess
        ? "decompiled"
        : "bytecode_only",
      personSlug: null,
    };
  });
}

/**
 * Get total contract count
 */
export async function getTotalContractCount(): Promise<number> {
  const database = getDb();
  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.contracts);
  return Number(result[0]?.count ?? 0);
}

/**
 * Get decompiled contract count
 */
export async function getDecompiledContractCount(): Promise<number> {
  const database = getDb();
  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.contracts)
    .where(eq(schema.contracts.decompilationSuccess, true));
  return Number(result[0]?.count ?? 0);
}

/**
 * Get featured contracts (oldest with successful decompilation and known type)
 */
export async function getFeaturedContracts(
  limit = 6
): Promise<AppContract[]> {
  const database = getDb();
  const results = await database
    .select()
    .from(schema.contracts)
    .where(
      and(
        eq(schema.contracts.decompilationSuccess, true),
        isNotNull(schema.contracts.contractType),
        ne(schema.contracts.contractType, "unknown")
      )
    )
    .orderBy(asc(schema.contracts.deploymentTimestamp))
    .limit(limit);

  return results.map(dbRowToContract);
}

// =============================================================================
// Similarity Queries
// =============================================================================

/**
 * Get similar contracts from pre-computed index
 */
export async function getSimilarContractsFromDb(
  address: string,
  limit = 10
): Promise<ContractSimilarity[]> {
  const database = getDb();

  const results = await database
    .select()
    .from(schema.similarityIndex)
    .where(eq(schema.similarityIndex.contractAddress, address.toLowerCase()))
    .orderBy(desc(schema.similarityIndex.similarityScore))
    .limit(limit);

  // Get matched contract details
  const matchedAddresses = results.map((r) => r.matchedAddress);
  const matchedContracts =
    matchedAddresses.length > 0
      ? await database
          .select()
          .from(schema.contracts)
          .where(inArray(schema.contracts.address, matchedAddresses))
      : [];

  const contractMap = new Map(matchedContracts.map((c) => [c.address, c]));

  return results.map((row) => {
    const matched = contractMap.get(row.matchedAddress);
    return {
      contractAddress: row.contractAddress,
      matchedAddress: row.matchedAddress,
      similarityScore: row.similarityScore,
      ngramSimilarity: row.ngramSimilarity || 0,
      controlFlowSimilarity: row.controlFlowSimilarity || 0,
      shapeSimilarity: row.shapeSimilarity || 0,
      similarityType: (row.similarityType ||
        "weak") as ContractSimilarity["similarityType"],
      confidenceScore: Math.round(row.similarityScore * 100),
      explanation: row.explanation || "",
      sharedPatterns: row.sharedPatterns
        ? JSON.parse(row.sharedPatterns)
        : [],
      matchedContract: matched
        ? {
            deploymentTimestamp:
              matched.deploymentTimestamp?.toISOString() || null,
            deployerAddress: matched.deployerAddress,
            heuristicContractType:
              (matched.contractType as HeuristicContractType) || null,
            eraId: matched.eraId,
          }
        : undefined,
    };
  });
}

// =============================================================================
// Batch Operations (for imports)
// =============================================================================

/**
 * Insert contracts in batches
 */
export async function insertContracts(
  contracts: schema.NewContract[]
): Promise<void> {
  const database = getDb();
  const batchSize = 100;

  for (let i = 0; i < contracts.length; i += batchSize) {
    const batch = contracts.slice(i, i + batchSize);
    await database.insert(schema.contracts).values(batch).onConflictDoNothing();
  }
}

/**
 * Insert a single contract row if missing (no updates on conflict).
 */
export async function insertContractIfMissing(
  contract: schema.NewContract
): Promise<void> {
  const database = getDb();
  await database.insert(schema.contracts).values(contract).onConflictDoNothing();
}

/**
 * Insert similarity records in batches
 */
export async function insertSimilarityRecords(
  records: schema.NewSimilarityRecord[]
): Promise<void> {
  const database = getDb();
  const batchSize = 100;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await database
      .insert(schema.similarityIndex)
      .values(batch)
      .onConflictDoNothing();
  }
}
