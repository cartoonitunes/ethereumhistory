/**
 * /assets/[slug]  the public collection behind a collector card.
 *
 * The card is the viral object: identity, tier, a number, no portfolio. This is
 * the reference view it points at, where every holding gets its name, its
 * balance, why it matters and a link into the archive.
 *
 * Server rendered from live data rather than from the card snapshot, so
 * descriptions stay current, and shareable as a plain URL.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { isDatabaseConfigured } from "@/lib/db-client";
import { getPublicPortfolio } from "@/lib/collector-card";
import HoldingsList from "./HoldingsList";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ethereumhistory.com";
const SLUG_PATTERN = /^[a-z0-9]{6,32}$/;

async function load(slug: string) {
  if (!isDatabaseConfigured() || !SLUG_PATTERN.test(slug)) return null;
  return getPublicPortfolio(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Collection not found", robots: { index: false, follow: false } };

  const title = `${p.owner.name}'s collection on Ethereum History`;
  return {
    title,
    description: p.headline,
    openGraph: {
      title,
      description: p.headline,
      url: `${SITE_URL}/assets/${slug}`,
      images: [{ url: `${SITE_URL}/api/collector-card/${slug}/og`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: p.headline },
  };
}


export default async function PublicAssetsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        {/* Identity */}
        <header className="flex flex-col items-center gap-4 text-center">
          {p.owner.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.owner.avatarUrl}
              alt=""
              width={72}
              height={72}
              className="h-18 w-18 rounded-full object-cover"
              style={{ width: 72, height: 72 }}
            />
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold text-obsidian-50">{p.owner.name}</h1>
            <p className="mt-1 text-sm text-ether-300">{p.tier.label}</p>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-obsidian-400">{p.headline}</p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <Stat label="Score" value={String(p.stats.score)} accent />
            <Stat label="Holdings" value={String(p.stats.contractCount)} />
            <Stat
              label="Earliest"
              value={p.stats.earliestYear ? String(p.stats.earliestYear) : "n/a"}
            />
            <Stat
              label="Onchain"
              value={p.stats.walletAgeYears !== null ? `${p.stats.walletAgeYears}y` : "n/a"}
            />
          </div>

          <Link
            href={`/card/${p.slug}`}
            className="text-xs text-ether-400 underline-offset-4 transition-colors hover:text-ether-300 hover:underline"
          >
            View the collector card
          </Link>
        </header>

        <HoldingsList holdings={p.holdings} />

        <p className="mt-10 text-center text-xs leading-relaxed text-obsidian-500">
          {p.owner.verified
            ? "Every wallet behind this collection was verified by signature."
            : "The wallets behind this collection have not been verified by signature, so these holdings are a claim rather than a proof."}{" "}
          Balances were read from the chain and matched against the Ethereum History archive.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`font-mono text-lg tabular-nums ${accent ? "text-ether-300" : "text-obsidian-100"}`}
      >
        {value}
      </span>
      <span className="text-[0.5625rem] uppercase tracking-[0.14em] text-obsidian-500">{label}</span>
    </div>
  );
}
