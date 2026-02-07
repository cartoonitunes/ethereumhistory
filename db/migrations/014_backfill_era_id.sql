-- Migration 014: Backfill era_id from deployment_block
--
-- Many contracts have deployment_block but no era_id.
-- This sets era_id based on the block ranges defined in the codebase:
--   frontier:  0 – 1,149,999
--   homestead: 1,150,000 – 1,919,999
--   dao:       1,920,000 – 2,462,999
--   tangerine: 2,463,000 – 2,674,999
--   spurious:  2,675,000 – 4,369,999

UPDATE contracts
SET era_id = CASE
  WHEN deployment_block BETWEEN 0       AND 1149999 THEN 'frontier'
  WHEN deployment_block BETWEEN 1150000 AND 1919999 THEN 'homestead'
  WHEN deployment_block BETWEEN 1920000 AND 2462999 THEN 'dao'
  WHEN deployment_block BETWEEN 2463000 AND 2674999 THEN 'tangerine'
  WHEN deployment_block BETWEEN 2675000 AND 4369999 THEN 'spurious'
  ELSE era_id
END
WHERE deployment_block IS NOT NULL
  AND (era_id IS NULL OR era_id = '');
