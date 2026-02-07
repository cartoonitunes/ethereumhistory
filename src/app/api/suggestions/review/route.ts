/**
 * Suggestion Review API Route
 *
 * POST /api/suggestions/review — Approve or reject a suggestion (historian only)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isDatabaseConfigured,
  updateEditSuggestionStatusFromDb,
} from "@/lib/db-client";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const me = await getHistorianMeFromCookies();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    const status = String(body.status || "");

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid suggestion id" }, { status: 400 });
    }
    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
    }

    await updateEditSuggestionStatusFromDb({
      id,
      status,
      reviewedBy: me.id,
    });

    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (error) {
    console.error("[suggestions] Error reviewing suggestion:", error);
    return NextResponse.json({ error: "Failed to review suggestion" }, { status: 500 });
  }
}
