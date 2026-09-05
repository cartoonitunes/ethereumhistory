"use client";

/**
 * Wallet management for the collector card.
 *
 * The flow is: add an address, scan it, build the card. Verification is
 * optional and sits alongside, not in front: it earns the card a verified
 * badge and changes nothing about which holdings appear.
 *
 * Every step is available as soon as it is meaningful, so nothing is disabled
 * for a reason the user has to guess at.
 */

import { useCallback, useEffect, useState } from "react";
import HoldingsList, { type HoldingItem } from "./[slug]/HoldingsList";

interface Wallet {
  id: number;
  address: string;
  label: string | null;
  verifiedAt: string | null;
  firstTxDate: string | null;
  addedAt: string;
  holdingCount: number;
  lastScannedAt: string | null;
}

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

/** EIP-1193 rejection code, returned when the user dismisses a wallet prompt. */
const USER_REJECTED = 4001;

function providerErrorMessage(err: unknown): string {
  const code = (err as { code?: number })?.code;
  if (code === USER_REJECTED) return "Signature cancelled.";
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.toLowerCase().includes("reject")) return "Signature cancelled.";
  return raw;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 10)}…${address.slice(-6)}`;
}

async function readJson(res: Response): Promise<{ data: unknown; error: string | null }> {
  try {
    return (await res.json()) as { data: unknown; error: string | null };
  } catch {
    return { data: null, error: `Request failed with status ${res.status}` };
  }
}

export default function AssetsClient() {
  const [wallets, setWallets] = useState<Wallet[] | null>(null);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<HoldingItem[] | null>(null);
  const [hasCard, setHasCard] = useState(false);

  const load = useCallback(async () => {
    // cache: "no-store" belts-and-braces the server's no-store headers. Without
    // one or the other, the browser could serve this from cache and the list
    // would still show pre-scan numbers.
    const res = await fetch("/api/wallets", { cache: "no-store" });
    if (res.status === 401) {
      setWallets([]);
      setError("Sign in as a historian to manage wallets.");
      return;
    }
    const { data, error: err } = await readJson(res);
    if (err) {
      setError(err);
      return;
    }
    setWallets(((data as { wallets: Wallet[] })?.wallets) ?? []);
  }, []);

  /**
   * Everything the page shows, in one request: holdings from the last scan and
   * the existing card. Assets is a page in its own right, so it must show the
   * collection on arrival rather than making someone press Scan or Build first.
   */
  const loadMine = useCallback(async () => {
    const res = await fetch("/api/collector-card/me", { cache: "no-store" });
    if (res.status === 401) return;
    const { data } = await readJson(res);
    const d = data as {
      card: { shareSlug: string; balancesHidden: boolean } | null;
      holdings: HoldingItem[];
    } | null;
    if (!d) return;
    setHoldings(d.holdings ?? []);
    setHasCard(!!d.card);
    if (d.card) setCardUrl(`/card/${d.card.shareSlug}`);
  }, []);

  useEffect(() => {
    void load();
    void loadMine();
  }, [load, loadMine]);

  const addWallet = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setNotice(null);
      setBusy("add");
      try {
        const res = await fetch("/api/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: address.trim(), label: label.trim() || null }),
        });
        const { error: err } = await readJson(res);
        if (err) {
          setError(err);
          return;
        }
        setAddress("");
        setLabel("");
        setNotice("Wallet added. Scan it to find archive holdings.");
        await load();
      } finally {
        setBusy(null);
      }
    },
    [address, label, load]
  );

  const verify = useCallback(
    async (wallet: Wallet) => {
      setError(null);
      setNotice(null);
      setBusy(`verify:${wallet.address}`);
      try {
        const provider = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
        if (!provider) {
          setError("No browser wallet detected. Install one to sign the ownership challenge.");
          return;
        }

        // Connect before signing. personal_sign only works for an account the
        // user has authorised for this site, so without this the wallet
        // rejects the request outright and verification appears to do nothing.
        // Both other wallet flows in this codebase (historian login and the
        // supporter claim modal) request accounts first for the same reason.
        const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
        const connected = (accounts?.[0] ?? "").toLowerCase();
        if (!connected) {
          setError("No account was authorised in your wallet.");
          return;
        }

        // The signature is always made by the wallet's SELECTED account. If
        // that is not the address being verified, the server would correctly
        // reject the result with a confusing "does not match" error, so catch
        // it here and say what to actually do about it.
        if (connected !== wallet.address.toLowerCase()) {
          setError(
            `Your wallet is on ${shortAddress(connected)} but this entry is ${shortAddress(
              wallet.address
            )}. Switch accounts in your wallet, then verify again.`
          );
          return;
        }

        const challengeRes = await fetch(`/api/wallets/${wallet.address}/verify/challenge`);
        const { data, error: challengeErr } = await readJson(challengeRes);
        if (challengeErr) {
          setError(challengeErr);
          return;
        }
        const message = (data as { message: string }).message;

        // personal_sign takes (message, address). The wallet shows the full
        // text, so the user can read exactly what they are agreeing to.
        const signature = (await provider.request({
          method: "personal_sign",
          params: [message, wallet.address],
        })) as string;

        const verifyRes = await fetch(`/api/wallets/${wallet.address}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature }),
        });
        const { error: verifyErr } = await readJson(verifyRes);
        if (verifyErr) {
          setError(verifyErr);
          return;
        }
        setNotice("Wallet verified.");
        await load();
      } catch (err) {
        // Rejecting a wallet prompt is a normal outcome, not a failure.
        setError(providerErrorMessage(err));
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  const scan = useCallback(
    async (wallet: Wallet) => {
      setError(null);
      setNotice(null);
      setBusy(`scan:${wallet.address}`);
      try {
        const res = await fetch(`/api/wallets/${wallet.address}/scan`, { method: "POST" });
        const body = (await res.json().catch(() => null)) as
          | {
              data: {
                scanned: boolean;
                holdings: unknown[];
                firstTxDate?: string | null;
              } | null;
              error: string | null;
              meta?: { warning?: string };
            }
          | null;
        if (!body || body.error) {
          setError(body?.error ?? "Scan failed.");
          return;
        }
        if (body.meta?.warning) {
          setNotice(body.meta.warning);
        } else {
          const n = body.data?.holdings.length ?? 0;
          setNotice(`Scan complete. ${n} documented ${n === 1 ? "holding" : "holdings"} found.`);
        }

        // Apply the scan's own result straight away. The refetch below is the
        // source of truth, but it is a second round trip, and the counts it
        // returns were the reason a completed scan still read as "never
        // scanned" until the page was reloaded. Updating from the response the
        // scan already handed us makes the card correct immediately.
        if (body.data?.scanned) {
          const scannedAt = new Date().toISOString();
          const count = body.data.holdings.length;
          const firstTx = body.data.firstTxDate ?? null;
          setWallets((prev) =>
            prev
              ? prev.map((w) =>
                  w.address === wallet.address
                    ? {
                        ...w,
                        holdingCount: count,
                        lastScannedAt: scannedAt,
                        firstTxDate: firstTx ?? w.firstTxDate,
                      }
                    : w
                )
              : prev
          );
        }

        await Promise.all([load(), loadMine()]);
      } finally {
        setBusy(null);
      }
    },
    [load, loadMine]
  );

  const remove = useCallback(
    async (wallet: Wallet) => {
      setError(null);
      setNotice(null);
      setBusy(`remove:${wallet.address}`);
      try {
        const res = await fetch(`/api/wallets/${wallet.address}`, { method: "DELETE" });
        const { error: err } = await readJson(res);
        if (err) {
          setError(err);
          return;
        }
        await load();
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  const buildCard = useCallback(async () => {
    setError(null);
    setNotice(null);
    setBusy("card");
    try {
      const res = await fetch("/api/collector-card", { method: "POST" });
      const { data, error: err } = await readJson(res);
      if (err) {
        setError(err);
        return;
      }
      setCardUrl((data as { url: string }).url);
      setHasCard(true);
      setNotice("Card ready.");
      await loadMine();
    } finally {
      setBusy(null);
    }
  }, [loadMine]);

  const verifiedCount = (wallets ?? []).filter((w) => w.verifiedAt).length;
  const withHoldings = (wallets ?? []).filter((w) => w.holdingCount > 0).length;
  const allVerified = (wallets ?? []).length > 0 && verifiedCount === (wallets ?? []).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-obsidian-100">Your assets</h1>
        <p className="text-sm leading-relaxed text-obsidian-400">
          Attach the wallets you want represented and scan them for holdings that
          appear in the Ethereum History archive. Verifying a wallet is optional and
          earns your card a verified badge.
        </p>
      </header>

      <form onSubmit={addWallet} className="flex flex-col gap-3 rounded-xl border border-white/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            spellCheck={false}
            aria-label="Wallet address"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-obsidian-100 outline-none placeholder:text-obsidian-600 focus:border-ether-500"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            aria-label="Wallet label"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-obsidian-100 outline-none placeholder:text-obsidian-600 focus:border-ether-500 sm:w-44"
          />
          <button
            type="submit"
            disabled={busy === "add" || address.trim().length === 0}
            className="rounded-lg bg-ether-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ether-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "add" ? "Adding" : "Add wallet"}
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg border border-ether-500/30 bg-ether-500/10 px-3 py-2 text-sm text-ether-200">
          {notice}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        {wallets === null ? (
          <p className="text-sm text-obsidian-500">Loading wallets.</p>
        ) : wallets.length === 0 ? (
          <p className="text-sm text-obsidian-500">No wallets yet. Add one above to begin.</p>
        ) : (
          wallets.map((w) => (
            <article
              key={w.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm text-obsidian-200">
                    {shortAddress(w.address)}
                  </span>
                  {w.verifiedAt ? (
                    <span
                      title="Ownership proven by signature"
                      className="flex shrink-0 items-center gap-1 rounded-full bg-ether-500/15 px-2 py-0.5 text-[0.625rem] font-medium text-ether-300"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.4 1.8 3 .1.9 2.8 2.4 1.7-1 2.8 1 2.8-2.4 1.7-.9 2.8-3 .1L12 22l-2.4-1.8-3-.1-.9-2.8L3.3 15.6l1-2.8-1-2.8 2.4-1.7.9-2.8 3-.1L12 2zm-1 12.8l5-5-1.4-1.4L11 12l-1.6-1.6L8 11.8l3 3z" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.625rem] text-obsidian-400">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-obsidian-500">
                  {w.label ? `${w.label} · ` : ""}
                  {w.holdingCount} documented {w.holdingCount === 1 ? "holding" : "holdings"}
                  {w.lastScannedAt ? ` · scanned ${new Date(w.lastScannedAt).toLocaleDateString()}` : " · never scanned"}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => scan(w)}
                  disabled={busy !== null}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-obsidian-200 transition-colors hover:border-white/30 disabled:opacity-40"
                >
                  {busy === `scan:${w.address}` ? "Scanning" : "Scan"}
                </button>
                {!w.verifiedAt ? (
                  <button
                    type="button"
                    onClick={() => verify(w)}
                    disabled={busy !== null}
                    className="rounded-lg border border-ether-500/40 px-3 py-1.5 text-xs text-ether-300 transition-colors hover:bg-ether-500/10 disabled:opacity-40"
                  >
                    {busy === `verify:${w.address}` ? "Waiting for signature" : "Verify"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(w)}
                  disabled={busy !== null}
                  className="rounded-lg px-2 py-1.5 text-xs text-obsidian-500 transition-colors hover:text-red-400 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-ether-500/25 bg-ether-500/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-obsidian-100">Collector card</h2>
            <p className="mt-1 text-xs leading-relaxed text-obsidian-400">
              A shareable card built from every wallet on your account. Verifying is
              optional and earns the card a verified badge.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={buildCard}
              disabled={busy !== null || withHoldings === 0}
              className="rounded-lg bg-ether-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ether-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "card" ? "Building" : hasCard ? "Rebuild card" : "Build my card"}
            </button>
            {cardUrl ? (
              <a
                href={cardUrl}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-obsidian-200 transition-colors hover:border-white/30"
              >
                View card
              </a>
            ) : null}
            {cardUrl ? (
              <a
                href={cardUrl.replace("/card/", "/assets/")}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-obsidian-200 transition-colors hover:border-white/30"
              >
                Public collection
              </a>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-obsidian-500">
          {withHoldings} {withHoldings === 1 ? "wallet has" : "wallets have"} holdings,{" "}
          {verifiedCount} verified.
          {(wallets ?? []).length > 0 && !allVerified
            ? " Verify every wallet to show the badge."
            : ""}{" "}
          Balances are never shown on the public collection page.
        </p>
      </section>

      {holdings && holdings.length > 0 ? (
        <HoldingsList holdings={holdings} showBalances compact title="What you hold" />
      ) : holdings ? (
        <p className="text-sm text-obsidian-500">
          No documented holdings yet. Add a wallet above and scan it.
        </p>
      ) : null}

    </div>
  );
}
