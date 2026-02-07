/**
 * GitHub OAuth Callback
 *
 * GET /api/auth/github/callback
 * Exchanges code for access token, fetches user info, creates/finds historian, sets session.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isDatabaseConfigured,
  getHistorianByGithubIdFromDb,
  createHistorianFromGithubFromDb,
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
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret || !isDatabaseConfigured()) {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=not_configured`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=missing_params`);
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("gh_oauth_state")?.value;
  cookieStore.delete("gh_oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=invalid_state`);
  }

  // Exchange code for access token
  let accessToken: string;
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[github-oauth] Token exchange failed:", tokenData);
      return NextResponse.redirect(`${siteUrl}/historian/login?error=token_failed`);
    }
    accessToken = tokenData.access_token;
  } catch (error) {
    console.error("[github-oauth] Token exchange error:", error);
    return NextResponse.redirect(`${siteUrl}/historian/login?error=token_failed`);
  }

  // Fetch user info from GitHub
  let githubUser: { id: number; login: string; name: string | null; email: string | null };
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    githubUser = {
      id: userData.id,
      login: userData.login,
      name: userData.name,
      email: userData.email,
    };

    // If no public email, fetch from emails endpoint
    if (!githubUser.email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const emails = await emailsRes.json();
      const primary = emails.find((e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified);
      if (primary) {
        githubUser.email = primary.email;
      }
    }
  } catch (error) {
    console.error("[github-oauth] User info fetch error:", error);
    return NextResponse.redirect(`${siteUrl}/historian/login?error=user_fetch_failed`);
  }

  if (!githubUser.email) {
    return NextResponse.redirect(`${siteUrl}/historian/login?error=no_email`);
  }

  // Find or create historian by GitHub ID
  try {
    let historian = await getHistorianByGithubIdFromDb(String(githubUser.id));

    if (!historian) {
      // Create new historian from GitHub
      historian = await createHistorianFromGithubFromDb({
        email: githubUser.email,
        name: githubUser.name || githubUser.login,
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
      });
    }

    if (!historian.active) {
      return NextResponse.redirect(`${siteUrl}/historian/login?error=account_inactive`);
    }

    // Set session cookie
    const cookieValue = buildHistorianSessionCookieValue(historian.id);
    const cookieOptions = getHistorianSessionCookieOptions();
    cookieStore.set(getHistorianSessionCookieName(), cookieValue, cookieOptions);

    return NextResponse.redirect(`${siteUrl}/historian/profile`);
  } catch (error) {
    console.error("[github-oauth] Historian lookup/create error:", error);
    return NextResponse.redirect(`${siteUrl}/historian/login?error=auth_failed`);
  }
}
