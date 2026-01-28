import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import {
  getHistorianInvitationByTokenFromDb,
  acceptHistorianInvitationFromDb,
  getHistorianByEmailFromDb,
} from "@/lib/db-client";
import { hashHistorianToken } from "@/lib/historian-auth";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<{ invitation: { id: number; invitedEmail: string | null; invitedName: string | null; expiresAt: string | null; notes: string | null; inviterName: string } }>>> {
  const { token } = await params;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { data: null, error: "Invalid invitation token." },
      { status: 400 }
    );
  }

  try {
    const invitation = await getHistorianInvitationByTokenFromDb(token);

    if (!invitation) {
      return NextResponse.json(
        { data: null, error: "Invitation not found." },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { data: null, error: "This invitation has already been accepted." },
        { status: 400 }
      );
    }

    // Check if expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { data: null, error: "This invitation has expired." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        invitation: {
          id: invitation.id,
          invitedEmail: invitation.invitedEmail || null,
          invitedName: invitation.invitedName || null,
          expiresAt: invitation.expiresAt?.toISOString() || null,
          notes: invitation.notes || null,
          inviterName: invitation.inviterName || "A historian",
        },
      },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { data: null, error: "Failed to validate invitation." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<{ historianId: number }>>> {
  const { token } = await params;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { data: null, error: "Invalid invitation token." },
      { status: 400 }
    );
  }

  try {
    const invitation = await getHistorianInvitationByTokenFromDb(token);

    if (!invitation) {
      return NextResponse.json(
        { data: null, error: "Invitation not found." },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { data: null, error: "This invitation has already been accepted." },
        { status: 400 }
      );
    }

    // Check if expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { data: null, error: "This invitation has expired." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const passwordToken = typeof body?.token === "string" ? body.token.trim() : "";

    if (!email || !name || !passwordToken) {
      return NextResponse.json(
        { data: null, error: "Email, name, and token are required." },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { data: null, error: "Invalid email format." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await getHistorianByEmailFromDb(email);
    if (existing) {
      return NextResponse.json(
        { data: null, error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash the token
    const tokenHash = hashHistorianToken(passwordToken);

    // Create the account
    const { historianId } = await acceptHistorianInvitationFromDb({
      invitationId: invitation.id,
      email,
      name,
      tokenHash,
    });

    return NextResponse.json({
      data: { historianId },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { data: null, error: "Failed to accept invitation." },
      { status: 500 }
    );
  }
}
