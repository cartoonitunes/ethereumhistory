import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ suspended: boolean; historianId: number }>>> {
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
    return NextResponse.json({ data: null, error: "Cannot suspend your own account." }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.historians)
    .set({ active: false })
    .where(eq(schema.historians.id, historianId))
    .returning({ id: schema.historians.id });

  if (!updated) {
    return NextResponse.json({ data: null, error: "Historian not found." }, { status: 404 });
  }

  return NextResponse.json({ data: { suspended: true, historianId }, error: null });
}
