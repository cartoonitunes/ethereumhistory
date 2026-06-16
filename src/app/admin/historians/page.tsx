"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Mail,
  Wallet,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { formatAddress, formatRelativeTime } from "@/lib/utils";
import type { HistorianMe } from "@/types";
import type { AdminHistorianSummary, AdminTrustLevel } from "@/lib/db/historians";

type Filter = "all" | "trusted" | "admin" | "standard";

const LEVEL_LABEL: Record<AdminTrustLevel, string> = {
  standard: "Standard",
  trusted: "Trusted",
  admin: "Super Admin",
};

function levelOf(h: AdminHistorianSummary): AdminTrustLevel {
  if (h.role === "admin") return "admin";
  if (h.trusted) return "trusted";
  return "standard";
}

function LevelBadge({ level }: { level: AdminTrustLevel }) {
  const styles: Record<AdminTrustLevel, string> = {
    admin: "bg-ether-600/20 border-ether-500/40 text-ether-300",
    trusted: "bg-green-600/15 border-green-500/30 text-green-400",
    standard: "bg-obsidian-800/60 border-obsidian-700 text-obsidian-400",
  };
  return (
    <span className={`text-xs border px-1.5 py-0.5 rounded ${styles[level]}`}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

export default function AdminHistoriansPage() {
  const router = useRouter();
  const [me, setMe] = useState<HistorianMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [historians, setHistorians] = useState<AdminHistorianSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  // Add form state
  const [addType, setAddType] = useState<"email" | "wallet">("email");
  const [addIdentifier, setAddIdentifier] = useState("");
  const [addLevel, setAddLevel] = useState<AdminTrustLevel>("trusted");
  const [adding, setAdding] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/historians");
    const json = await res.json();
    if (json?.data?.historians) {
      setHistorians(json.data.historians as AdminHistorianSummary[]);
    } else if (json?.error) {
      setError(json.error);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meRes = await fetch("/api/historian/me");
        const meJson = await meRes.json();
        if (cancelled) return;
        const historian = meJson?.data as HistorianMe | null;
        setMe(historian);

        if (!historian?.active || historian?.role !== "admin") {
          router.push("/historian/login?next=/admin/historians");
          return;
        }

        await reload();
      } catch {
        if (!cancelled) setError("Failed to load admin data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSetLevel(h: AdminHistorianSummary, level: AdminTrustLevel) {
    if (level === levelOf(h)) return;
    setRowBusy(h.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/historians/${h.id}/trust-level`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error || "Failed to update trust level");
        return;
      }
      await reload();
      setNotice(`${h.name} is now ${LEVEL_LABEL[level]}.`);
    } catch {
      setError("Failed to update trust level");
    } finally {
      setRowBusy(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addIdentifier.trim()) return;
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/historians/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: addIdentifier.trim(), type: addType, level: addLevel }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error || "Failed to add trusted user");
        return;
      }
      await reload();
      setNotice(
        json.data?.created
          ? `Created and granted ${LEVEL_LABEL[addLevel as AdminTrustLevel]} to ${addIdentifier.trim()}.`
          : `Granted ${LEVEL_LABEL[addLevel as AdminTrustLevel]} to ${addIdentifier.trim()}.`
      );
      setAddIdentifier("");
    } catch {
      setError("Failed to add trusted user");
    } finally {
      setAdding(false);
    }
  }

  const counts = useMemo(() => {
    let trusted = 0;
    let admin = 0;
    let standard = 0;
    for (const h of historians) {
      const l = levelOf(h);
      if (l === "admin") admin++;
      else if (l === "trusted") trusted++;
      else standard++;
    }
    return { trusted, admin, standard };
  }, [historians]);

  const filtered = useMemo(() => {
    if (filter === "all") return historians;
    return historians.filter((h) => levelOf(h) === filter);
  }, [historians, filter]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header historianMe={me} />
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ether-500" />
          </div>
        </div>
      </div>
    );
  }

  if (me?.role !== "admin") return null;

  const tabs: Array<{ key: Filter; label: string; count: number | null }> = [
    { key: "all", label: "All", count: historians.length },
    { key: "trusted", label: "Trusted", count: counts.trusted },
    { key: "admin", label: "Super Admins", count: counts.admin },
    { key: "standard", label: "Standard", count: counts.standard },
  ];

  return (
    <div className="min-h-screen">
      <Header historianMe={me} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/historian/profile"
          className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-obsidian-200 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to profile
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-7 h-7 text-ether-400" />
          <h1 className="text-3xl font-bold">Trusted User Management</h1>
        </div>
        <p className="text-obsidian-400 mb-8">
          Super admin controls. Grant or revoke trust, promote admins, and add new trusted users by
          email or wallet address.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            {notice}
          </div>
        )}

        {/* Add trusted user */}
        <div className="mb-8 p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-ether-400" />
            Add trusted user
          </h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="inline-flex rounded-lg border border-obsidian-800 bg-obsidian-900/50 p-1 self-start">
              <button
                type="button"
                onClick={() => setAddType("email")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  addType === "email"
                    ? "bg-ether-600 text-white"
                    : "text-obsidian-400 hover:text-obsidian-200"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setAddType("wallet")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  addType === "wallet"
                    ? "bg-ether-600 text-white"
                    : "text-obsidian-400 hover:text-obsidian-200"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Wallet address
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={addIdentifier}
                onChange={(e) => setAddIdentifier(e.target.value)}
                placeholder={addType === "email" ? "historian@example.com" : "0x…"}
                className="flex-1 rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              />
              <select
                value={addLevel}
                onChange={(e) => setAddLevel(e.target.value as AdminTrustLevel)}
                className="rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
              >
                <option value="trusted">Trusted</option>
                <option value="admin">Super Admin</option>
                <option value="standard">Standard</option>
              </select>
              <button
                type="submit"
                disabled={adding || !addIdentifier.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add
              </button>
            </div>
            <p className="text-xs text-obsidian-500">
              If no account exists for this {addType === "email" ? "email" : "address"}, one is
              created and granted the selected level. They take effect on the user&apos;s next sign-in.
            </p>
          </form>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                filter === t.key
                  ? "bg-obsidian-800 border-obsidian-700 text-obsidian-100"
                  : "border-obsidian-800 text-obsidian-400 hover:text-obsidian-200 hover:bg-obsidian-900/50"
              }`}
            >
              {t.label}
              {t.count !== null && (
                <span className="text-xs text-obsidian-500">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Historian list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
            <Users className="w-10 h-10 text-obsidian-600 mx-auto mb-4" />
            <p className="text-obsidian-400">No users in this view.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 overflow-hidden divide-y divide-obsidian-800">
            {filtered.map((h, i) => {
              const level = levelOf(h);
              const isSelf = h.id === me.id;
              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {h.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.avatarUrl}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-obsidian-800 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-obsidian-800 flex items-center justify-center text-obsidian-400 text-sm shrink-0">
                        {h.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/historian/${h.id}`}
                          className="text-sm font-medium text-obsidian-100 hover:text-ether-400 transition-colors truncate"
                        >
                          {h.name}
                        </Link>
                        <LevelBadge level={level} />
                        {!h.active && (
                          <span className="inline-flex items-center gap-1 text-xs border px-1.5 py-0.5 rounded bg-red-600/15 border-red-500/30 text-red-400">
                            <ShieldAlert className="w-3 h-3" />
                            Suspended
                          </span>
                        )}
                        {isSelf && (
                          <span className="text-xs text-obsidian-500">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-obsidian-500 truncate">
                        {h.ethereumAddress
                          ? formatAddress(h.ethereumAddress, 8)
                          : h.email}
                        {" · "}
                        {h.editCount} edit{h.editCount !== 1 ? "s" : ""}
                        {h.createdAt ? ` · joined ${formatRelativeTime(h.createdAt)}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rowBusy === h.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-ether-500" />
                    )}
                    <select
                      value={level}
                      disabled={isSelf || rowBusy === h.id}
                      onChange={(e) => handleSetLevel(h, e.target.value as AdminTrustLevel)}
                      title={isSelf ? "You cannot change your own trust level" : "Set trust level"}
                      className="rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-2.5 py-1.5 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="standard">Standard</option>
                      <option value="trusted">Trusted</option>
                      <option value="admin">Super Admin</option>
                    </select>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
