-- Migration 031: Fix Curio Cards v2 verification method
-- The contract had source_code and a proof repo but verification_method was NULL,
-- causing it to be excluded from /proofs page.

UPDATE contracts SET
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/curio-cards-verify',
  compiler_language = 'solidity',
  compiler_commit = '60cc1668',
  compiler_repo = 'ethereum/solidity',
  verification_notes = 'Exact bytecode match with solc 0.4.8+commit.60cc1668, optimizer OFF. Source recovered by adding string public thumbnail field (slot 5) to the known Curio Cards v1 source (17b-erc20.sol). Cards 17-19 were deployed by a different factory (0xeca65Be7...) using this updated contract.'
WHERE address = '0x8ccf904e75bc592df3db236cd171d0caf0b2bbcb';
