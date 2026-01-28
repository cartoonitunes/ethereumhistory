import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  createHistorianInvitationFromDb,
  getHistorianInvitationsByInviterFromDb,
} from "@/lib/db-client";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ inviteToken: string; inviteUrl: string }>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json(
      { data: null, error: "Unauthorized. Must be logged in as an active historian." },
      { status: 401 }
    );
  }

  if (!me.trusted) {
    return NextResponse.json(
      { data: null, error: "Only trusted historians can create invitations." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const invitedEmail = typeof body?.invitedEmail === "string" ? body.invitedEmail.trim() : null;
    const invitedName = typeof body?.invitedName === "string" ? body.invitedName.trim() : null;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

    // If email is provided, validate it
    if (invitedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invitedEmail)) {
        return NextResponse.json(
          { data: null, error: "Invalid email format." },
          { status: 400 }
        );
      }
    }

    const { inviteToken } = await createHistorianInvitationFromDb({
      inviterId: me.id,
      invitedEmail: invitedEmail || null,
      invitedName: invitedName || null,
      notes: notes || null,
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const inviteUrl = `${baseUrl}/historian/invite/${inviteToken}`;

    return NextResponse.json({
      data: { inviteToken, inviteUrl },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { data: null, error: "Failed to create invitation." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Array<{ id: number; inviteToken: string; invitedEmail: string | null; invitedName: string | null; createdAt: string; acceptedAt: string | null; expiresAt: string | null; notes: string | null }>>>> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json(
      { data: null, error: "Unauthorized. Must be logged in as an active historian." },
      { status: 401 }
    );
  }

  if (!me.trusted) {
    return NextResponse.json(
      { data: null, error: "Only trusted historians can view invitations." },
      { status: 403 }
    );
  }

  try {
    const invitations = await getHistorianInvitationsByInviterFromDb(me.id);
    
    const formatted = invitations.map((inv) => ({
      id: inv.id,
      inviteToken: inv.inviteToken,
      invitedEmail: inv.invitedEmail,
      invitedName: inv.invitedName,
      createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
      acceptedAt: inv.acceptedAt?.toISOString() || null,
      expiresAt: inv.expiresAt?.toISOString() || null,
      notes: inv.notes,
    }));

    return NextResponse.json({
      data: formatted,
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch invitations." },
      { status: 500 }
    );
  }
}
