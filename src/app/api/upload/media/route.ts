import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DIMENSION = 4096;

// Detect MIME type from magic bytes — never trust the Content-Type header
function detectMimeType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  // GIF: 47 49 46 38 (GIF87a / GIF89a)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

// In-memory rate limiter. Resets per serverless instance — adequate deterrent
// for a small trusted-historian pool where uploads are infrequent.
const uploadWindows = new Map<number, { count: number; windowStart: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(historianId: number): boolean {
  const now = Date.now();
  const entry = uploadWindows.get(historianId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    uploadWindows.set(historianId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (isRateLimited(me.id)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 uploads per hour." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 5 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const mimeType = detectMimeType(buffer);
  if (!mimeType) {
    return NextResponse.json(
      { error: "Unsupported file type. PNG, JPG, GIF, and WebP only — no SVG." },
      { status: 400 }
    );
  }

  // Re-encode through sharp: strips EXIF/metadata and any embedded scripts,
  // and lets us enforce dimension limits before storing.
  let processed: Buffer;
  let outputMime: string;
  let ext: string;
  try {
    const sharpSrc = mimeType === "image/gif"
      ? sharp(buffer, { animated: true })
      : sharp(buffer);

    const meta = await sharpSrc.metadata();
    if ((meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION) {
      return NextResponse.json(
        { error: `Image exceeds maximum dimensions (${MAX_DIMENSION}×${MAX_DIMENSION} px).` },
        { status: 400 }
      );
    }

    if (mimeType === "image/jpeg") {
      processed = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      outputMime = "image/jpeg"; ext = "jpg";
    } else if (mimeType === "image/png") {
      processed = await sharp(buffer).png().toBuffer();
      outputMime = "image/png"; ext = "png";
    } else if (mimeType === "image/gif") {
      processed = await sharp(buffer, { animated: true }).gif().toBuffer();
      outputMime = "image/gif"; ext = "gif";
    } else {
      processed = await sharp(buffer).webp({ quality: 90 }).toBuffer();
      outputMime = "image/webp"; ext = "webp";
    }
  } catch (err) {
    console.error("[upload/media] sharp error:", err);
    return NextResponse.json({ error: "Failed to process image." }, { status: 400 });
  }

  try {
    const pathname = `media/${me.id}-${Date.now()}.${ext}`;
    const blob = await put(pathname, processed, {
      access: "public",
      contentType: outputMime,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload/media] blob storage error:", err);
    return NextResponse.json({ error: "Failed to store image." }, { status: 500 });
  }
}
