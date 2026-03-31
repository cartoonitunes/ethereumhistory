/**
 * SIWE Verification
 *
 * POST /api/auth/siwe/verify
 * Accepts { message, signature }, verifies the SIWE message,
 * finds/creates historian by ethereum_address, sets session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";
import {
  isDatabaseConfigured,
  getHistorianByEthereumAddressFromDb,
  getHistorianByEmailFromDb,
  linkEthereumAddressToHistorianFromDb,
  createHistorianFromOAuth,
} from "@/lib/db-client";
import {
  buildHistorianSessionCookieValue,
  getHistorianSessionCookieName,
  getHistorianSessionCookieOptions,
} from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let message: string;
  let signature: string;
  try {
    const body = await request.json();
    message = body.message;
    signature = body.signature;
    if (!message || !signature) {
      return NextResponse.json({ error: "Missing message or signature" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Verify SIWE message
  let siweMessage: SiweMessage;
  try {
    siweMessage = new SiweMessage(message);
    const cookieStore = await cookies();
    const savedNonce = cookieStore.get("siwe_nonce")?.value;
    cookieStore.delete("siwe_nonce");

    if (!savedNonce) {
      return NextResponse.json({ error: "No nonce found. Please try again." }, { status: 400 });
    }

    const result = await siweMessage.verify({
      signature,
      nonce: savedNonce,
    });

    if (!result.success) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (error) {
    console.error("[siwe] Verification error:", error);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const address = siweMessage.address.toLowerCase();

  // Find or create historian
  try {
    const cookieStore = await cookies();

    // 1. Look up by Ethereum address
    let historian = await getHistorianByEthereumAddressFromDb(address);

    if (!historian) {
      // 2. Create new historian with Ethereum address (untrusted)
      // Use a truncated address as the display name, and a placeholder email
      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      historian = await createHistorianFromOAuth({
        email: `${address}@ethereum.local`,
        name: shortAddr,
        authProvider: "ethereum",
        ethereumAddress: address,
      });
    }

    if (!historian.active) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    // Set session cookie
    const cookieValue = buildHistorianSessionCookieValue(historian.id);
    const cookieOptions = getHistorianSessionCookieOptions();
    cookieStore.set(getHistorianSessionCookieName(), cookieValue, cookieOptions);

    return NextResponse.json({ ok: true, historianId: historian.id });
  } catch (error) {
    console.error("[siwe] Historian lookup/create error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
