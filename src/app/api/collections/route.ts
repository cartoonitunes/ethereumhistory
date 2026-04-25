import { NextResponse } from "next/server";
import { getCollectionsListFromDb } from "@/lib/db-client";
import { isDatabaseConfigured } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  try {
    const collections = await getCollectionsListFromDb();
    return NextResponse.json({ data: collections });
  } catch (err) {
    console.error("[api/collections] error:", err);
    return NextResponse.json({ error: "Failed to load collections." }, { status: 500 });
  }
}
