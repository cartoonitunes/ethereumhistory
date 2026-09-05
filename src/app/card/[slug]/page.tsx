/**
 * /card/[slug]  the public, shareable collector card.
 *
 * Server rendered from the stored snapshot so a link posted to X resolves for
 * anyone, signed in or not, and so the crawler gets real metadata rather than
 * an empty client shell.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { collectorCards } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { normalizeCardData } from "@/lib/collector-card";
import HolographicCard, { type CardPayload } from "./HolographicCard";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ethereumhistory.com";

const SLUG_PATTERN = /^[a-z0-9]{6,32}$/;

async function loadCard(slug: string): Promise<CardPayload | null> {
  if (!isDatabaseConfigured() || !SLUG_PATTERN.test(slug)) return null;
  const db = getDb();
  const [row] = await db
    .select({ cardDataJson: collectorCards.cardDataJson })
    .from(collectorCards)
    .where(eq(collectorCards.shareSlug, slug));
  // Normalised, so a card stored before the redesign still renders.
  return row ? (normalizeCardData(row.cardDataJson) as unknown as CardPayload) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = await loadCard(slug);

  if (!card) {
    return { title: "Card not found", robots: { index: false, follow: false } };
  }

  const title = `${card.owner.name} on Ethereum History`;
  const count = card.stats.contractCount;
  const description = `${count} historic ${count === 1 ? "contract" : "contracts"} held${
    card.stats.earliestYear ? `, the oldest deployed in ${card.stats.earliestYear}` : ""
  }.`;
  const ogImage = `${SITE_URL}/api/collector-card/${slug}/og`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/card/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await loadCard(slug);
  if (!card) notFound();

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <main className="flex flex-col items-center gap-10 px-4 py-16">
        <HolographicCard
        card={card}
        shareUrl={`${SITE_URL}/card/${slug}`}
        slug={slug}
        collectionUrl={`${SITE_URL}/assets/${slug}`}
      />

        <p className="max-w-sm text-center text-xs leading-relaxed text-obsidian-500">
          {card.stats.allWalletsVerified
            ? "Every wallet behind this card was verified by signature."
            : "The wallets behind this card have not been verified by signature, so these holdings are a claim rather than a proof."}{" "}
          Balances were read from the chain and matched against the Ethereum History
          archive.
        </p>

        <div className="flex flex-col items-center gap-2">
          <Link
            href={`/assets/${slug}`}
            className="text-xs text-ether-400 underline-offset-4 transition-colors hover:text-ether-300 hover:underline"
          >
            See the full collection
          </Link>
          <Link
            href="/assets"
            className="text-xs text-obsidian-500 underline-offset-4 transition-colors hover:text-obsidian-300 hover:underline"
          >
            Make your own collector card
          </Link>
        </div>
      </main>
    </div>
  );
}
