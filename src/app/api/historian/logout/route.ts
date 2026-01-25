import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import {
  getHistorianSessionCookieName,
  getHistorianSessionCookieOptions,
} from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const res = NextResponse.json({
    data: { ok: true as const },
    error: null,
    meta: { timestamp: new Date().toISOString(), cached: false },
  });

  // Clear cookie (keep attributes consistent with login)
  res.cookies.set(getHistorianSessionCookieName(), "", {
    ...getHistorianSessionCookieOptions(),
    maxAge: 0,
  });

  return res;
}

