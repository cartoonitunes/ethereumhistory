-- Migration 036: Add ShapeShift chain-split contracts (July 2016)
-- Earliest known ShapeShift on-chain smart contracts, deployed days after the DAO hard fork
-- All deployed by ShapeShift ETH hot wallet (0x9e6316f44baeeee5d41a1070516cc5fa47baf227)
-- All verified: solc v0.2.1-v0.3.5, optimizer ON

-- 94B: Simple active-flag forwarder (Jul 24, 2016)
INSERT INTO contracts (
  address,
  deployment_block,
  deployment_timestamp,
  deployer_address,
  era_id,
  etherscan_contract_name,
  short_description,
  description,
  contract_type,
  code_size_bytes,
  featured,
  source_code,
  compiler_language,
  compiler_commit,
  verification_method,
  verification_proof_url,
  verification_notes
) VALUES (
  '0xa2d5c5eb9bffe1f8380e27cf54311747b7d549de',
  1951734,
  '2016-07-24T00:00:00Z',
  '0x9e6316f44baeeee5d41a1070516cc5fa47baf227',
  'dao',
  'ShapeShift Chain-Split Forwarder',
  'Earliest ShapeShift on-chain contract (Jul 24, 2016). Simple ETH forwarder with an active flag — routes deposits to target when active and msg.value > 0.',
  'The earliest of four ShapeShift chain-split contracts deployed in the week following the DAO hard fork (July 20, 2016). Deployed July 24, 2016 by the ShapeShift ETH hot wallet (0x9e6316). The contract has no function selectors — only a fallback function that checks whether the contract is active and msg.value is non-zero, then forwards ETH to the stored target address via send(). Two days later, ShapeShift deployed the more sophisticated ShapeShiftReceiver and ShapeShiftSplit contracts using an external forked() oracle for chain detection.',
  'utility',
  94,
  FALSE,
  'contract Forked {
    function forked() returns (bool);
}

contract ShapeShiftFallback {
    bool active;
    address checker;
    address target;

    function ShapeShiftFallback(address _checker, address _target) {
        active = true;
        checker = _checker;
        target = _target;
    }

    function() {
        if (active == false || msg.value == 0 || !target.send(msg.value)) throw;
    }
}',
  'solidity',
  'solc v0.2.1-v0.3.5 (optimizer ON)',
  'exact_bytecode_match',
  'https://github.com/cartoonitunes/shapeshift-chainsplit-verification',
  'Exact runtime bytecode match (94 bytes). Key finding: active == false condition (not !active) generates the DUP1 + ISZERO + ISZERO + EQ opcode pattern. Matches solc v0.2.1 through v0.3.5 with optimizer enabled.'
) ON CONFLICT (address) DO UPDATE SET
  etherscan_contract_name = EXCLUDED.etherscan_contract_name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  source_code = EXCLUDED.source_code,
  compiler_language = EXCLUDED.compiler_language,
  compiler_commit = EXCLUDED.compiler_commit,
  verification_method = EXCLUDED.verification_method,
  verification_proof_url = EXCLUDED.verification_proof_url,
  verification_notes = EXCLUDED.verification_notes;

-- 287B Instance 1 (Jul 26, 2016)
INSERT INTO contracts (
  address,
  deployment_block,
  deployment_timestamp,
  deployer_address,
  era_id,
  etherscan_contract_name,
  short_description,
  description,
  contract_type,
  code_size_bytes,
  featured,
  source_code,
  compiler_language,
  compiler_commit,
  verification_method,
  verification_proof_url,
  verification_notes
) VALUES (
  '0x3e7756b1ea48f2caf35d820b5e46cbbec62e7a25',
  1957038,
  '2016-07-26T17:38:56Z',
  '0x9e6316f44baeeee5d41a1070516cc5fa47baf227',
  'dao',
  'ShapeShift Chain-Split Receiver',
  'ShapeShift ETH/ETC routing contract (Jul 26, 2016). Forwards ETH to target only when on-chain forked() oracle result matches stored boolean — routing deposits to the correct wallet on each chain post-DAO-fork.',
  'Deployed July 26, 2016 — 6 days after the DAO hard fork split Ethereum into ETH and ETC. One of two identical instances deployed in consecutive blocks by the ShapeShift ETH hot wallet. Queries the forked() oracle at 0x2bd2326c993dfaef84f696526064ff22eba5b362 to determine which chain it is running on, then forwards incoming ETH to the configured target only when the oracle result matches the stored forked boolean. This enabled ShapeShift to maintain separate deposit addresses for ETH and ETC with on-chain routing logic.',
  'utility',
  287,
  FALSE,
  'contract Forked {
    function forked() returns (bool);
}

