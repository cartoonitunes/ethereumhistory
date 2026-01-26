/**
 * People API Route
 *
 * GET /api/people - Get all people (for dropdowns)
 * POST /api/people - Create or update a person
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllPeopleFromDb, upsertPersonFromDb } from "@/lib/db-client";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { isValidAddress } from "@/lib/utils";
import type { ApiResponse, Person } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<ApiResponse<{ people: Array<{ address: string; name: string; slug: string }> }>>> {
  try {
    const people = await getAllPeopleFromDb();
    return NextResponse.json({
      data: { people },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch people." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ person: Person }>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json(
      { data: null, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.address !== "string" || typeof body.name !== "string") {
      return NextResponse.json(
        { data: null, error: "Invalid request. 'address' and 'name' are required." },
        { status: 400 }
      );
    }

    const address = body.address.trim().toLowerCase();
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { data: null, error: "Invalid Ethereum address format." },
        { status: 400 }
      );
    }

    const person = await upsertPersonFromDb({
      address,
      name: body.name,
      slug: body.slug || null,
      role: body.role || null,
      shortBio: body.shortBio || null,
      bio: body.bio || null,
      highlights: Array.isArray(body.highlights) ? body.highlights : null,
      websiteUrl: body.websiteUrl || null,
    });

    return NextResponse.json({
      data: { person },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error creating/updating person:", error);
    return NextResponse.json(
      { data: null, error: "Failed to create/update person." },
      { status: 500 }
    );
  }
}
