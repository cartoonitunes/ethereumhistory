import type { Metadata } from "next";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

function getMetadataBaseUrl(): URL {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_ENV === "production"
      ? "https://www.ethereumhistory.com"
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "");
  return new URL(explicit || "https://www.ethereumhistory.com");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const historianId = parseInt(id, 10);
  const metadataBase = getMetadataBaseUrl();

  if (isNaN(historianId) || historianId <= 0) {
    return {
      metadataBase,
      title: "Historian Not Found | ethereumhistory.com",
    };
  }

  try {
    const db = getDb();

    const [historianRows, editCountRows] = await Promise.all([
      db
        .select({
          name: schema.historians.name,
          bio: schema.historians.bio,
          avatarUrl: schema.historians.avatarUrl,
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
    ]);

    const historian = historianRows[0];
    if (!historian) {
      return {
        metadataBase,
        title: "Historian Not Found | ethereumhistory.com",
      };
    }

    const editCount = editCountRows[0]?.count ?? 0;
    const description = historian.bio
      ? `${historian.bio.slice(0, 150)}${historian.bio.length > 150 ? "..." : ""}`
      : `${historian.name} has made ${editCount} ${editCount === 1 ? "edit" : "edits"} documenting early Ethereum smart contracts on ethereumhistory.com.`;

    return {
      metadataBase,
      title: `${historian.name} – Ethereum Historian | ethereumhistory.com`,
      description,
      openGraph: {
        title: `${historian.name} – Ethereum Historian`,
        description,
        siteName: "ethereumhistory.com",
        type: "profile",
        url: new URL(`/historian/${id}`, metadataBase).toString(),
      },
      twitter: {
        card: "summary_large_image",
        title: `${historian.name} – Ethereum Historian`,
        description,
      },
    };
  } catch {
    return {
      metadataBase: getMetadataBaseUrl(),
      title: "Historian Profile | ethereumhistory.com",
    };
  }
}

export default function HistorianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
