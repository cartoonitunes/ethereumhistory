/**
 * EH Explorer cloud save — backed by the EH Neon/Postgres database (NOT Turso,
 * which ran out of memory). Keyed on the player's verified Google `sub`.
 *
 *   GET  /api/game/save  → { state } | { state: null }
 *   POST /api/game/save  { state }   → { ok: true }
 *
 * Auth: send the Google ID token as `Authorization: Bearer <id_token>`. We verify
 * it server-side via Google's tokeninfo endpoint and key the save on the stable
 * `sub`. Email is never stored. Plays fully offline via localStorage; signing in
 * just syncs across devices.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";

export const dynamic = "force-dynamic";

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const db = getDb();
  await db.execute(sql`CREATE TABLE IF NOT EXISTS game_saves (
    sub TEXT PRIMARY KEY, state JSONB NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  ensured = true;
}

async function verifySub(req: NextRequest): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token));
    if (!r.ok) return null;
    const info = (await r.json()) as { sub?: string; aud?: string; exp?: string };
    const aud = process.env.GOOGLE_CLIENT_ID;
    if (aud && info.aud && info.aud !== aud) return null;          // wrong app
    if (info.exp && Number(info.exp) * 1000 <= Date.now()) return null; // expired
    return info.sub || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const sub = await verifySub(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureTable();
    const res = await getDb().execute(sql`SELECT state FROM game_saves WHERE sub = ${sub} LIMIT 1`);
    const rows = (((res as unknown) as { rows?: unknown[] }).rows ?? (res as unknown[])) as { state: unknown }[];
    return NextResponse.json({ state: rows[0]?.state ?? null });
  } catch (e) {
    console.error("[/api/game/save GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const sub = await verifySub(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { state?: unknown } | null;
  if (!body || body.state == null) return NextResponse.json({ error: "Missing state" }, { status: 400 });
  try {
    await ensureTable();
    await getDb().execute(sql`
      INSERT INTO game_saves (sub, state, updated_at) VALUES (${sub}, ${JSON.stringify(body.state)}::jsonb, now())
      ON CONFLICT (sub) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/game/save POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
