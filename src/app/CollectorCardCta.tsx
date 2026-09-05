"use client";

/**
 * Landing CTA: paste an address or ENS name, get a collector card.
 *
 * The acquisition funnel. Nothing is stored and no account is needed, so the
 * cost of trying it is a single paste. The card page it lands on is what asks
 * for the signup, once the visitor has already seen something they want to keep.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function CollectorCardCta() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const input = value.trim();
      if (!input) return;

      setError(null);
      setBusy(true);
      try {
        // Validated and resolved server side before navigating, so a typo shows
        // an inline message here rather than dumping the visitor on a 404.
        const res = await fetch("/api/collector-card/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: input }),
        });
        const body = (await res.json().catch(() => null)) as
          | { data: { address: string } | null; error: string | null }
          | null;

        if (!body || body.error || !body.data) {
          setError(body?.error ?? "Could not build a card for that address.");
          setBusy(false);
          return;
        }

        // Deliberately no setBusy(false) on the way out, and no finally block.
        // router.push resolves as soon as navigation is requested, not when the
        // new route has rendered, and the preview route is server rendered
        // behind a scan. Clearing the state here put the button back to "Get my
        // card" about a second before anything moved, which reads as a failed
        // press and invites a second one. The component unmounts on arrival, so
        // the pending state ends on its own.
        router.push(`/preview/${body.data.address}`);
      } catch {
        setError("Something went wrong. Try again shortly.");
        setBusy(false);
      }
    },
    [value, router]
  );

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your address or ENS name"
          spellCheck={false}
          aria-label="Wallet address or ENS name"
          className="min-w-0 flex-1 rounded-lg border border-obsidian-700 bg-obsidian-900/50 px-4 py-2.5 text-sm text-obsidian-100 outline-none placeholder:text-obsidian-400 focus:border-ether-500/60"
        />
        <button
          type="submit"
          disabled={busy || value.trim().length === 0}
          className="rounded-lg bg-ether-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ether-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Reading the chain" : "Get my card"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-red-300">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-center text-xs text-obsidian-400">
          See which historic Ethereum contracts you hold. No account needed.
        </p>
      )}
    </div>
  );
}
