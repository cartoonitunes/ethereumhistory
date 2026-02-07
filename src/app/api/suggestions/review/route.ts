/**
 * Suggestion Review API Route
 *
 * POST /api/suggestions/review — Approve or reject a suggestion (trusted historian only)
 *
 * On approval of a historian-submitted suggestion:
 * - Auto-applies the change to the contract
 * - Logs the edit under the submitter's historian ID
 * - Triggers auto-trust check
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isDatabaseConfigured,
  updateEditSuggestionStatusFromDb,
  getEditSuggestionByIdFromDb,
  applyApprovedSuggestionFromDb,
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

  // Only trusted historians can review suggestions
  if (!me.trusted) {
    return NextResponse.json({ error: "Only trusted historians can review suggestions." }, { status: 403 });
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

    // Get the suggestion to check for self-approval
    const suggestion = await getEditSuggestionByIdFromDb(id);
    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }
    if (suggestion.status !== "pending") {
      return NextResponse.json({ error: "Suggestion already processed" }, { status: 400 });
    }

    // Prevent self-approval (historian cannot approve their own submissions)
    if (suggestion.submitterHistorianId && suggestion.submitterHistorianId === me.id) {
      return NextResponse.json(
        { error: "You cannot approve your own suggestions." },
        { status: 403 }
      );
    }

    if (status === "approved" && suggestion.submitterHistorianId) {
      // Auto-apply: update the contract field, log the edit, trigger auto-trust check
      await applyApprovedSuggestionFromDb({
        suggestionId: id,
        reviewerId: me.id,
      });
    } else {
      // Simple status update (reject, or approve anonymous suggestions without auto-apply)
      await updateEditSuggestionStatusFromDb({
        id,
        status,
        reviewedBy: me.id,
      });
    }

    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (error) {
    console.error("[suggestions] Error reviewing suggestion:", error);
    return NextResponse.json({ error: "Failed to review suggestion" }, { status: 500 });
  }
}
