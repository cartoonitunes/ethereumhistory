-- Rename partial_match to near_exact_match
UPDATE contracts 
SET verification_method = 'near_exact_match' 
WHERE verification_method = 'partial_match';
