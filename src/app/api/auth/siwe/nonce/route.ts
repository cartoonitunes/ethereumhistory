/**
 * SIWE Nonce Generation
 *
 * GET /api/auth/siwe/nonce
 * Returns a random nonce and stores it in a cookie for verification.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const nonce = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("siwe_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return NextResponse.json({ nonce });
}
