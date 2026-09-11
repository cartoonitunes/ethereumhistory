/**
 * Which backend serves the 12M-row contract index.
 *
 * `INDEX_SOURCE=neon` switches the browse index mode, the deployer pages, the
 * contract resolver, and the hourly totals cron onto Neon's
 * `neon_contract_index` / `neon_bytecode_families`. Anything else — unset,
 * empty, a typo, the literal "turso" — keeps today's Turso path.
 *
 * The default is deliberately the fail-safe direction: a misconfigured or
 * missing env var must never silently move traffic onto the new backend.
 */
export type IndexSource = "turso" | "neon";

export function getIndexSource(): IndexSource {
  return process.env.INDEX_SOURCE?.trim().toLowerCase() === "neon" ? "neon" : "turso";
}

export function isNeonIndex(): boolean {
  return getIndexSource() === "neon";
}

/**
 * Scope prefix used inside `contract_stats_cache` for full-index totals.
 *
 * The prefix follows the flag so the cron writes and the readers agree without
 * a second switch: in turso mode both sides use `turso:*` (exactly the rows
 * that exist today), in neon mode both use `index:*`. Rolling the flag back
 * finds the `turso:*` rows still present — nothing is ever deleted from that
 * table.
 */
export function indexScopePrefix(source: IndexSource = getIndexSource()): string {
  return source === "neon" ? "index:" : "turso:";
}

/**
 * Whether the active index backend can be queried at all.
 *
 * The contract page and `/api/contract/[address]` gate their Layer 2/3 fallback
 * on this: without an index there is no way to tell a self-destructed archived
 * contract from an address that never held code, so they must not pretend to
 * answer. In turso mode this is the original `TURSO_DATABASE_URL` check; in
 * neon mode it is the Postgres URL, which is present whenever the site runs.
 */
export function isIndexConfigured(): boolean {
  return isNeonIndex()
    ? !!(process.env.POSTGRES_URL || process.env.DATABASE_URL)
    : !!process.env.TURSO_DATABASE_URL;
}
