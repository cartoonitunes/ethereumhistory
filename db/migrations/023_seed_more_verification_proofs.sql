-- Migration 023: Populate verification proof data for additional verified contracts

-- GavCoin (solc v0.3.1, optimizer enabled)
UPDATE contracts SET
  compiler_language = 'solidity',
  compiler_commit = 'c492d9be',
  compiler_repo = 'ethereum/solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/gavcoin-verify',
  verification_notes = 'Pre-ERC-20 mineable token from Gavin Wood''s coin.sol in ethereum/dapp-bin. Compiled with solc v0.3.1, optimizer enabled. 905 bytes runtime, byte-perfect match.'
WHERE address = '0xb4abc1bfc403a7b82c777420c81269858a4b8aa4';

-- SciFi voting contract (solc v0.1.4, optimizer enabled)
UPDATE contracts SET
  compiler_language = 'solidity',
  compiler_commit = '5f6c3cdf',
  compiler_repo = 'ethereum/solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/scifi-verify',
  verification_notes = 'One of the first dApps on Ethereum, deployed 9 days after Frontier launch. Users bid ETH to rank sci-fi movies. Compiled with solc v0.1.4, optimizer enabled. 219 bytes runtime.'
WHERE address = '0xd94badbec21695b7a36abcb979efad0108319d18';

-- Unicorn token (avsa's published source + compiler settings)
UPDATE contracts SET
  compiler_language = 'solidity',
  verification_method = 'author_published_source',
  verification_proof_url = 'https://gist.github.com/alexvandesande',
  verification_notes = 'Source code and compiler settings published by Alex Van de Sande (avsa), the contract author. Created as an April Fool''s 2016 experiment in token mechanics.'
WHERE address = '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7';

-- Unicorn Meat Grinder Association (avsa's published source + compiler settings)
UPDATE contracts SET
  compiler_language = 'solidity',
  verification_method = 'author_published_source',
  verification_proof_url = 'https://gist.github.com/alexvandesande',
  verification_notes = 'DAO controlling the Unicorn Meat grinder rules. Source and compiler settings published by Alex Van de Sande (avsa). Features quadratic voting where each negative vote is worth 4 support votes.'
WHERE address = '0xc7e9ddd5358e08417b1c88ed6f1a73149beeaa32';
