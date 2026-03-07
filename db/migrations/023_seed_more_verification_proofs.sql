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

-- MeatConversionCalculator (avsa's published source + compiler settings)
UPDATE contracts SET
  compiler_language = 'solidity',
  verification_method = 'author_published_source',
  verification_proof_url = 'https://gist.github.com/alexvandesande/3abc9f741471e08a6356#file-meat-calculator',
  verification_notes = 'Source code and compiler settings published by Alex Van de Sande (avsa). Converts Unicorn tokens into Unicorn Meat through a one-way grinder mechanism.'
WHERE address = '0x4ab274fc3a81b300a0016b3805d9b94c81fa54d2';

-- Unicorn Meat Grinder Association (avsa's published source + compiler settings)
UPDATE contracts SET
  compiler_language = 'solidity',
  verification_method = 'author_published_source',
  verification_proof_url = 'https://gist.github.com/alexvandesande/3abc9f741471e08a6356#file-meat-grinder-association',
  verification_notes = 'DAO controlling the Unicorn Meat grinder rules. Source and compiler settings published by Alex Van de Sande (avsa). Features quadratic voting where each negative vote is worth 4 support votes.'
WHERE address = '0xc7e9ddd5358e08417b1c88ed6f1a73149beeaa32';

-- MistCoin (verified by crypt0biwan)
UPDATE contracts SET
  compiler_language = 'solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/crypt0biwan/mistcoin',
  verification_notes = 'Source code verified by crypt0biwan. Fabian Vogelsteller''s token created to test the ERC-20 standard, deployed November 3, 2015.'
WHERE address = '0xf4eced2f682ce333f96f2d8966c613ded8fc95dd';

-- Vitalik's currency contract: expanded description with Serpent discovery + Devcon 1 context
UPDATE contracts SET
  short_description = 'A token contract deployed by Vitalik Buterin, compiled from currency.se (Serpent) in the ethereum/dapp-bin repository. Deployed days after Devcon 1 and one week before EIP-20 was published.',
  description = E'Deployed by Vitalik Buterin on November 12, 2015 (block 530,996), this token implements the standardized currency API from the ethereum/dapp-bin repository. It has zero decimals and a fixed supply of 1,000,000 units, all held by the deployer.\n\nThe contract was long assumed to be compiled from currency.sol (Solidity), but bytecode analysis revealed it was actually compiled from currency.se - the Serpent version. Three clues gave it away: the constructor uses MSTORE8-based memory initialization instead of Solidity''s free memory pointer pattern, the runtime uses Serpent''s alloc() pattern (MSIZE, SWAP1, MSIZE, ADD), and two function names differ from the Solidity source (disapprove vs unapprove, isApprovedOnceFor vs isApprovedOnce). The exact compiler was identified as Serpent at commit f0b4128 (October 15, 2015), producing a byte-for-byte match of all 1,661 bytes.\n\nThe deployment came days after Devcon 1 in London, where token standardization was a major topic, and one week before Vitalik co-published EIP-20 (the ERC-20 standard) on November 19, 2015. The source code predates the standard - this contract captures the state of token design just before it was formalized.',
  historical_summary = 'A proto-ERC-20 token compiled from currency.se (Serpent, not Solidity) in the ethereum/dapp-bin repository. Deployed by Vitalik Buterin days after Devcon 1 and one week before EIP-20 was published, it captures the state of token design just before formalization of the standard.',
  historical_significance = 'One of the earliest known token contracts on Ethereum, and the only verified contract compiled from Vitalik''s own language (Serpent). It represents the pre-ERC-20 era of token design and sits at the intersection of Devcon 1, where standardization was debated, and EIP-20, which formalized it one week later. The bytecode verification required compiler archaeology - Etherscan does not support Serpent as a verification language.',
  historical_context = 'In late 2015, Ethereum''s token conventions were still evolving. The ethereum/dapp-bin repository contained reference implementations in both Solidity (currency.sol) and Serpent (currency.se) side by side. Vitalik deployed the Serpent version, reflecting his own language preference before Solidity became dominant. This happened during a pivotal week: Devcon 1 had just concluded in London where standardization was a central theme, and EIP-20 would be published seven days later. Serpent, which Vitalik created, was later succeeded by Vyper.'
WHERE address = '0xa2e3680acaf5d2298697bdc016cf75a929385463';
