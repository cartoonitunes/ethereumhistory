# Index migration: validation checklist

Run this before flipping `INDEX_SOURCE=neon` in production, and again right
after. Nothing here writes to production data.

`scripts/validate-index-migration.mjs` automates step 4; the rest are checks a
person has to look at.

---

## 0. Preconditions

- [ ] Migration 089 applied: `npm run db:migrate -- --only 089_neon_contract_index.sql`
- [ ] Migration 090 applied: `npm run db:migrate -- --only 090_neon_index_value_wei_format.sql`
      (turns `value_wei` into TEXT and adds `value_wei_decimal` — required, see
      the note on the dual upstream format below)
- [ ] Tables exist and are non-empty:
      `SELECT count(*) FROM neon_contract_index;` → expect ~12,047,134
      `SELECT count(*) FROM neon_bytecode_families;` → expect ~180,690
- [ ] Row counts agree with the source SQLite (`enriched_index.db`) to the row.
- [ ] `ANALYZE neon_contract_index; ANALYZE neon_bytecode_families;` has run —
      without stats the planner will seq-scan and every timing below is meaningless.
- [ ] Database size checked after the load (`\l+` or the Neon console) and the
      new monthly cost accepted. Estimate: +6–8 GB ≈ +$2–3/month.

## 1. Data integrity (run against Neon, compare to the SQLite source)

Automated: `node scripts/validate-neon-index-load.mjs` runs every check in this
section plus a 400-row × 32-column row-level diff. Exit 0 = all matched. The
manual list below is what it asserts, for when you want to eyeball one.


- [ ] `SELECT count(*) FROM neon_contract_index WHERE address <> lower(address);` → **0**
- [ ] `SELECT count(*) FROM neon_contract_index WHERE deployer <> lower(deployer);` → **0**
- [ ] `SELECT count(*) FROM neon_contract_index WHERE length(address) <> 42;` → **0**
- [ ] `SELECT count(*) FROM neon_contract_index WHERE bytecode_hash IS NOT NULL AND length(bytecode_hash) <> 32;` → **0**
- [ ] `SELECT count(*) FROM neon_contract_index WHERE bytecode_hash IS NULL;` → ~2,132,770
- [ ] `value_wei` dual format preserved:
      `SELECT count(*) FROM neon_contract_index WHERE value_wei LIKE '0x%';` → **23,729**
      (these are hex in the source and must stay hex — see migration 090)
- [ ] `SELECT count(*) FROM neon_contract_index WHERE value_wei IS NOT NULL AND value_wei_decimal IS NULL;` → **0**
- [ ] `SELECT count(*) FROM neon_contract_index WHERE value_wei NOT LIKE '0x%' AND value_wei_decimal::text <> value_wei;` → **0**
- [ ] `SELECT era, count(*) FROM neon_contract_index GROUP BY era ORDER BY 2 DESC;`
      matches the SQLite distribution — in particular `byzantium` ~9.94M,
      `spurious-dragon` ~1.89M, `dao-fork` ~101,098, `frontier-thawing` ~13,149,
      `frontier` ~1,299, `unknown` 86, `constantinople` 26
- [ ] `SELECT year, count(*) FROM neon_contract_index GROUP BY year ORDER BY 1;`
      matches — including the oddities: `year = 0` (3 rows) and 2019–2026 (~109)
- [ ] `SELECT count(*) FROM neon_bytecode_families WHERE is_cracked = 1;` → **803**
- [ ] Referential sanity: every cracked family's `cracked_address` resolves —
      `SELECT count(*) FROM neon_bytecode_families f WHERE f.is_cracked = 1
       AND NOT EXISTS (SELECT 1 FROM neon_contract_index c WHERE c.address = f.cracked_address);`
      Investigate any non-zero result before cutover.
- [ ] Spot-check 10 addresses end to end: same row in SQLite and Neon, every column.

## 2. Query plans (no seq scans on the hot paths)

Run each with `EXPLAIN (ANALYZE, BUFFERS)` and confirm an index scan, not a
sequential scan:

- [ ] `WHERE address = '0x…'` → Index Scan on `neon_contract_index_pkey`
- [ ] `WHERE deployer = '0x…' ORDER BY block_number` → `neon_contract_index_deployer_block_idx`
- [ ] `WHERE deployer = '0x…' AND era = 'byzantium'` → `neon_contract_index_deployer_era_idx`
- [ ] `WHERE era = 'byzantium' ORDER BY block_number LIMIT 24` → `neon_contract_index_era_block_idx`
- [ ] `WHERE year = 2016 ORDER BY block_number LIMIT 24` → `neon_contract_index_year_block_idx`
- [ ] `WHERE bytecode_hash = '…'` → `neon_contract_index_bytecode_hash_idx`
- [ ] `GROUP BY era, year` → parallel aggregate, and record the wall time. It must
      finish well inside the cron's `maxDuration = 300`.
- [ ] Unfiltered `COUNT(*)` — record the wall time. If it exceeds ~3s, set
      `INDEX_COUNT_ESTIMATE=1` so the no-filter case serves the cron's cached
      total instead (see step 6).

## 2b. Load procedure (for a reload or a second environment)

```bash
# 1. schema
npm run db:migrate -- --only 089_neon_contract_index.sql
npm run db:migrate -- --only 090_neon_index_value_wei_format.sql

# 2. drop the secondary indexes — loading into an indexed table is several times
#    slower and leaves the indexes bloated. The PRIMARY KEY stays, as a
#    duplicate-address tripwire.
psql "$DATABASE_URL_UNPOOLED" -c "DROP INDEX IF EXISTS neon_contract_index_deployer_block_idx, ..."

# 3. load (streams SQLite → COPY, chunked and resumable)
node scripts/load-neon-index.mjs --table bytecode_families
node scripts/load-neon-index.mjs --table contract_index --chunk 100000
#    interrupted? add --resume

# 4. rebuild indexes + ANALYZE
bash scripts/rebuild-neon-index-indexes.sh

# 5. validate
node scripts/validate-neon-index-load.mjs
```

