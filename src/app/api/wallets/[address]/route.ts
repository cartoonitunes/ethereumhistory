/**
 * DELETE /api/wallets/[address]  detach a wallet from the account
 *
 * Scoped to the caller's own rows, so knowing another user's address is not
 * enough to remove it. Holdings are removed by ON DELETE CASCADE.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { userWallets } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { isValidAddress, normalizeAddress } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";

export async function DELETE(
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

  const db = getDb();
  const deleted = await db
    .delete(userWallets)
    .where(and(eq(userWallets.historianId, me.id), eq(userWallets.address, address)))
    .returning({ id: userWallets.id });

  if (deleted.length === 0) {
    return NextResponse.json(
      { data: null, error: "That wallet is not on your account." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      data: { removed: address },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    },
    { headers: NO_STORE_HEADERS }
  );
}
