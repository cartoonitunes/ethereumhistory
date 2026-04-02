-- Migration 063: Era cleanup + Byzantine era definition backfill
--
-- 1. Fix stray era_id='5' (CryptoCatsMarket, data corruption) → 'spurious'
-- 2. Backfill NULL era_ids for 2017 contracts using timestamp ranges
-- 3. Backfill NULL era_ids for 2018+ contracts
--
-- Era block/date boundaries:
--   frontier:   0         – 1,149,999  (genesis – 2016-03-14)
--   homestead:  1,150,000 – 1,919,999  (2016-03-14 – 2016-07-20)
--   dao:        1,920,000 – 2,462,999  (2016-07-20 – 2016-10-18)
--   tangerine:  2,463,000 – 2,674,999  (2016-10-18 – 2016-11-22)
--   spurious:   2,675,000 – 4,369,999  (2016-11-22 – 2017-10-16)
--   byzantium:  4,370,000 – 7,279,999  (2017-10-16 – 2019-02-28)
--   constantinople: 7,280,000+         (2019-02-28+)

-- Fix the stray '5' era
UPDATE contracts
SET era_id = 'spurious'
WHERE era_id = '5';

-- Backfill NULLs using deployment_block where available
UPDATE contracts
SET era_id = CASE
  WHEN deployment_block < 1150000  THEN 'frontier'
  WHEN deployment_block < 1920000  THEN 'homestead'
  WHEN deployment_block < 2463000  THEN 'dao'
  WHEN deployment_block < 2675000  THEN 'tangerine'
  WHEN deployment_block < 4370000  THEN 'spurious'
  WHEN deployment_block < 7280000  THEN 'byzantium'
  ELSE 'constantinople'
END
WHERE era_id IS NULL
  AND deployment_block IS NOT NULL;

-- Backfill remaining NULLs using deployment_timestamp
UPDATE contracts
SET era_id = CASE
  WHEN deployment_timestamp < '2016-03-14' THEN 'frontier'
  WHEN deployment_timestamp < '2016-07-20' THEN 'homestead'
  WHEN deployment_timestamp < '2016-10-18' THEN 'dao'
  WHEN deployment_timestamp < '2016-11-22' THEN 'tangerine'
  WHEN deployment_timestamp < '2017-10-16' THEN 'spurious'
  WHEN deployment_timestamp < '2019-02-28' THEN 'byzantium'
  ELSE 'constantinople'
END
WHERE era_id IS NULL
  AND deployment_timestamp IS NOT NULL;
