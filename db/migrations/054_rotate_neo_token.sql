-- Rotate Neo's historian token (old token was exposed in public GitHub repo)
UPDATE historians
SET token_hash = 'c7ad6d7e0d628ed6d81e10fe7014c1f965c00ca98725ae700d9edf35a75e5443',
    active = true,
    updated_at = NOW()
WHERE email = 'neo@openclaw.ai';
