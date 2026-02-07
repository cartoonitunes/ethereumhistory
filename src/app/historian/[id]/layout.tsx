import type { Metadata } from "next";
import { getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const historianId = parseInt(id, 10);

  if (isNaN(historianId) || historianId <= 0) {
    return {
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
        title: "Historian Not Found | ethereumhistory.com",
      };
    }

    const editCount = editCountRows[0]?.count ?? 0;
    const description = historian.bio
      ? `${historian.bio.slice(0, 150)}${historian.bio.length > 150 ? "..." : ""}`
      : `${historian.name} has made ${editCount} ${editCount === 1 ? "edit" : "edits"} documenting early Ethereum smart contracts on ethereumhistory.com.`;

    return {
      title: `${historian.name} – Ethereum Historian | ethereumhistory.com`,
      description,
      openGraph: {
        title: `${historian.name} – Ethereum Historian`,
        description,
        siteName: "ethereumhistory.com",
        type: "profile",
      },
      twitter: {
        card: "summary_large_image",
        title: `${historian.name} – Ethereum Historian`,
        description,
      },
    };
  } catch {
    return {
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
