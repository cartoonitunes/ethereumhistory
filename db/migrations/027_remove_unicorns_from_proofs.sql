-- Migration 027: Remove Unicorns from proofs page
-- Etherscan verification was done by someone else, not us.
-- Proofs page is only for original verification work we did ourselves.
UPDATE contracts SET
  verification_method = NULL,
  verification_proof_url = NULL,
  verification_notes = NULL
WHERE address = '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7';
