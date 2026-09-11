# Turso → Neon contract-index migration: audit

**Date:** 2026-09-10
**Author:** Claude (for Julian)
**Status:** Audit complete — code changes follow this document.

Everything in this migration is **additive**. No existing table, column, index,
query, or code path is dropped or altered. The Turso code path stays intact and
stays the default; the new path is reached only when `INDEX_SOURCE=neon`.

---

## 1. Complete surface map

### 1.1 Every file that imports `turso.ts`

| File | What it imports | Why |
|------|-----------------|-----|
| `src/lib/turso.ts` | — | The client itself (lazy proxy over `@libsql/client`). |
| `src/lib/contract-resolver.ts` | `turso` | `resolveContract()` — 2 queries. |
| `src/lib/progress-stats.ts` | `turso`, `isTursoConfigured` | `refreshTursoIndexTotals()` — 1 query (cron only). |
| `src/app/api/browse/route.ts` | `turso`, `isTursoConfigured` | `browseIndex()` — 2 queries. |
| `src/app/api/deployer/[address]/route.ts` | `turso` | Deployer listing — 2 queries. |
| `src/app/api/contract/[address]/route.ts` | `isTursoConfigured` | Gate only — decides whether to attempt the index fallback. |
| `src/app/contract/[address]/page.tsx` | `isTursoConfigured` | Gate only — same decision, SSR side. |

Files that merely mention Turso in a comment (no import): `src/app/page.tsx`,
`src/app/browse/page.tsx`, `src/app/api/stats/progress/route.ts`,
`src/app/api/game/save/route.ts`, `src/lib/coverage-stats.ts`.
`src/app/api/contract/[address]/history/manage/route.ts` imports
`resolveContract` (indirect Turso dependency — 2 call sites).

**Nothing outside `src/` touches Turso.** `scripts/`, `pipeline/`, `db/` have
zero references to `contract_index`, `bytecode_families`, or `libsql`.

### 1.2 Every query against `contract_index` / `bytecode_families`

There are exactly **7 SQL statements** against Turso in the whole codebase.

| # | Location | SQL | Shape returned |
|---|----------|-----|----------------|
| Q1 | `contract-resolver.ts:61` | `SELECT * FROM contract_index WHERE address = ?` | 0–1 row, all 11 base columns |
| Q2 | `contract-resolver.ts:81` | `SELECT sibling_count, is_cracked, cracked_address, proof_url FROM bytecode_families WHERE bytecode_hash = ?` | 0–1 row |
| Q3 | `api/browse/route.ts:205` | `SELECT COUNT(*) as total FROM contract_index ci [LEFT JOIN bytecode_families bf ON ci.bytecode_hash = bf.bytecode_hash] <where>` | 1 row `{total}` |
| Q4 | `api/browse/route.ts:206` | `SELECT ci.address, ci.deployer, ci.block_number, ci.timestamp, ci.bytecode_hash, ci.code_size, ci.era, ci.year, ci.is_internal <from> <where> ORDER BY <expr> LIMIT ? OFFSET ?` | ≤100 rows |
| Q5 | `api/deployer/[address]/route.ts:70` | `SELECT COUNT(*) as total FROM contract_index WHERE deployer = ? [AND era = ?]` | 1 row `{total}` |
| Q6 | `api/deployer/[address]/route.ts:71` | `SELECT address, block_number, timestamp, bytecode_hash, code_size, era, year, is_internal, gas_used FROM contract_index <where> ORDER BY <expr> LIMIT ? OFFSET ?` | ≤200 rows |
| Q7 | `progress-stats.ts:96` | `SELECT era, year, COUNT(*) AS total FROM contract_index GROUP BY era, year` | ~20–40 rows. **Cron only.** Full scan. |

### 1.3 `contract_stats_cache` — how it is populated and read

Table (migration 068): `(scope TEXT PK, total INT, documented INT, updated_at TIMESTAMP)`.

**Two independent writers, into two disjoint scope namespaces:**

