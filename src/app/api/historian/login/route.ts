import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, HistorianMe } from "@/types";
import { getHistorianByEmailFromDb, historianRowToMe } from "@/lib/db-client";
import {
  buildHistorianSessionCookieValue,
  getHistorianSessionCookieName,
  getHistorianSessionCookieOptions,
  hashHistorianToken,
} from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<HistorianMe>>> {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!email || !token) {
    return NextResponse.json(
      { data: null, error: "Missing email or token." },
      { status: 400 }
    );
  }

  const row = await getHistorianByEmailFromDb(email);
  if (!row || !row.active) {
    return NextResponse.json(
      { data: null, error: "Invalid credentials." },
      { status: 401 }
    );
  }

  if (!row.tokenHash) {
    return NextResponse.json(
      { data: null, error: "This account is not configured for login yet." },
      { status: 401 }
    );
  }

  const hashed = hashHistorianToken(token);
  if (hashed !== row.tokenHash) {
    return NextResponse.json(
      { data: null, error: "Invalid credentials." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({
    data: historianRowToMe(row),
    error: null,
    meta: { timestamp: new Date().toISOString(), cached: false },
  });

  res.cookies.set(
    getHistorianSessionCookieName(),
    buildHistorianSessionCookieValue(row.id),
    getHistorianSessionCookieOptions()
  );

  return res;
}

