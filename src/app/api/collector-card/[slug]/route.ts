/**
 * GET /api/collector-card/[slug]  public card data
 *
 * Unauthenticated on purpose: this is what makes a card shareable. It serves
 * the stored snapshot rather than recomputing, so a shared link stays stable
 * and cheap no matter how much traffic it gets.
 */

import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503 });
  }

  const { slug } = await params;
  if (!/^[a-z0-9]{6,32}$/.test(slug)) {
    return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const [row] = await db
    .select({
      shareSlug: collectorCards.shareSlug,
      cardDataJson: collectorCards.cardDataJson,
      updatedAt: collectorCards.updatedAt,
    })
    .from(collectorCards)
    .where(eq(collectorCards.shareSlug, slug));

  if (!row) {
    return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: { card: row.cardDataJson, shareSlug: row.shareSlug, updatedAt: row.updatedAt },
    error: null,
    meta: { timestamp: new Date().toISOString(), cached: true },
  });
}
