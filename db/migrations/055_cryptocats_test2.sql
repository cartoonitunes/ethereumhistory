-- Migration 055: CryptoCats Pre-Launch Test Contract 2
-- Address: 0x78eea094e1d30141ccade64f8d29a7bfcc921f9e
-- Deployed: 2017-11-11 (block 4532036)
-- Note: contract row already exists (stub), so we UPDATE

UPDATE contracts SET
  etherscan_contract_name = 'CryptoCatsMarket',
  deployer_address = '0x0003b2f7218896285a88a1c6b97f8ae692036edb',
  deployment_tx_hash = '0x51d6871d7c3021d6392c0bbc6f4aa88be400f066b1ebeb9317e09c27449f5c95',
  deployment_block = 4532036,
  deployment_timestamp = to_timestamp(1510398952),
  short_description = 'CryptoCats pre-launch test contract 2 (Nov 2017). Second test deployed the same day as T1, compiled without the optimizer and introducing the v3-style struct and return order.',
  description = 'Deployed a few hours after Test Contract 1 on 2017-11-11 (block 4532036 vs 4530388), this second test contract iterated on the CryptoCats marketplace design. Key changes from T1: the Offer struct field order was updated to {bool isForSale; uint catIndex; address seller; string catName;} matching the final v3 production layout; getCatDetail() return order was changed to (bool, uint, address, string); the allInitialOwnersAssigned() runtime function was simplified to only set allCatsAssigned=true, with all 12 cat Offer structs initialized in the constructor instead; seller was set to 0x0 (not msg.sender); and the imageHash was a placeholder string ("INSERT ACTUAL HASH HERE"). The contract was compiled WITHOUT the optimizer, producing 8451 bytes vs 5823 for T1. Source reconstruction by EthereumHistory.com achieved 96.3% match (8137/8451 bytes). The 314-byte gap is dead code from the constructor-only internal cat initialization block — the same root cause as T1''s 108-byte gap, but larger because no optimizer was used to compact the code.',
  era_id = '5',
  token_name = 'CRYPTOCATS',
  token_symbol = 'CCAT',
  compiler_commit = 'v0.4.18+commit.9cf6e910',
  compiler_language = 'Solidity',
  compiler_repo = 'https://github.com/ethereum/solidity/releases/tag/v0.4.18',
  verification_method = 'near_exact_match',
  verification_proof_url = 'https://github.com/cartoonitunes/cryptocats-t2-verification',
  verification_notes = '8137/8451 bytes (96.3%). All function selectors match. All function logic matches. 314-byte gap isolated to dead code region from constructor-only cat init (no optimizer = full code preserved). Struct confirmed: {bool isForSale; uint catIndex; address seller; string catName;}. getCatDetail return order: (bool, uint, address, string).'
WHERE address = '0x78eea094e1d30141ccade64f8d29a7bfcc921f9e';
