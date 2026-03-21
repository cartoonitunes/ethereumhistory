import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active || me.role !== "admin") {
    return NextResponse.json(
      { data: null, error: "Unauthorized. Admin access required." },
      { status: 403 }
    );
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { data: null, error: "Invalid historian ID." },
      { status: 400 }
    );
  }

  try {
    const database = getDb();
    await database
      .update(schema.historians)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(schema.historians.id, id));

    return NextResponse.json({
      data: { suspended: true, historianId: id },
      error: null,
    });
  } catch (error) {
    console.error("Error suspending historian:", error);
    return NextResponse.json(
      { data: null, error: "Failed to suspend historian." },
      { status: 500 }
    );
  }
}
