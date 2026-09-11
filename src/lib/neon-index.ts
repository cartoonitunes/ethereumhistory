/**
 * Neon-backed contract index — the parallel of `lib/turso.ts`.
 *
 * Every function here answers exactly one of the seven SQL statements the
 * codebase issues against Turso's `contract_index` / `bytecode_families`, and
 * returns the SAME shape the libsql driver returns for it. Callers select
 * between the two implementations with `INDEX_SOURCE` (see lib/index-source).
 *
 * PARITY IS THE WHOLE POINT
 * -------------------------
 * These queries reproduce the Turso behavior literally, including its
 * quirks — the exact-match `era` filter that misses the verbose era spellings
 * the UI never sends, the sort whitelist, the limit clamps, the NULL handling.
 * A difference between the two paths is a migration bug, not an improvement.
 * Behavior changes belong in their own commit, after cutover, where they are
 * visible. See docs/turso-to-neon-index-migration-audit.md (finding E4).
 *
 * TYPE PARITY
 * -----------
 *  - `is_internal` / `is_cracked` come back as numbers (0/1), because callers
 *    test `=== 1` and rely on 0/1 truthiness.
 *  - `value_wei` comes back as a string, verbatim from the source. It can
 *    exceed int64, and ~23.7k of the 12M rows hold a hex string rather than
 *    decimal wei (see migration 090) — so it is a string, never a number.
 *  - counts come back as numbers; postgres.js returns `count(*)` as a string,
 *    so every aggregate below is cast with `::int` / read through `Number()`.
 *
 * ADDRESS CASE
 * ------------
 * `address` and `deployer` are stored lowercase and every caller lowercases
 * before querying, so all lookups use a plain `=`. Wrapping either column in
 * `LOWER()` would turn a primary-key lookup into a 12M-row sequential scan.
 */

import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db-client";

// The row shapes below mirror the `TursoIndexRow` / `TursoFamilyRow`
// interfaces declared at the Turso call sites, so the two paths are
// interchangeable without a cast at the boundary.

export interface IndexRow {
  address: string;
  deployer: string;
  block_number: number;
  timestamp: number;
  bytecode_hash: string | null;
  code_size: number;
  era: string;
  year: number;
  is_internal: number;
  gas_used: number | null;
  value_wei: string | null;
}

export interface FamilyRow {
  sibling_count: number;
  is_cracked: number;
  cracked_address: string | null;
  proof_url: string | null;
}

export interface BrowseIndexRow {
  address: string;
  deployer: string;
  block_number: number;
  timestamp: number;
  bytecode_hash: string | null;
  code_size: number;
  era: string;
  year: number;
  is_internal: number;
}

export interface DeployerIndexRow {
  address: string;
  block_number: number;
  timestamp: number;
  bytecode_hash: string | null;
  code_size: number;
  era: string;
  year: number;
  is_internal: number;
  gas_used: number | null;
}

/** postgres.js returns arrays; drizzle's pg driver returns `{ rows }`. Accept both. */
function rowsOf<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : (((raw as { rows?: T[] }).rows) ?? []);
}

/**
 * `is_internal` and friends are INTEGER columns, but a driver or a future
 * column-type change could hand back a boolean or a numeric string. Normalize
 * at the boundary so `=== 1` at the call sites can never quietly become false.
 */
