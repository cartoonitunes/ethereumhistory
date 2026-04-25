import { Metadata } from "next";
import { isDatabaseConfigured, getCollectionsListFromDb } from "@/lib/db-client";
import CollectionsPageClient from "./CollectionsPageClient";
import type { CollectionSummary } from "@/lib/db/collections";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Collections — Ethereum History",
  description:
    "Curated galleries of historically significant Ethereum smart contracts, organized by deployer, era, or theme.",
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
