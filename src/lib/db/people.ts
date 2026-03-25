/**
 * People / wallets queries.
 */

import { eq, and, or, asc, ilike } from "drizzle-orm";
import * as schema from "../schema";
import type {
  Person as AppPerson,
  UnifiedSearchResult,
} from "@/types";
import { getDb } from "./connection";

// =============================================================================
// Helpers
// =============================================================================

export function dbRowToPerson(row: schema.Person): AppPerson {
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

export async function getWalletsForPersonFromDb(personAddress: string): Promise<Array<{ address: string; label: string | null }>> {
  const database = getDb();
  const rows = await database
    .select({ address: schema.peopleWallets.address, label: schema.peopleWallets.label })
    .from(schema.peopleWallets)
    .where(eq(schema.peopleWallets.personAddress, personAddress.toLowerCase()))
    .orderBy(asc(schema.peopleWallets.label), asc(schema.peopleWallets.address));
  return rows.map((r) => ({ address: r.address, label: r.label }));
}

// =============================================================================
// Queries
// =============================================================================

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
