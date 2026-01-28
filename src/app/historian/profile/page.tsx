"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Loader2, ArrowLeft, Save, UserPlus, LogOut } from "lucide-react";
import type { HistorianMe } from "@/types";

export default function HistorianProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<HistorianMe | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [currentToken, setCurrentToken] = useState("");
  const [newToken, setNewToken] = useState("");
  const [confirmToken, setConfirmToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/historian/me");
        const json = await res.json();
        if (cancelled) return;
        const historian = json?.data as HistorianMe | null;
        setMe(historian);
        
        if (!historian || !historian.active) {
          router.push("/historian/login?next=/historian/profile");
          return;
        }
        
        setName(historian.name);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch("/api/historian/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(String(json?.error || "Failed to update name."));
        return;
      }
      
      setMe(json.data);
      setSuccess("Name updated successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to update name.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateToken(e: React.FormEvent) {
    e.preventDefault();
    if (!currentToken.trim() || !newToken.trim() || !confirmToken.trim()) {
      setError("All fields are required.");
      return;
    }
    
    if (newToken !== confirmToken) {
      setError("New tokens do not match.");
      return;
    }
    
    if (newToken.length < 8) {
      setError("New token must be at least 8 characters.");
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch("/api/historian/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentToken: currentToken.trim(),
          newToken: newToken.trim(),
        }),
      });
      
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(String(json?.error || "Failed to update token."));
        return;
      }
      
      setCurrentToken("");
      setNewToken("");
      setConfirmToken("");
      setSuccess("Token updated successfully. Please log in again.");
      setTimeout(() => {
        router.push("/historian/login");
      }, 2000);
    } catch {
      setError("Failed to update token.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/historian/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      // Ignore errors
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header historianMe={me} />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ether-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!me?.active) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen">
      <Header historianMe={me} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Historian Profile</h1>
        <p className="text-obsidian-400 mb-8">
          Manage your account settings and preferences.
        </p>

        {/* Account Info */}
        <div className="mb-8 p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-obsidian-500">Email:</span>{" "}
              <span className="text-obsidian-200">{me.email}</span>
            </div>
            <div>
              <span className="text-obsidian-500">Status:</span>{" "}
              <span className="text-obsidian-200">
                {me.trusted ? (
                  <span className="text-ether-400">Trusted Historian</span>
                ) : (
                  "Historian"
                )}
              </span>
            </div>
            {me.trusted && (
              <div className="mt-4 pt-4 border-t border-obsidian-800">
                <Link
                  href="/historian/invite"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Historians
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Update Name */}
        <div className="mb-8 p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h2 className="text-lg font-semibold mb-4">Update Name</h2>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-sm text-obsidian-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                disabled={saving}
              />
            </div>
            {error && success === null && (
              <div className="text-sm text-red-400">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-400">{success}</div>
            )}
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4 inline mr-2" />
                  Update Name
                </>
              )}
            </button>
          </form>
        </div>

        {/* Update Token/Password */}
        <div className="mb-8 p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h2 className="text-lg font-semibold mb-4">Change Token (Password)</h2>
          <form onSubmit={handleUpdateToken} className="space-y-4">
            <div>
              <label className="block text-sm text-obsidian-400 mb-1">Current Token</label>
              <input
                type="password"
                value={currentToken}
                onChange={(e) => setCurrentToken(e.target.value)}
                required
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="Enter your current token"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm text-obsidian-400 mb-1">New Token</label>
              <input
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                required
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="Enter your new token (min 8 characters)"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm text-obsidian-400 mb-1">Confirm New Token</label>
              <input
                type="password"
                value={confirmToken}
                onChange={(e) => setConfirmToken(e.target.value)}
                required
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="Confirm your new token"
                disabled={saving}
              />
            </div>
            {error && success === null && (
              <div className="text-sm text-red-400">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-400">{success}</div>
            )}
            <button
              type="submit"
              disabled={saving || !currentToken.trim() || !newToken.trim() || !confirmToken.trim()}
              className="px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4 inline mr-2" />
                  Update Token
                </>
              )}
            </button>
          </form>
        </div>

        {/* Logout */}
        <div className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h2 className="text-lg font-semibold mb-4">Session</h2>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