1. `refresh_contract_stats_cache()` — a plpgsql function, run by
   `/api/cron/refresh-stats` via `SELECT refresh_contract_stats_cache()`.
   Aggregates **Neon's `contracts` table** into base scopes:
   `overall`, `era:<id>`, `year:<yyyy>`. Writes both `total` and `documented`.
   **This migration does not touch it.**
2. `refreshTursoIndexTotals()` (`progress-stats.ts`) — run by the same cron
   route, right after (1). Aggregates the **Turso `contract_index`** into
   `turso:overall`, `turso:era:<id>`, `turso:year:<yyyy>`. Writes `total` only
   (`documented` is hardcoded 0). **This is the one function the migration
   re-points.**

**Three readers:**

| Reader | Scopes read | Notes |
|--------|-------------|-------|
| `getProgressStats()` (`progress-stats.ts:230`) | base scopes only — **explicitly skips `turso:*`** (line 253) | Homepage widget + `/api/stats/progress`. Denominator deliberately pinned to Neon `contracts`. Must not change. |
| `getIndexTotals()` (`progress-stats.ts:172`) | both; `turso:*` overrides base per-key | Backs `/coverage` (page, OG image, `/api/coverage`). |
| `/api/cron/refresh-stats:73` | all, for the response body | Reporting only. |

**Current live state** (queried 2026-09-10): the `turso:*` scopes were last
written **2026-09-02** — consistent with Turso reads being blocked since. The
base scopes refreshed as recently as 2026-09-10 22:00. So `/coverage` is today
serving 8-day-stale full-index totals, and would fall back to the much smaller
Neon totals for any scope that expired. `turso:overall` = 12,023,046.

Note `turso:*` currently has **no `year:2019+` and no `era:constantinople`
scopes**, while the base scopes do. `getIndexTotals` merges per-key, so
`/coverage` renders those years from Neon totals and the rest from Turso — a
pre-existing mixed-corpus quirk that this migration preserves exactly.

### 1.4 User-facing features that depend on Turso data

| Feature | Route / page | Queries | Behavior if index is unavailable today |
|---------|--------------|---------|----------------------------------------|
| Browse → "Index" mode (12M contracts) | `/browse?mode=index` → `GET /api/browse?source=index` | Q3, Q4 | 503 if `TURSO_DATABASE_URL` unset; 500 on query failure. |
| Deployer page | `/deployer/[address]` → `GET /api/deployer/[address]` | Q5, Q6 | 500 on query failure. No config gate — throws if unset. |
| Contract page, Layer 2/3 fallback | `/contract/[address]` (SSR) and `GET /api/contract/[address]` | Q1, Q2 | Gated on `isTursoConfigured()`. API returns 503 + Retry-After when the resolver throws; SSR falls through to not-found. |
| Documenting an un-promoted contract | `POST /api/contract/[address]/history/manage` | Q1, Q2 (via `resolveContract`) | Both the trusted and untrusted branches promote index-only contracts into Neon. Throws → 500. |
| `/coverage` dashboard + OG image + metadata | `/coverage`, `/api/coverage` | Q7 (indirect, via the cache) | Serves stale/smaller Neon totals; 503 when the cache is empty. |
| Homepage progress widget, `/api/stats/progress` | `/`, `/api/stats/progress` | **none** | Unaffected — reads base scopes only. |

---

## 2. Per-query Neon requirements

### Q1 — `resolveContract` address lookup
- `SELECT *`, so the Neon table must carry **at least** the 11 base columns
  (`address, deployer, block_number, timestamp, bytecode_hash, code_size, era,
  year, is_internal, gas_used, value_wei`). Extra enrichment columns are read
  and ignored by `buildFromIndex()` — safe.
- Address arrives **already lowercased** (`address.toLowerCase()` at
  `contract-resolver.ts:57`). The enriched DB is 100% lowercase (verified: 0
  rows where `address <> lower(address)`), so a plain `=` on the PK is correct
  and index-friendly. **Do not wrap the column in `LOWER()`** — that forces a
  seq scan.
