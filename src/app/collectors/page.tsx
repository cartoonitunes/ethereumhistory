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
import { allTiers } from "@/lib/collector-card";

export const metadata: Metadata = {
  title: "Collectors - Ethereum History",
  description:
    "Check any wallet against the Ethereum History archive and see which documented early contracts it holds.",
};

export default function CollectorsPage() {
  const tiers = allTiers();

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
