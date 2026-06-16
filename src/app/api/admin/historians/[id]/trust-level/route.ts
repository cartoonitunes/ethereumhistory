import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  getHistorianByIdFromDb,
  setHistorianTrustLevelFromDb,
} from "@/lib/db-client";
import type { AdminTrustLevel } from "@/lib/db/historians";

export const dynamic = "force-dynamic";

const VALID_LEVELS: AdminTrustLevel[] = ["standard", "trusted", "admin"];

/**
 * POST /api/admin/historians/[id]/trust-level
 * Super-admin only. Sets a historian's trust level. Body: { level }.
 * Setting "standard" removes trusted/admin privileges.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ historianId: number; level: AdminTrustLevel }>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active || me.role !== "admin") {
    return NextResponse.json({ data: null, error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const historianId = parseInt(id, 10);
  if (isNaN(historianId)) {
    return NextResponse.json({ data: null, error: "Invalid historian ID." }, { status: 400 });
  }

  if (historianId === me.id) {
    return NextResponse.json(
      { data: null, error: "Cannot change your own trust level." },
      { status: 400 }
    );
  }

  let level: unknown;
  try {
    const body = await request.json();
    level = body?.level;
  } catch {
    return NextResponse.json({ data: null, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof level !== "string" || !VALID_LEVELS.includes(level as AdminTrustLevel)) {
    return NextResponse.json(
      { data: null, error: `Invalid trust level. Expected one of: ${VALID_LEVELS.join(", ")}.` },
      { status: 400 }
    );
  }

  const target = await getHistorianByIdFromDb(historianId);
  if (!target) {
    return NextResponse.json({ data: null, error: "Historian not found." }, { status: 404 });
  }

  await setHistorianTrustLevelFromDb(historianId, level as AdminTrustLevel);

  return NextResponse.json({
    data: { historianId, level: level as AdminTrustLevel },
    error: null,
  });
}
