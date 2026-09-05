"use client";

/**
 * The collector card itself: a single physical object that tilts toward the
 * pointer and catches light as it moves.
 *
 * DESIGN NOTES
 * ------------
 * The effect is built from three stacked layers, which is what keeps it from
 * reading as a generic CSS gradient toy:
 *
 *   1. tilt      the whole card rotates on X and Y toward the pointer, with a
 *                real perspective origin, so parallax is consistent.
 *   2. sheen     a narrow specular band that travels with the pointer, using
 *                overlay blending so it lifts the artwork underneath instead of
 *                painting over it.
 *   3. spectrum  a repeating hue band, masked to the pointer and blended with
 *                color-dodge. This is the part that reads as foil: the hue only
 *                separates where the light hits.
 *
 * Restraint is deliberate. The card carries one accent, one typeface, and a
 * strict year-led row rhythm borrowed from the rest of the archive. Everything
 * that moves is tied to pointer position, so nothing animates on its own and
 * the card is completely still until touched.
 *
 * Motion is disabled outright under prefers-reduced-motion, and the effect is
 * pointer-driven only, so touch devices get the flat card rather than a
 * gyroscope permission prompt.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface CardHolding {
  contractAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  balance: string;
  tokenDecimals: number | null;
  tokenType: string;
  viaWrapper: string | null;
  eraId: string | null;
  deployedYear: number | null;
  deploymentBlock: number | null;
}

export interface CardPayload {
  owner: { name: string; avatarUrl: string | null };
  wallets: { address: string; label: string | null; firstTxDate: string | null }[];
  holdings: CardHolding[];
  stats: {
    contractCount: number;
    walletCount: number;
    earliestYear: number | null;
    onChainSince: string | null;
    eraCounts: Record<string, number>;
    score: number;
    averageBlock: number | null;
  };
  generatedAt: string;
}

/** Max rows before the card starts scrolling internally. */
const VISIBLE_ROWS = 8;

/** Degrees of rotation at the extreme edges. Small on purpose: past roughly 12
 * degrees the text edges start to shimmer and it stops looking like an object. */
const MAX_TILT = 9;

