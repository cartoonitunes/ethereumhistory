/**
 * Edit Suggestions API Route
 *
 * POST /api/suggestions — Submit a suggestion (public, no auth required)
 * GET  /api/suggestions — List suggestions (requires historian auth)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isDatabaseConfigured,
  insertEditSuggestionFromDb,
  getEditSuggestionsFromDb,
  getPendingSuggestionsForHistorianFromDb,
} from "@/lib/db-client";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "description",
  "short_description",
  "historical_significance",
  "historical_context",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const contractAddress = String(body.contractAddress || "").trim();
    const fieldName = String(body.fieldName || "").trim();
    const suggestedValue = String(body.suggestedValue || "").trim();
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    const submitterName = body.submitterName ? String(body.submitterName).slice(0, 100) : null;
    const submitterGithub = body.submitterGithub ? String(body.submitterGithub).slice(0, 100) : null;

    if (!contractAddress || !contractAddress.startsWith("0x") || contractAddress.length !== 42) {
      return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
    }
    if (!ALLOWED_FIELDS.has(fieldName)) {
      return NextResponse.json({ error: "Invalid field name" }, { status: 400 });
    }
    if (!suggestedValue || suggestedValue.length < 10) {
      return NextResponse.json({ error: "Suggestion must be at least 10 characters" }, { status: 400 });
    }
    if (suggestedValue.length > 5000) {
      return NextResponse.json({ error: "Suggestion too long (max 5000 characters)" }, { status: 400 });
    }

    const result = await insertEditSuggestionFromDb({
      contractAddress,
      fieldName,
      suggestedValue,
      reason,
      submitterName,
      submitterGithub,
    });

    return NextResponse.json({ data: { id: result.id }, error: null }, { status: 201 });
  } catch (error) {
    console.error("[suggestions] Error creating suggestion:", error);
    return NextResponse.json({ error: "Failed to submit suggestion" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: { suggestions: [] }, error: null });
  }

  // Require historian auth for viewing suggestions
  const me = await getHistorianMeFromCookies();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractAddress = request.nextUrl.searchParams.get("contract") || undefined;
  const status = request.nextUrl.searchParams.get("status") || "pending";
  const mine = request.nextUrl.searchParams.get("mine") === "true";

  try {
    // If mine=true, return only the current historian's pending suggestions
    if (mine) {
      const suggestions = await getPendingSuggestionsForHistorianFromDb(
        me.id,
        contractAddress || undefined
      );

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
            batchId: s.batchId,
            status: s.status,
            createdAt: s.createdAt?.toISOString() || null,
          })),
        },
        error: null,
      });
    }

    const suggestions = await getEditSuggestionsFromDb({
      contractAddress,
      status,
      limit: 50,
    });

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
          batchId: s.batchId,
          status: s.status,
          createdAt: s.createdAt?.toISOString() || null,
        })),
      },
      error: null,
    });
  } catch (error) {
    console.error("[suggestions] Error fetching suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
