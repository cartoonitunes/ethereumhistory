/**
 * The collectors leaderboard.
 *
 * A plain ranked list rather than a podium. A podium needs three entries to
 * read as intentional and looks broken with one or two, and this list starts
 * near empty and fills up over time. A list is correct at every size, which is
 * the only layout that works on day one and on day five hundred.
 *
 * Server component: it receives rows already ranked and does no fetching, so
 * the page can decide how to handle a database that is down.
 */

import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/collector-card";

export default function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold">Leaderboard</h2>
        <p className="font-mono text-xs text-obsidian-500">
          {entries.length === 1 ? "1 collector" : `top ${entries.length}`}
        </p>
      </div>
      <p className="mt-2 text-sm text-obsidian-400">
        Everyone who has built a card, ranked by score. Scores are recomputed on every
        view, so a rank moves when the archive grows or a collection does.
      </p>

      <ol className="mt-6 flex flex-col gap-px overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {entries.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/assets/${e.slug}`}
              className="group flex items-center gap-3 bg-obsidian-950 px-3 py-3 transition-colors hover:bg-obsidian-900 sm:gap-4 sm:px-4"
            >
              <Rank rank={e.rank} />
              <Avatar entry={e} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-obsidian-100 group-hover:text-white">
                    {e.name}
                  </span>
                  {e.verified ? <VerifiedMark /> : null}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <span className={e.tier.color}>{e.tier.label}</span>
                  <span className="hidden text-obsidian-600 sm:inline">/</span>
                  <span className="hidden text-obsidian-500 sm:inline">
                    {e.contractCount} {e.contractCount === 1 ? "contract" : "contracts"}
                    {e.earliestYear ? `, from ${e.earliestYear}` : ""}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="font-mono text-base leading-none text-obsidian-50 tabular-nums">
                  {e.score}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-obsidian-600">
                  score
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-center text-xs text-obsidian-500">
        Built a card? You are on it. Scores update as the archive grows.
      </p>
    </section>
  );
}

/**
 * Rank number. The top three are lit, everything below is quiet.
 *
 * Brightness, deliberately not colour. The first three tiers are yellow-400,
 * ether-200 and ether-300, so a gold, silver, bronze rank would paint rank one
 * the exact colour that means Master Curator two lines below it, and a rank two
 * Archivist would come out in Senior Curator's colour. Two scales in one palette
 * is unreadable. Here colour means tier and nothing else, and rank is carried by
 * weight alone.
 *
 * Tabular figures and a fixed width so the avatars line up whether the rank is
 * one digit or two, which is the thing that makes a ranked list look composed
 * rather than assembled.
 */
function Rank({ rank }: { rank: number }) {
  const tone = rank <= 3 ? "text-obsidian-300" : "text-obsidian-600";
  return (
    <span className={`w-6 shrink-0 text-right font-mono text-sm tabular-nums ${tone}`}>{rank}</span>
  );
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.avatarUrl}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
        style={{ width: 36, height: 36 }}
      />
    );
  }
  // No image, so draw an initial rather than an empty circle. Deterministic from
  // the name, so the same collector looks the same on every visit.
  const initial = entry.name.replace(/^0x/i, "").charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-obsidian-400 ring-1 ring-white/10">
      {initial}
    </span>
  );
}

/** Every wallet behind the card was proved by signature. */
function VerifiedMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-label="Wallets verified by signature"
      role="img"
      className="h-3.5 w-3.5 shrink-0 text-ether-400"
    >
      <path
        fillRule="evenodd"
        d="M10 1.5 3 4.3v5c0 4 2.9 7.7 7 9.2 4.1-1.5 7-5.2 7-9.2v-5L10 1.5Zm3.3 6.4-4 4.4a.9.9 0 0 1-1.3.05L6.8 11.2a.9.9 0 1 1 1.2-1.3l.9.85 3.4-3.7a.9.9 0 1 1 1.3 1.2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
