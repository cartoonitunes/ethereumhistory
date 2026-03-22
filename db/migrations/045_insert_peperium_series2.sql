-- Insert Peperium Series 2 first token (factory-created)
INSERT INTO contracts (
  address, deployer_address, deployment_block, deployment_timestamp,
  era_id, contract_type, verification_method, verification_proof_url,
  verification_notes, compiler_commit, compiler_language,
  short_description, token_name, token_symbol
) VALUES (
  '0x5921f43985a027ba74ee110b77dce09b96de943e',
  '0xb4e34890034a13325363b3226dce8eeec292d626',
  4210431,
  '2017-08-24T00:00:00Z',
  'spurious',
  'token',
  'near_exact_match',
  'https://github.com/cartoonitunes/peperium-series2-verification',
  'All 21 functions, storage layout, events verified. One unknown bool variable name (getter 0xea76f7d8). Compiler: solc 0.4.14+commit.c2215d46, no optimizer.',
  '0.4.14+commit.c2215d46',
  'solidity',
  'RARE Pepe collectible card token (Series 2). Factory-deployed by the Peperium platform with transfer events and an admin toggle.',
  'Peperium Series 2',
  'PEPE'
) ON CONFLICT (address) DO UPDATE SET
  verification_method = EXCLUDED.verification_method,
  verification_proof_url = EXCLUDED.verification_proof_url,
  verification_notes = EXCLUDED.verification_notes,
  compiler_commit = EXCLUDED.compiler_commit,
  compiler_language = EXCLUDED.compiler_language,
  short_description = EXCLUDED.short_description;
