-- Migration 029: Add Gamble contract verification

-- Gamble contract (Serpent fd9b0b6, Sep 15 2015)
UPDATE contracts SET
  etherscan_contract_name = 'Gamble',
  compiler_language = 'serpent',
  compiler_commit = 'fd9b0b6',
  compiler_repo = 'ethereum/serpent',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/gamble-verification',
  verification_notes = 'Full 1136-byte creation transaction input matches compiled output byte-for-byte. Source: dapp-bin/gamble.se commit d94b22e. Compiler: Serpent fd9b0b6 (2015-09-06). Key findings: send() uses 5000 gas stipend (pre-EIP-150), event Bet() requires typed ABI params (bettor:address, value:uint256, prob_milli:uint256) for correct keccak topic hash, bytes32 function arguments supported. The init code deploys 1114 of 1118 compiled runtime bytes, skipping a 4-byte unreachable dead-code epilogue.',
  short_description = 'A provably-fair commit-reveal gambling contract from the Ethereum dapp-bin, deployed 47 days after Frontier genesis.',
  description = 'A provably-fair on-chain gambling contract from the dapp-bin example repository. Players place bets by submitting a key and probability. The house pre-commits to a seed hash, then reveals the seed to determine outcomes via sha3(seed || player_key) divided by a normalization constant. Winners receive payouts automatically during the reveal phase. Written in Serpent, the smart contract language developed alongside Ethereum before Solidity matured.',
  historical_significance = 'One of the earliest on-chain gambling contracts on Ethereum, written in Serpent by the Ethereum core team and included in the official dapp-bin repository. Deployed just 47 days after Frontier genesis, it demonstrates cryptographic commit-reveal randomness at a time when the concept was being actively developed for blockchain use. A direct predecessor to the commit-reveal patterns used by later provably-fair gaming protocols.',
  historical_context = 'Ethereum''s Frontier mainnet launched July 30, 2015. The first weeks and months saw core developers actively building and deploying example contracts to demonstrate capabilities. The dapp-bin repository was the official showcase for Serpent-based dapps. This gamble contract was deployed by address 0x5ed8cee6b63b1c6afce3ad7c92f4fd7e1b8fad9f at block 235,543 on September 15, 2015.'
WHERE address = '0xaf5558b1b834be59b9ff94e05c17bae9257c9bf1';
