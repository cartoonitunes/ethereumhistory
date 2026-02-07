"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";

export default function HistorianLoginPage() {
  // `useSearchParams()` requires a Suspense boundary in Next 16.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian-950 text-obsidian-50">
          <Header showHistorianLogin={false} />
          <div className="max-w-md mx-auto px-4 py-16">
            <h1 className="text-2xl font-bold mb-2">Historian Login</h1>
            <p className="text-sm text-obsidian-500">Loading…</p>
          </div>
        </div>
      }
    >
      <HistorianLoginInner />
    </Suspense>
  );
}

function HistorianLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim() && token.trim(), [email, token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/historian/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(String(json?.error || "Login failed."));
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-50">
      <Header showHistorianLogin={false} />
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-2">Historian Login</h1>
        <p className="text-sm text-obsidian-500 mb-8">
          Want to help catalogue Ethereum history? Join the community on{" "}
          <a
            href="https://discord.gg/3KV6dt2euF"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ether-400 hover:text-ether-300"
          >
            Discord
          </a>
          .
        </p>

        {/* GitHub OAuth */}
        <a
          href="/api/auth/github"
          className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-[#24292f] hover:bg-[#2f363d] transition-colors px-4 py-2.5 text-sm font-medium text-white mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-obsidian-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-obsidian-950 px-3 text-obsidian-500">or use email and token</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-obsidian-500 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs text-obsidian-500 mb-1">Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              placeholder="Provided by an admin"
              disabled={loading}
            />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full rounded-lg bg-ether-600 hover:bg-ether-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="mt-6 text-sm text-obsidian-500">
          <Link href="/" className="hover:text-obsidian-200">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

