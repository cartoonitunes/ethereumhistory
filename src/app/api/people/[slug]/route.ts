/**
 * Person by Slug API Route
 *
 * GET /api/people/[slug] - Get person by slug
 * POST /api/people/[slug] - Update person by slug (historian only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getPersonBySlugFromDb, upsertPersonFromDb } from "@/lib/db-client";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import type { ApiResponse, Person } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ApiResponse<{ person: Person }>>> {
  try {
    const { slug } = await params;
    const person = await getPersonBySlugFromDb(slug);
    
    if (!person) {
      return NextResponse.json(
        { data: null, error: "Person not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { person },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error fetching person:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch person." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ApiResponse<{ person: Person }>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json(
      { data: null, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const { slug } = await params;
    const existing = await getPersonBySlugFromDb(slug);
    
    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Person not found." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.name !== "string") {
      return NextResponse.json(
        { data: null, error: "Invalid request. 'name' is required." },
        { status: 400 }
      );
    }

    const person = await upsertPersonFromDb({
      address: existing.address,
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
    console.error("Error updating person:", error);
    return NextResponse.json(
      { data: null, error: "Failed to update person." },
      { status: 500 }
    );
  }
}
