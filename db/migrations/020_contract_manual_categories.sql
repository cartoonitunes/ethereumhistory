-- Allow historians to override contract categories from an enumerated multi-select list.
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS manual_categories JSONB;
