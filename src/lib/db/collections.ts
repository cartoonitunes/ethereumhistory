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

/** A collection is anchored on a person, or on a bare deployer address. */
export type CollectionAnchor = Pick<Collection, "deployerAddress" | "personAddress"> & {
  contractAddresses?: string[] | null;
};

// `address = ANY(...)` stops using the primary key index once the list gets
// long, so address lookups are issued in batches this size.
const ADDRESS_BATCH_SIZE = 200;
const MAX_COLLECTION_CONTRACTS = 5000;
const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;

function toRows<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : ((raw as { rows?: T[] }).rows ?? []);
}

function normalizeAddresses(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const addr = value.toLowerCase();
    if (ADDRESS_PATTERN.test(addr)) seen.add(addr);
  }
  return [...seen];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const contractColumns = {
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
};

type ContractRow = {
  address: string;
  tokenName: string | null;
  etherscanContractName: string | null;
  ensName: string | null;
  shortDescription: string | null;
  deploymentTimestamp: Date | null;
  eraId: string | null;
  verificationMethod: string | null;
  deploymentRank: number | null;
  tokenSymbol: string | null;
};

/** Oldest first, undated last — the order the collections were seeded in. */
function compareContractRows(a: ContractRow, b: ContractRow): number {
  const aTime = a.deploymentTimestamp?.getTime() ?? Number.POSITIVE_INFINITY;
  const bTime = b.deploymentTimestamp?.getTime() ?? Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  const aRank = a.deploymentRank ?? Number.POSITIVE_INFINITY;
  const bRank = b.deploymentRank ?? Number.POSITIVE_INFINITY;
  if (aRank !== bRank) return aRank - bRank;
  return a.address.localeCompare(b.address);
}

/**
 * Every wallet address a collection draws contracts from: the deployer address
 * named on the collection, the person it is linked to, and every other wallet
 * that person owns. Adding a wallet to a person therefore widens their
 * collection on the next request — no migration or backfill needed.
 *
 * The anchor may be a person's primary address or one of their secondary
 * wallets, so both directions of the people/people_wallets link are followed.
 */