contract ShapeShiftReceiver {
    address forkedContract;
    address public target;
    bool public forked;

    function ShapeShiftReceiver(address _forkedContract, address _target, bool _forked) {
        forkedContract = _forkedContract;
        target = _target;
        forked = _forked;
    }

    function() {
        if (Forked(forkedContract).forked() != forked || msg.value == 0 || !target.send(msg.value)) throw;
    }
}',
  'solidity',
  'solc v0.2.1-v0.3.5 (optimizer ON)',
  'exact_bytecode_match',
  'https://github.com/cartoonitunes/shapeshift-chainsplit-verification',
  'Exact runtime bytecode match (287 bytes). Key finding: bool public forked generates the forked() getter with selector 0x16c72721. Condition != forked (not == forked) produces 287B; the latter produces 289B. Matches solc v0.2.1 through v0.3.5 with optimizer.'
) ON CONFLICT (address) DO UPDATE SET
  etherscan_contract_name = EXCLUDED.etherscan_contract_name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  source_code = EXCLUDED.source_code,
  compiler_language = EXCLUDED.compiler_language,
  compiler_commit = EXCLUDED.compiler_commit,
  verification_method = EXCLUDED.verification_method,
  verification_proof_url = EXCLUDED.verification_proof_url,
  verification_notes = EXCLUDED.verification_notes;

-- 287B Instance 2 (Jul 26, 2016 - consecutive block)
INSERT INTO contracts (
  address,
  deployment_block,
  deployment_timestamp,
  deployer_address,
  era_id,
  etherscan_contract_name,
  short_description,
  description,
  contract_type,
  code_size_bytes,
  featured,
  source_code,
  compiler_language,
  compiler_commit,
  verification_method,
  verification_proof_url,
  verification_notes
) VALUES (
  '0x89afcc1452d4ffbf720bdd2da354fc0691a51456',
  1957039,
  '2016-07-26T17:39:47Z',
  '0x9e6316f44baeeee5d41a1070516cc5fa47baf227',
  'dao',
  'ShapeShift Chain-Split Receiver',
  'ShapeShift ETH/ETC routing contract (Jul 26, 2016). Twin instance of the ShapeShiftReceiver — identical bytecode, configured for the opposite chain fork state.',
  'Deployed July 26, 2016 — 6 days after the DAO hard fork. Twin instance of 0x3e7756, deployed in the immediately following block by the same ShapeShift ETH wallet. Identical 287-byte bytecode, configured with forked=false for the ETC chain routing (where forked() oracle returns false). Together with its sibling, the ShapeShiftSplit contract, and the earlier 94-byte forwarder, these represent the first on-chain smart contract infrastructure deployed by ShapeShift.',
  'utility',
  287,
  FALSE,
  'contract Forked {
    function forked() returns (bool);
}

