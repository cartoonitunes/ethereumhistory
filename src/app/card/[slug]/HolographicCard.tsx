"use client";

/**
 * The collector card: a single physical object that tilts toward the pointer
 * and catches light as it moves.
 *
 * DESIGN NOTES
 * ------------
 * Built as a trading card rather than a data view. The portrait carries the
 * card, the tier title says what the score means, and two or three holdings get
 * room to tell their story. The previous version listed every holding as a row
 * of name, year and balance, which read as a table and taught the viewer
 * nothing.
 *
 * The holographic effect is three stacked layers:
 *
 *   1. tilt      the card rotates on X and Y toward the pointer, with a real
 *                perspective origin, so parallax is consistent.
 *   2. sheen     a specular highlight that travels with the pointer, on overlay
 *                blending so it lifts the art underneath instead of painting
 *                over it.
 *   3. spectrum  a fine hue band masked to the pointer, on soft-light. This is
 *                the part that reads as foil: the hue only separates where the
 *                light falls. Soft-light rather than color-dodge, because dodge
 *                drives values toward white and blows out the type underneath.
 *
 * Nothing animates on its own. Everything is tied to pointer position, so the
 * card is completely still until touched, and the whole effect is disabled
 * under prefers-reduced-motion. Pointer driven only, so touch devices get the
 * flat card rather than a gyroscope permission prompt.
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

export interface CardStandout {
  contractAddress: string;
  name: string;
  headline: string;
  story: string | null;
  year: number | null;
  eraId: string | null;
}

export interface CardPayload {
  owner: {
    name: string;
    ensName: string | null;
    avatarUrl: string | null;
    avatarSource: "profile" | "ens" | "generated";
    verified: boolean;
  };
  tier: { label: string; blurb: string; min: number };
  standouts: CardStandout[];
  wallets: { address: string; label: string | null; firstTxDate: string | null; verified: boolean }[];
  holdings: CardHolding[];
  stats: {
    contractCount: number;
    walletCount: number;
    verifiedWalletCount: number;
    allWalletsVerified: boolean;
    earliestYear: number | null;
    onChainSince: string | null;
    walletAgeYears: number | null;
    eraCounts: Record<string, number>;
    score: number;
    averageBlock: number | null;
  };
  generatedAt: string;
}

/** Degrees of rotation at the extreme edges. Past roughly 12 the text edges
 * shimmer and it stops reading as a solid object. */
const MAX_TILT = 9;

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Deterministic fallback portrait, drawn from the address.
 *
 * Used when there is no EH profile image and no ENS avatar. Deterministic so a
 * given wallet always gets the same one, which makes it read as an identity
 * rather than as random decoration.
 */
function generatedAvatar(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 58) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 70% 52%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 68% 34%)"/>
    </linearGradient></defs>
    <rect width="120" height="120" fill="url(#g)"/>
    <circle cx="60" cy="46" r="21" fill="rgba(255,255,255,0.32)"/>
    <ellipse cx="60" cy="102" rx="34" ry="26" fill="rgba(255,255,255,0.32)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Decorative sparkles. Positions are fixed rather than random, so the card
 * renders identically on the server and after hydration. */
const SPARKS = [
  { top: "6%", left: "8%", size: 9, delay: 0 },
  { top: "13%", left: "89%", size: 6, delay: 0.6 },
  { top: "44%", left: "4%", size: 5, delay: 1.2 },
  { top: "72%", left: "93%", size: 8, delay: 0.3 },
  { top: "88%", left: "12%", size: 6, delay: 0.9 },
];

