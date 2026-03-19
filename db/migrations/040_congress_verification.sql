-- Migration 040: Blockchain Congress contract verification (Vitalik, Dec 28 2015)

UPDATE contracts SET
  etherscan_contract_name = 'Blockchain Congress',
  compiler_language = 'solidity',
  compiler_commit = 'd41f8b7c',
  compiler_repo = 'ethereum/solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/congress-verification',
  verification_notes = 'soljson v0.1.6+commit.d41f8b7c, optimizer ON. Creation TX (5357 bytes) = compiled (5229 bytes) + 128 bytes ABI-encoded constructor args (minimumQuorum=0, debatingPeriod=10000min, majorityMargin=0, congressLeader=0x0).',
  short_description = 'The ethereum.org Blockchain Congress governance contract, deployed by Vitalik Buterin on December 28, 2015.',
  description = 'The ethereum.org Blockchain Congress governance contract, deployed by Vitalik Buterin on December 28, 2015. A live deployment of the official ethereum.org DAO tutorial, demonstrating on-chain governance with member management, proposal creation, voting, and execution. Constructor configured with 10,000-minute (~7 day) debate period, simple majority, and no minimum quorum.',
  historical_significance = 'One of the earliest governance contracts deployed on Ethereum mainnet, and the first known live deployment of the official ethereum.org DAO tutorial source code. Deployed by Vitalik Buterin the same day the ethereum.org tutorial page was updated (commit ac2f65b5, December 28, 2015). Shows the Ethereum Foundation actively testing their own governance tooling in the months before The DAO launched. The contract saw 100+ transactions, indicating real usage.',
  historical_context = 'In late 2015, the Ethereum Foundation was building out example contracts and tutorials. The DAO tutorial on ethereum.org described a simple voting contract called the Blockchain Congress. This deployment by Vitalik the same day the tutorial was updated suggests it was a live demo or actively used for internal coordination. Solidity 0.1.6 was the latest stable compiler in December 2015.'
WHERE address = '0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb';