function formatBalance(balance: string, decimals: number | null): string {
  const d = decimals ?? 0;
  if (d === 0) return balance;
  const padded = balance.padStart(d + 1, "0");
  const whole = padded.slice(0, padded.length - d);
  const frac = padded.slice(padded.length - d).replace(/0+$/, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac.slice(0, 4)}` : grouped;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function HolographicCard({
  card,
  shareUrl,
}: {
  card: CardPayload;
  shareUrl: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || e.pointerType !== "mouse") return;
      const rect = e.currentTarget.getBoundingClientRect();
      setPointer({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    },
    [reducedMotion]
  );

  const onPointerLeave = useCallback(() => setPointer(null), []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the URL is visible in the address bar anyway.
    }
  }, [shareUrl]);

  // Centre (0.5, 0.5) means "resting", so the card is flat until pointed at.
  const px = pointer?.x ?? 0.5;
  const py = pointer?.y ?? 0.5;
  const active = pointer !== null;

  const rotateY = (px - 0.5) * 2 * MAX_TILT;
  const rotateX = -(py - 0.5) * 2 * MAX_TILT;

  const rows = card.holdings.slice(0, VISIBLE_ROWS);
  const overflow = card.holdings.length - rows.length;

  const tweetText = encodeURIComponent(
    `My Ethereum History collector card scores ${card.stats.score}: ${
      card.stats.contractCount
    } documented ${card.stats.contractCount === 1 ? "contract" : "contracts"}${
      card.stats.earliestYear ? `, oldest from ${card.stats.earliestYear}` : ""
    }.`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex flex-col items-center gap-8">
      <div style={{ perspective: "1400px" }}>
        <div
          ref={ref}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="relative w-[min(92vw,26rem)] select-none rounded-2xl"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: "preserve-3d",
            transition: active ? "transform 80ms linear" : "transform 600ms cubic-bezier(0.2,0.8,0.2,1)",
            boxShadow: active
              ? "0 30px 70px -25px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)"
              : "0 18px 45px -25px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Card body */}
          <div className="relative overflow-hidden rounded-2xl bg-[#0e0e12]">
            {/* Layer 3: spectrum foil, only visible where the light falls. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20"
              style={{
                opacity: active ? 0.3 : 0,
                transition: "opacity 300ms ease",
                // soft-light, not color-dodge. Dodge drives values toward white
                // and blew out any text underneath the highlight; soft-light
                // tints the surface and leaves the type readable.
                mixBlendMode: "soft-light",
                // Fine bands (7% apart) read as foil grain. Wide blocks read as
                // a coloured gradient laid over the card, which is the tell.
                background: `repeating-linear-gradient(${
                  100 + (px - 0.5) * 40
                }deg, #ff4d7a 0%, #ffd23d 7%, #3dffa8 14%, #3da8ff 21%, #b23dff 28%, #ff4d7a 35%)`,
                WebkitMaskImage: `radial-gradient(26% 32% at ${px * 100}% ${py * 100}%, #000 0%, transparent 100%)`,
                maskImage: `radial-gradient(26% 32% at ${px * 100}% ${py * 100}%, #000 0%, transparent 100%)`,
              }}
            />

            {/* Layer 2: specular sheen. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20"
              style={{
                opacity: active ? 0.34 : 0,
                transition: "opacity 300ms ease",
                mixBlendMode: "overlay",
                background: `radial-gradient(22% 26% at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)`,
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col gap-5 p-6">
              <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-ether-400">
                    Ethereum History
                  </p>
                  <h1 className="mt-1.5 truncate text-xl font-semibold text-obsidian-100">
                    {card.owner.name}
                  </h1>
                </div>
                {/* Verified: every wallet feeding this card proved ownership. */}
                <span
                  title="Every wallet on this card is signature verified"
                  className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full bg-ether-500/15 px-2 py-0.5 text-[0.625rem] font-medium text-ether-300"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                    <path d="M12 2l2.4 1.8 3 .1.9 2.8 2.4 1.7-1 2.8 1 2.8-2.4 1.7-.9 2.8-3 .1L12 22l-2.4-1.8-3-.1-.9-2.8L3.3 15.6l1-2.8-1-2.8 2.4-1.7.9-2.8 3-.1L12 2zm-1 12.8l5-5-1.4-1.4L11 12l-1.6-1.6L8 11.8l3 3z" />
                  </svg>
                  Verified
                </span>
              </header>

              {/* Headline stats. The earliest year is the number that matters. */}
              <div className="grid grid-cols-3 gap-3 border-y border-white/5 py-4">
                <Stat label="Score" value={String(card.stats.score)} accent />
                <Stat label="Contracts" value={String(card.stats.contractCount)} />
                <Stat
                  label="Earliest"
                  value={card.stats.earliestYear ? String(card.stats.earliestYear) : "n/a"}
                />
              </div>

              {/* Holdings, oldest first. */}
              <ul className="flex flex-col">
                {rows.map((h) => (
                  <li
                    key={h.contractAddress}
                    className="flex items-baseline gap-3 border-b border-white/5 py-2 last:border-b-0"
                  >
                    <span className="w-10 shrink-0 font-mono text-[0.6875rem] tabular-nums text-ether-400/90">
                      {h.deployedYear ?? "\u00b7"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-obsidian-200">
                      {h.tokenName ?? shortAddress(h.contractAddress)}
                      {h.viaWrapper ? (
                        <span
                          title="Held as a wrapped token and credited to the original"
                          className="ml-1.5 align-middle text-[0.5625rem] uppercase tracking-wider text-obsidian-500"
                        >
                          wrapped
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-obsidian-400">
                      {h.tokenType === "erc721"
                        ? `${h.balance}×`
                        : formatBalance(h.balance, h.tokenDecimals)}
                    </span>
                  </li>
                ))}
              </ul>

              {overflow > 0 ? (
                <p className="text-[0.6875rem] text-obsidian-500">and {overflow} more</p>
              ) : null}

              <footer className="flex items-center justify-between pt-1 text-[0.625rem] text-obsidian-600">
                <span className="font-mono">
                  {card.wallets.length > 0 ? shortAddress(card.wallets[0].address) : ""}
                  {card.wallets.length > 1 ? ` +${card.wallets.length - 1}` : ""}
                </span>
                <span>ethereumhistory.com</span>
              </footer>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-ether-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ether-500"
        >
          Share on X
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-obsidian-300 transition-colors hover:border-white/20 hover:text-obsidian-100"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`font-mono text-lg tabular-nums ${accent ? "text-ether-300" : "text-obsidian-100"}`}
      >
        {value}
      </span>
      <span className="text-[0.5625rem] uppercase tracking-[0.16em] text-obsidian-500">{label}</span>
    </div>
  );
}