export default function HolographicCard({
  card,
  shareUrl,
}: {
  card: CardPayload;
  shareUrl: string;
}) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
      setPointer({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    },
    [reducedMotion]
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the URL is in the address bar regardless.
    }
  }, [shareUrl]);

  // Centre means resting, so the card is flat until pointed at.
  const px = pointer?.x ?? 0.5;
  const py = pointer?.y ?? 0.5;
  const active = pointer !== null;
  const rotateY = (px - 0.5) * 2 * MAX_TILT;
  const rotateX = -(py - 0.5) * 2 * MAX_TILT;

  const seed = card.wallets[0]?.address ?? card.owner.name;
  const primaryWallet = card.wallets[0]?.address ?? null;
  const subline =
    card.owner.ensName && card.owner.ensName !== card.owner.name
      ? card.owner.ensName
      : primaryWallet
        ? shortAddress(primaryWallet)
        : null;
  const avatar = !avatarFailed && card.owner.avatarUrl ? card.owner.avatarUrl : generatedAvatar(seed);

  const tweet = encodeURIComponent(
    `I am a ${card.tier.label} on Ethereum History, scoring ${card.stats.score} across ${
      card.stats.contractCount
    } documented ${card.stats.contractCount === 1 ? "contract" : "contracts"}.`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweet}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex flex-col items-center gap-8">
      <div style={{ perspective: "1500px" }}>
        <div
          ref={cardRef}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setPointer(null)}
          className="relative w-[min(92vw,23rem)] select-none rounded-[1.25rem]"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: "preserve-3d",
            transition: active
              ? "transform 80ms linear"
              : "transform 650ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        >
          {/* Outer glow, behind the card, stronger on hover. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-3 rounded-[1.75rem] blur-2xl"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 40%, rgba(98,110,241,0.5), rgba(98,110,241,0) 70%)",
              opacity: active ? 0.95 : 0.5,
              transition: "opacity 400ms ease",
            }}
          />

          {/* Gradient border, drawn as a 1px padded wrapper around the body. */}
          <div
            className="relative rounded-[1.25rem] p-px"
            style={{
              background: `linear-gradient(${145 + (px - 0.5) * 50}deg, rgba(164,184,252,0.85), rgba(98,110,241,0.35) 35%, rgba(255,255,255,0.08) 60%, rgba(164,184,252,0.6))`,
              boxShadow: active
                ? "0 32px 70px -28px rgba(0,0,0,0.9)"
                : "0 20px 50px -30px rgba(0,0,0,0.85)",
            }}
          >
            <div className="relative overflow-hidden rounded-[1.2rem] bg-[#0b0b10]">
              {/* Spectrum foil */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-20"
                style={{
                  opacity: active ? 0.3 : 0,
                  transition: "opacity 300ms ease",
                  mixBlendMode: "soft-light",
                  background: `repeating-linear-gradient(${100 + (px - 0.5) * 40}deg, #ff4d7a 0%, #ffd23d 7%, #3dffa8 14%, #3da8ff 21%, #b23dff 28%, #ff4d7a 35%)`,
                  WebkitMaskImage: `radial-gradient(26% 32% at ${px * 100}% ${py * 100}%, #000 0%, transparent 100%)`,
                  maskImage: `radial-gradient(26% 32% at ${px * 100}% ${py * 100}%, #000 0%, transparent 100%)`,
                }}
              />
              {/* Specular sheen */}
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

              {/* Sparkles */}
              {SPARKS.map((s, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute z-20 rounded-full"
                  style={{
                    top: s.top,
                    left: s.left,
                    width: s.size,
                    height: s.size,
                    opacity: active ? 0.9 : 0.35,
                    transition: `opacity 500ms ease ${s.delay * 120}ms`,
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 65%)",
                  }}
                />
              ))}

              <div className="relative z-10 flex flex-col items-center px-6 pb-6 pt-7 text-center">
                <p className="text-[0.5625rem] font-medium uppercase tracking-[0.3em] text-ether-400">
                  Ethereum History
                </p>

                {/* Portrait */}
                <div className="relative mt-5">
                  <div
                    aria-hidden
                    className="absolute -inset-2 rounded-full blur-lg"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(130,145,255,0.55), rgba(130,145,255,0) 70%)",
                      opacity: active ? 1 : 0.6,
                      transition: "opacity 400ms ease",
                    }}
                  />
                  <div
                    className="relative h-28 w-28 rounded-full p-[2px]"
                    style={{
                      background:
                        "conic-gradient(from 140deg, #a4b8fc, #626ef1, #b23dff, #3da8ff, #a4b8fc)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar}
                      alt=""
                      width={112}
                      height={112}
                      onError={() => setAvatarFailed(true)}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                </div>

                {/* Identity */}
                <h1 className="mt-4 max-w-full truncate text-lg font-semibold text-obsidian-50">
                  {card.owner.name}
                </h1>
                <div className="mt-1 flex items-center gap-1.5">
                  {/* The title already shows the ENS name when there is one, so
                      the sub-line falls back to the address rather than
                      printing the same string twice. */}
                  {subline ? (
                    <span className="font-mono text-[0.6875rem] text-obsidian-500">{subline}</span>
                  ) : null}
                  {card.owner.verified ? (
                    <span
                      title="Every wallet on this card is signature verified"
                      className="inline-flex items-center text-ether-300"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.4 1.8 3 .1.9 2.8 2.4 1.7-1 2.8 1 2.8-2.4 1.7-.9 2.8-3 .1L12 22l-2.4-1.8-3-.1-.9-2.8L3.3 15.6l1-2.8-1-2.8 2.4-1.7.9-2.8 3-.1L12 2zm-1 12.8l5-5-1.4-1.4L11 12l-1.6-1.6L8 11.8l3 3z" />
                      </svg>
                    </span>
                  ) : null}
                </div>

                {/* Tier */}
                <div className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-base font-semibold tracking-tight text-ether-200">
                    {card.tier.label}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] leading-snug text-obsidian-400">
                    {card.tier.blurb}
                  </p>
                </div>

                {/* Standouts */}
                {card.standouts.length > 0 ? (
                  <ul className="mt-4 flex w-full flex-col gap-2.5 text-left">
                    {card.standouts.map((s) => (
                      <li
                        key={s.contractAddress}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[0.625rem] tabular-nums text-ether-400/90">
                            {s.year ?? "·"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-obsidian-100">
                            {s.name}
                          </span>
                        </div>
                        <p className="mt-1 text-[0.6875rem] leading-snug text-obsidian-300">
                          {s.headline}
                        </p>
                        {s.story ? (
                          <p className="mt-1 text-[0.625rem] leading-snug text-obsidian-500">
                            {s.story}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Stats bar */}
                <div className="mt-5 grid w-full grid-cols-4 gap-1 border-t border-white/10 pt-4">
                  <Stat label="Score" value={String(card.stats.score)} accent />
                  <Stat label="Held" value={String(card.stats.contractCount)} />
                  <Stat
                    label="Oldest"
                    value={card.stats.earliestYear ? String(card.stats.earliestYear) : "n/a"}
                  />
                  <Stat
                    label="Onchain"
                    value={card.stats.walletAgeYears !== null ? `${card.stats.walletAgeYears}y` : "n/a"}
                  />
                </div>
              </div>
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
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`font-mono text-sm tabular-nums ${accent ? "text-ether-300" : "text-obsidian-100"}`}
      >
        {value}
      </span>
      <span className="text-[0.5rem] uppercase tracking-[0.12em] text-obsidian-500">{label}</span>
    </div>
  );
}
