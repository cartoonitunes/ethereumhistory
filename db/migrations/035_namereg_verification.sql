-- Set NameRegistry (0xa1a111bc074c9cfa781f0c38e63bd51c91b8af00) verification to exact_bytecode_match
UPDATE contracts SET
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/namereg-verification',
  updated_at = NOW()
WHERE address = '0xa1a111bc074c9cfa781f0c38e63bd51c91b8af00';
