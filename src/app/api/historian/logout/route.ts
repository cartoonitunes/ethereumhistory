import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { clearHistorianSessionCookie } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  clearHistorianSessionCookie();
  return NextResponse.json({
    data: { ok: true },
    error: null,
    meta: { timestamp: new Date().toISOString(), cached: false },
  });
}

