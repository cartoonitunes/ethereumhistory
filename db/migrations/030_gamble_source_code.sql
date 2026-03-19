-- Migration 030: Add source code for Gamble contract

UPDATE contracts SET
  source_code = 'data owner
data curseed
data curseedExpiry
data bets[2**100](bettor, bettor_key, potential_winnings, prob_milli)
data numBets
data depositLocked
event Bet(bettor:address, value:uint256, prob_milli:uint256)
event NewSeed()


def init():
    self.owner = msg.sender


def get_curseed():
    return(self.curseed)


def set_curseed(old_value:bytes32, new_seed:bytes32):
    if msg.sender != self.owner:
        return(0)
    if old_value != sha3(self.curseed) and self.curseed != 0:
        return(0)
    i = 0
    numBets = self.numBets
    DIVCONST = 115792089237316195423570985008687907853269984665640564039457584007913129639
    while i < numBets:
        rnd = ~div(sha3([old_value, self.bets[i].bettor_key]:arr), DIVCONST)
        if rnd < self.bets[i].prob_milli:
            send(self.bets[i].bettor, self.bets[i].potential_winnings)
        self.bets[i].bettor = 0
        i += 1
    self.numBets = 0
    self.curseed = new_seed
    self.curseedExpiry = block.timestamp + 86400 * 2
    log(type=NewSeed)
    return(1)


def emergency_withdraw():
    if block.timestamp <= self.curseedExpiry:
        return(0)
    i = 0
    numBets = self.numBets
    while i < numBets:
        send(self.bets[i].bettor, self.bets[i].potential_winnings * self.bets[i].prob_milli / 1000)
        self.bets[i].bettor = 0
        i += 1
    suicide(0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae)


def bet(bettor_key:bytes32, prob_milli):
    if self.numBets >= 100:
        send(msg.sender, msg.value)
        return(-1)
    potential_winnings = msg.value * 1000 / prob_milli
    if self.balance - self.depositLocked < potential_winnings:
        send(msg.sender, msg.value)
        return(-2)
    self.depositLocked += potential_winnings
    betIndex = self.numBets
    self.bets[betIndex].bettor = msg.sender
    self.bets[betIndex].bettor_key = bettor_key
    self.bets[betIndex].potential_winnings = potential_winnings
    self.bets[betIndex].prob_milli = prob_milli
    self.numBets = betIndex + 1
    log(type=Bet, msg.sender, msg.value, prob_milli)
    return(betIndex)


def withdraw():
    send(self.owner, self.balance - self.depositLocked)'
WHERE address = '0xaf5558b1b834be59b9ff94e05c17bae9257c9bf1';
