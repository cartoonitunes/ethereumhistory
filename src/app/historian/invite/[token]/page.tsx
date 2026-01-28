"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Loader2, ArrowLeft } from "lucide-react";

interface InviteAcceptPageProps {
  params: Promise<{ token: string }>;
}

export default function InviteAcceptPage({ params }: InviteAcceptPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <Header />
          <div className="max-w-md mx-auto px-4 py-16">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-ether-500" />
            </div>
          </div>
        </div>
      }
    >
      <InviteAcceptInner params={params} />
    </Suspense>
  );
}

function InviteAcceptInner({ params }: InviteAcceptPageProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{
    id: number;
    invitedEmail: string | null;
    invitedName: string | null;
    notes: string | null;
  } | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tokenValue, setTokenValue] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    async function loadToken() {
      const resolved = await params;
      setToken(resolved.token);
    }
    loadToken();
  }, [params]);

  useEffect(() => {
    if (!token) return;

    async function validateInvitation() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/historian/invite/${token}`);
        const json = await res.json();
        
        if (!res.ok || json?.error) {
          setError(String(json?.error || "Invalid invitation."));
          return;
        }
        
        const inv = json.data.invitation;
        setInvitation(inv);
        setEmail(inv.invitedEmail || "");
        setName(inv.invitedName || "");
      } catch {
        setError("Failed to validate invitation.");
      } finally {
        setLoading(false);
      }
    }
    
    validateInvitation();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !tokenValue.trim()) return;
    
    setAccepting(true);
    setAcceptError(null);
    
    try {
      const res = await fetch(`/api/historian/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          token: tokenValue.trim(),
        }),
      });
      
      const json = await res.json();
      if (!res.ok || json?.error) {
        setAcceptError(String(json?.error || "Failed to accept invitation."));
        return;
      }
      
      // Redirect to login
      router.push(`/historian/login?next=/`);
    } catch {
      setAcceptError("Failed to accept invitation.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ether-500" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
            <p className="text-obsidian-400 mb-6">{error || "This invitation is not valid."}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-ether-400 hover:text-ether-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-md mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-2xl font-bold mb-2">Accept Invitation</h1>
        <p className="text-sm text-obsidian-500 mb-4">
          You've been invited to become a historian. Please provide your information below to create your account.
        </p>
        
        {invitation?.notes && (
          <div className="mb-6 p-4 rounded-lg bg-ether-500/10 border border-ether-500/30">
            <p className="text-sm text-ether-300">{invitation.notes}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-obsidian-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              disabled={accepting}
            />
          </div>

          <div>
            <label className="block text-xs text-obsidian-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              disabled={accepting}
            />
          </div>

          <div>
            <label className="block text-xs text-obsidian-500 mb-1">Token (Password)</label>
            <input
              type="password"
              value={tokenValue}
              onChange={(e) => setTokenValue(e.target.value)}
              required
              className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              placeholder="Choose a secure token"
              disabled={accepting}
            />
            <p className="text-xs text-obsidian-500 mt-1">
              This will be your password for logging in. Keep it secure.
            </p>
          </div>

          {acceptError && <div className="text-sm text-red-400">{acceptError}</div>}

          <button
            type="submit"
            disabled={accepting || !email.trim() || !name.trim() || !tokenValue.trim()}
            className="w-full rounded-lg bg-ether-600 hover:bg-ether-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
