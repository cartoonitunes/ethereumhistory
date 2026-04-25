import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isDatabaseConfigured,
  getCollectionBySlugFromDb,
  getCollectionContractsFromDb,
} from "@/lib/db-client";
import CollectionPageClient from "./CollectionPageClient";
import type { CollectionContract } from "@/lib/db/collections";
import type { Collection } from "@/lib/schema";

export const revalidate = 300;

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

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isDatabaseConfigured()) return { title: "Collection — Ethereum History" };
  const collection = await getCollectionBySlugFromDb(slug).catch(() => null);
  if (!collection) return { title: "Collection Not Found — Ethereum History" };

  const metadataBase = getMetadataBaseUrl();
  const title = `${collection.title} — Ethereum History`;
  const description =
    collection.subtitle ??
    collection.description ??
    `Explore the ${collection.title} on Ethereum History.`;
  const ogImageUrl = new URL(`/api/og/collection/${slug}`, metadataBase).toString();
  const canonicalUrl = new URL(`/collection/${slug}`, metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Ethereum History",
      images: [{ url: ogImageUrl, width: 1200, height: 630, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;

  if (!isDatabaseConfigured()) notFound();

  const collection = await getCollectionBySlugFromDb(slug).catch(() => null);
  if (!collection) notFound();

  const contracts = await getCollectionContractsFromDb(
    collection.contractAddresses ?? [],
    collection.deployerAddress ?? null,
    200
  ).catch(() => [] as CollectionContract[]);

  return (
    <CollectionPageClient collection={collection} contracts={contracts} />
  );
}
