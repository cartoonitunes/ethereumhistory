-- Migration 028: Add Doubler contract with verification proof
-- Deployed January 21, 2016 (block 883,117)
-- Byte-for-byte verified with native C++ solc v0.2.0

INSERT INTO contracts (
  address,
  deployment_block,
  deployment_timestamp,
  era_id,
  short_description,
  description,
  contract_type,
  code_size_bytes,
  featured,
  compiler_language,
  compiler_commit,
  compiler_repo,
  verification_method,
  verification_proof_url,
  verification_notes
) VALUES (
  '0x2ff2a65b0a324c04747bfdc63f4bf525d43e5c62',
  883117,
  '2016-01-21T00:00:00Z',
  'frontier',
  'Doubler drain contract with hardcoded owner',
  'A "doubler drain" contract deployed in January 2016. The fallback function calculates 2x the incoming ETH, caps it at the contract balance, and sends it to a hardcoded owner address. The add_funds() function accepts ETH deposits. 25 ETH remains locked, extractable only by the owner.',
  'financial',
  235,
  FALSE,
  'solidity',
  '67c855c58304',
  'ethereum/solidity',
  'exact_bytecode_match',
  'https://github.com/cartoonitunes/doubler-verification',
  'Compiled with native C++ solc v0.2.0 (webthree-umbrella v1.1.2, unoptimized). Required building the compiler from source - no pre-built binaries exist for this era. Key finding: source uses amount > this.balance (GT opcode), not this.balance < amount (LT opcode). Logically identical but different bytecode due to EVM stack operand ordering.'
) ON CONFLICT (address) DO UPDATE SET
  compiler_language = EXCLUDED.compiler_language,
  compiler_commit = EXCLUDED.compiler_commit,
  compiler_repo = EXCLUDED.compiler_repo,
  verification_method = EXCLUDED.verification_method,
  verification_proof_url = EXCLUDED.verification_proof_url,
  verification_notes = EXCLUDED.verification_notes,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description;
