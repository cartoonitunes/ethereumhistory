-- Fix 5795 contracts that got Etherscan V1 deprecation message stored as bytecode
UPDATE contracts SET 
  deployed_bytecode = NULL, 
  deployed_bytecode_hash = NULL 
WHERE deployed_bytecode LIKE '%deprecated%' 
   OR deployed_bytecode LIKE '%etherscan%'
   OR deployed_bytecode LIKE '%Etherscan%';