- `is_internal` is compared `=== 1`. In Postgres this must stay an integer (or
  be cast) — a `boolean` column would come back as `true`/`false` and
  `true === 1` is **false**, silently flipping every contract to "not internal".
- `gas_used`/`value_wei` NULL → `undefined` via `?? undefined`. Preserve NULLs.
- `value_wei` is a decimal string up to **26 digits** — exceeds `int64`. Must be
  `numeric`/`text` in Postgres, and must come back as a **string** (postgres.js
  returns `numeric` as string — correct), because `buildFromIndex` assigns it to
  `valueWei?: string`.

### Q2 — bytecode family lookup
- `bytecode_hash` is a **32-char lowercase hex string, no `0x` prefix** (verified
  on 9,914,364 non-null rows; 2,132,770 rows are NULL). `bytecode_families` has
  180,690 rows, all distinct hashes → the hash can be the PK.
- `is_cracked` is used in a truthy test (`familyRow?.is_cracked && ...`). In
  SQLite that's `0`/`1`. An integer column keeps this identical; a boolean
  would also be truthy-correct but changes the JSON shape — keep integer.
- `sibling_count` max is **1,576,988** — fits `integer`.
- 803 families are cracked; `cracked_address` and `proof_url` are non-null only
  for those.

### Q3/Q4 — browse index
- Filters: `era` (exact `=`), `year`, `deployer` (lowercased by the caller),
  `code_size >= / <=`, `is_internal = 0|1`, and `bf.sibling_count >= ?` which
  triggers a `LEFT JOIN bytecode_families`.
- **The `LEFT JOIN` is only added when `min_siblings` is set**, but the join is
  in `fromClause` for *both* the count and the row query, so they stay
  consistent. Preserve that coupling.
- Sort is a whitelist of 4 expressions; anything else falls through to
  `block_number ASC`. No user string reaches the SQL. Preserve the whitelist —
  it is the injection guard.
- `LIMIT`/`OFFSET`: limit is clamped to `[1, 100]`, page to `>= 1`. Deep offsets
  (e.g. page 100,000) will be slow on Postgres just as they were on SQLite —
  same class of behavior, no regression.
- Placeholders: SQLite uses `?`; Postgres needs `$1..$n`. Drizzle's `sql`
  template handles this — but the dynamic `WHERE` must be built with
  `sql.join`/`sql.append`, never string concatenation of values.

### Q5/Q6 — deployer
- `deployer = ?` with the value lowercased by the route. Enriched DB deployers
  are 100% lowercase (verified). Plain `=`, no `LOWER()`.
- Q6 additionally selects `gas_used`; Q4 does not.
- Limit clamp is `[1, 200]` here (vs 100 for browse).

### Q7 — cron totals
- `GROUP BY era, year` over the full table. On Postgres this is a ~12M-row
  aggregate; it should run in tens of seconds with a parallel seq scan, well
  inside `maxDuration = 300`. No per-row billing on Neon, unlike Turso.
- The existing guards must be kept verbatim: **throw** on an empty grid, and
  **skip any scope whose total is `<= 0`** so a partial failure can never
  overwrite a good cached value with a zero.

---

## 3. Edge cases and gotchas found

