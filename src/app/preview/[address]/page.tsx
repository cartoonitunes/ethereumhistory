/**
 * /preview/[address]  an ephemeral collector card for any wallet.
 *
 * Server rendered and recomputed on each view rather than stored, so the card
 * is shareable as a real URL (X can unfurl it) while still living nowhere in
 * the database. Signing up is what turns it into a card someone owns.
 */

import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  buildEphemeralCard,
  getPreviewCard,
  persistPreviewCard,
} from "@/lib/collector-card";
import { isDatabaseConfigured } from "@/lib/db-client";
import { isValidAddress } from "@/lib/utils";
import { tokenIdentity } from "@/lib/token-display";
import { cached, CACHE_TTL } from "@/lib/cache";
import HolographicCard, { type CardPayload } from "@/app/card/[slug]/HolographicCard";
import HoldingsList, { type HoldingItem } from "@/app/assets/[slug]/HoldingsList";
import ActivityList from "@/app/assets/[slug]/ActivityList";
import SavePreviewCta from "./SavePreviewCta";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ethereumhistory.com";

/**
 * Load a preview, from storage when it exists.
 *
 * A preview URL is permanent now: the first person to look an address up pays
 * for the scan, and everyone after that reads the stored row. That is what
 * makes the link shareable without a three second wait and without spending a
 * provider call on every view of a popular address.
 *
 * Wrapped in React cache so generateMetadata and the page body share one call
 * per request. Without it a single view runs this twice, which on a cold
 * address means two scans and, worse, counts as two lookups in scan_count.
 *
 * A stored card is served however old it is, deliberately. The alternative is
 * re-scanning on some staleness rule, which quietly turns every shared link
 * back into a scan and reintroduces the cost this exists to remove. Holdings do
 * change, so the page says when it last looked rather than pretending the
 * number is live.
 */
const load = cache(async function load(address: string, force = false) {
  const key = decodeURIComponent(address).trim().toLowerCase();
  if (!key || key.length > 128) return null;

  // A refresh skips the stored row. Without this a persisted preview is
  // permanent in the unhelpful sense too: holdings change, and there would be
  // no way to ever see the new ones.
  if (!force && isDatabaseConfigured() && isValidAddress(key)) {
    const stored = await getPreviewCard(key);
    if (stored) {
      return { address: key, card: stored.card, lastScannedAt: stored.lastScannedAt, fresh: false };
    }
  }

  // Nothing stored, so scan. The in memory cache still absorbs the burst of a
  // link going round before the row is written.
  const result = force
    ? await buildEphemeralCard(key, true)
    : await cached(`card-preview:${key}`, CACHE_TTL.MEDIUM, () => buildEphemeralCard(key));
  if ("error" in result) return null;

  await persistPreviewCard(result.address, result.card);
  return { address: result.address, card: result.card, lastScannedAt: new Date(), fresh: true };
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const result = await load(address);
  if (!result) return { title: "Card preview", robots: { index: false, follow: false } };

  const { card } = result;
  const title = `${card.owner.name} on Ethereum History`;
  const image = `${SITE_URL}/api/collector-card/preview/${encodeURIComponent(address)}/share`;
  return {
    title,
    description: card.headline,
    // Previews are persisted and publicly ranked now, so they are real pages
    // rather than throwaway renders. Still noindex: they are generated for
    // arbitrary addresses, including addresses whose owner never visited, and
    // putting those in a search index goes a step beyond listing them on one
    // page of this site.
    robots: { index: false, follow: false },
    openGraph: { title, description: card.headline, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: card.headline, images: [image] },
  };
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ refresh?: string }>;
}) {
  const { address } = await params;
  const { refresh } = await searchParams;
  const result = await load(address, refresh === "1");
  if (!result) notFound();

  // Signed in visitors already have somewhere to keep this, so the banner
  // would be selling them something they own. They get the quieter footer.
  const me = await getHistorianMeFromCookies();

  const shareUrl = `${SITE_URL}/preview/${encodeURIComponent(address)}`;

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <main className="flex flex-col items-center gap-8 px-4 py-10 sm:py-14">
        <HolographicCard
          card={result.card as unknown as CardPayload}
          shareUrl={shareUrl}
          slug={`preview/${encodeURIComponent(address)}`}
          previewMode
        />

        {!me ? (
          <SavePreviewCta
            address={result.address}
            holdingCount={result.card.holdings.length}
          />
        ) : null}

        {/* The card alone is thin value for a first visit, so the holdings sit
            right under it: what they own, why each one matters, and a way into
            the archive. This is the same list a saved collection page shows. */}
        {result.card.holdings.length > 0 ? (
          <div className="w-full max-w-5xl">
            <HoldingsList
              title="Collectibles, oldest first"
              holdings={result.card.holdings.map(
                (h): HoldingItem => ({
                  contractAddress: h.contractAddress,
                  // Stored preview cards can carry names written before the
                  // bytes32 cleanup, so the test is applied on render too.
                  name: tokenIdentity({
                    tokenName: h.tokenName,
                    tokenSymbol: h.tokenSymbol,
                    address: h.contractAddress,
                  }).name,
                  symbol: tokenIdentity({
                    tokenName: h.tokenName,
                    tokenSymbol: h.tokenSymbol,
                    address: h.contractAddress,
                  }).symbol,
                  balance: h.balance,
                  tokenDecimals: h.tokenDecimals,
                  tokenType: h.tokenType,
                  viaWrapper: h.viaWrapper,
                  deployedYear: h.deployedYear,
                  eraId: h.eraId,
                  shortDescription: h.shortDescription ?? null,
                })
              )}
            />
          </div>
        ) : null}

        {result.card.activity && result.card.activity.length > 0 ? (
          <div className="w-full max-w-5xl">
            <ActivityList
              items={result.card.activity.map((h) => ({
                contractAddress: h.contractAddress,
                name: tokenIdentity({
                  tokenName: h.tokenName,
                  tokenSymbol: h.tokenSymbol,
                  address: h.contractAddress,
                }).name,
                symbol: tokenIdentity({
                  tokenName: h.tokenName,
                  tokenSymbol: h.tokenSymbol,
                  address: h.contractAddress,
                }).symbol,
                deployedYear: h.deployedYear,
                shortDescription: h.shortDescription ?? null,
              }))}
            />
          </div>
        ) : null}

        <p className="text-xs text-obsidian-400">
          Holdings read from the chain on{" "}
          {result.lastScannedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          .{" "}
          <Link
            href={`/preview/${encodeURIComponent(address)}?refresh=1`}
            prefetch={false}
            className="text-ether-300 underline-offset-4 hover:underline"
          >
            Check again
          </Link>
        </p>

        {me ? (
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-xs leading-relaxed text-obsidian-400">
              This preview is generated on the spot and is not saved. Add the wallet to
              your account to keep it alongside your others.
            </p>
            <Link
              href="/assets"
              className="rounded-lg bg-ether-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ether-500"
            >
              Go to your assets
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
