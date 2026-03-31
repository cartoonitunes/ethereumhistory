/**
 * Google OAuth Callback
 *
 * GET /api/auth/google/callback
 * Exchanges code for tokens, fetches user info, creates/finds historian, sets session.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isDatabaseConfigured,
  getHistorianByGoogleIdFromDb,
  getHistorianByEmailFromDb,
  linkGoogleIdToHistorianFromDb,
  createHistorianFromOAuth,
} from "@/lib/db-client";
import {
  buildHistorianSessionCookieValue,
  getHistorianSessionCookieName,
  getHistorianSessionCookieOptions,
} from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_ENV === "production" ? "https://www.ethereumhistory.com" : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !isDatabaseConfigured()) {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=not_configured`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const errorParam = request.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=oauth_denied`);
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=missing_params`);
  }

  // Decode state and verify CSRF
  let next = "/";
  try {
    const statePayload = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
    const cookieStore = await cookies();
    const savedCsrf = cookieStore.get("google_oauth_csrf")?.value;
    cookieStore.delete("google_oauth_csrf");

    if (!savedCsrf || savedCsrf !== statePayload.csrf) {
      return NextResponse.redirect(`${siteUrl}/historian/login?error=invalid_state`);
    }

    next = statePayload.next || "/";
  } catch {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=invalid_state`);
  }

  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  // Exchange code for tokens
  let idToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      console.error("[google-oauth] Token exchange failed:", tokenData);
      return NextResponse.redirect(`${siteUrl}/historian/login?error=token_failed`);
    }
    idToken = tokenData.id_token;
  } catch (error) {
    console.error("[google-oauth] Token exchange error:", error);
    return NextResponse.redirect(`${siteUrl}/historian/login?error=token_failed`);
  }

  // Decode ID token (JWT) to get user info
  // Google ID tokens are signed JWTs — we decode the payload (verification happens via the token exchange)
  let googleUser: { sub: string; email: string; name: string; picture?: string };
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    if (!payload.sub || !payload.email) {
      console.error("[google-oauth] Invalid ID token payload:", payload);
      return NextResponse.redirect(`${siteUrl}/historian/login?error=invalid_token`);
    }
    googleUser = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture,
    };
  } catch (error) {
    console.error("[google-oauth] ID token decode error:", error);
    return NextResponse.redirect(`${siteUrl}/historian/login?error=invalid_token`);
  }

  // Find or create historian
  try {
    const cookieStore = await cookies();

    // 1. Look up by Google ID
    let historian = await getHistorianByGoogleIdFromDb(googleUser.sub);

    if (!historian) {
      // 2. Look up by email — link Google ID to existing account
      historian = await getHistorianByEmailFromDb(googleUser.email);
      if (historian) {
        await linkGoogleIdToHistorianFromDb(historian.id, googleUser.sub);
      }
    }

    if (!historian) {
      // 3. Create new historian (untrusted)
      historian = await createHistorianFromOAuth({
        email: googleUser.email,
        name: googleUser.name,
        authProvider: "google",
        googleId: googleUser.sub,
      });
    }

    if (!historian.active) {
      return NextResponse.redirect(`${siteUrl}/historian/login?error=account_inactive`);
    }

    // Set session cookie
    const cookieValue = buildHistorianSessionCookieValue(historian.id);
    const cookieOptions = getHistorianSessionCookieOptions();
    cookieStore.set(getHistorianSessionCookieName(), cookieValue, cookieOptions);

    // Redirect to the original `next` URL
    const redirectUrl = next.startsWith("/") ? `${siteUrl}${next}` : `${siteUrl}/`;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[google-oauth] Historian lookup/create error:", error);
    return NextResponse.redirect(`${siteUrl}/historian/login?error=auth_failed`);
  }
}
