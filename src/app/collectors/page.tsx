/**
 * /collectors  what collecting means on Ethereum History, and the lookup tool.
 *
 * The homepage section is a short prompt with an input. This is the page it
 * points at, for anyone who wants to know what the archive is and why holding
 * one of these contracts is worth anything before they paste an address.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import CollectorCardCta from "@/app/CollectorCardCta";
import { allTiers, getLeaderboard, type LeaderboardEntry } from "@/lib/collector-card";
import { isDatabaseConfigured } from "@/lib/db-client";
import Leaderboard from "./Leaderboard";

/**
 * Revalidated rather than force-dynamic. This is a marketing page that was
 * fully static until the leaderboard arrived, and rankings do not need to be
 * to the second. Five minutes keeps it cheap for the common case, which is a
 * visitor who followed a shared link and will never see it change.
 */
export const revalidate = 300;

/** How many rows the page shows. The API accepts more for a future "show more". */
const LEADERBOARD_SIZE = 25;

/**
 * Same helper the other metadata-bearing pages declare locally. Kept local
 * rather than shared because the three existing copies do not agree: the root
 * layout omits the VERCEL_ENV production branch, so unifying them would change
 * how the site resolves its own URL. That is a separate cleanup, not something
 * to slip into a metadata change.
 */
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

const TITLE = "Collectors - Ethereum History";
const DESCRIPTION =
  "Check any wallet against the Ethereum History archive and see which documented early contracts it holds. No account needed.";

/**
 * The opengraph-image file beside this page supplies og:image and
 * twitter:image, so neither is repeated here. Only the fields that differ from
 * the root layout's defaults are set.
 */
export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Ethereum",
    "collector",
    "early contracts",
    "NFT history",
    "token archive",
    "wallet",
  ],
  alternates: {
    canonical: new URL("/collectors", getMetadataBaseUrl()).toString(),
  },
  openGraph: {
    title: "Do you hold a piece of Ethereum history?",
    description: DESCRIPTION,
    url: new URL("/collectors", getMetadataBaseUrl()).toString(),
    type: "website",
    locale: "en_US",
    siteName: "Ethereum History",
  },
  twitter: {
    card: "summary_large_image",
    title: "Do you hold a piece of Ethereum history?",
    description:
      "Check any wallet against the Ethereum History archive and see which documented early contracts it holds.",
  },
  robots: { index: true, follow: true },
};

/**
 * The leaderboard is the only part of this page that touches the database, and
 * everything else on it is worth serving without one. A failed query renders no
 * section rather than no page: this is the entry point people arrive at from a
 * shared link, and losing the whole thing because a rank could not be computed
 * would be a bad trade.
 */
async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await getLeaderboard(LEADERBOARD_SIZE);
  } catch (err) {
    console.error("[collectors] leaderboard unavailable:", err);
    return [];
  }
}

export default async function CollectorsPage() {
  const tiers = allTiers();
  const leaderboard = await loadLeaderboard();

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <header className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Collectors</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-obsidian-400">
            Ethereum History is an archive of the contracts that shaped the chain&apos;s
            first years, documented one at a time by historians. Many of those contracts
            issued tokens, and a surprising number are still held today, in wallets whose
            owners have no idea what they are sitting on.
          </p>
        </header>

        <div className="mt-10">
          <CollectorCardCta />
        </div>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <Step
            n="1"
            title="We read the chain"
            body="Every token your wallet holds is read directly from mainnet, then matched against the archive."
          />
          <Step
            n="2"
            title="We keep the documented ones"
            body="Only contracts a historian has actually written up count. A wallet full of modern tokens returns an empty card."
          />
          <Step
            n="3"
            title="You get a score and a card"
            body="Scored on how early the contracts you hold were deployed, then turned into a card you can share."
          />
        </section>

        <section className="mt-16">
          <h2 className="text-xl font-semibold">Tiers</h2>
          <p className="mt-2 text-sm text-obsidian-400">
            Scored purely on the deployment order of what you hold, the same way the
            supporter badges are scored on what has been given. Earlier contracts score
            higher. The tier describes the collection, never the collector.
          </p>
          <ul className="mt-6 flex flex-col gap-2">
            {tiers.map((t) => (
              <li
                key={t.label}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-white/10 px-4 py-3"
              >
                <span className={`text-sm font-semibold ${t.color}`}>{t.label}</span>
                <span className="font-mono text-xs text-obsidian-500">{t.threshold}</span>
                <span className="w-full text-xs text-obsidian-400 sm:w-auto sm:flex-1">
                  {t.blurb}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* After Tiers on purpose: the rows are labelled with tier names, so the
            ladder has to be explained before the ranking that uses it. */}
        <Leaderboard entries={leaderboard} />

        <section className="mt-16 rounded-xl border border-white/10 p-6 text-center">
          <h2 className="text-lg font-semibold">Keep your card</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-obsidian-400">
            A card generated from the box above is not saved anywhere. Sign in to keep it,
            add more wallets, verify them by signature for the badge, and get a collection
            page listing every holding with its story.
          </p>
          <Link
            href="/assets"
            className="mt-5 inline-block rounded-lg bg-ether-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ether-500"
          >
            Go to your assets
          </Link>
        </section>
      </main>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-5">
      <span className="font-mono text-xs text-ether-400">{n}</span>
      <h3 className="mt-2 text-sm font-semibold text-obsidian-100">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-obsidian-400">{body}</p>
    </div>
  );
}
