"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Users, GitBranch, FileText, Calendar, Globe, ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { formatAddress, formatDate, formatRelativeTime } from "@/lib/utils";

interface HistorianProfile {
  id: number;
  name: string;
  githubUsername: string | null;
  avatarUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  joinedAt: string | null;
  totalEdits: number;
  uniqueContracts: number;
  recentEdits: Array<{
    contractAddress: string;
    contractName: string | null;
    fieldsChanged: string[];
    editedAt: string;
  }>;
}

export default function HistorianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const [profile, setProfile] = useState<HistorianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/historian/${id}/profile`);
        if (!res.ok) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          if (json?.data) {
            setProfile(json.data);
          } else {
            setNotFound(true);
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-obsidian-200 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Loading skeleton */}
        {loading && (
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-obsidian-800" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-obsidian-800 rounded" />
                <div className="h-4 w-32 bg-obsidian-800 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-obsidian-800 rounded-xl" />
              <div className="h-24 bg-obsidian-800 rounded-xl" />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-obsidian-800 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Not found */}
        {!loading && notFound && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-obsidian-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-obsidian-500" />
            </div>
            <h1 className="text-2xl font-bold text-obsidian-100 mb-2">
              Historian not found
            </h1>
            <p className="text-obsidian-400 mb-6">
              This historian profile does not exist or is no longer active.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-obsidian-600 bg-obsidian-900/50 hover:bg-obsidian-800 text-obsidian-200 hover:text-obsidian-100 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go home
            </Link>
          </motion.div>
        )}

        {/* Profile content */}
        {!loading && profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Profile header */}
            <div className="flex items-start gap-5">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-16 h-16 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-ether-500/10 flex items-center justify-center text-ether-400 text-2xl font-bold shrink-0">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-obsidian-100">
                  {profile.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  {profile.githubUsername && (
                    <a
                      href={`https://github.com/${profile.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-obsidian-400 hover:text-ether-400 transition-colors"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      {profile.githubUsername}
                    </a>
                  )}
                  {profile.websiteUrl && (
                    <a
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-obsidian-400 hover:text-ether-400 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {profile.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                  {profile.joinedAt && (
                    <div className="flex items-center gap-1.5 text-sm text-obsidian-500">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {formatDate(profile.joinedAt)}
                    </div>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-sm text-obsidian-300 mt-3 max-w-xl leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-ether-400" />
                </div>
                <p className="text-2xl font-bold text-obsidian-100">
                  {profile.totalEdits}
                </p>
                <p className="text-sm text-obsidian-400">Total edits</p>
              </div>
              <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-ether-400" />
                </div>
                <p className="text-2xl font-bold text-obsidian-100">
                  {profile.uniqueContracts}
                </p>
                <p className="text-sm text-obsidian-400">Unique contracts</p>
              </div>
            </div>

            {/* Recent edits */}
            {profile.recentEdits.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-obsidian-100 mb-4">
                  Recent Edits
                </h2>
                <div className="space-y-3">
                  {profile.recentEdits.map((edit, i) => (
                    <motion.div
                      key={`${edit.contractAddress}-${edit.editedAt}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        href={`/contract/${edit.contractAddress}`}
                        className="flex items-center gap-4 p-4 rounded-xl border border-obsidian-800 bg-obsidian-900/30 hover:border-obsidian-700 transition-colors group"
                      >
                        <div className="w-2 h-2 rounded-full bg-ether-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-obsidian-200 group-hover:text-ether-400 transition-colors">
                              {edit.contractName ||
                                formatAddress(edit.contractAddress, 8)}
                            </span>
                          </div>
                          {edit.fieldsChanged &&
                            edit.fieldsChanged.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {edit.fieldsChanged
                                  .slice(0, 4)
                                  .map((field) => (
                                    <span
                                      key={field}
                                      className="text-xs px-1.5 py-0.5 rounded bg-obsidian-800 text-obsidian-400"
                                    >
                                      {field.replace(/_/g, " ")}
                                    </span>
                                  ))}
                                {edit.fieldsChanged.length > 4 && (
                                  <span className="text-xs text-obsidian-500">
                                    +{edit.fieldsChanged.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                        <span className="text-xs text-obsidian-500 shrink-0">
                          {formatRelativeTime(edit.editedAt)}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty edits state */}
            {profile.recentEdits.length === 0 && (
              <div className="text-center py-10">
                <p className="text-obsidian-500">
                  No edits yet. This historian has not made any contributions.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
