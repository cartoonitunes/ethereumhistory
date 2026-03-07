-- Migration 026: Point FunDistributor proof URL to dedicated verification repo
UPDATE contracts SET
  verification_proof_url = 'https://github.com/cartoonitunes/fundistributor-verification'
WHERE address = '0x125b606c67e8066da65069652b656c19717745fa';