There is deliberately **no intermediate CSV file**. sqlite3's CSV writer emits
both NULL and the empty string as an empty field, so a CSV round-trip cannot tell
them apart — and this index has 2.1M NULL `bytecode_hash` values that must not
arrive as `''`. COPY's text format has a dedicated `\N` NULL marker, so the
loader streams directly and the distinction survives. `validate-neon-index-load.mjs`
asserts both the NULL counts and the empty-string counts for exactly this reason.

## 3. Unit-level parity (already run; re-run if the query layer changes)

These are the harnesses used during development. Both need a throwaway Postgres
loaded with a sample of the enriched SQLite — see the audit doc for the recipe.

- [ ] SQL-level A/B across all 7 queries: **135 assertions, 0 failures**
      (5 cases correctly reported as indeterminate on a tied sort key)
- [ ] Shipped-module tests (`lib/neon-index`, `lib/index-source`): **43 / 43**
- [ ] Cron + stats-cache prefix switching: **16 / 16**, including the guard that
      the progress-widget denominator never reads `index:*` or `turso:*`

## 4. Endpoint parity (automated)

Deploy a staging build with `INDEX_SOURCE=neon` against the same Neon database,
then diff it against production:

```bash
node scripts/validate-index-migration.mjs \
  --turso https://ethereumhistory.com \
  --neon  https://<staging>.vercel.app \
  --deployer 0x<a-deployer-with-many-contracts> \
  --contract 0x<an-index-only-contract> \
  --verbose
```

Covers 55+ cases: browse index mode (pagination, all four sorts, unknown-sort
fallback, sort injection, era, year, is_internal, size band, min_siblings join,
deployer filter, empty results), browse documented/undocumented mode as a
control, deployer pages (sorts, era, limit clamps, uppercase, unknown, invalid),
`/api/stats/progress`, `/api/coverage`, and contract resolution (index-only,
uppercase, invalid, never-deployed).

- [ ] Exit code 0
- [ ] Every `TIED` case is on a `size_asc` / `size_desc` sort — those are
      genuinely undetermined by the query and behave the same way on Turso today
- [ ] The three "(control)" browse cases match exactly — they prove the flag did
      not touch the Neon documented path

## 5. Stats and coverage (the part that can silently misreport)

- [ ] Before cutover, record `/api/stats/progress` → `data.overall` verbatim.
- [ ] After cutover, `data.overall` is **identical**. This number must never move
      as a result of this migration — it divides two counts from Neon's
      `contracts` table and has nothing to do with the index. If it drops from
      ~70% to ~8%, an `index:*` scope has leaked into the denominator.
- [ ] `POST /api/cron/refresh-stats` with the `CRON_SECRET` bearer token, then:
      - [ ] response `data.indexSource` = `"neon"`
      - [ ] response `data.tursoError` is `null`
      - [ ] `SELECT scope, total, updated_at FROM contract_stats_cache WHERE scope LIKE 'index:%';`
            shows fresh rows: `index:overall` ≈ 12,047,134 plus per-era and
            per-year scopes
      - [ ] the pre-existing `turso:*` rows are **still there, untouched**
            (`updated_at` unchanged) — that is the rollback path
      - [ ] the base scopes (`overall`, `era:*`, `year:*`) are unchanged in
            meaning and were refreshed by `refresh_contract_stats_cache()`
- [ ] `/api/coverage` renders. `summary.total` moves from 12,023,046 to
      ~12,047,134 — that is expected (the enriched snapshot is newer, finding
      E7), not a bug. `documented`, `uncovered` and `indexed` must stay in the
      same proportion and none may go negative.
- [ ] `/coverage` page renders, and its OG image (`/coverage/opengraph-image`)
      quotes the same numbers as the API.
- [ ] Homepage progress widget shows the same figures as before.

## 6. Performance under the flag

- [ ] `/browse?mode=index` first page: p95 under ~1.5s
- [ ] `/browse?mode=index` with `min_siblings` set (the LEFT JOIN case)
- [ ] A deployer page for the largest deployer in the index
- [ ] If the unfiltered browse count is slow, set `INDEX_COUNT_ESTIMATE=1` and
      confirm the total still matches the cron's `index:overall`

## 7. Rollback

- [ ] Unset `INDEX_SOURCE` (or set it to `turso`) and redeploy.
- [ ] `/api/coverage` returns to the `turso:*` numbers within one cache TTL
      (up to 1 hour; the in-memory cache key includes the prefix, so a fresh
      instance is immediate).
- [ ] `/browse?mode=index` and the deployer pages serve from Turso again.
- [ ] Nothing needed on the data side — the migration only ever added tables and
      the cron only ever upserts scopes.

## 8. Not covered by this migration (known, deliberate)

- **Finding E4** — era filters on browse index mode and deployer pages send
  canonical ids (`dao`, `tangerine`, `spurious`) that the index does not store,
  so they match 0 rows. Broken today on Turso, still broken on Neon by design;
  fixing it here would have made the A/B diff above meaningless. Fix separately.
- **Tied-sort-key pagination** — `size_asc` / `size_desc` paging can repeat or
  skip rows because the queries have no tiebreaker. Pre-existing on Turso. The
  fix is to append `, address` to those ORDER BY clauses, in its own commit.
- **Loading the data** — this changeset creates the tables; it does not populate
  them.
