import { eq, sql, inArray } from "drizzle-orm";
import * as schema from "../schema";
import { getDb } from "./connection";
import type { Collection } from "../schema";

export interface CollectionSummary {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  deployerAddress: string | null;
  coverImageUrl: string | null;
  contractCount: number;
}

export interface CollectionContract {
  address: string;
  name: string | null;
  shortDescription: string | null;
  deploymentTimestamp: string | null;
  eraId: string | null;
  verificationMethod: string | null;
  deploymentRank: number | null;
  tokenSymbol: string | null;
}

export async function getCollectionsListFromDb(): Promise<CollectionSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.collections.id,
      slug: schema.collections.slug,
      title: schema.collections.title,
      subtitle: schema.collections.subtitle,
      deployerAddress: schema.collections.deployerAddress,
      coverImageUrl: schema.collections.coverImageUrl,
      contractAddresses: schema.collections.contractAddresses,
    })
    .from(schema.collections)
    .orderBy(schema.collections.id);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    deployerAddress: r.deployerAddress,
    coverImageUrl: r.coverImageUrl,
    contractCount: r.contractAddresses?.length ?? 0,
  }));
}

export async function getCollectionBySlugFromDb(
  slug: string
): Promise<Collection | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getCollectionContractsFromDb(
  addresses: string[],
  limit = 200
): Promise<CollectionContract[]> {
  if (addresses.length === 0) return [];
  const db = getDb();
  const capped = addresses.slice(0, limit);
  const rows = await db
    .select({
      address: schema.contracts.address,
      tokenName: schema.contracts.tokenName,
      etherscanContractName: schema.contracts.etherscanContractName,
      ensName: schema.contracts.ensName,
      shortDescription: schema.contracts.shortDescription,
      deploymentTimestamp: schema.contracts.deploymentTimestamp,
      eraId: schema.contracts.eraId,
      verificationMethod: schema.contracts.verificationMethod,
      deploymentRank: schema.contracts.deploymentRank,
      tokenSymbol: schema.contracts.tokenSymbol,
    })
    .from(schema.contracts)
    .where(inArray(schema.contracts.address, capped));

  // Preserve insertion order from `addresses`
  const idx = new Map(capped.map((a, i) => [a, i]));
  rows.sort((a, b) => (idx.get(a.address) ?? 999) - (idx.get(b.address) ?? 999));

  return rows.map((r) => ({
    address: r.address,
    name: r.tokenName || r.etherscanContractName || r.ensName || null,
    shortDescription: r.shortDescription,
    deploymentTimestamp: r.deploymentTimestamp?.toISOString() ?? null,
    eraId: r.eraId,
    verificationMethod: r.verificationMethod,
    deploymentRank: r.deploymentRank,
    tokenSymbol: r.tokenSymbol,
  }));
}

export async function getCollectionForContractFromDb(
  address: string
): Promise<{ slug: string; title: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({ slug: schema.collections.slug, title: schema.collections.title })
    .from(schema.collections)
    .where(sql`${schema.collections.contractAddresses} @> ARRAY[${address}]::text[]`)
    .limit(1);
  return row ?? null;
}
