/**
 * /assets  wallet management for the collector card.
 *
 * The page shell is server rendered; everything interactive lives in the client
 * component, which talks to /api/wallets. Not indexed: it is a personal
 * dashboard, and the public artefact is /card/[slug].
 */

import type { Metadata } from "next";
import AssetsClient from "./AssetsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your assets",
  description: "Attach wallets and build your Ethereum History collector card.",
  robots: { index: false, follow: false },
};

export default function AssetsPage() {
  return (
    <main className="px-4 py-12 sm:py-16">
      <AssetsClient />
    </main>
  );
}
