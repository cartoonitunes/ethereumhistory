-- Migration 021 (seed): Populate verification proof data for known verified contracts

-- Vitalik's Currency Contract (Serpent)
UPDATE contracts SET
  compiler_language = 'serpent',
  compiler_commit = 'f0b4128',
  compiler_repo = 'ethereum/serpent',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/vitalik-currency-verification',
  verification_notes = 'Compiled from currency.se in ethereum/dapp-bin using the Serpent compiler. Initially mistaken for Solidity - the contract was actually written in Vitalik''s own language.'
WHERE address = '0xa2e3680acaf5d2298697bdc016cf75a929385463';

-- Ethereum Foundation Multisig Wallet (Solidity v0.1.1)
UPDATE contracts SET
  compiler_language = 'solidity',
  compiler_commit = '6ff4cd6',
  compiler_repo = 'ethereum/solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/ef-wallet-verify',
  verification_notes = 'Gavin Wood''s wallet.sol from ethereum/dapp-bin, compiled with solc v0.1.1. The direct ancestor of the Parity multisig that was later hacked.'
WHERE address = '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae';
