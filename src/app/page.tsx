"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Archive, Search, Clock, Code, Users, BookOpen, Plug, History, Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { OmniSearch } from "@/components/OmniSearch";
import { EraTimeline } from "@/components/EraTimeline";
import { EraCompact } from "@/components/EraTimeline";
import { DocumentationProgress } from "@/components/DocumentationProgress";
import { formatAddress, formatDate, formatRelativeTime } from "@/lib/utils";
import { usePageView } from "@/lib/useAnalytics";
import type { FeaturedContract } from "@/types";

const FEATURED_FALLBACK: FeaturedContract[] = [];

interface TopEditor {
  historianId: number;
  name: string;
  editCount: number;
  newPagesCount: number;
}

interface RecentEdit {
  contractAddress: string;
  historianName: string;
  fieldsChanged: string[] | null;
  editedAt: string;
  contractName: string | null;
}

interface MarqueeContract {
  address: string;
  name: string;
  shortDescription: string | null;
  eraId: string | null;
  deploymentDate: string | null;
}

export default function HomePage() {
  usePageView("/");
  const [featuredContracts, setFeaturedContracts] = useState<FeaturedContract[]>(FEATURED_FALLBACK);
  const [marqueeContracts, setMarqueeContracts] = useState<MarqueeContract[]>([]);
  const [topEditors, setTopEditors] = useState<TopEditor[]>([]);
  const [recentEdits, setRecentEdits] = useState<RecentEdit[]>([]);
  const [contractOfTheDay, setContractOfTheDay] = useState<FeaturedContract | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/featured");
        const json = await res.json();
        const next = (json?.data?.featuredContracts || []) as FeaturedContract[];
        if (!cancelled && Array.isArray(next) && next.length > 0) {
          setFeaturedContracts(next);
        }
      } catch {
        // fall back to empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/browse?limit=24");
        const json = await res.json();
        const list = (json?.data?.contracts || []) as MarqueeContract[];
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setMarqueeContracts(list);
        }
      } catch {
        // leave empty, will fall back to featured in render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/editors/top?limit=10");
        const json = await res.json();
        const editors = (json?.data?.editors || []) as TopEditor[];
        if (!cancelled && Array.isArray(editors)) {
          setTopEditors(editors);
        }
      } catch {
        // fall back to empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Contract of the Day
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/contract-of-the-day");
        const json = await res.json();
        if (!cancelled && json?.data) {
          setContractOfTheDay(json.data);
        }
      } catch {
        // fall back to null
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Activity Feed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/activity?limit=10");
        const json = await res.json();
        const edits = (json?.data?.edits || []) as RecentEdit[];
        if (!cancelled && Array.isArray(edits)) {
          setRecentEdits(edits);
        }
      } catch {
        // fall back to empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-radial opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(98,110,241,0.1),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ether-500/10 border border-ether-500/20 text-ether-400 text-sm mb-6"
            >
              <Archive className="w-4 h-4" />
              Wikipedia for Ethereum Smart Contracts
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              <span className="gradient-text">Ethereum</span> has a history
              <br />
              worth preserving.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-obsidian-400 max-w-2xl mx-auto mb-10">
              Explore the smart contracts that shaped the early blockchain era.
              From the genesis block to now, focusing on the early days.
            </p>

            {/* Search */}
            <div className="flex justify-center mb-6">
              <Suspense
                fallback={
                  <div className="w-full max-w-3xl">
                    <div className="h-16 rounded-xl border border-obsidian-800 bg-obsidian-900/30" />
                  </div>
                }
              >
                <OmniSearch />
              </Suspense>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contract of the Day */}
      {contractOfTheDay && (
        <section className="py-16 border-t border-obsidian-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Contract of the Day</h2>
                  <p className="text-sm text-obsidian-500">A new historical contract featured every day</p>
                </div>
              </div>
              <Link
                href={`/contract/${contractOfTheDay.address}`}
                className="block rounded-2xl border border-obsidian-700 bg-obsidian-900/40 hover:border-ether-500/30 p-6 md:p-8 transition-colors group"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-xl md:text-2xl font-bold text-obsidian-100 group-hover:text-ether-400 transition-colors">
                        {contractOfTheDay.name}
                      </h3>
                      {contractOfTheDay.eraId && <EraCompact eraId={contractOfTheDay.eraId} />}
                    </div>
                    {contractOfTheDay.shortDescription && (
                      <p className="text-obsidian-300 mb-3 line-clamp-2">{contractOfTheDay.shortDescription}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-obsidian-500">
                      <code className="font-mono">{formatAddress(contractOfTheDay.address, 8)}</code>
                      {contractOfTheDay.deploymentDate && (
                        <span>Deployed {formatDate(contractOfTheDay.deploymentDate)}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-obsidian-500 group-hover:text-ether-400 transition-colors">
                    <Archive className="w-6 h-6" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Archived Contracts (browse-style section) */}
      <section className="py-20 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
          >
            <div>
              <h2 className="text-3xl font-bold mb-2">Archived contracts</h2>
              <p className="text-obsidian-400 max-w-xl">
                Find documented contracts for your research. Early Ethereum mainnet contracts with editorial history.
              </p>
            </div>
            <Link
              href="/browse"
              className="inline-flex items-center justify-center sm:justify-end px-5 py-2.5 rounded-xl border border-obsidian-600 bg-obsidian-900/50 hover:bg-obsidian-800 hover:border-obsidian-600 text-obsidian-200 hover:text-obsidian-100 font-medium text-sm transition-colors shrink-0"
            >
              View all
            </Link>
          </motion.div>

          {/* Moving single line (marquee) of archived contracts */}
          <div className="overflow-hidden py-2 -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="animate-marquee flex w-max gap-4">
              {(marqueeContracts.length > 0 ? marqueeContracts : featuredContracts.map((c) => ({
                address: c.address,
                name: c.name,
                shortDescription: c.shortDescription,
                eraId: c.eraId,
                deploymentDate: c.deploymentDate,
              }))).map((contract) => (
                <Link
                  key={contract.address}
                  href={`/contract/${contract.address}`}
                  className="flex-shrink-0 w-[240px] sm:w-[260px] rounded-xl border border-obsidian-800 bg-obsidian-900/50 hover:border-ether-500/30 p-4 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-obsidian-100 group-hover:text-ether-400 transition-colors truncate text-sm">
                      {contract.name || "Contract"}
                    </h3>
                    {contract.eraId && <EraCompact eraId={contract.eraId} showLabel={false} />}
                  </div>
                  <code className="text-xs text-obsidian-500 font-mono block truncate">
                    {formatAddress(contract.address, 6)}
                  </code>
                  {contract.deploymentDate && (
                    <p className="text-xs text-obsidian-500 mt-1">
                      {formatDate(contract.deploymentDate)}
                    </p>
                  )}
                </Link>
              ))}
              {/* Duplicate list for seamless infinite scroll */}
              {(marqueeContracts.length > 0 ? marqueeContracts : featuredContracts.map((c) => ({
                address: c.address,
                name: c.name,
                shortDescription: c.shortDescription,
                eraId: c.eraId,
                deploymentDate: c.deploymentDate,
              }))).map((contract) => (
                <Link
                  key={`${contract.address}-dup`}
                  href={`/contract/${contract.address}`}
                  className="flex-shrink-0 w-[240px] sm:w-[260px] rounded-xl border border-obsidian-800 bg-obsidian-900/50 hover:border-ether-500/30 p-4 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-obsidian-100 group-hover:text-ether-400 transition-colors truncate text-sm">
                      {contract.name || "Contract"}
                    </h3>
                    {contract.eraId && <EraCompact eraId={contract.eraId} showLabel={false} />}
                  </div>
                  <code className="text-xs text-obsidian-500 font-mono block truncate">
                    {formatAddress(contract.address, 6)}
                  </code>
                  {contract.deploymentDate && (
                    <p className="text-xs text-obsidian-500 mt-1">
                      {formatDate(contract.deploymentDate)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For agents */}
      <section id="for-agents" className="py-16 border-t border-obsidian-800 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-obsidian-700 bg-obsidian-900/40 p-8 md:p-10"
          >
            <h2 className="text-2xl font-bold mb-2">For agents</h2>
            <p className="text-obsidian-400 mb-6 max-w-2xl">
              MCP integration. REST API. Let your bot query historical contract data.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/api-docs"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ether-600 hover:bg-ether-500 text-white font-medium text-sm transition-colors border border-ether-500/30"
              >
                <BookOpen className="w-4 h-4" />
                API Docs
              </Link>
              <Link
                href="/mcp-setup"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-obsidian-600 bg-obsidian-800/50 hover:bg-obsidian-700/80 text-obsidian-200 hover:text-obsidian-100 font-medium text-sm transition-colors"
              >
                <Plug className="w-4 h-4" />
                MCP Setup
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Documentation Progress + This Week */}
      <section className="py-16 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <DocumentationProgress variant="homepage" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Link
                href="/this-week"
                className="block h-full rounded-xl border border-obsidian-800 bg-obsidian-900/30 hover:border-ether-500/30 p-5 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-ether-500/10 flex items-center justify-center text-ether-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-obsidian-100 group-hover:text-ether-400 transition-colors">
                      This Week in Ethereum History
                    </h3>
                    <p className="text-xs text-obsidian-500">
                      Contracts deployed this same week in 2015-2017
                    </p>
                  </div>
                </div>
                <p className="text-sm text-obsidian-400">
                  Discover which contracts were being deployed at this time in Ethereum&apos;s earliest years. Updated weekly.
                </p>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="Contract Analysis"
              description="Deep analysis of bytecode structure, detected patterns, and function signatures."
            />
            <FeatureCard
              icon={<Code className="w-6 h-6" />}
              title="Decompiled Code"
              description="View human-readable decompiled bytecode with function names and logic flow."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Historical Context"
              description="Every contract is placed in its historical context with era information."
            />
          </div>
        </div>
      </section>

      {/* Top Editors */}
      {topEditors.length > 0 && (
        <section className="py-20 border-t border-obsidian-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Top Contributors</h2>
              <p className="text-obsidian-400 max-w-2xl mx-auto">
                Recognizing the historians who have contributed the most edits to preserve Ethereum's history.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              {topEditors.map((editor, index) => (
                <motion.div
                  key={editor.historianId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 rounded-xl bg-obsidian-900/30 border border-obsidian-800 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-ether-500/10 flex items-center justify-center text-ether-400 mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <Link href={`/historian/${editor.historianId}`} className="text-lg font-semibold text-obsidian-100 hover:text-ether-400 transition-colors mb-1">
                    {editor.name}
                  </Link>
                  <p className="text-sm text-obsidian-400">
                    {editor.editCount} {editor.editCount === 1 ? "edit" : "edits"}
                  </p>
                  {editor.newPagesCount > 0 && (
                    <p className="text-xs text-ether-400 mt-1">
                      {editor.newPagesCount} new {editor.newPagesCount === 1 ? "page" : "pages"}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity Feed */}
      {recentEdits.length > 0 && (
        <section className="py-16 border-t border-obsidian-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Recent Activity</h2>
                  <p className="text-sm text-obsidian-500">Latest documentation updates by historians</p>
                </div>
              </div>
              <div className="space-y-3">
                {recentEdits.map((edit, i) => (
                  <motion.div
                    key={`${edit.contractAddress}-${edit.editedAt}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      href={`/contract/${edit.contractAddress}`}
                      className="flex items-center gap-4 p-4 rounded-xl border border-obsidian-800 bg-obsidian-900/30 hover:border-obsidian-700 transition-colors group"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-obsidian-200 group-hover:text-ether-400 transition-colors">
                            {edit.contractName || formatAddress(edit.contractAddress, 8)}
                          </span>
                          <span className="text-obsidian-500 text-sm">
                            edited by {edit.historianName}
                          </span>
                        </div>
                        {edit.fieldsChanged && edit.fieldsChanged.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {edit.fieldsChanged.slice(0, 3).map((field) => (
                              <span key={field} className="text-xs px-1.5 py-0.5 rounded bg-obsidian-800 text-obsidian-400">
                                {field.replace(/_/g, " ")}
                              </span>
                            ))}
                            {edit.fieldsChanged.length > 3 && (
                              <span className="text-xs text-obsidian-500">+{edit.fieldsChanged.length - 3} more</span>
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
            </motion.div>
          </div>
        </section>
      )}

      {/* Era Timeline */}
      <EraTimeline />

      {/* Join / Community CTA */}
      <section className="py-16 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-ether-500/20 bg-gradient-to-br from-ether-500/5 to-obsidian-900/40 p-8 md:p-10 text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Help preserve Ethereum&apos;s history
            </h2>
            <p className="text-obsidian-400 max-w-2xl mx-auto mb-6">
              Join our community of historians documenting the earliest smart contracts
              ever deployed. Sign up with GitHub, start editing, and build your contributor profile.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/api/auth/github"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ether-600 hover:bg-ether-500 text-white font-medium text-sm transition-colors border border-ether-500/30"
              >
                <Users className="w-4 h-4" />
                Sign up with GitHub
              </Link>
              <Link
                href="/browse?undocumented=1"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-obsidian-600 bg-obsidian-900/50 hover:bg-obsidian-800 text-obsidian-200 hover:text-obsidian-100 font-medium text-sm transition-colors"
              >
                Browse undocumented contracts
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 border-t border-obsidian-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold mb-6">About This Project</h2>

            <div className="prose prose-invert mx-auto text-obsidian-400">
              <p className="text-lg mb-4">
                ethereumhistory.com is a historical archive and analysis tool for
                Ethereum smart contracts, with a focus on the 2015-2017 era when
                standards were still forming.
              </p>

              <p className="mb-4">
                This is not a trading site, block explorer, or dashboard. It is a
                long-term preservation effort — part museum, part research terminal,
                part Wikipedia for Ethereum's earliest code.
              </p>

              <p className="mb-6">
                Every contract is analyzed using bytecode structure comparison, not
                black-box ML. Heuristics are clearly labeled. Uncertainty is explicit.
                If we're not sure about something, we say so.
              </p>
            </div>

            {/* Principles */}
            <div className="grid md:grid-cols-3 gap-6 mt-10 text-left">
              <PrincipleCard
                title="Accuracy over Speed"
                description="We prefer correct over fast. Every claim is backed by evidence or clearly marked as heuristic."
              />
              <PrincipleCard
                title="Transparency"
                description="Our similarity algorithms are deterministic and explainable. No black boxes."
              />
              <PrincipleCard
                title="Preservation"
                description="Ethereum's early contracts deserve to be preserved and understood, not forgotten."
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ether-500 to-ether-700 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
                  <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
                </svg>
              </div>
              <span className="text-obsidian-400">ethereumhistory.com</span>
            </div>

            <p className="text-sm text-obsidian-500">
              A preservation project for Ethereum's historical smart contracts.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-6 rounded-xl bg-obsidian-900/30 border border-obsidian-800"
    >
      <div className="w-12 h-12 rounded-lg bg-ether-500/10 flex items-center justify-center text-ether-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-obsidian-100 mb-2">{title}</h3>
      <p className="text-obsidian-400">{description}</p>
    </motion.div>
  );
}

function PrincipleCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-lg bg-obsidian-900/30 border border-obsidian-800">
      <h4 className="font-medium text-obsidian-200 mb-2">{title}</h4>
      <p className="text-sm text-obsidian-400">{description}</p>
    </div>
  );
}