function toFlag(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function toNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/** NUMERIC arrives as a string from postgres.js; keep it a string either way. */
function toNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

// =============================================================================
// Q1 — resolver: single contract by address
// =============================================================================

/** Mirrors `SELECT * FROM contract_index WHERE address = ?`. */
export async function getIndexRowByAddress(address: string): Promise<IndexRow | null> {
  const db = getDb();
  const raw = await db.execute(sql`
    SELECT address, deployer, block_number, timestamp, bytecode_hash, code_size,
           era, year, is_internal, gas_used, value_wei
    FROM neon_contract_index
    WHERE address = ${address}
    LIMIT 1
  `);
  const row = rowsOf<Record<string, unknown>>(raw)[0];
  if (!row) return null;
  return {
    address: String(row.address),
    deployer: String(row.deployer),
    block_number: toNumber(row.block_number),
    timestamp: toNumber(row.timestamp),
    bytecode_hash: toNullableString(row.bytecode_hash),
    code_size: toNumber(row.code_size),
    era: String(row.era),
    year: toNumber(row.year),
    is_internal: toFlag(row.is_internal),
    gas_used: toNullableNumber(row.gas_used),
    value_wei: toNullableString(row.value_wei),
  };
}

// =============================================================================
// Q2 — resolver: bytecode family
// =============================================================================

/**
 * Mirrors `SELECT sibling_count, is_cracked, cracked_address, proof_url
 * FROM bytecode_families WHERE bytecode_hash = ?`.
 */
export async function getFamilyByHash(bytecodeHash: string): Promise<FamilyRow | null> {
  const db = getDb();
  const raw = await db.execute(sql`
    SELECT sibling_count, is_cracked, cracked_address, proof_url
    FROM neon_bytecode_families
    WHERE bytecode_hash = ${bytecodeHash}
    LIMIT 1
  `);
  const row = rowsOf<Record<string, unknown>>(raw)[0];
  if (!row) return null;
  return {
    sibling_count: toNumber(row.sibling_count),
    is_cracked: toFlag(row.is_cracked),
    cracked_address: toNullableString(row.cracked_address),
    proof_url: toNullableString(row.proof_url),
  };
}

// =============================================================================
// Q3 / Q4 — browse index mode
// =============================================================================

export interface BrowseIndexFilters {
  era: string | null;
  year: number | null;
  deployer: string | null;
  minSize: number | null;
  maxSize: number | null;
  minSiblings: number | null;
  /** "1" → only internal, "0" → only external, anything else → no filter. */
  isInternal: string | undefined;
  /** One of block_asc | block_desc | size_asc | size_desc; anything else → block_asc. */
  sort: string;
  limit: number;
  offset: number;
}

/**
 * Build the WHERE fragment shared by the count and the row query.
 *
 * Values go in as drizzle parameters, never as interpolated text. The only
 * thing that reaches the SQL as an identifier is the sort expression, which is
 * chosen from a fixed whitelist below — that whitelist is the injection guard,
 * exactly as on the Turso side.
 */
function browseConditions(f: BrowseIndexFilters): SQL[] {
  const conditions: SQL[] = [];
  if (f.era) conditions.push(sql`ci.era = ${f.era}`);
  if (f.year && f.year >= 2015 && f.year <= 2030) conditions.push(sql`ci.year = ${f.year}`);
  if (f.deployer) conditions.push(sql`ci.deployer = ${f.deployer}`);
  if (f.minSize !== null) conditions.push(sql`ci.code_size >= ${f.minSize}`);
  if (f.maxSize !== null) conditions.push(sql`ci.code_size <= ${f.maxSize}`);
  if (f.isInternal === "1") conditions.push(sql`ci.is_internal = 1`);
  else if (f.isInternal === "0") conditions.push(sql`ci.is_internal = 0`);
  // NULL bytecode_hash rows get a NULL sibling_count from the LEFT JOIN and are
  // excluded by this comparison — same as SQLite, where NULL >= n is UNKNOWN.
  if (f.minSiblings !== null) conditions.push(sql`bf.sibling_count >= ${f.minSiblings}`);
  return conditions;
}

function browseFrom(f: BrowseIndexFilters): SQL {
  // The join is added only for min_siblings, and is added to BOTH the count and
  // the row query so the two can never disagree about the row set.
  return f.minSiblings !== null
    ? sql`FROM neon_contract_index ci LEFT JOIN neon_bytecode_families bf ON ci.bytecode_hash = bf.bytecode_hash`
    : sql`FROM neon_contract_index ci`;
}

function whereClause(conditions: SQL[]): SQL {
  return conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;
}

function browseOrder(sort: string): SQL {
  switch (sort) {
    case "block_desc": return sql`ci.block_number DESC`;
    case "size_desc": return sql`ci.code_size DESC`;
    case "size_asc": return sql`ci.code_size ASC`;
    default: return sql`ci.block_number ASC`;
  }
}

/** Mirrors the browse `SELECT COUNT(*)`. */
export async function countBrowseIndex(f: BrowseIndexFilters): Promise<number> {
  const db = getDb();
  const conditions = browseConditions(f);

  // An unfiltered count is a 12M-row aggregate on every request. Opt in to
  // serving the cron's precomputed full-index total instead — same number when
  // the cache is fresh, and only ever used when there is no filter at all.
  // Off by default so the turso/neon A/B comparison stays exact.
  if (conditions.length === 0 && process.env.INDEX_COUNT_ESTIMATE === "1") {
    const cached = await getCachedIndexOverall();
    if (cached > 0) return cached;
  }

  const raw = await db.execute(sql`
    SELECT COUNT(*)::bigint AS total ${browseFrom(f)} ${whereClause(conditions)}
  `);
  return Number(rowsOf<{ total: unknown }>(raw)[0]?.total ?? 0);
}

/** Mirrors the browse row `SELECT`. */
export async function listBrowseIndex(f: BrowseIndexFilters): Promise<BrowseIndexRow[]> {
  const db = getDb();
  const raw = await db.execute(sql`
    SELECT ci.address, ci.deployer, ci.block_number, ci.timestamp, ci.bytecode_hash,
           ci.code_size, ci.era, ci.year, ci.is_internal
    ${browseFrom(f)}
    ${whereClause(browseConditions(f))}
    ORDER BY ${browseOrder(f.sort)}
    LIMIT ${f.limit} OFFSET ${f.offset}
  `);
  return rowsOf<Record<string, unknown>>(raw).map((row) => ({
    address: String(row.address),
    deployer: String(row.deployer),
    block_number: toNumber(row.block_number),
    timestamp: toNumber(row.timestamp),
    bytecode_hash: toNullableString(row.bytecode_hash),
    code_size: toNumber(row.code_size),
    era: String(row.era),
    year: toNumber(row.year),
    is_internal: toFlag(row.is_internal),
  }));
}

// =============================================================================
// Q5 / Q6 — deployer pages
// =============================================================================

export interface DeployerFilters {
  deployer: string;
  era: string | null;
  sort: string;
  limit: number;
  offset: number;
}

function deployerConditions(f: DeployerFilters): SQL[] {
  const conditions: SQL[] = [sql`deployer = ${f.deployer}`];
  if (f.era) conditions.push(sql`era = ${f.era}`);
  return conditions;
}

function deployerOrder(sort: string): SQL {
  switch (sort) {
    case "block_desc": return sql`block_number DESC`;
    case "size_desc": return sql`code_size DESC`;
    case "size_asc": return sql`code_size ASC`;
    default: return sql`block_number ASC`;
  }
}

export async function countDeployerContracts(f: DeployerFilters): Promise<number> {
  const db = getDb();
  const raw = await db.execute(sql`
    SELECT COUNT(*)::bigint AS total
    FROM neon_contract_index
    ${whereClause(deployerConditions(f))}
  `);
  return Number(rowsOf<{ total: unknown }>(raw)[0]?.total ?? 0);
}

export async function listDeployerContracts(f: DeployerFilters): Promise<DeployerIndexRow[]> {
  const db = getDb();
  const raw = await db.execute(sql`
    SELECT address, block_number, timestamp, bytecode_hash, code_size, era, year,
           is_internal, gas_used
    FROM neon_contract_index
    ${whereClause(deployerConditions(f))}
    ORDER BY ${deployerOrder(f.sort)}
    LIMIT ${f.limit} OFFSET ${f.offset}
  `);
  return rowsOf<Record<string, unknown>>(raw).map((row) => ({
    address: String(row.address),
    block_number: toNumber(row.block_number),
    timestamp: toNumber(row.timestamp),
    bytecode_hash: toNullableString(row.bytecode_hash),
    code_size: toNumber(row.code_size),
    era: String(row.era),
    year: toNumber(row.year),
    is_internal: toFlag(row.is_internal),
    gas_used: toNullableNumber(row.gas_used),
  }));
}

// =============================================================================
// Q7 — cron: the (era, year) grid
// =============================================================================

export interface IndexGridRow {
  era: string | null;
  year: number | null;
  total: number;
  /**
   * Rows with `is_documented = 1` in this group. The index carries its own
   * documentation flag (sibling propagation + Sourcify), which covers far more
   * of the 12M rows than the editorial `contracts` table does.
   */
  documented: number;
}

/**
 * Mirrors `SELECT era, year, COUNT(*) FROM contract_index GROUP BY era, year`.
 *
 * One pass, giving the overall count and both marginals. NULL era/year still
 * form their own groups, so summing every group is a true COUNT(*).
 */
export async function getIndexGrid(): Promise<IndexGridRow[]> {
  const db = getDb();
  // The documented count rides along in the SAME pass. A second query would
  // double the scan of a 12M-row table for a filter Postgres can evaluate while
  // it is already counting the group.
  const raw = await db.execute(sql`
    SELECT era, year,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE is_documented = 1)::bigint AS documented
    FROM neon_contract_index
    GROUP BY era, year
  `);
  return rowsOf<Record<string, unknown>>(raw).map((row) => ({
    era: row.era === null || row.era === undefined ? null : String(row.era),
    year: row.year === null || row.year === undefined ? null : Number(row.year),
    total: Number(row.total ?? 0),
    documented: Number(row.documented ?? 0),
  }));
}

// =============================================================================
// Helpers
// =============================================================================

/** The active source's cached full-index total, or 0 when it isn't there. */
async function getCachedIndexOverall(): Promise<number> {
  try {
    const { indexScopePrefix } = await import("@/lib/index-source");
    const db = getDb();
    const scope = `${indexScopePrefix()}overall`;
    const raw = await db.execute(sql`
      SELECT total FROM contract_stats_cache WHERE scope = ${scope} LIMIT 1
    `);
    return Number(rowsOf<{ total: unknown }>(raw)[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Whether the Neon index is usable. Mirrors `isTursoConfigured()` at the call
 * sites; Postgres is always configured when the site is, so this only asks
 * whether the database itself is available.
 */
export function isNeonIndexConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}
