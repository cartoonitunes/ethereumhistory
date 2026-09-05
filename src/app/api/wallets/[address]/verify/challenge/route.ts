/**
 * GET /api/wallets/[address]/verify/challenge
 *
 * Issues the message the user signs with personal_sign to prove wallet
 * ownership. The nonce is returned to the caller and simultaneously stored in
 * a short-lived httpOnly cookie, mirroring the existing SIWE nonce route.
 *
 * Keeping the nonce server side is what stops replay: the verify step only
 * accepts a signature whose message carries the nonce from this cookie, so a
 * signature captured elsewhere cannot be presented later. The address is baked
 * into the message too, so a signature proving wallet A cannot be replayed to
 * claim wallet B.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { isValidAddress, normalizeAddress } from "@/lib/utils";
import { buildVerificationMessage } from "@/lib/collector-card";

export const dynamic = "force-dynamic";

export const WALLET_NONCE_COOKIE = "eh_wallet_nonce";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { address: raw } = await params;
  if (!isValidAddress(raw)) {
    return NextResponse.json({ data: null, error: "Invalid address." }, { status: 400 });
  }
  const address = normalizeAddress(raw);

  const nonce = crypto.randomBytes(16).toString("hex");
  const message = buildVerificationMessage(address, nonce);

  const store = await cookies();
  // Bound to the address so a nonce issued for one wallet cannot be spent on
  // another within the same session.
  store.set(WALLET_NONCE_COOKIE, `${address}:${nonce}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.json({
    data: { address, nonce, message },
    error: null,
    meta: { timestamp: new Date().toISOString(), cached: false },
  });
}
