-- Migration 054: CryptoCats Pre-Launch Test Contract 1
-- Address: 0xD23AdE68C693264Aa9e8f8303F912A3E54718456
-- Deployed: 2017-11-11 (block 4530388)

INSERT INTO contracts (
  address,
  etherscan_contract_name,
  deployer_address,
  deployment_tx_hash,
  deployment_block,
  deployment_timestamp,
  short_description,
  description,
  era_id,
  token_name,
  token_symbol,
  compiler_commit,
  compiler_language,
  compiler_repo,
  verification_method,
  verification_proof_url,
  verification_notes,
  source_code
) VALUES (
  '0xD23AdE68C693264Aa9e8f8303F912A3E54718456',
  'CryptoCatsMarket',
  '0x0003b2f7218896285a88a1c6b97f8ae692036edb',
  '0x94efb7f737c8479700aa8fea1d764565cdd63ae89f013997d40819993f10b720',
  4530388,
  to_timestamp(1510376326),
  'CryptoCats pre-launch test contract (Nov 2017). The first version to introduce cat names and the allInitialOwnersAssigned() initialization pattern.',
  'Deployed one day before the public CryptoCats launch on 2017-11-12, this test contract introduced two innovations that carried into the final v3 production contract: a string catName field in the Offer struct (baking "Cat 0" through "Cat 11" directly into the blockchain) and the allInitialOwnersAssigned() function for bulk initialization. Unlike the production contract (0x088C), this version has only 18 functions — no marketplace functions (offerCatForSale, catNoLongerForSale) yet. Source reconstruction by EthereumHistory.com achieved 98.1% match (5715/5823 bytes). Compiler: Solidity 0.4.18 with optimizer.',
  '5',
  'CRYPTOCATS',
  'CCAT',
  'v0.4.18+commit.9cf6e910',
  'Solidity',
  'https://github.com/ethereum/solidity/releases/tag/v0.4.18',
  'near_exact_match',
  'https://github.com/cartoonitunes/cryptocats-t1-verification',
  '5715/5823 bytes (98.1%). All 18 selectors match. All function logic matches. 108-byte gap isolated to cat init dead code region (optimizer behavior with pre-release 0.4.18 build). Struct confirmed: {bool isForSale; address seller; string catName; uint catIndex;}',
  NULL
);
