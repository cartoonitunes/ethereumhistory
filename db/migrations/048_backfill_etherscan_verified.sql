-- Backfill verification_method for contracts whose source_code was imported from Etherscan
-- but never had verification_method set. These are Etherscan-verified contracts.

UPDATE contracts
SET verification_method = 'etherscan_verified'
WHERE source_code IS NOT NULL
  AND source_code != ''
  AND verification_method IS NULL;

-- Now that these have verification_method set, re-run the canonical_address propagation
-- for any siblings that currently point to them (already handled by migration 047),
-- but also catch any that were missed because the source-holder wasn't recognized as canonical.
UPDATE contracts c
SET canonical_address = (
  SELECT address FROM contracts v
  WHERE v.runtime_bytecode_hash = c.runtime_bytecode_hash
    AND (
      v.verification_method IN ('exact_bytecode_match', 'author_published_source', 'partial_match', 'etherscan_verified')
    )
    AND v.address != c.address
  ORDER BY
    CASE WHEN v.verification_method = 'exact_bytecode_match' THEN 0
         WHEN v.verification_method = 'author_published_source' THEN 1
         WHEN v.verification_method = 'etherscan_verified' THEN 2
         ELSE 3 END ASC,
    v.deployment_timestamp ASC NULLS LAST
  LIMIT 1
)
WHERE c.verification_method IS NULL
  AND (c.source_code IS NULL OR c.source_code = '')
  AND c.runtime_bytecode_hash IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM contracts v2
    WHERE v2.runtime_bytecode_hash = c.runtime_bytecode_hash
      AND v2.verification_method IN ('exact_bytecode_match', 'author_published_source', 'partial_match', 'etherscan_verified')
  );
