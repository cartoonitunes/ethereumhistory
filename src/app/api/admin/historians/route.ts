import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getAllHistoriansForAdminFromDb } from "@/lib/db-client";
import type { AdminHistorianSummary } from "@/lib/db/historians";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/historians
 * Super-admin only. Lists all historian accounts with trust info and edit counts.
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse<{ historians: AdminHistorianSummary[] }>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active || me.role !== "admin") {
    return NextResponse.json({ data: null, error: "Admin access required." }, { status: 403 });
  }

  const historians = await getAllHistoriansForAdminFromDb();
  return NextResponse.json({ data: { historians }, error: null });
}
