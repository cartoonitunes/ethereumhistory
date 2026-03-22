-- Fix MyToken 0xe274 from exact to near_exact (622/625 bytes, 3-byte diff)
UPDATE contracts 
SET verification_method = 'near_exact_match'
WHERE address = '0xe274d18ef7b194a1edebb04cfe297cfe1489ef65'
  AND verification_method = 'exact_bytecode_match';

-- Also check for the Mist DAO (0x8d554c6c) which was the other near_exact
-- It was already updated by the partial->near_exact migration
