-- Migration 039: Reframe EFSubMultisig as voting/signaling contract, not multisig

UPDATE contracts SET
  short_description = 'An early EF multi-party signaling contract (Serpent, Aug 2015). Three developer keys co-sign to emit on-chain events. No ETH, no external calls.',
  description = 'A 3-of-3 on-chain voting contract deployed by the Ethereum Foundation EF 1 wallet on August 12, 2015, just 13 days after Frontier launched. Three signer addresses are hardcoded in the constructor. Any two of three signers can call signMotion to vote on a proposal. Once majority is reached, if the target address is zero, the contract emits a log event with the data payload. Despite being labeled "EFSubMultisig" on Etherscan, this is not a multisig in the standard sense. It holds no funds, cannot transfer ETH, and cannot call other contracts. It is a coordinated signaling mechanism: three EF developer keys agreeing on a message to emit on-chain.',
  historical_significance = 'The first preserved contract deployed by the Ethereum Foundation EF 1 developer wallet, and an early example of multi-party coordination on Ethereum. The design, likely inspired by the multisig concept but stripped to its simplest form, captures how the core team was experimenting with on-chain governance primitives in the days after Frontier launch. A twin contract with identical bytecode was deployed 23 minutes earlier at 0x2194b1734ee0f67440884da49952a45b34ba832d, likely a test run. The same EF 1 wallet later deployed the Gamble contract at block 235,543, which has also been bytecode-verified.',
  historical_context = 'Ethereum Frontier launched July 30, 2015. In the first two weeks, core developers deployed foundational infrastructure including wallets, registries, and coordination tools. The EF 1 address was one of several EF developer keys active in this period. This contract appears to have been deployed as part of an initial operational setup. The three signer slots hold addresses with no other on-chain transaction history, likely cold or hardware wallet addresses held by different EF team members whose identities have not been publicly confirmed. On-chain storage confirms the three signers: 0x23a1bada327be1da636cf6c31f71349e3ea0ba00, 0x288bbeb76a509947f3ea8c56e9b86d81f3b41897, and 0x5ed8cee6b63b1c6afce3ad7c92f4fd7e1b8fad9f. The contract was used only three times, all on its deployment day.',
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
                self.proposals[proposal_id][3] = 0'
WHERE address = '0x209711382eaeb6c1e021e0fc81acc5afa9b23d25';
