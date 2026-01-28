"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Copy, Check, Loader2, ArrowLeft } from "lucide-react";
import type { HistorianMe } from "@/types";

interface HistorianInvitation {
  id: number;
  inviteToken: string;
  invitedEmail: string;
  invitedName: string | null;
  createdAt: string;
  acceptedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
}

export default function InviteHistorianPage() {
  const router = useRouter();
  const [me, setMe] = useState<HistorianMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<HistorianInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);

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
          router.push("/historian/login?next=/historian/invite");
          return;
        }
        
        if (!historian.trusted) {
          router.push("/");
          return;
        }
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

  useEffect(() => {
    if (me?.trusted) {
      loadInvitations();
    }
  }, [me]);

  async function loadInvitations() {
    setLoadingInvitations(true);
    try {
      const res = await fetch("/api/historian/invite");
      const json = await res.json();
      if (json?.data) {
        setInvitations(json.data);
      }
    } catch {
      // Ignore errors
    } finally {
      setLoadingInvitations(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    setCreating(true);
    setError(null);
    setNewInviteUrl(null);
    
    try {
      const res = await fetch("/api/historian/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim() || null,
        }),
      });
      
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(String(json?.error || "Failed to create invitation."));
        return;
      }
      
      setNewInviteUrl(json.data.inviteUrl);
      setNotes("");
      await loadInvitations();
    } catch {
      setError("Failed to create invitation.");
    } finally {
      setCreating(false);
    }
  }

  async function copyToClipboard(text: string, token: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Ignore
    }
  }

  function getInvitationStatus(inv: HistorianInvitation): "pending" | "accepted" | "expired" {
    if (inv.acceptedAt) return "accepted";
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return "expired";
    return "pending";
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ether-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!me?.trusted) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Invite a Historian</h1>
        <p className="text-obsidian-400 mb-8">
          Create a shareable invitation link. The invitee will provide their own email and name when accepting. They will start as untrusted and can earn trusted status after 30 edits.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-12">
          <div>
            <label className="block text-sm text-obsidian-400 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              placeholder="Optional message or notes for the invitee"
              disabled={creating}
            />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          {newInviteUrl && (
            <div className="p-4 rounded-lg bg-ether-500/10 border border-ether-500/30">
              <p className="text-sm text-ether-300 mb-2 font-medium">Invitation created!</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newInviteUrl}
                  readOnly
                  className="flex-1 rounded bg-obsidian-900/50 border border-obsidian-800 px-2 py-1 text-xs font-mono text-obsidian-300"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(newInviteUrl, "new")}
                  className="px-3 py-1 rounded bg-obsidian-800 hover:bg-obsidian-700 text-sm transition-colors"
                >
                  {copiedToken === "new" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-lg bg-ether-600 hover:bg-ether-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Invitation"
            )}
          </button>
        </form>

        <div>
          <h2 className="text-xl font-semibold mb-4">Previous Invitations</h2>
          {loadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-ether-500" />
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-obsidian-500">No invitations created yet.</p>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => {
                const status = getInvitationStatus(inv);
                const inviteUrl = `${window.location.origin}/historian/invite/${inv.inviteToken}`;
                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-lg border border-obsidian-800 bg-obsidian-900/30"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {inv.invitedEmail || "Generic invitation"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              status === "accepted"
                                ? "bg-green-500/20 text-green-400"
                                : status === "expired"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-ether-500/20 text-ether-400"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        {inv.invitedName && (
                          <p className="text-xs text-obsidian-500">{inv.invitedName}</p>
                        )}
                        {inv.notes && (
                          <p className="text-xs text-obsidian-500 italic">{inv.notes}</p>
                        )}
                        <p className="text-xs text-obsidian-500 mt-1">
                          Created {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {status === "pending" && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(inviteUrl, inv.inviteToken)}
                          className="p-1.5 rounded hover:bg-obsidian-800 transition-colors"
                          title="Copy invitation link"
                        >
                          {copiedToken === inv.inviteToken ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-obsidian-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
