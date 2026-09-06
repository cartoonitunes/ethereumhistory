/**
 * Historic contracts a wallet took part in rather than collected.
 *
 * Wallet proxies, multi-sigs and DAOs. Holding one of these is participation in
 * Ethereum's history and worth showing, but it is not ownership of an artefact,
 * so none of it is scored or counted in the stats above.
 *
 * Styled quieter than the collectibles list on purpose, and the difference is
 * the point rather than decoration: a subdued row says "this is context" without
 * needing a sentence to explain it. Same order, oldest first, so the two lists
 * read the same way.
 */

import Link from "next/link";

export interface ActivityItem {
  contractAddress: string;
  name: string;
  symbol?: string | null;
  deployedYear: number | null;
  shortDescription?: string | null;
}

export default function ActivityList({
  items,
  compact = false,
}: {
  items: ActivityItem[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className={compact ? "mt-8" : "mt-12"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-obsidian-300">Historic contract activity</h2>
        <p className="font-mono text-[0.6875rem] text-obsidian-400">
          {items.length === 1
            ? "participated in 1 historic contract"
            : `participated in ${items.length} historic contracts`}
        </p>
      </div>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-obsidian-400">
        Wallets, multi-sigs and DAOs this address took part in. Shown for the record,
        and deliberately not counted towards the score, which measures a collection.
      </p>

      {/* A plain divided list rather than the bordered cards above, so the two
          sections are told apart at a glance and not only by their headings. */}
      <ul className="mt-3 flex flex-col divide-y divide-white/5 border-y border-white/5">
        {items.map((h) => (
          <li key={h.contractAddress}>
            <Link
              href={`/contract/${h.contractAddress}`}
              className="flex items-baseline gap-3 py-2 transition-colors hover:bg-white/[0.02]"
            >
              <span className="w-11 shrink-0 font-mono text-[0.6875rem] tabular-nums text-obsidian-400">
                {h.deployedYear ?? "·"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-obsidian-300">
                {h.name}
              </span>
              {h.symbol ? (
                <span className="shrink-0 font-mono text-[0.6875rem] text-obsidian-400">
                  {h.symbol}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
