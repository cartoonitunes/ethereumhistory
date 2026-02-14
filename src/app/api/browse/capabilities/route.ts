import { NextResponse } from "next/server";
import { isDatabaseConfigured, getAvailableCapabilityCategoriesFromDb } from "@/lib/db-client";
import { CAPABILITY_CATEGORIES } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { data: { categories: [] }, meta: { timestamp: new Date().toISOString(), cached: false } },
      { status: 200 }
    );
  }

  try {
    const dbKeys = await getAvailableCapabilityCategoriesFromDb();
    const categories = Object.entries(CAPABILITY_CATEGORIES)
      .filter(([, cat]) => cat.keys.some((k) => dbKeys.includes(k)))
      .map(([slug]) => slug);

    return NextResponse.json({
      data: { categories },
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch {
    return NextResponse.json(
      { data: { categories: [] }, meta: { timestamp: new Date().toISOString(), cached: false } },
      { status: 200 }
    );
  }
}
