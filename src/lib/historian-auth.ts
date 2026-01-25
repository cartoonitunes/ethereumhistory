import crypto from "crypto";
import { cookies } from "next/headers";
import { getHistorianByIdFromDb } from "./db-client";
import type { HistorianMe } from "@/types";
import { historianRowToMe } from "./db-client";

const COOKIE_NAME = "eh_historian";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSessionSecret(): string {
  const secret = process.env.HISTORIAN_SESSION_SECRET;
  if (!secret) {
    throw new Error("HISTORIAN_SESSION_SECRET is not set");
  }
  return secret;
}

export function hashHistorianToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function sign(payload: string): string {
  const secret = getSessionSecret();
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function getHistorianSessionCookieName(): string {
  return COOKIE_NAME;
}

export function buildHistorianSessionCookieValue(historianId: number): string {
  const issuedAt = Date.now();
  const payload = `${historianId}.${issuedAt}`;
  const sig = sign(payload);
  const value = `${payload}.${sig}`;
  return value;
}

export function getHistorianSessionCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

function parseSessionCookie(raw: string | undefined): { historianId: number; issuedAt: number } | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [idStr, issuedStr, sig] = parts;
  const payload = `${idStr}.${issuedStr}`;
  const expected = sign(payload);
  try {
    // constant time compare
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const historianId = Number(idStr);
  const issuedAt = Number(issuedStr);
  if (!Number.isFinite(historianId) || !Number.isFinite(issuedAt)) return null;

  // basic TTL guard (30 days)
  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0 || ageMs > 1000 * 60 * 60 * 24 * 30) return null;

  return { historianId, issuedAt };
}

export async function getHistorianMeFromCookies(): Promise<HistorianMe | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const parsed = parseSessionCookie(raw);
  if (!parsed) return null;
  const row = await getHistorianByIdFromDb(parsed.historianId);
  if (!row) return null;
  if (!row.active) return null;
  return historianRowToMe(row);
}

