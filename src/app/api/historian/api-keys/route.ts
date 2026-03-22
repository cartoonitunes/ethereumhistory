/**
 * Historian API Keys Management
 *
 * GET    /api/historian/api-keys  — List logged-in historian's keys (no full key returned)
 * POST   /api/historian/api-keys  — Generate a new API key (full key returned ONCE)
 * DELETE /api/historian/api-keys  — Revoke a key by id
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { hashApiKey } from "@/lib/api-key-auth";
import * as schema from "@/lib/schema";

export const dynamic = "force-dynamic";

const MAX_ACTIVE_KEYS = 5;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function dbNotConfigured() {
  return NextResponse.json({ error: "Database not configured" }, { status: 503 });
}

// GET — list keys
export async function GET(): Promise<NextResponse> {
  const me = await getHistorianMeFromCookies();
  if (!me) return unauthorized();
  if (!isDatabaseConfigured()) return dbNotConfigured();

  const db = getDb();
  const rows = await db
    .select({
      id: schema.apiKeys.id,
      keyPrefix: schema.apiKeys.keyPrefix,
      name: schema.apiKeys.name,
      tier: schema.apiKeys.tier,
      rateLimitPerMinute: schema.apiKeys.rateLimitPerMinute,
      createdAt: schema.apiKeys.createdAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      revokedAt: schema.apiKeys.revokedAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.historianId, me.id))
    .orderBy(schema.apiKeys.createdAt);

  return NextResponse.json({ data: rows });
}

// POST — generate a new key
export async function POST(request: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromCookies();
  if (!me) return unauthorized();
  if (!isDatabaseConfigured()) return dbNotConfigured();

  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine
  }

  const db = getDb();

  // Count active (non-revoked) keys
  const activeKeys = await db
    .select({ id: schema.apiKeys.id })
    .from(schema.apiKeys)
    .where(
      and(
        eq(schema.apiKeys.historianId, me.id),
        isNull(schema.apiKeys.revokedAt)
      )
    );

  if (activeKeys.length >= MAX_ACTIVE_KEYS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_ACTIVE_KEYS} active API keys allowed. Revoke an existing key first.` },
      { status: 400 }
    );
  }

  // Generate key: eh_ + 32 random hex chars
  const randomHex = crypto.randomBytes(16).toString("hex"); // 16 bytes = 32 hex chars
  const key = `eh_${randomHex}`;
  const keyPrefix = key.slice(0, 11); // "eh_" + 8 chars = 11 chars
  const keyHash = hashApiKey(key);

  const name = body.name?.trim() || null;

  const [row] = await db
    .insert(schema.apiKeys)
    .values({
      historianId: me.id,
      keyHash,
      keyPrefix,
      name,
      tier: "historian",
      rateLimitPerMinute: 120,
    })
    .returning({
      id: schema.apiKeys.id,
      keyPrefix: schema.apiKeys.keyPrefix,
      name: schema.apiKeys.name,
      tier: schema.apiKeys.tier,
      rateLimitPerMinute: schema.apiKeys.rateLimitPerMinute,
      createdAt: schema.apiKeys.createdAt,
    });

  return NextResponse.json({
    data: {
      ...row,
      key, // Full key returned ONCE
    },
    message: "Store this key securely — it won't be shown again.",
  });
}

// DELETE — revoke a key
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromCookies();
  if (!me) return unauthorized();
  if (!isDatabaseConfigured()) return dbNotConfigured();

  let body: { id?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "number") {
    return NextResponse.json({ error: "Key id is required" }, { status: 400 });
  }

  const db = getDb();

  // Only revoke keys belonging to the logged-in historian
  const [updated] = await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.apiKeys.id, body.id),
        eq(schema.apiKeys.historianId, me.id),
        isNull(schema.apiKeys.revokedAt) // don't double-revoke
      )
    )
    .returning({ id: schema.apiKeys.id });

  if (!updated) {
    return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
  }

  return NextResponse.json({ data: { revoked: true, id: updated.id } });
}
