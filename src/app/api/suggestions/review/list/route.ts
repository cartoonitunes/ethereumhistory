/**
 * Review Dashboard API Route
 *
 * GET /api/suggestions/review/list — Get pending suggestions for review (trusted historians only)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isDatabaseConfigured,
  getEditSuggestionsForReviewFromDb,
  getPendingSuggestionsCountFromDb,
} from "@/lib/db-client";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: { suggestions: [], total: 0 }, error: null });
  }

  const me = await getHistorianMeFromCookies();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!me.trusted) {
    return NextResponse.json({ error: "Only trusted historians can access the review dashboard." }, { status: 403 });
  }

  try {
    const [suggestions, total] = await Promise.all([
      getEditSuggestionsForReviewFromDb({ limit: 100 }),
      getPendingSuggestionsCountFromDb(),
    ]);

    return NextResponse.json({
      data: {
        suggestions: suggestions.map((s) => ({
          id: s.id,
          contractAddress: s.contractAddress,
          fieldName: s.fieldName,
          suggestedValue: s.suggestedValue,
          reason: s.reason,
          submitterName: s.submitterName,
          submitterGithub: s.submitterGithub,
          submitterHistorianId: s.submitterHistorianId,
          submitterHistorianName: s.submitterHistorianName,
          submitterHistorianGithub: s.submitterHistorianGithub,
          batchId: s.batchId,
          status: s.status,
          createdAt: s.createdAt?.toISOString() || null,
        })),
        total,
      },
      error: null,
    });
  } catch (error) {
    console.error("[review] Error fetching review list:", error);
    return NextResponse.json({ error: "Failed to fetch review list" }, { status: 500 });
  }
}
