-- Migration 060: Fix Token Sweeper naming and remove stale sibling counts

-- Update the canonical Forwarder v2 -> Token Sweeper (correct name + remove count from text)
UPDATE contracts SET
  etherscan_contract_name = 'Token Sweeper',
  short_description = 'ERC-20 token sweeper for exchange deposit addresses. Owner-only sweep of any token balance. Compiled with Solidity 0.4.9.',
  verification_notes = 'Exact bytecode match (stripped bzzr metadata). Compiler: solc 0.4.9+commit.364da425, no optimizer. Token sweeper: calls token.transfer(owner, token.balanceOf(this)).'
WHERE address = '0x9a96270a85fb79eb320f2f7965ccf5c19ba695c7';

-- Update our new entry too (remove count from notes)
UPDATE contracts SET
  verification_notes = 'Exact bytecode match (stripped bzzr metadata). Compiler: solc 0.4.9+commit.364da425, no optimizer. Token sweeper: owner-only sweep of any ERC-20 token balance.',
  short_description = 'ERC-20 token sweeper for exchange deposit addresses. Owner-only sweep of any token balance. Compiled with Solidity 0.4.9.'
WHERE address = '0x0000ae487a4d02e28b8f3c6b91e2c3af6874d6eb';
