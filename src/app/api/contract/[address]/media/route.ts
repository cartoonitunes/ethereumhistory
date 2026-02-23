import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import type { ContractMedia } from "@/types";
import { isValidAddress } from "@/lib/utils";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  getContractMediaFromDb,
  addContractMediaFromDb,
  deleteContractMediaFromDb,
} from "@/lib/db-client";

export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES = new Set(["screenshot", "photo", "diagram", "artwork", "other"]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<ContractMedia[]>>> {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ data: null, error: "Invalid address." }, { status: 400 });
  }
  try {
    const media = await getContractMediaFromDb(address.toLowerCase());
    return NextResponse.json({ data: media, error: null });
  } catch (err) {
    console.error("[media] GET error:", err);
    return NextResponse.json({ data: null, error: "Failed to load media." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<ContractMedia>>> {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ data: null, error: "Invalid address." }, { status: 400 });
  }

  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ data: null, error: "url is required." }, { status: 400 });
  }

  const mediaType = typeof body.mediaType === "string" && VALID_MEDIA_TYPES.has(body.mediaType)
    ? body.mediaType
    : "other";

  try {
    const item = await addContractMediaFromDb({
      contractAddress: address.toLowerCase(),
      mediaType,
      url: body.url.trim(),
      caption: typeof body.caption === "string" ? body.caption.trim() || null : null,
      sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || null : null,
      sourceLabel: typeof body.sourceLabel === "string" ? body.sourceLabel.trim() || null : null,
      uploadedBy: me.id,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });
    return NextResponse.json({ data: item, error: null }, { status: 201 });
  } catch (err) {
    console.error("[media] POST error:", err);
    return NextResponse.json({ data: null, error: "Failed to save media." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ data: null, error: "Invalid address." }, { status: 400 });
  }

  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "number" ? body.id : null;
  if (!id) {
    return NextResponse.json({ data: null, error: "id is required." }, { status: 400 });
  }

  try {
    const deleted = await deleteContractMediaFromDb({
      id,
      historianId: me.id,
      isTrusted: me.trusted,
    });
    if (!deleted) {
      return NextResponse.json(
        { data: null, error: "Not found or not authorized to delete." },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    console.error("[media] DELETE error:", err);
    return NextResponse.json({ data: null, error: "Failed to delete media." }, { status: 500 });
  }
}
