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

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isDatabaseConfigured()) return { title: "Collection — Ethereum History" };
  const collection = await getCollectionBySlugFromDb(slug).catch(() => null);
  if (!collection) return { title: "Collection Not Found — Ethereum History" };
  return {
    title: `${collection.title} — Ethereum History`,
    description: collection.subtitle ?? collection.description ?? undefined,
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
