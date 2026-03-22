/**
 * API Key Authentication
 *
 * Validates API keys passed via x-api-key header.
 * Keys are stored as SHA-256 hashes in the database.
 */

import crypto from "crypto";
import { NextRequest } from "next/server";
import { eq, isNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "./db-client";
import * as schema from "./schema";

export interface ApiKeyValidationResult {
  valid: boolean;
  historianId?: number;
  tier?: string;
  rateLimit?: number;
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key, "utf8").digest("hex");
}

export async function validateApiKeyFromRequest(
  request: NextRequest
): Promise<ApiKeyValidationResult> {
  const key = request.headers.get("x-api-key");
  if (!key || !key.startsWith("eh_")) {
    return { valid: false };
  }

  if (!isDatabaseConfigured()) {
    return { valid: false };
  }

  const keyHash = hashApiKey(key);

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.keyHash, keyHash))
      .limit(1);

    if (!rows.length) {
      return { valid: false };
    }

    const row = rows[0];

    // Reject revoked keys
    if (row.revokedAt !== null) {
      return { valid: false };
    }

    // Update last_used_at asynchronously (fire-and-forget, don't block response)
    db.update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, row.id))
      .catch(() => {
        // Ignore errors — last_used_at is best-effort
      });

    return {
      valid: true,
      historianId: row.historianId,
      tier: row.tier,
      rateLimit: row.rateLimitPerMinute,
    };
  } catch {
    return { valid: false };
  }
}