contract ShapeShiftReceiver {
    address forkedContract;
    address public target;
    bool public forked;

    function ShapeShiftReceiver(address _forkedContract, address _target, bool _forked) {
        forkedContract = _forkedContract;
        target = _target;
        forked = _forked;
    }

    function() {
        if (Forked(forkedContract).forked() != forked || msg.value == 0 || !target.send(msg.value)) throw;
    }
}',
  'solidity',
  'solc v0.2.1-v0.3.5 (optimizer ON)',
  'exact_bytecode_match',
  'https://github.com/cartoonitunes/shapeshift-chainsplit-verification',
  'Identical bytecode to 0x3e7756b1 (287 bytes). Same source, same compiler, different constructor arguments.'
) ON CONFLICT (address) DO UPDATE SET
  etherscan_contract_name = EXCLUDED.etherscan_contract_name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  source_code = EXCLUDED.source_code,
  compiler_language = EXCLUDED.compiler_language,
  compiler_commit = EXCLUDED.compiler_commit,
  verification_method = EXCLUDED.verification_method,
  verification_proof_url = EXCLUDED.verification_proof_url,
  verification_notes = EXCLUDED.verification_notes;

-- 301B: Split function contract (Jul 26, 2016)
INSERT INTO contracts (
  address,
  deployment_block,
  deployment_timestamp,
  deployer_address,
  era_id,
  etherscan_contract_name,
  short_description,
  description,
  contract_type,
  code_size_bytes,
  featured,
  source_code,
  compiler_language,
  compiler_commit,
  verification_method,
  verification_proof_url,
  verification_notes
) VALUES (
  '0xfdc6a6ad6711ca98c1cb269312c93d601ee2dbbf',
  1957123,
  '2016-07-26T18:00:58Z',
  '0x9e6316f44baeeee5d41a1070516cc5fa47baf227',
  'dao',
  'ShapeShift Chain-Split Splitter',
  'ShapeShift conditional ETH splitter (Jul 26, 2016). split(address,uint) routes ETH to a specified address — but only on the ETC chain (where forked() returns false). Returns false on ETH chain.',
  'Deployed July 26, 2016, the same day as the ShapeShiftReceiver twins. The split() function takes a target address and ETH amount, calls the forked() oracle twice to verify chain state, and routes funds only on the ETC chain. On the ETH chain (where forked() returns true), it returns false immediately without sending. The double forked() call pattern — first to short-circuit if on ETH, second to confirm before sending — appears intentional for safety. Deployed alongside the two ShapeShiftReceiver contracts within the same hour.',
  'utility',
  301,
  FALSE,
  'contract Forked {
    function forked() returns (bool);
}

contract ShapeShiftSplit {
    address forkedContract;

    function ShapeShiftSplit(address _forkedContract) {
        forkedContract = _forkedContract;
    }

    function split(address _to, uint _value) returns (bool) {
        if (Forked(forkedContract).forked()) return false;
        if (!Forked(forkedContract).forked() && _to.send(_value)) return true;
        throw;
    }
}',
  'solidity',
  'solc v0.2.1-v0.3.5 (optimizer ON)',
  'exact_bytecode_match',
  'https://github.com/cartoonitunes/shapeshift-chainsplit-verification',
  'Exact runtime bytecode match (301 bytes). The two forked() calls are present in source — first call short-circuits if on ETH chain, second verifies before sending on ETC chain. Matches solc v0.2.1 through v0.3.5 with optimizer.'
) ON CONFLICT (address) DO UPDATE SET
  etherscan_contract_name = EXCLUDED.etherscan_contract_name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  source_code = EXCLUDED.source_code,
  compiler_language = EXCLUDED.compiler_language,
  compiler_commit = EXCLUDED.compiler_commit,
  verification_method = EXCLUDED.verification_method,
  verification_proof_url = EXCLUDED.verification_proof_url,
  verification_notes = EXCLUDED.verification_notes;

-- Fix: set verification fields that failed on initial insert
UPDATE contracts SET
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/shapeshift-chainsplit-verification',
  compiler_language = 'solidity'
WHERE address IN (
  '0xa2d5c5eb9bffe1f8380e27cf54311747b7d549de',
  '0x3e7756b1ea48f2caf35d820b5e46cbbec62e7a25',
  '0x89afcc1452d4ffbf720bdd2da354fc0691a51456',
  '0xfdc6a6ad6711ca98c1cb269312c93d601ee2dbbf'
);
