-- Migration 015: Backfill era_id from deployment_timestamp for all contracts
--
-- Only 12K contracts had deployment_block; 175K+ were missing era_id.
-- This uses deployment_timestamp (available on all 187K contracts) to
-- assign eras based on the era date boundaries:
--   frontier:  genesis – 2016-03-14
--   homestead: 2016-03-14 – 2016-07-20
--   dao:       2016-07-20 – 2016-10-18
--   tangerine: 2016-10-18 – 2016-11-22
--   spurious:  2016-11-22 – 2017-10-16

UPDATE contracts
SET era_id = CASE
  WHEN deployment_timestamp < '2016-03-14' THEN 'frontier'
  WHEN deployment_timestamp < '2016-07-20' THEN 'homestead'
  WHEN deployment_timestamp < '2016-10-18' THEN 'dao'
  WHEN deployment_timestamp < '2016-11-22' THEN 'tangerine'
  WHEN deployment_timestamp < '2017-10-16' THEN 'spurious'
  ELSE era_id
END
WHERE deployment_timestamp IS NOT NULL
  AND (era_id IS NULL OR era_id = '');
