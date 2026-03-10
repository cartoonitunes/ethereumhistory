-- Migration 033: Add verification proof data for 0xe28e72fcf78647adce1f1252f240bbfaebd63bcc
-- Augur REP Crowdsale deployed August 15, 2015 (block 88,090)
-- Byte-for-byte verified with Serpent @ commit 6ace8a6 (August 2015), 856 bytes

UPDATE contracts SET
  compiler_language = 'serpent',
  compiler_commit = '6ace8a6',
  compiler_repo = 'ethereum/serpent',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/augur-crowdsale-verify',
  verification_notes = 'Compiled with Serpent @ commit 6ace8a6 (August 2015). Two non-obvious source details required for exact match: (1) buyRep() uses an if/else structure on the block.number < endBlock check — not a trailing return(0). This generates a PUSH2+JUMP trampoline between the true and false branches. (2) getAmountSent() compares as `address == self.funders[i].addr` with the parameter on the LEFT side of ==. Serpent evaluates the left operand first, so reversing the order changes the bytecode. Critical discovery: the Serpent (lll code 0) wrapper appends 4 bytes of init-code epilogue (JUMPDEST PUSH1(0) RETURN) after the runtime in the creation bytecode. These bytes are NOT deployed — the CODECOPY in the init section explicitly copies only 856 bytes. Runtime must be extracted using the CODECOPY size field, not by bytecode scanning.',
  source_code = 'data funders[](addr, amt, blockNum)
data funderNum
data addrToIndex[]
data wallet
data endBlock

def init():
    self.wallet = 0xa04fc9bd2be8bcc6875d9ebb964e8f858bcc1b4f
    self.endBlock = 432015

def buyRep():
    if msg.value == 0:
        return(0)
    if block.number < self.endBlock:
        send(self.wallet, msg.value)
        self.funders[self.funderNum].amt = msg.value
        self.funders[self.funderNum].blockNum = block.number
        self.funders[self.funderNum].addr = tx.origin
        self.addrToIndex[tx.origin] = self.funderNum
        self.funderNum += 1
        return(1)
    else:
        return(0)

def getAmountSent(address):
    amount = 0
    i = 0
    while i < self.funderNum:
        if address == self.funders[i].addr:
            amount += self.funders[i].amt
        i += 1
    return(amount)

def getBlockNumSent(address):
    return(self.funders[self.addrToIndex[address]].blockNum)

def getFunderNum():
    return(self.funderNum)

def getAmtByIndex(index):
    return(self.funders[index].amt)

def getAddrByIndex(index):
    return(self.funders[index].addr)

def getBlockNumByIndex(index):
    return(self.funders[index].blockNum)

def addrToFunder(address):
    return(self.addrToIndex[address])

def getFundsRaised():
    return(self.wallet.balance)'
WHERE address = '0xe28e72fcf78647adce1f1252f240bbfaebd63bcc';
