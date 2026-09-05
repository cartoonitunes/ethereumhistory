/**
 * Shown while a preview is scanned.
 *
 * The preview is server rendered and scans on demand, which measured at around
 * 3.2 seconds for a real wallet. Arriving from the lookup form was fine, since
 * that form says "Reading the chain" before it navigates. Arriving from a
 * shared link, which is what this page exists for, was three seconds of nothing
 * at all, and nothing at all is indistinguishable from a broken link.
 *
 * Deliberately a skeleton of the real layout rather than a spinner: the card
 * frame, the header and the page shape are all known before the scan returns,
 * so the page can settle into its final geometry immediately and only the
 * contents arrive late.
 */

import { Header } from "@/components/Header";

export default function PreviewLoading() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <main className="flex flex-col items-center gap-8 px-4 py-10 sm:py-14">
        {/* Matches the card's own footprint so nothing jumps when it lands. */}
        <div
          className="w-[min(88vw,20rem)] animate-pulse rounded-[1.25rem] border border-white/10 bg-white/[0.03] sm:w-[23rem]"
          style={{ height: 462 }}
          aria-hidden
        />
        <p role="status" className="text-sm text-obsidian-400">
          Reading the chain and matching against the archive.
        </p>
        <div className="flex w-full max-w-5xl flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
