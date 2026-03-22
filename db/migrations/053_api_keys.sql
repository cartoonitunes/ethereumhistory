CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  historian_id INTEGER NOT NULL REFERENCES historians(id),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,  -- first 8 chars for display (e.g. "eh_abc123")
  name TEXT,  -- user-given label like "My Bot"
  tier TEXT NOT NULL DEFAULT 'historian',  -- historian, pro, enterprise (future)
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  CONSTRAINT fk_historian FOREIGN KEY (historian_id) REFERENCES historians(id)
);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_historian ON api_keys(historian_id);
