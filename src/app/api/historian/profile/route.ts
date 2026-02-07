import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, HistorianMe } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { getHistorianByIdFromDb, historianRowToMe, updateHistorianProfileFromDb } from "@/lib/db-client";
import { hashHistorianToken } from "@/lib/historian-auth";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<HistorianMe>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json(
      { data: null, error: "Unauthorized. Must be logged in as an active historian." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const currentToken = typeof body?.currentToken === "string" ? body.currentToken.trim() : null;
    const newToken = typeof body?.newToken === "string" ? body.newToken.trim() : null;

    const database = getDb();
    const historian = await getHistorianByIdFromDb(me.id);
    if (!historian) {
      return NextResponse.json(
        { data: null, error: "Historian not found." },
        { status: 404 }
      );
    }

    // Update name if provided
    if (name !== null) {
      if (!name) {
        return NextResponse.json(
          { data: null, error: "Name cannot be empty." },
          { status: 400 }
        );
      }

      await database
        .update(schema.historians)
        .set({
          name,
          updatedAt: new Date(),
        })
        .where(eq(schema.historians.id, me.id));

      const updated = await getHistorianByIdFromDb(me.id);
      return NextResponse.json({
        data: historianRowToMe(updated!),
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      });
    }

    // Update token if provided
    if (currentToken !== null && newToken !== null) {
      if (!currentToken || !newToken) {
        return NextResponse.json(
          { data: null, error: "Current token and new token are required." },
          { status: 400 }
        );
      }

      if (newToken.length < 8) {
        return NextResponse.json(
          { data: null, error: "New token must be at least 8 characters." },
          { status: 400 }
        );
      }

      // Verify current token
      const currentHash = hashHistorianToken(currentToken);
      if (currentHash !== historian.tokenHash) {
        return NextResponse.json(
          { data: null, error: "Current token is incorrect." },
          { status: 401 }
        );
      }

      // Update to new token
      const newHash = hashHistorianToken(newToken);
      await database
        .update(schema.historians)
        .set({
          tokenHash: newHash,
          updatedAt: new Date(),
        })
        .where(eq(schema.historians.id, me.id));

      const updated = await getHistorianByIdFromDb(me.id);
      return NextResponse.json({
        data: historianRowToMe(updated!),
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      });
    }

    // Update profile fields (avatarUrl, bio, websiteUrl) if provided
    const hasProfileUpdate =
      body?.avatarUrl !== undefined ||
      body?.bio !== undefined ||
      body?.websiteUrl !== undefined;

    if (hasProfileUpdate) {
      const patch: { avatarUrl?: string | null; bio?: string | null; websiteUrl?: string | null } = {};

      if (body?.avatarUrl !== undefined) {
        patch.avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() || null : null;
      }
      if (body?.bio !== undefined) {
        const bioVal = typeof body.bio === "string" ? body.bio.trim() : "";
        if (bioVal.length > 280) {
          return NextResponse.json(
            { data: null, error: "Bio must be 280 characters or fewer." },
            { status: 400 }
          );
        }
        patch.bio = bioVal || null;
      }
      if (body?.websiteUrl !== undefined) {
        const urlVal = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "";
        if (urlVal && !urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
          return NextResponse.json(
            { data: null, error: "Website URL must start with http:// or https://" },
            { status: 400 }
          );
        }
        patch.websiteUrl = urlVal || null;
      }

      await updateHistorianProfileFromDb(me.id, patch);

      const updated = await getHistorianByIdFromDb(me.id);
      return NextResponse.json({
        data: historianRowToMe(updated!),
        error: null,
        meta: { timestamp: new Date().toISOString(), cached: false },
      });
    }

    return NextResponse.json(
      { data: null, error: "Either name, profile fields, or currentToken/newToken must be provided." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { data: null, error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
