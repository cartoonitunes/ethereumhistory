"use client";

/**
 * The holdings list, with a per-viewer balance toggle.
 *
 * The preference is stored in localStorage and belongs to whoever is looking,
 * not to the collection. Someone reading a public page can hide the numbers on
 * their own screen without it affecting what anyone else sees, and the setting
 * follows them across every collection they open.
 */

import { useCallback, useState } from "react";
import Link from "next/link";

export interface HoldingItem {
  contractAddress: string;
  name: string;
  symbol: string | null;
  balance: string;
  tokenDecimals: number | null;
  tokenType: string;
  viaWrapper: string | null;
  deployedYear: number | null;
  eraId: string | null;
  shortDescription: string | null;
}

const STORAGE_KEY = "eh:balances-visible";

const ERA_LABEL: Record<string, string> = {
  frontier: "Frontier",
  homestead: "Homestead",
  dao: "DAO fork",
  tangerine: "Tangerine Whistle",
  spurious: "Spurious Dragon",
  byzantium: "Byzantium",
  constantinople: "Constantinople",
};

/** Integer string maths, so a uint256 never passes through a float. */
function formatBalance(balance: string, decimals: number | null): string {
  const d = decimals ?? 0;
  if (d === 0) return balance;
  const padded = balance.padStart(d + 1, "0");
  const whole = padded.slice(0, padded.length - d);
  const frac = padded.slice(padded.length - d).replace(/0+$/, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac.slice(0, 4)}` : grouped;
}

export default function HoldingsList({
  holdings,
  ownerHidden = false,
}: {
  holdings: HoldingItem[];
  /**
   * The owner hid balances for everyone. The amounts are not in this data at
   * all, so there is no reveal to offer and the toggle is replaced by a note
   * explaining why. The viewer preference below is only ever about a viewer's
   * own screen.
   */
  ownerHidden?: boolean;
}) {
  /**
   * Read the stored preference lazily on first client render rather than in an
   * effect. An effect would paint once with the default and then immediately
   * set state, which flashes the balances for anyone who chose to hide them.
   *
   * The initialiser runs on the server too, where there is no localStorage, so
   * it returns the default there and the client corrects on hydration.
   */
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      // Private mode and blocked storage both throw. Visible is the default.
      return true;
    }
  });

  const toggle = useCallback(() => {
    setVisible((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Preference simply will not persist. Not worth surfacing.
      }
      return next;
    });
  }, []);

  // The owner's choice wins. A viewer can hide amounts for themselves, never
  // reveal ones the owner withheld.
  const showAmounts = visible && !ownerHidden;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-obsidian-200">
          Documented holdings, oldest first
        </h2>
        {ownerHidden ? (
          <span className="shrink-0 text-xs text-obsidian-500">Balances hidden by the owner</span>
        ) : (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={!visible}
          title={visible ? "Hide balances" : "Show balances"}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-obsidian-400 transition-colors hover:border-white/25 hover:text-obsidian-200"
        >
          {visible ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M2 12s3.6-7 10-7c1.6 0 3 .4 4.3 1M22 12s-3.6 7-10 7c-1.6 0-3-.4-4.3-1" />
              <path d="m3 3 18 18" />
            </svg>
          )}
          {visible ? "Hide balances" : "Show balances"}
        </button>
        )}
      </div>

      {holdings.length === 0 ? (
        <p className="mt-3 text-sm text-obsidian-500">
          No documented holdings on this collection yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {holdings.map((h) => {
            const era = h.eraId ? ERA_LABEL[h.eraId] ?? h.eraId : null;
            const isNft = h.tokenType === "erc721";
            const amount = isNft
              ? `${h.balance} ${Number(h.balance) === 1 ? "token" : "tokens"}`
              : `${formatBalance(h.balance, h.tokenDecimals)}${h.symbol ? ` ${h.symbol}` : ""}`;

            return (
              <li key={h.contractAddress}>
                <Link
                  href={`/contract/${h.contractAddress}`}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 p-4 transition-colors hover:border-white/25"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="w-11 shrink-0 font-mono text-xs tabular-nums text-ether-400/90">
                      {h.deployedYear ?? "·"}
                    </span>
                    <span className="text-sm font-medium text-obsidian-100">{h.name}</span>
                    {h.symbol ? (
                      <span className="font-mono text-[0.6875rem] text-obsidian-500">{h.symbol}</span>
                    ) : null}
                    <span
                      className={`ml-auto font-mono text-xs tabular-nums ${
                        showAmounts ? "text-obsidian-300" : "select-none text-obsidian-600"
                      }`}
                    >
                      {showAmounts ? amount : "••••"}
                    </span>
                  </div>

                  {h.shortDescription ? (
                    <p className="pl-14 text-xs leading-relaxed text-obsidian-400">
                      {h.shortDescription}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 pl-14 text-[0.625rem] uppercase tracking-wider text-obsidian-600">
                    {era ? <span>{era}</span> : null}
                    <span>{isNft ? "ERC-721" : "ERC-20"}</span>
                    {h.viaWrapper ? <span className="text-ether-400/70">held as wrapper</span> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
