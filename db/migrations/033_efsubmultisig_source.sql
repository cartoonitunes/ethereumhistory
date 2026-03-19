-- Migration 033: Add source code for EFSubMultisig

UPDATE contracts SET
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
