-- Migration 076: Collections follow a Person's wallets, not a single deployer
--
-- Two problems this fixes:
--
--   1. A collection's contract_addresses array was materialized once, from the
--      single deployer address named on the collection. Adding another wallet to
--      the Person behind that collection changed nothing, so contracts deployed
--      from the new wallet never appeared.
--
--   2. Some materialized addresses are no longer rows in `contracts` (they were
--      indexed from the deployer's history but never imported, or were later
--      removed). They rendered as dark "ghost" cards linking to Not Found pages.
--
-- The runtime query now resolves a collection's contracts from every wallet of
-- the linked Person, so this migration only has to (a) record the Person link
-- and (b) bring the stored array — still used for counts, curated extras and the
-- "part of collection" badge — back in sync.
--
-- Idempotent: safe to re-run.

-- 1. Link each collection to the Person it belongs to ------------------------

ALTER TABLE collections ADD COLUMN IF NOT EXISTS person_address TEXT;

CREATE INDEX IF NOT EXISTS collections_person_idx
  ON collections (person_address);

-- Direct match: the collection's deployer address IS the person's primary address.
UPDATE collections c
SET person_address = p.address
FROM people p
WHERE c.person_address IS NULL
  AND lower(c.deployer_address) = p.address;

-- Secondary match: the collection's deployer address is one of a person's wallets.
UPDATE collections c
SET person_address = w.person_address
FROM people_wallets w
WHERE c.person_address IS NULL
  AND lower(c.deployer_address) = w.address;

-- 2. Drop stored addresses that have no row in `contracts` -------------------
--    These are the ghost cards that linked to Not Found pages.

UPDATE collections c
SET contract_addresses = COALESCE(
      (
        SELECT array_agg(t.addr ORDER BY t.ord)
        FROM unnest(c.contract_addresses) WITH ORDINALITY AS t(addr, ord)
        WHERE EXISTS (SELECT 1 FROM contracts ct WHERE ct.address = t.addr)
      ),
      '{}'::text[]
    ),
    updated_at = now()
WHERE c.contract_addresses IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(c.contract_addresses) AS a(addr)
    WHERE NOT EXISTS (SELECT 1 FROM contracts ct WHERE ct.address = a.addr)
  );

-- 3. Refresh each collection from every wallet of its Person -----------------

WITH coll AS (
  SELECT
    id,
    lower(COALESCE(person_address, deployer_address)) AS anchor,
    lower(deployer_address)                           AS deployer,
    contract_addresses
  FROM collections
),
wallets AS (
  SELECT DISTINCT coll.id, x.addr
  FROM coll
  CROSS JOIN LATERAL (
    SELECT coll.deployer AS addr
    UNION
    SELECT coll.anchor
    UNION
    -- wallets of the person the anchor points at, whether the anchor is the
    -- person's primary address or one of their secondary wallets
    SELECT w2.address
    FROM people_wallets w1
    JOIN people_wallets w2 ON w2.person_address = w1.person_address
    WHERE w1.address = coll.anchor
    UNION
    SELECT w3.address
    FROM people_wallets w3
    WHERE w3.person_address = coll.anchor
  ) AS x
  WHERE x.addr IS NOT NULL
),
matched AS (
  -- curated addresses that survived step 2 (unnested so the lookup stays on the
  -- primary key index rather than scanning `contracts` once per collection)
  SELECT coll.id, ct.address, ct.deployment_timestamp, ct.deployment_rank
  FROM coll
  CROSS JOIN LATERAL unnest(coll.contract_addresses) AS a(addr)
  JOIN contracts ct ON ct.address = a.addr
  UNION
  -- everything deployed by (or attributed to) any wallet of the person. The
  -- redundant ANY(...) keeps this on the deployer_address index instead of a
  -- hash join over the whole contracts table.
  SELECT wallets.id, ct.address, ct.deployment_timestamp, ct.deployment_rank
  FROM wallets
  JOIN contracts ct ON ct.deployer_address = wallets.addr
  WHERE ct.deployer_address = ANY(ARRAY(SELECT DISTINCT addr FROM wallets))
),
agg AS (
  SELECT
    id,
    array_agg(
      address ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST, address
    ) AS addresses
  FROM matched
  GROUP BY id
)
UPDATE collections c
SET contract_addresses = agg.addresses,
    updated_at = now()
FROM agg
WHERE agg.id = c.id
  AND c.contract_addresses IS DISTINCT FROM agg.addresses;
