import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 4096;

// Rate limit: 10 uploads per hour per historian
const UPLOAD_RATE_LIMIT = { maxRequests: 10, windowSeconds: 3600 };

type ImageFormat = "png" | "jpeg" | "gif" | "webp";

function detectImageType(buf: Buffer): ImageFormat | null {
  if (buf.length < 12) return null;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`upload:${me.id}`, UPLOAD_RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: "Upload rate limit exceeded (10 per hour). Try again later." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageType = detectImageType(buffer);
  if (!imageType) {
    return NextResponse.json(
      { error: "Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed." },
      { status: 400 }
    );
  }

  let processed: Buffer;
  let contentType: string;
  let ext: string;

  try {
    const img = sharp(buffer, { animated: imageType === "gif" });
    const metadata = await img.metadata();

    if (
      (metadata.width && metadata.width > MAX_DIMENSION) ||
      (metadata.height && metadata.height > MAX_DIMENSION)
    ) {
      return NextResponse.json(
        { error: `Image too large. Maximum dimensions are ${MAX_DIMENSION}×${MAX_DIMENSION}px.` },
        { status: 400 }
      );
    }

    // Re-encode to strip EXIF/metadata and sanitize content
    switch (imageType) {
      case "gif":
        processed = await img.gif().toBuffer();
        contentType = "image/gif";
        ext = "gif";
        break;
      case "webp":
        processed = await img.webp({ quality: 85 }).toBuffer();
        contentType = "image/webp";
        ext = "webp";
        break;
      case "jpeg":
        processed = await img.jpeg({ quality: 85 }).toBuffer();
        contentType = "image/jpeg";
        ext = "jpg";
        break;
      default:
        processed = await img.png().toBuffer();
        contentType = "image/png";
        ext = "png";
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to process image. The file may be corrupted." },
      { status: 400 }
    );
  }

  try {
    const pathname = `contract-media/${me.id}/${Date.now()}.${ext}`;
    const blob = await put(pathname, processed, {
      access: "public",
      contentType,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload] Blob put error:", err);
    return NextResponse.json({ error: "Failed to store image." }, { status: 500 });
  }
}
