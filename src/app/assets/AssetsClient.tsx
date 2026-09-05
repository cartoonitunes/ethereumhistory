"use client";

/**
 * Wallet management for the collector card.
 *
 * The flow is deliberately explicit and in one direction: add an address,
 * prove you control it, scan it, then build the card. Each step unlocks the
 * next and says why, so the reason a wallet is not on the card is always
 * visible rather than something the user has to infer.
 */

import { useCallback, useEffect, useState } from "react";

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

  const load = useCallback(async () => {
    const res = await fetch("/api/wallets");
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

  useEffect(() => {
    void load();
  }, [load]);

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
        setNotice("Wallet added. Verify it to include it on your card.");
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
        // Rejecting the signature prompt is a normal outcome, not a failure.
        const message = err instanceof Error ? err.message : String(err);
        setError(message.toLowerCase().includes("reject") ? "Signature cancelled." : message);
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
          | { data: { scanned: boolean; holdings: unknown[] } | null; error: string | null; meta?: { warning?: string } }
          | null;
        if (!body || body.error) {
          setError(body?.error ?? "Scan failed.");
          return;
        }
        if (body.meta?.warning) {
          setNotice(body.meta.warning);
        } else {
          const n = body.data?.holdings.length ?? 0;
          setNotice(`Scan complete. ${n} archive ${n === 1 ? "holding" : "holdings"} found.`);
        }
        await load();
      } finally {
        setBusy(null);
      }
    },
    [load]
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
      setNotice("Card ready.");
    } finally {
      setBusy(null);
    }
  }, []);

  const verifiedCount = (wallets ?? []).filter((w) => w.verifiedAt).length;
  const scannedCount = (wallets ?? []).filter((w) => w.verifiedAt && w.holdingCount > 0).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-obsidian-100">Your assets</h1>
        <p className="text-sm leading-relaxed text-obsidian-400">
          Attach the wallets you want represented, prove you control them, then scan
          for holdings that appear in the Ethereum History archive.
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
                  {w.holdingCount} archive {w.holdingCount === 1 ? "holding" : "holdings"}
                  {w.lastScannedAt ? ` · scanned ${new Date(w.lastScannedAt).toLocaleDateString()}` : " · never scanned"}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {!w.verifiedAt ? (
                  <button
                    type="button"
                    onClick={() => verify(w)}
                    disabled={busy !== null}
                    className="rounded-lg border border-ether-500/40 px-3 py-1.5 text-xs text-ether-300 transition-colors hover:bg-ether-500/10 disabled:opacity-40"
                  >
                    {busy === `verify:${w.address}` ? "Waiting for signature" : "Verify"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => scan(w)}
                    disabled={busy !== null}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-obsidian-200 transition-colors hover:border-white/30 disabled:opacity-40"
                  >
                    {busy === `scan:${w.address}` ? "Scanning" : "Scan"}
                  </button>
                )}
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

      <section className="flex flex-col gap-3 rounded-xl border border-white/10 p-4">
        <h2 className="text-sm font-medium text-obsidian-200">Collector card</h2>
        <p className="text-xs leading-relaxed text-obsidian-500">
          Built from verified wallets only, so an unverified address never appears on a
          public card. {verifiedCount} verified, {scannedCount} with holdings.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={buildCard}
            disabled={busy !== null || scannedCount === 0}
            className="rounded-lg bg-ether-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ether-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "card" ? "Building" : "Build my card"}
          </button>
          {cardUrl ? (
            <a href={cardUrl} className="text-sm text-ether-400 underline-offset-4 hover:underline">
              View your card
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
