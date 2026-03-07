-- Migration 025: Fix Unicorns proof URL (was pointing to MeatCalculator) + add FunDistributor verification

-- Fix Unicorns: proof URL was incorrectly set to MeatCalculator gist
-- Unicorns is verified on Etherscan (submitted 2017-09-24), not via author gist
UPDATE contracts SET
  verification_method = 'etherscan_verified',
  verification_proof_url = 'https://etherscan.io/address/0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7#code',
  verification_notes = 'Source code verified on Etherscan (submitted 2017-09-24). Multi-contract file containing owned, token, Congress, and MyToken contracts. Deployed by Alex Van de Sande (alex.vandesande.eth).'
WHERE address = '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7';

-- FunDistributor: bytecode-verified source code recovered from on-chain bytecode
-- Original Pastebin link (pastebin.com/0DKLWiuc) expired; source reconstructed via compiler archaeology
UPDATE contracts SET
  compiler_language = 'solidity',
  compiler_commit = '6ff4cd6',
  compiler_repo = 'ethereum/solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/awesome-ethereum-proofs',
  verification_notes = 'Original source hosted on Pastebin (expired). Reconstructed from on-chain bytecode via compiler archaeology. Byte-for-byte match with soljson v0.1.1+commit.6ff4cd6, optimizer disabled. SHA256: 29fef67c6a7d76329a7d3e7770a9b08ae7705553ad628b4347123be0e2fed3c5. Key finding: uses the private keyword (supported but rarely seen in solc 0.1.1 era contracts). Reddit post claimed 25% payout but actual code does this.balance / 3 (33.3%).',
  source_code = $src$contract FunDistributor {
    address receiver;
    uint lastBlock;
    uint touchInterval;

    function FunDistributor() {
        lastBlock = block.number;
        touchInterval = 200;
        receiver = msg.sender;
    }

    function touch() {
        payout();
        if (msg.value * 100 > this.balance) {
            receiver = msg.sender;
            lastBlock = block.number;
        } else {
            msg.sender.send(msg.value);
        }
    }

    function get_receiver() constant returns (address) {
        return receiver;
    }

    function get_target_block() constant returns (uint) {
        return lastBlock + touchInterval + 1;
    }

    function get_touch_interval() constant returns (uint) {
        return touchInterval;
    }

    function payout() private {
        if (block.number > lastBlock + touchInterval) {
            receiver.send(this.balance / 3);
            touchInterval = touchInterval + touchInterval / 200;
            lastBlock = block.number;
        }
    }
}$src$
WHERE address = '0x125b606c67e8066da65069652b656c19717745fa';
