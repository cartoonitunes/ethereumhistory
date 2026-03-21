ALTER TABLE contracts ADD COLUMN IF NOT EXISTS canonical_address TEXT;
CREATE INDEX IF NOT EXISTS contracts_canonical_address_idx ON contracts (canonical_address) WHERE canonical_address IS NOT NULL;

UPDATE contracts c
SET canonical_address = (
  SELECT address FROM contracts v
  WHERE v.runtime_bytecode_hash = c.runtime_bytecode_hash
    AND v.verification_method IN ('exact_bytecode_match', 'author_published_source', 'partial_match')
    AND v.address != c.address
  ORDER BY v.deployment_timestamp ASC NULLS LAST
  LIMIT 1
)
WHERE c.verification_method IS NULL
  AND c.runtime_bytecode_hash IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM contracts v2
    WHERE v2.runtime_bytecode_hash = c.runtime_bytecode_hash
      AND v2.verification_method IN ('exact_bytecode_match', 'author_published_source', 'partial_match')
  );
