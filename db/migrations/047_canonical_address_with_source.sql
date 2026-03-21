-- Broaden canonical_address propagation to include contracts that have source_code
-- but no verification_method (these are verified by implication — source exists).
-- Also re-runs for contracts missed by migration 046.

UPDATE contracts c
SET canonical_address = (
  SELECT address FROM contracts v
  WHERE v.runtime_bytecode_hash = c.runtime_bytecode_hash
    AND (
      v.verification_method IN ('exact_bytecode_match', 'author_published_source', 'partial_match')
      OR (v.source_code IS NOT NULL AND v.source_code != '')
    )
    AND v.address != c.address
  ORDER BY
    -- Prefer explicitly verified over source-only
    CASE WHEN v.verification_method IS NOT NULL THEN 0 ELSE 1 END ASC,
    v.deployment_timestamp ASC NULLS LAST
  LIMIT 1
)
WHERE c.verification_method IS NULL
  AND (c.source_code IS NULL OR c.source_code = '')
  AND c.runtime_bytecode_hash IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM contracts v2
    WHERE v2.runtime_bytecode_hash = c.runtime_bytecode_hash
      AND (
        v2.verification_method IN ('exact_bytecode_match', 'author_published_source', 'partial_match')
        OR (v2.source_code IS NOT NULL AND v2.source_code != '')
      )
  );
