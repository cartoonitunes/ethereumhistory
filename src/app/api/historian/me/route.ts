import { NextResponse } from "next/server";
import type { ApiResponse, HistorianMe } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";


export async function GET(): Promise<NextResponse<ApiResponse<HistorianMe | null>>> {
  try {
    const me = await getHistorianMeFromCookies();
    return NextResponse.json(
      {
        data: me,
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { data: null, error: "Failed to load historian session." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

