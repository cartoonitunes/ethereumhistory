-- Migration: Auto-propagate verification to/from siblings
-- When a contract is verified, mark all bytecode-identical siblings
-- When a contract is unverified, clear siblings that inherited from it

CREATE OR REPLACE FUNCTION propagate_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Case 1: Verification set or updated to a real value
  IF NEW.verification_method IS NOT NULL AND NEW.verification_method != 'unverified'
     AND NEW.deployed_bytecode_hash IS NOT NULL THEN
    UPDATE contracts SET
      verification_method   = NEW.verification_method,
      verification_proof_url = NEW.verification_proof_url,
      compiler_commit       = NEW.compiler_commit,
      compiler_language     = NEW.compiler_language,
      canonical_address     = NEW.address
    WHERE deployed_bytecode_hash = NEW.deployed_bytecode_hash
      AND code_size_bytes        = NEW.code_size_bytes
      AND address               != NEW.address
      -- Only overwrite if currently unverified (don't stomp independently verified contracts)
      AND (verification_method IS NULL OR verification_method = 'unverified');
  END IF;

  -- Case 2: Verification revoked on a canonical contract — clear its siblings
  IF (NEW.verification_method IS NULL OR NEW.verification_method = 'unverified')
     AND (OLD.verification_method IS NOT NULL AND OLD.verification_method != 'unverified')
     AND NEW.deployed_bytecode_hash IS NOT NULL THEN
    UPDATE contracts SET
      verification_method    = NULL,
      verification_proof_url = NULL,
      compiler_commit        = NULL,
      compiler_language      = NULL,
      canonical_address      = NULL
    WHERE canonical_address = OLD.address   -- only siblings that inherited from this one
      AND address          != OLD.address;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propagate_verification ON contracts;
CREATE TRIGGER trg_propagate_verification
  AFTER UPDATE OF verification_method ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION propagate_verification();
