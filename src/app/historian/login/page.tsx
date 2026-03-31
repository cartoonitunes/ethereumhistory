"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { SiweMessage } from "siwe";

export default function HistorianLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian-950 text-obsidian-50">
          <Header showHistorianLogin={false} />
          <div className="max-w-md mx-auto px-4 py-16">
            <h1 className="text-2xl font-bold mb-2">Join Ethereum History</h1>
            <p className="text-sm text-obsidian-500">Loading...</p>
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
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? decodeOAuthError(errorParam) : null
  );
  const [tokenLoginOpen, setTokenLoginOpen] = useState(false);
  const [siweLoading, setSiweLoading] = useState(false);

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
      if (next.includes("#")) {
        window.location.href = next;
      } else {
        router.push(next);
        router.refresh();
      }
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onSiweLogin() {
    setSiweLoading(true);
    setError(null);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        setError("No Ethereum wallet found. Please install MetaMask or another wallet.");
        return;
      }

      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        setError("No account selected.");
        return;
      }
      const address = accounts[0];

      const nonceRes = await fetch("/api/auth/siwe/nonce");
      const { nonce } = await nonceRes.json();

      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Ethereum History as a Historian.",
        uri: window.location.origin,
        version: "1",
        chainId: 1,
        nonce,
      });
      const messageToSign = siweMessage.prepareMessage();

      const signature = await ethereum.request({
        method: "personal_sign",
        params: [messageToSign, address],
      });

      const verifyRes = await fetch("/api/auth/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSign, signature }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || verifyData.error) {
        setError(verifyData.error || "SIWE verification failed.");
        return;
      }

      if (next.includes("#")) {
        window.location.href = next;
      } else {
        router.push(next);
        router.refresh();
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        setError("Signature request was rejected.");
      } else {
        setError("Wallet sign-in failed. Please try again.");
        console.error("[siwe] Error:", err);
      }
    } finally {
      setSiweLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-50">
      <Header showHistorianLogin={false} />
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-2">Join Ethereum History</h1>
        <p className="text-sm text-obsidian-400 mb-8">
          Sign in or create an account to start documenting the earliest smart contracts on Ethereum.
          New accounts are created automatically.
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-800/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          {/* Google OAuth */}
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}`}
            className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-white hover:bg-gray-100 transition-colors px-4 py-2.5 text-sm font-medium text-gray-800"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </a>

          {/* GitHub OAuth */}
          <a
            href="/api/auth/github"
            className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-[#24292f] hover:bg-[#2f363d] transition-colors px-4 py-2.5 text-sm font-medium text-white"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </a>

          {/* SIWE */}
          <button
            onClick={onSiweLogin}
            disabled={siweLoading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-ether-700 hover:bg-ether-600 transition-colors px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {siweLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            )}
            Continue with Ethereum
          </button>
        </div>

        <p className="text-xs text-obsidian-600 text-center mb-6">
          No account? One will be created for you automatically.
        </p>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-obsidian-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-obsidian-950 px-3 text-obsidian-600">existing historians</span>
          </div>
        </div>

        {/* Collapsible Token Login */}
        <button
          onClick={() => setTokenLoginOpen(!tokenLoginOpen)}
          className="w-full flex items-center gap-2 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors mb-4"
        >
          {tokenLoginOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Sign in with token
        </button>

        {tokenLoginOpen && (
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
                placeholder="Your login token"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-lg bg-obsidian-800 hover:bg-obsidian-700 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-sm text-obsidian-500">
          <Link href="/" className="hover:text-obsidian-200">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function decodeOAuthError(code: string): string {
  const errors: Record<string, string> = {
    not_configured: "OAuth is not configured. Please contact an admin.",
    missing_params: "Invalid OAuth response. Please try again.",
    invalid_state: "Session expired. Please try again.",
    token_failed: "Authentication failed. Please try again.",
    invalid_token: "Invalid authentication token. Please try again.",
    user_fetch_failed: "Could not fetch account info. Please try again.",
    no_email: "No email found on your account. Please use a different method.",
    account_inactive: "Your account has been deactivated.",
    auth_failed: "Authentication failed. Please try again.",
    oauth_denied: "Sign in was cancelled.",
  };
  return errors[code] || "An error occurred. Please try again.";
}
