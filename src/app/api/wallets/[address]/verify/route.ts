/**
 * POST /api/wallets/[address]/verify
 *
 * Body: { signature: "0x..." }
 *
 * Recovers the signer from the challenge message and marks the wallet verified
 * only when it matches the address being claimed. viem's verifyMessage is used
 * rather than a hand-rolled ecrecover: it applies the EIP-191 personal_sign
 * prefix and also accepts ERC-1271 contract signatures, so Safe and other smart
 * accounts can verify too. A raw ecrecover would reject every contract wallet.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { userWallets } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { isValidAddress, normalizeAddress } from "@/lib/utils";
import { buildVerificationMessage } from "@/lib/collector-card";
import { WALLET_NONCE_COOKIE } from "./challenge/route";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const { address: raw } = await params;
  if (!isValidAddress(raw)) {
    return NextResponse.json({ data: null, error: "Invalid address." }, { status: 400 });
  }
  const address = normalizeAddress(raw);

  const body = await req.json().catch(() => null);
  const signature = typeof body?.signature === "string" ? body.signature.trim() : "";
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
    return NextResponse.json({ data: null, error: "A signature is required." }, { status: 400 });
  }

  const store = await cookies();
  const cookieValue = store.get(WALLET_NONCE_COOKIE)?.value ?? "";
  const [cookieAddress, nonce] = cookieValue.split(":");
  if (!nonce || cookieAddress !== address) {
    return NextResponse.json(
      { data: null, error: "Challenge expired or was issued for a different address. Request a new one." },
      { status: 400 }
    );
  }

  const db = getDb();
  const owned = await db
    .select({ id: userWallets.id })
    .from(userWallets)
    .where(and(eq(userWallets.historianId, me.id), eq(userWallets.address, address)));
  if (owned.length === 0) {
    return NextResponse.json(
      { data: null, error: "Add the wallet to your account before verifying it." },
      { status: 404 }
    );
  }

  let valid = false;
  try {
    valid = await verifyMessage({
      address: address as `0x${string}`,
      message: buildVerificationMessage(address, nonce),
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ data: null, error: "Malformed signature." }, { status: 400 });
  }
  if (!valid) {
    return NextResponse.json(
      { data: null, error: "Signature does not match this address." },
      { status: 400 }
    );
  }

  // Burn the nonce so the same signature cannot be replayed.
  store.delete(WALLET_NONCE_COOKIE);

  try {
    const [row] = await db
      .update(userWallets)
      .set({ verifiedAt: new Date() })
      .where(and(eq(userWallets.historianId, me.id), eq(userWallets.address, address)))
      .returning();

    return NextResponse.json(
      {
        data: { wallet: row },
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    // The partial unique index allows one verified claim per address globally.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("user_wallets_verified_address_unique")) {
      return NextResponse.json(
        { data: null, error: "That address is already verified on another account." },
        { status: 409 }
      );
    }
    throw err;
  }
}
