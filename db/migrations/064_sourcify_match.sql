-- Add Sourcify verification match status to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sourcify_match text;
-- Values: 'match' (full/runtime), 'partial' (runtime only, no creation), null (not verified)
-- 'match' = Sourcify runtimeMatch is non-null
-- 'partial' = same as match for our purposes (creation mismatch is expected for frontier contracts)
