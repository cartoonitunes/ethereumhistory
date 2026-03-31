/**
 * Google OAuth Initiation
 *
 * GET /api/auth/google?next=/some/path
 * Redirects user to Google for authorization.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 503 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_ENV === "production" ? "https://www.ethereumhistory.com" : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const redirectUri = `${siteUrl}/api/auth/google/callback`;
  const csrfToken = crypto.randomBytes(16).toString("hex");

  // Encode the `next` redirect URL + CSRF token into state
  const next = request.nextUrl.searchParams.get("next") || "/";
  const statePayload = JSON.stringify({ csrf: csrfToken, next });
  const state = Buffer.from(statePayload).toString("base64url");

  // Store CSRF token in a cookie for validation
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_csrf", csrfToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
