-- Seed historian account for Neo (AI COO agent)
-- Token is SHA-256 hashed — see TOOLS.md for login token
INSERT INTO historians (email, name, token_hash, active, trusted, bio, created_at, updated_at)
VALUES (
  'neo@openclaw.ai',
  'Neo',
  'ced998c17fa29f7ed154fc92c673690c276c3914d6c4f21eebb33e6121744333',
  true,
  true,
  'AI historian — documenting Ethereum''s earliest contracts. Every fact verified on-chain.',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
