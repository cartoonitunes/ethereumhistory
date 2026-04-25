import { Metadata } from "next";
import { isDatabaseConfigured, getCollectionsListFromDb } from "@/lib/db-client";
import CollectionsPageClient from "./CollectionsPageClient";
import type { CollectionSummary } from "@/lib/db/collections";

export const revalidate = 300;

const SITE_URL = "https://www.ethereumhistory.com";

export const metadata: Metadata = {
  title: "Collections — Ethereum History",
  description:
    "Every contract deployed by Ethereum's earliest builders, documented and verified in one place. Explore collections from Vitalik, Avsa, Linagee, Piper Merriam, and more.",
  alternates: { canonical: `${SITE_URL}/collections` },
  openGraph: {
    title: "Collections — Ethereum History",
    description:
      "Every contract deployed by Ethereum's earliest builders, documented and verified in one place.",
    url: `${SITE_URL}/collections`,
    type: "website",
    siteName: "Ethereum History",
    images: [
      { url: `${SITE_URL}/api/og/collections`, width: 1200, height: 630, type: "image/png" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Collections — Ethereum History",
    description:
      "Every contract deployed by Ethereum's earliest builders, documented and verified.",
    images: [`${SITE_URL}/api/og/collections`],
  },
};

export default async function CollectionsPage() {
  let collections: CollectionSummary[] = [];
  if (isDatabaseConfigured()) {
    try {
      collections = await getCollectionsListFromDb();
    } catch {
      // render empty on error
    }
  }
  return <CollectionsPageClient collections={collections} />;
}
