import { NextResponse } from "next/server";
import {
  getCollectionBySlugFromDb,
  getCollectionContractsFromDb,
} from "@/lib/db-client";
import { isDatabaseConfigured } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const { slug } = await params;
  try {
    const collection = await getCollectionBySlugFromDb(slug);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found." }, { status: 404 });
    }
    const contracts = await getCollectionContractsFromDb(
      collection.contractAddresses ?? [],
      collection.deployerAddress ?? null
    );
    return NextResponse.json({ data: { collection, contracts } });
  } catch (err) {
    console.error("[api/collections/slug] error:", err);
    return NextResponse.json({ error: "Failed to load collection." }, { status: 500 });
  }
}