| # | Finding | Impact | Handling |
|---|---------|--------|----------|
| E1 | **`is_internal` / `is_cracked` must stay INTEGER, not BOOLEAN.** `r.is_internal === 1` and truthiness checks would break under booleans. | Would silently mislabel every contract. | Schema uses `integer`. |
| E2 | **`value_wei` exceeds int64** (26 digits observed). | `bigint` overflow / precision loss. | `numeric` column; postgres.js returns it as a string, matching the existing `string` type. |
| E3 | **Addresses are already lowercase everywhere** — in the source data and at every call site. | Wrapping in `LOWER()` would kill index usage on 12M rows. | Plain `=` on a `text` PK. Documented in the module. |
| E4 | **Pre-existing era-filter mismatch.** The browse and deployer UIs offer canonical era ids (`dao`, `tangerine`, `spurious`, `frontier`) but the index stores verbose names (`dao-fork`, `tangerine-whistle`, `spurious-dragon`, `frontier-thawing`). `era = 'dao'` matches **0 rows** today; `era = 'frontier'` matches 1,299 of 14,448. | Era filters on index browse and deployer pages are already broken. | **Not fixed here.** Fixing it would make the Neon path disagree with the Turso path and invalidate the A/B validation. Reproduced exactly; logged as follow-up F1. |
| E5 | `bytecode_hash` is NULL for 2,132,770 rows. The `LEFT JOIN` on `min_siblings` therefore yields NULL `sibling_count` for them; `bf.sibling_count >= ?` excludes them — same in Postgres (NULL comparison is UNKNOWN → not matched). | None; behavior identical. | Verified equivalent. |
| E6 | `year` contains `0` (3 rows) and 2019–2026 (~109 rows) beyond the 2015–2018 whitelist. `era` contains `constantinople` (26) and `unknown` (86). | The cron's `ERA_IDS`/`YEARS` whitelists drop them from the cache, so full-index totals per-era/year do not sum to `turso:overall`. | Pre-existing; preserved exactly. |
| E7 | The enriched local DB has **12,047,134** rows vs `turso:overall` = **12,023,046** — a 24,088-row difference (different snapshot). | `/coverage` totals will shift slightly on cutover. | Expected and correct — the local DB is newer. Flagged so it is not mistaken for a bug. |
| E8 | An unfiltered `COUNT(*)` for browse index mode scans 12M rows on every request. | Latency on `/browse?mode=index` with no filters. | Exact count kept by default so A/B validation is meaningful; opt-in `INDEX_COUNT_ESTIMATE=1` uses the cached full-index total when *no* filters are present. |
| E9 | `bytecode_families.bytecode_hash` has no declared PK/UNIQUE in SQLite, but all 180,690 values are distinct. | — | Neon table declares it PRIMARY KEY, which also serves Q2. |
| E10 | `/api/deployer` has **no config gate** — it calls `turso.execute` unconditionally and the lazy proxy throws if the URL is unset, producing a 500. | Pre-existing. | The Neon path has no such failure mode (Postgres is always configured), so this only ever improves. |
| E13 | **`value_wei` has TWO upstream formats.** 12,023,405 rows hold a decimal wei string; **23,729 hold a hex string** (`0x4a817c800`). Found during the load: the `NUMERIC` column that migration 089 declared rejects the hex rows outright, which would have aborted the COPY partway. The mixed format exists upstream and is equally present in Turso today; `ResolvedContract.valueWei` is typed `string` and — verified — is populated by the resolver and then **read by nothing**, so no surface has ever rendered it. | Would have failed the bulk load. No user-visible impact either way. | Migration **090**: `value_wei` becomes `TEXT` so the source is stored verbatim (rewriting 23,729 values would be a data transformation smuggled into a no-change migration), plus an additive `value_wei_decimal NUMERIC` holding the BigInt-normalized number so nobody ever sums the raw column by accident. |
| E12 | **Tied-sort-key pagination is non-deterministic.** `ORDER BY code_size DESC` with no tiebreaker: thousands of contracts share a `code_size`, so paging can repeat or skip rows. Confirmed live in the parity harness — 5 of 140 cases could not be compared on row identity for this reason. | Pre-existing on Turso, identical on Neon. | Reproduced, not fixed. Follow-up F4. |
| E11 | Storage cost: ~12M rows × 29 columns ≈ **4–5 GB heap + ~2–3 GB indexes**. On a 7.45 GB database at $0.35/GB-month that is roughly **+$2–3/month**. | Budget. | Flagged for Julian's sign-off before the data load. |

---

## 4. Design decisions

**D1 — Table names.** `neon_contract_index` and `neon_bytecode_families`, exactly
as specified. No collision with anything existing.

