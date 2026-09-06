/**
 * The quiet invitation at the foot of somebody else's collection.
 *
 * Placed below the holdings on both public surfaces, /assets/[slug] and
 * /preview/[address], and deliberately kept plain. The page belongs to the
 * person whose collection it is, and a visitor arriving from a shared link came
 * to look at theirs, not to be sold something. So this is a hairline rule and a
 * sentence rather than a panel: outlined instead of filled, so it reads as a
 * footer note rather than as a second call to action competing with the card at
 * the top of the page.
 *
 * The "no account needed" line is the part that earns the click. The scan is
 * genuinely open to anyone, and saying so removes the thing most people assume
 * is waiting for them behind a link like this.
 */

import Link from "next/link";

export default function CollectorScoreCta({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="collector-score-cta-heading"
      className={`w-full max-w-2xl border-t border-white/5 pt-8 text-center ${className}`}
    >
      <h2 id="collector-score-cta-heading" className="text-sm font-medium text-obsidian-200">
        Want to see yours?
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-obsidian-400">
        Any wallet can be scored against the archive, on how early the contracts it
        holds were deployed. No account needed to look.
      </p>
      <Link
        href="/collectors"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-ether-500/30 bg-ether-500/5 px-4 py-2 text-sm font-medium text-ether-300 transition-colors hover:border-ether-500/50 hover:bg-ether-500/10 hover:text-ether-200"
      >
        Check your collector score
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
