import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  getHistorianByEmailFromDb,
  getHistorianByEthereumAddressFromDb,
  createHistorianFromOAuth,
  setHistorianTrustLevelFromDb,
} from "@/lib/db-client";
import type { AdminTrustLevel } from "@/lib/db/historians";

export const dynamic = "force-dynamic";

const VALID_LEVELS: AdminTrustLevel[] = ["standard", "trusted", "admin"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * POST /api/admin/historians/add
 * Super-admin only. Grant a trust level to a user identified by email or wallet
 * address. If no historian account exists for the identifier, one is created.
 * Body: { identifier, type: "email" | "wallet", level }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ historianId: number; created: boolean; level: AdminTrustLevel }>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active || me.role !== "admin") {
    return NextResponse.json({ data: null, error: "Admin access required." }, { status: 403 });
  }

  let identifier: unknown;
  let type: unknown;
  let level: unknown;
  try {
    const body = await request.json();
    identifier = body?.identifier;
    type = body?.type;
    level = body?.level ?? "trusted";
  } catch {
    return NextResponse.json({ data: null, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof identifier !== "string" || !identifier.trim()) {
    return NextResponse.json({ data: null, error: "An email or wallet address is required." }, { status: 400 });
  }
  if (type !== "email" && type !== "wallet") {
    return NextResponse.json({ data: null, error: "Type must be 'email' or 'wallet'." }, { status: 400 });
  }
  if (typeof level !== "string" || !VALID_LEVELS.includes(level as AdminTrustLevel)) {
    return NextResponse.json(
      { data: null, error: `Invalid trust level. Expected one of: ${VALID_LEVELS.join(", ")}.` },
      { status: 400 }
    );
  }
  const trustLevel = level as AdminTrustLevel;
  const value = identifier.trim();

  let historianId: number;
  let created = false;

  if (type === "email") {
    const email = value.toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ data: null, error: "Invalid email address." }, { status: 400 });
    }
    const existing = await getHistorianByEmailFromDb(email);
    if (existing) {
      historianId = existing.id;
    } else {
      const name = email.split("@")[0] || email;
      const row = await createHistorianFromOAuth({ email, name });
      historianId = row.id;
      created = true;
    }
  } else {
    const address = value.toLowerCase();
    if (!ADDRESS_RE.test(address)) {
      return NextResponse.json({ data: null, error: "Invalid wallet address." }, { status: 400 });
    }
    const existing = await getHistorianByEthereumAddressFromDb(address);
    if (existing) {
      historianId = existing.id;
    } else {
      // Mirror the SIWE flow: placeholder email + truncated address as name.
      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      const row = await createHistorianFromOAuth({
        email: `${address}@ethereum.local`,
        name: shortAddr,
        authProvider: "ethereum",
        ethereumAddress: address,
      });
      historianId = row.id;
      created = true;
    }
  }

  await setHistorianTrustLevelFromDb(historianId, trustLevel);

  return NextResponse.json({ data: { historianId, created, level: trustLevel }, error: null });
}