**D2 — Feature flag.** `INDEX_SOURCE`, read via a single helper. Any value other
than the literal `"neon"` (including unset, empty, or a typo) resolves to
`"turso"`. Fail-safe direction: a misconfiguration keeps today's behavior.

**D3 — Stats-cache scope prefix follows the flag.** `refreshTursoIndexTotals()`
writes `turso:*` in turso mode and `index:*` in neon mode; `getIndexTotals()`
prefers the *active* source's prefix, falls back to the other prefix, then to the
Neon base scopes. This means:
- flipping the flag flips read and write together — no stale-scope mismatch;
- rolling back to turso mode finds the `turso:*` rows still present and intact;
- nothing is ever deleted from `contract_stats_cache`.

**D4 — Identical output, including the bugs.** The Neon queries reproduce the
Turso semantics exactly — same filters, same sort whitelist, same clamps, same
era matching (E4), same JSON keys and types. Divergence is a bug, not a feature,
during the flag period.

**D5 — The load is a separate, resumable operation.** Migration 089/090 create
the empty tables; `scripts/load-neon-index.mjs` streams the rows in. It streams
SQLite → `COPY … FROM STDIN` directly rather than via a CSV file, because
sqlite3's CSV writer emits NULL and `''` identically and this index has 2.1M NULL
`bytecode_hash` values that must not arrive as empty strings. Chunked, each chunk
its own transaction, `--resume` to continue an interrupted run. Secondary indexes
are dropped before the copy and rebuilt after
(`scripts/rebuild-neon-index-indexes.sh`).

---

## 5. Verification performed

Three harnesses, all against a throwaway local Postgres 16 loaded with a
40,157-row sample of the enriched index plus all 180,690 families — production
was never written to. Recipe and gotchas: `scripts/index-migration-harness/`.

| Harness | What it proves | Result |
|---------|----------------|--------|
| `sql-parity.mjs` | All 7 queries, SQLite vs Postgres, over 15 browse filter combinations, 16 deployer combinations, 10 resolver addresses, and the cron grid | **135 passed, 0 failed** (5 cases correctly reported indeterminate on a tied sort key — see E12) |
| `module-parity.ts` | The shipped `lib/neon-index` + `lib/index-source` modules, not a reimplementation: flag resolution, return types (`is_internal` a number not a boolean, `value_wei` a string, counts numbers not strings), sort direction, sort-injection rejection, pagination non-overlap, NULL-hash exclusion, E4 reproduced | **43 passed, 0 failed** |
| `cron-parity.ts` | `refreshTursoIndexTotals` + `getIndexTotals` in both flag modes: `index:*` written in neon mode, `turso:*` left untouched, base scopes untouched, zero-totals skipped, cross-prefix fallback, and the guard that the progress denominator reads neither prefix | **16 passed, 0 failed** |

Also verified:

- Migration 089 applies cleanly against the **production Neon database inside a
  transaction that was then rolled back** — 2 tables and 9 indexes created, then
  discarded. Nothing was persisted.
- `npx tsc --noEmit` clean; `eslint` clean on all changed files.
- `scripts/validate-index-migration.mjs` — 55+ endpoint cases for the staging
  A/B, documented in `docs/index-migration-validation-checklist.md`.

## 6. Follow-ups (not done here)

- **F1** — Fix E4: normalize canonical era ids to the verbose set the index uses
  (`dao` → `dao-fork`, `tangerine` → `tangerine-whistle`, `spurious` →
  `spurious-dragon`, `frontier` → `('frontier','frontier-thawing')`). Do this
  *after* cutover, so it lands as a visible one-line behavior change rather than
  hiding inside the migration.
- **F2** — Load the 12M rows (needs sign-off on E11).
- **F3** — Once neon mode has run clean for a while: drop the `@libsql/client`
  dependency and the Turso branch. Not before.
- **F4** — Fix E12 by appending `, address` to the `code_size` ORDER BY clauses
  in the browse and deployer queries, making paging deterministic. Both paths at
  once, in its own commit, so the change is visible.