export async function getCollectionWalletAddressesFromDb(
  anchor: CollectionAnchor
): Promise<string[]> {
  const seeds = normalizeAddresses([anchor.personAddress, anchor.deployerAddress]);
  if (seeds.length === 0) return [];

  const db = getDb();
  const seedValues = sql.join(
    seeds.map((s) => sql`${s}`),
    sql`, `
  );
  const raw = await db.execute<{ address: string }>(sql`
    WITH seeds AS (
      SELECT unnest(ARRAY[${seedValues}]::text[]) AS address
    ),
    persons AS (
      SELECT p.address FROM people p JOIN seeds s ON p.address = s.address
      UNION
      SELECT w.person_address FROM people_wallets w JOIN seeds s ON w.address = s.address
    )
    SELECT address FROM seeds
    UNION
    SELECT address FROM persons
    UNION
    SELECT w.address FROM people_wallets w JOIN persons pr ON w.person_address = pr.address
  `);

  return normalizeAddresses(toRows<{ address: string }>(raw).map((r) => r.address));
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
    // The stored array is kept in sync with the live attribution by
    // refreshCollectionsForPersonFromDb, and holds only addresses that have a
    // row in `contracts` — so it counts exactly what the page will render.
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

/** Best-effort deploy timestamps across every wallet of the collection. */
async function fetchDeployTimestampsForWallets(
  wallets: string[]
): Promise<Map<string, string>> {
  const merged = new Map<string, string>();
  const results = await Promise.all(
    wallets.map((w) => fetchDeployTimestamps(w).catch(() => new Map<string, string>()))
  );
  for (const map of results) {
    for (const [addr, ts] of map) if (!merged.has(addr)) merged.set(addr, ts);
  }
  return merged;
}

/** Contracts attributed to any of the given wallet addresses. */
async function selectContractsByDeployers(
  wallets: string[],
  limit: number
): Promise<ContractRow[]> {
  if (wallets.length === 0) return [];
  const db = getDb();
  return (await db
    .select(contractColumns)
    .from(schema.contracts)
    .where(inArray(schema.contracts.deployerAddress, wallets))
    .orderBy(
      sql`${schema.contracts.deploymentTimestamp} ASC NULLS LAST`,
      sql`${schema.contracts.deploymentRank} ASC NULLS LAST`,
      schema.contracts.address
    )
    .limit(limit)) as ContractRow[];
}

/** Contracts by explicit address, batched to keep the index scan. */
async function selectContractsByAddresses(
  addresses: string[],
  limit: number
): Promise<ContractRow[]> {
  if (addresses.length === 0) return [];
  const db = getDb();
  const rows: ContractRow[] = [];
  for (const batch of chunk(addresses, ADDRESS_BATCH_SIZE)) {
    const found = (await db
      .select(contractColumns)
      .from(schema.contracts)
      .where(inArray(schema.contracts.address, batch))) as ContractRow[];
    rows.push(...found);
    if (rows.length >= limit) break;
  }
  return rows;
}

/**
 * Resolve a collection's contracts from live attribution: everything deployed by
 * (or attributed to) any wallet of the collection's person, plus any curated
 * address stored on the collection itself.
 *
 * Only rows that exist in `contracts` are returned. An address with no row has
 * no page to link to — those previously rendered as dark cards pointing at
 * Contract Not Found.
 */
async function resolveCollectionRows(
  collection: CollectionAnchor,
  limit: number
): Promise<{ rows: ContractRow[]; wallets: string[] }> {
  const wallets = await getCollectionWalletAddressesFromDb(collection);
  const byDeployer = await selectContractsByDeployers(wallets, limit);

  // Curated addresses are normally a subset of what the wallets already
  // resolve, so this second lookup usually has nothing left to do.
  const seen = new Set(byDeployer.map((r) => r.address));
  const leftover = normalizeAddresses(collection.contractAddresses ?? []).filter(
    (a) => !seen.has(a)
  );
  const byAddress = await selectContractsByAddresses(leftover, limit);

  const rows = [...byDeployer, ...byAddress].sort(compareContractRows).slice(0, limit);
  return { rows, wallets };
}

export async function getCollectionContractsFromDb(
  collection: CollectionAnchor,
  limit = 200
): Promise<CollectionContract[]> {
  const { rows, wallets } = await resolveCollectionRows(collection, limit);
  if (rows.length === 0) return [];

  // Rows imported without a deployment timestamp still get a date on the card.
  let etherscanTimestamps = new Map<string, string>();
  if (rows.some((r) => !r.deploymentTimestamp) && wallets.length > 0) {
    try {
      etherscanTimestamps = await fetchDeployTimestampsForWallets(wallets);
    } catch {
      // non-fatal: those cards just won't show a date
    }
  }

  return rows.map((row) => {
    const name = row.tokenName || row.etherscanContractName || row.ensName || null;
    return {
      address: row.address,
      name,
      shortDescription: row.shortDescription,
      deploymentTimestamp:
        row.deploymentTimestamp?.toISOString() ??
        etherscanTimestamps.get(row.address) ??
        null,
      eraId: row.eraId,
      verificationMethod: row.verificationMethod,
      deploymentRank: row.deploymentRank,
      tokenSymbol: row.tokenSymbol,
      // "Documented" means there is something written up to show. Archived
      // contracts nobody has described yet still render — as a prompt to
      // document them — and still link to a real page.
      documented: Boolean(name || row.shortDescription),
    };
  });
}

/**
 * The collection a contract belongs to, for the badge on the contract page.
 * Matches the stored address array, and also matches by attribution so a newly
 * attributed contract is badged before the array is next refreshed.
 */
export async function getCollectionForContractFromDb(
  address: string
): Promise<{ slug: string; title: string } | null> {
  const db = getDb();
  const addr = address.toLowerCase();

  const raw = await db.execute<{ slug: string; title: string }>(sql`
    WITH target AS (
      SELECT lower(deployer_address) AS deployer FROM contracts WHERE address = ${addr}
    ),
    persons AS (
      SELECT p.address FROM people p JOIN target t ON p.address = t.deployer
      UNION
      SELECT w.person_address FROM people_wallets w JOIN target t ON w.address = t.deployer
    ),
    anchors AS (
      SELECT deployer AS address FROM target WHERE deployer IS NOT NULL
      UNION
      SELECT address FROM persons
      UNION
      SELECT w.address FROM people_wallets w JOIN persons pr ON w.person_address = pr.address
    )
    SELECT c.slug, c.title
    FROM collections c
    WHERE c.contract_addresses @> ARRAY[${addr}]::text[]
       OR lower(c.deployer_address) IN (SELECT address FROM anchors)
       OR lower(c.person_address)   IN (SELECT address FROM anchors)
    ORDER BY c.id
    LIMIT 1
  `);

  return toRows<{ slug: string; title: string }>(raw)[0] ?? null;
}

/**
 * Rewrite the stored `contract_addresses` of every collection belonging to a
 * person, from the live attribution of that person's wallets. Addresses with no
 * row in `contracts` are dropped.
 *
 * The collection page resolves its grid live, so this is only the stored copy —
 * used for the contract count on the collections index and for the collection
 * badge on contract pages. Called whenever a wallet is added to a person or a
 * contract is re-attributed. Returns the collections that changed.
 */
export async function refreshCollectionsForPersonFromDb(
  personAddress: string
): Promise<string[]> {
  const [seed] = normalizeAddresses([personAddress]);
  if (!seed) return [];

  const db = getDb();
  const collections = await db
    .select({
      id: schema.collections.id,
      slug: schema.collections.slug,
      deployerAddress: schema.collections.deployerAddress,
      personAddress: schema.collections.personAddress,
      contractAddresses: schema.collections.contractAddresses,
    })
    .from(schema.collections);

  // Wallets of the person being refreshed, used to pick out their collections.
  const personWallets = new Set(
    await getCollectionWalletAddressesFromDb({
      personAddress: seed,
      deployerAddress: seed,
    })
  );

  const updated: string[] = [];
  for (const collection of collections) {
    const anchors = normalizeAddresses([
      collection.personAddress,
      collection.deployerAddress,
    ]);
    if (!anchors.some((a) => personWallets.has(a))) continue;

    const { rows } = await resolveCollectionRows(collection, MAX_COLLECTION_CONTRACTS);
    const addresses = rows.map((r) => r.address);
    const current = collection.contractAddresses ?? [];
    const unchanged =
      current.length === addresses.length &&
      current.every((addr, i) => addr === addresses[i]);
    if (unchanged) continue;

    await db
      .update(schema.collections)
      .set({ contractAddresses: addresses, updatedAt: new Date() })
      .where(eq(schema.collections.id, collection.id));
    updated.push(collection.slug);
  }

  return updated;
}
