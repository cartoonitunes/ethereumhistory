import { ImageResponse } from "next/og";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const alt = "Ethereum History - Historian Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const historianId = parseInt(id, 10);

  if (isNaN(historianId) || historianId <= 0) {
    return fallbackImage();
  }

  try {
    const db = getDb();

    const [historianRows, editCountRows, contractCountRows] = await Promise.all(
      [
        db
          .select({
            name: schema.historians.name,
            avatarUrl: schema.historians.avatarUrl,
            bio: schema.historians.bio,
            githubUsername: schema.historians.githubUsername,
          })
          .from(schema.historians)
          .where(
            and(
              eq(schema.historians.id, historianId),
              eq(schema.historians.active, true)
            )
          )
          .limit(1),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(schema.contractEdits)
          .where(eq(schema.contractEdits.historianId, historianId)),
        db
          .select({
            count: sql<number>`COUNT(DISTINCT ${schema.contractEdits.contractAddress})::int`,
          })
          .from(schema.contractEdits)
          .where(eq(schema.contractEdits.historianId, historianId)),
      ]
    );

    const historian = historianRows[0];
    if (!historian) return fallbackImage();

    const editCount = editCountRows[0]?.count ?? 0;
    const contractCount = contractCountRows[0]?.count ?? 0;

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0a0b0f",
          color: "#e5e5e5",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: "flex",
            height: 6,
            width: "100%",
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "48px 64px",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
                <path
                  d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z"
                  opacity="0.6"
                />
              </svg>
            </div>
            <span style={{ fontSize: 20, color: "#71717a" }}>
              ethereumhistory.com
            </span>
          </div>

          {/* Main content */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              flex: 1,
              justifyContent: "flex-start",
              paddingTop: 24,
              paddingBottom: 24,
            }}
          >
            {/* Avatar */}
            {historian.avatarUrl ? (
              <img
                src={historian.avatarUrl}
                width={120}
                height={120}
                style={{ borderRadius: 60, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  background: "#6366f115",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  fontWeight: 700,
                  color: "#6366f1",
                }}
              >
                {historian.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                flex: 1,
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: "#fafafa",
                  lineHeight: 1.1,
                }}
              >
                {historian.name}
              </span>
              <span style={{ fontSize: 22, color: "#8b5cf6" }}>
                Ethereum Historian
              </span>
              {historian.bio && (
                <span
                  style={{
                    fontSize: 20,
                    color: "#a1a1aa",
                    lineHeight: 1.4,
                    maxWidth: 700,
                  }}
                >
                  {historian.bio.length > 100
                    ? historian.bio.slice(0, 100) + "..."
                    : historian.bio}
                </span>
              )}
            </div>
          </div>

          {/* Footer with stats */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ fontSize: 28, fontWeight: 700, color: "#fafafa" }}
                >
                  {editCount}
                </span>
                <span style={{ fontSize: 18, color: "#71717a" }}>
                  {editCount === 1 ? "edit" : "edits"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ fontSize: 28, fontWeight: 700, color: "#fafafa" }}
                >
                  {contractCount}
                </span>
                <span style={{ fontSize: 18, color: "#71717a" }}>
                  {contractCount === 1 ? "contract" : "contracts"}
                </span>
              </div>
            </div>
            {historian.githubUsername && (
              <span style={{ fontSize: 18, color: "#52525b" }}>
                github.com/{historian.githubUsername}
              </span>
            )}
          </div>
        </div>
      </div>,
      { ...size }
    );
  } catch {
    return fallbackImage();
  }
}

function fallbackImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        color: "#fff",
        fontSize: 48,
      }}
    >
      Ethereum Historian
    </div>,
    { ...size }
  );
}
