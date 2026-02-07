"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  GitBranch,
  FileText,
  Clock,
} from "lucide-react";
import { Header } from "@/components/Header";
import { formatAddress, formatRelativeTime } from "@/lib/utils";
import type { HistorianMe } from "@/types";

interface ReviewSuggestion {
  id: number;
  contractAddress: string;
  fieldName: string;
  suggestedValue: string;
  reason: string | null;
  submitterName: string | null;
  submitterGithub: string | null;
  submitterHistorianId: number | null;
  submitterHistorianName: string | null;
  submitterHistorianGithub: string | null;
  batchId: string | null;
  status: string;
  createdAt: string | null;
}

function fieldLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function ReviewDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<HistorianMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Check auth
        const meRes = await fetch("/api/historian/me");
        const meJson = await meRes.json();
        if (cancelled) return;
        const historian = meJson?.data as HistorianMe | null;
        setMe(historian);

        if (!historian?.active || !historian?.trusted) {
          router.push("/historian/login?next=/historian/review");
          return;
        }

        // Fetch suggestions
        const res = await fetch("/api/suggestions/review/list");
        const json = await res.json();
        if (cancelled) return;

        if (json?.data) {
          setSuggestions(json.data.suggestions || []);
          setTotal(json.data.total || 0);
        }
      } catch {
        if (!cancelled) setError("Failed to load review data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleAction(id: number, status: "approved" | "rejected") {
    setActionLoading(id);
    setError(null);

    try {
      const res = await fetch("/api/suggestions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();

      if (!res.ok || json?.error) {
        setError(json?.error || "Failed to process suggestion");
        return;
      }

      // Remove from list
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch {
      setError("Failed to process suggestion");
    } finally {
      setActionLoading(null);
    }
  }

  // Group by batchId for display
  const grouped = suggestions.reduce<
    Array<{ batchId: string | null; items: ReviewSuggestion[] }>
  >((acc, s) => {
    if (s.batchId) {
      const existing = acc.find((g) => g.batchId === s.batchId);
      if (existing) {
        existing.items.push(s);
      } else {
        acc.push({ batchId: s.batchId, items: [s] });
      }
    } else {
      acc.push({ batchId: null, items: [s] });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header historianMe={me} />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ether-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!me?.trusted) return null;

  return (
    <div className="min-h-screen">
      <Header historianMe={me} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/historian/profile"
          className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-obsidian-200 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to profile
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Review Edits</h1>
            <p className="text-obsidian-400 mt-1">
              {total} pending suggestion{total !== 1 ? "s" : ""} to review
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {suggestions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 rounded-xl border border-obsidian-800 bg-obsidian-900/30"
          >
            <Clock className="w-10 h-10 text-obsidian-600 mx-auto mb-4" />
            <p className="text-obsidian-400 mb-2">
              No pending suggestions to review.
            </p>
            <p className="text-sm text-obsidian-500">
              Check back later as new historians submit edits.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group, gi) => (
              <motion.div
                key={group.batchId || `single-${gi}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.05 }}
                className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 overflow-hidden"
              >
                {/* Group header */}
                <div className="px-5 py-3 bg-obsidian-800/30 border-b border-obsidian-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-obsidian-400" />
                    <Link
                      href={`/contract/${group.items[0].contractAddress}`}
                      className="text-sm font-medium text-obsidian-200 hover:text-ether-400 transition-colors"
                    >
                      {formatAddress(group.items[0].contractAddress, 10)}
                    </Link>
                    <span className="text-xs text-obsidian-500">
                      {group.items.length} field
                      {group.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-obsidian-500">
                    {group.items[0].submitterHistorianName && (
                      <span className="text-obsidian-300">
                        by {group.items[0].submitterHistorianName}
                      </span>
                    )}
                    {group.items[0].submitterHistorianGithub && (
                      <a
                        href={`https://github.com/${group.items[0].submitterHistorianGithub}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-obsidian-400 hover:text-ether-400"
                      >
                        <GitBranch className="w-3 h-3" />
                        {group.items[0].submitterHistorianGithub}
                      </a>
                    )}
                    {group.items[0].createdAt && (
                      <span>
                        {formatRelativeTime(group.items[0].createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Suggestion items */}
                <div className="divide-y divide-obsidian-800">
                  {group.items.map((s) => (
                    <div key={s.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-obsidian-500 uppercase tracking-wide">
                            {fieldLabel(s.fieldName)}
                          </span>
                          <div className="mt-1 text-sm text-obsidian-200 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {s.suggestedValue.length > 300
                              ? s.suggestedValue.slice(0, 300) + "..."
                              : s.suggestedValue}
                          </div>
                          {s.reason && (
                            <p className="mt-2 text-xs text-obsidian-500 italic">
                              Reason: {s.reason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAction(s.id, "approved")}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-sm disabled:opacity-50"
                          >
                            {actionLoading === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(s.id, "rejected")}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm disabled:opacity-50"
                          >
                            {actionLoading === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
