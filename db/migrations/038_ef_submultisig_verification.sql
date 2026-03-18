-- Migration 038: Update EF Sub-Multisig Serpent contract with verification proof
-- Contract: 0x209711382eaeb6c1e021e0fc81acc5afa9b23d25
-- Deployed: Block 72,142 (August 12, 2015 02:52 UTC)
-- Deploy TX: 0x13cba3a6c151c19cce0778688fa644edec2f01dede3939512eb5dba185e37ccd
-- Deployer: 0x5ed8cee6b63b1c6afce3ad7c92f4fd7e1b8fad9f
-- Compiler: Serpent (ethereum/serpent, python2)
-- Match: First 738 bytes of compiled output match on-chain bytecode exactly

UPDATE contracts SET
  etherscan_contract_name = 'EFSubMultisig',
  short_description = 'Ethereum Foundation internal sub-multisig (Serpent, Aug 2015). Three EF developer keys, majority vote to execute motions.',
  description = 'One of the earliest multisig governance contracts on Ethereum, written in Serpent by the Ethereum Foundation core team in August 2015 - just days after Frontier launch. The contract implements a simple 3-of-3 signer model where any majority (2+) can execute motions. Three EF core developer addresses are hardcoded in the constructor (slots 0-2): 0x23a1bada..., 0x288bbeb7..., and 0x5ed8cee6... (the deployer). Signer 2 also deployed the EF Foundation Wallet (0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae) and used this sub-multisig to authorize wallet operations. A twin contract at 0x2194b1734ee0f67440884da49952a45b34ba832d was deployed 23 minutes earlier in the same session. Both saw only three transactions: deploy, createMotion test, and signMotion test. Deploy TX: 0x13cba3a6c151c19cce0778688fa644edec2f01dede3939512eb5dba185e37ccd.',
  source_code = 'data _p0
data _p1
data proposals[][4]

def createMotion(addr, data:bytes32):
    idx = self.storage[0x0101]
    self.proposals[idx][0] = addr
    self.proposals[idx][3] = data
    self.storage[0x0101] = idx + 1

def signMotion(slot, proposal_id):
    if msg.sender == self.storage[slot]:
        voted = self.proposals[proposal_id][1] & 2**slot
        if not voted:
            self.proposals[proposal_id][1] = self.proposals[proposal_id][1] | 2**slot
            self.proposals[proposal_id][2] = self.proposals[proposal_id][2] + 1
            if self.proposals[proposal_id][2] > self.storage[0x0100] / 2:
                value = self.proposals[proposal_id][0]
                if value == 0:
                    log(self.proposals[proposal_id][3])
                self.proposals[proposal_id][0] = 0
                self.proposals[proposal_id][1] = 0
                self.proposals[proposal_id][2] = 0
                self.proposals[proposal_id][3] = 0',
  compiler_language = 'serpent',
  compiler_commit = 'ethereum/serpent (python2)',
  compiler_repo = 'https://github.com/ethereum/serpent',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/ef-multisig-verification',
  verification_notes = 'First 738 bytes of Serpent-compiled output match the 738-byte on-chain runtime exactly. The compiled output produces 742 bytes total; the final 4 bytes (5b 60 00 f3 = JUMPDEST PUSH1 0x00 RETURN) are a trailing return stub emitted by newer Serpent but absent in the deployer version. Identical bytecode also deployed at 0x2194b1734ee0f67440884da49952a45b34ba832d (block 72,119, 23 minutes earlier). Function selectors: 0x403147b6 = createMotion(addr,data:bytes32), 0xa42c4de7 = signMotion(slot,proposal_id). Storage layout: slots 0-2 = signers, 0x0100 = num_signers (3), 0x0101 = next_proposal_id, sha3([2,id,0-3]) = proposal fields.',
  decompilation_success = TRUE
WHERE address = '0x209711382eaeb6c1e021e0fc81acc5afa9b23d25';
