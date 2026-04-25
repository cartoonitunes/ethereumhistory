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
  documented: boolean;
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

// In-memory Etherscan cache keyed by deployer address
const etherscanCache = new Map<string, { timestamps: Map<string, string>; expiresAt: number }>();
const ETHERSCAN_CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchDeployTimestamps(deployer: string): Promise<Map<string, string>> {
  const cached = etherscanCache.get(deployer);
  if (cached && cached.expiresAt > Date.now()) return cached.timestamps;

  const apiKey =
    process.env.ETHERSCAN_API_KEY || "8X6AJW9D8XVC4U9ABQWHYF5I7IQBF68CEN";
  const url =
    `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist` +
    `&address=${deployer}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  const json = await res.json() as {
    status: string;
    result: Array<{ to: string; contractAddress: string; timeStamp: string; isError: string }>;
  };

  const timestamps = new Map<string, string>();
  if (json.status === "1" && Array.isArray(json.result)) {
    for (const tx of json.result) {
      if (!tx.to && tx.contractAddress && tx.isError === "0") {
        const addr = tx.contractAddress.toLowerCase();
        const ts = new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString();
        if (!timestamps.has(addr)) timestamps.set(addr, ts);
      }
    }
  }

  etherscanCache.set(deployer, { timestamps, expiresAt: Date.now() + ETHERSCAN_CACHE_TTL_MS });
  return timestamps;
}

export async function getCollectionContractsFromDb(
  addresses: string[],
  deployerAddress: string | null,
  limit = 200
): Promise<CollectionContract[]> {
  if (addresses.length === 0) return [];
  const db = getDb();
  const capped = addresses.slice(0, limit);

  // Fetch deploy timestamps for undocumented contracts (best-effort)
  let etherscanTimestamps = new Map<string, string>();
  if (deployerAddress) {
    try {
      etherscanTimestamps = await fetchDeployTimestamps(deployerAddress);
    } catch {
      // non-fatal: undocumented contracts just won't have timestamps
    }
  }

  // Query Neon for documented contracts only
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

  const docMap = new Map(rows.map((r) => [r.address, r]));

  // Preserve insertion order, merge documented + undocumented
  return capped.map((address) => {
    const doc = docMap.get(address);
    if (doc) {
      return {
        address,
        name: doc.tokenName || doc.etherscanContractName || doc.ensName || null,
        shortDescription: doc.shortDescription,
        deploymentTimestamp:
          doc.deploymentTimestamp?.toISOString() ??
          etherscanTimestamps.get(address) ??
          null,
        eraId: doc.eraId,
        verificationMethod: doc.verificationMethod,
        deploymentRank: doc.deploymentRank,
        tokenSymbol: doc.tokenSymbol,
        documented: true,
      };
    }
    return {
      address,
      name: null,
      shortDescription: null,
      deploymentTimestamp: etherscanTimestamps.get(address) ?? null,
      eraId: null,
      verificationMethod: null,
      deploymentRank: null,
      tokenSymbol: null,
      documented: false,
    };
  });
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
