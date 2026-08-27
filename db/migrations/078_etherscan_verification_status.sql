-- Record Etherscan's verification status as its own fact.
--
-- `verification_method` holds EthereumHistory's own provenance for the source it stores:
-- exact_bytecode_match, author_published_source, near_exact_match, partial_match, or
-- etherscan_verified. `etherscanVerified` was derived from it as
-- `verification_method = 'etherscan_verified'`, which made the two mutually exclusive: a
-- contract whose source EH cracked itself reported etherscan_verified = false even when
-- Etherscan served it. Etherscan's status is a separate fact and gets its own column.
--
-- match_type distinguishes a direct verification from Etherscan's automatic "Similar
-- Match", where it serves another address's verified source because the bytecode is
-- identical. Both read as verified on Etherscan; only the direct one carries a
-- ContractName that belongs to this deployment.

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS etherscan_verified BOOLEAN;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS etherscan_match_type TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS etherscan_checked_at TIMESTAMP;

-- NULL means never checked, which is what every existing row is. Rows whose source was
-- imported straight from Etherscan are known-verified, so seed those to TRUE and leave
-- the rest for enrichment to fill in on the next lookup.
UPDATE contracts
SET etherscan_verified = TRUE
WHERE verification_method = 'etherscan_verified'
  AND etherscan_verified IS NULL;

CREATE INDEX IF NOT EXISTS contracts_etherscan_verified_idx
  ON contracts (etherscan_verified) WHERE etherscan_verified IS TRUE;
