/**
 * Analytics Tracking API Route
 *
 * POST /api/analytics/track
 * Lightweight endpoint for recording engagement events.
 * No authentication required — events are anonymous.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, insertAnalyticsEventFromDb } from "@/lib/db-client";

export const dynamic = "force-dynamic";

const VALID_EVENT_TYPES = new Set([
  "page_view",
  "contract_view",
  "tab_click",
  "search",
  "outbound_link",
  "copy_address",
  "suggestion_submit",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true }); // silently no-op
  }

  try {
    const body = await request.json();
    const eventType = String(body.eventType || "").trim();

    if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }

    // Fire and forget — don't block the response on the DB write
    insertAnalyticsEventFromDb({
      eventType,
      pagePath: body.pagePath ? String(body.pagePath).slice(0, 500) : null,
      contractAddress: body.contractAddress ? String(body.contractAddress).slice(0, 42) : null,
      eventData: body.eventData || null,
      sessionId: body.sessionId ? String(body.sessionId).slice(0, 64) : null,
      referrer: body.referrer ? String(body.referrer).slice(0, 500) : null,
    }).catch((err) => console.warn("[analytics] Failed to insert event:", err));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never fail the client
  }
}
