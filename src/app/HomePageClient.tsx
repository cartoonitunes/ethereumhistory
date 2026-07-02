"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Archive, Search, Clock, Code, Users, BookOpen, Plug, History, Calendar, Layers, Gamepad2, Play, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { OmniSearch } from "@/components/OmniSearch";
import { EraTimeline } from "@/components/EraTimeline";
import { formatAddress, formatDate, formatRelativeTime } from "@/lib/utils";
import { usePageView } from "@/lib/useAnalytics";
import { EraCompact } from "@/components/EraTimeline";
import { Users as UsersIcon, PenLine, FileText } from "lucide-react";
import type { FeaturedContract } from "@/types";
import type { CollectionSummary } from "@/lib/db/collections";

export interface TopEditor {
  historianId: number;
  name: string;
  avatarUrl: string | null;
  editCount: number;
  newPagesCount: number;
}

export interface RecentEdit {
  contractAddress: string;
  historianName: string;
  fieldsChanged: string[] | null;
  editedAt: string;
  contractName: string | null;
}

export interface MarqueeContract {
  address: string;
  name: string;
  shortDescription: string | null;
  eraId: string | null;
  deploymentDate: string | null;
}

export interface ProgressStats {
  overall: { total: number; documented: number };
  byEra: Record<string, { total: number; documented: number }>;
  byYear: Record<string, { total: number; documented: number }>;
  community: { historians: number; totalEdits: number };
}

interface HomePageClientProps {
  featuredContracts: FeaturedContract[];
  marqueeContracts: MarqueeContract[];
  topEditors: TopEditor[];
  recentEdits: RecentEdit[];
  contractOfTheDay: FeaturedContract | null;
  progressStats: ProgressStats | null;
  collections: CollectionSummary[];
  verifiedProofsCount: number;
}

// Compact human count: 12,345,678 -> "12M+", 2,431 -> "2,400+", 1,712 -> "1,700+"
function compactCount(n: number): string {
  if (n <= 0) return "0";
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000);
    return `${m}M+`;
  }
  if (n >= 10_000) {
    const k = Math.floor(n / 1000);
    return `${k.toLocaleString()}K+`;
  }
  if (n >= 1000) {
    const rounded = Math.floor(n / 100) * 100;
    return `${rounded.toLocaleString()}+`;
  }
  const rounded = Math.floor(n / 10) * 10;
  return rounded > 0 ? `${rounded}+` : `${n}`;
}

// Discovery chips shown under the search bar. Addresses are the canonical,
// well-known mainnet deployments; search-based chips always resolve.
const QUICK_LINKS: { label: string; href: string }[] = [
  { label: "The DAO", href: "/contract/0xbb9bc244d798123fde783fcc1c72d3bb8c189413" },
  { label: "CryptoKitties", href: "/contract/0x06012c8cf97bead5deae237070f9587f8e7a266d" },
  { label: "Vitalik's contracts", href: "/collection/vitalik" },
  { label: "First contracts ever", href: "/browse" },
  { label: "Famous deployers", href: "/collections" },
];

const YEAR_COLORS: Record<string, string> = {
  "2015": "#8b5cf6",
  "2016": "#3b82f6",
  "2017": "#f97316",
  "2018": "#10b981",
};
const YEARS = ["2015", "2016", "2017", "2018"] as const;

function percentage(documented: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((documented / total) * 100);
}

export default function HomePageClient({
  featuredContracts,
  marqueeContracts,
  topEditors,
  recentEdits,
  contractOfTheDay,
  progressStats,
  collections,
  verifiedProofsCount,
}: HomePageClientProps) {
  usePageView("/");

  // Live stat counters. Fall back to known-good floors so the hero never shows
  // a hollow "0" if a data source stalls under serverless pressure.
  const totalIndexed = progressStats?.overall.total ?? 0;
  const documentedCount = progressStats?.overall.documented ?? 0;
  const heroStats = [
    {
      value: totalIndexed > 0 ? compactCount(totalIndexed) : "12M+",
      label: "contracts indexed",
    },
    {
      value: documentedCount > 0 ? compactCount(documentedCount) : "2,000+",
      label: "documented",
    },
    {
      value: verifiedProofsCount > 0 ? compactCount(verifiedProofsCount) : "1,700+",
      label: "verified proofs",
    },
  ];

  // Use marquee contracts or fallback to featured
  const displayContracts =
    marqueeContracts.length > 0
      ? marqueeContracts
      : featuredContracts.map((c) => ({
          address: c.address,
          name: c.name,
          shortDescription: c.shortDescription,
          eraId: c.eraId,
          deploymentDate: c.deploymentDate,
        }));

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
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
            {/* Eyebrow — archival provenance */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-obsidian-900/60 border border-obsidian-700 text-obsidian-400 text-xs font-medium tracking-wide mb-6"
            >
              <Archive className="w-3.5 h-3.5 text-ether-400" />
              The complete archive of Ethereum's earliest smart contracts
            </motion.div>

            {/* Headline — the positioning, front and center */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-5 tracking-tight leading-[1.05]">
              The <span className="gradient-text">Wikipedia</span> for
              <br className="hidden sm:block" />{" "}
              Ethereum smart contracts
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-obsidian-400 max-w-2xl mx-auto mb-8">
              A museum-grade archive of the code that shaped early Ethereum.
              Search the chain, then read the stories behind the contracts that mattered.
            </p>

            {/* Live stat counters */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12 mb-10">
              {heroStats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text tabular-nums">
                    {stat.value}
                  </span>
                  <span className="text-xs sm:text-sm text-obsidian-500 mt-1">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex justify-center mb-5">
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

            {/* Quick-link discovery chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
              <span className="text-xs text-obsidian-600 mr-1 hidden sm:inline">Jump to</span>
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-obsidian-700 bg-obsidian-900/40 text-sm text-obsidian-300 hover:text-obsidian-100 hover:border-ether-500/40 hover:bg-obsidian-800/60 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
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
                      {contractOfTheDay.deploymentRank != null && contractOfTheDay.deploymentRank <= 1_000_000 && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          {contractOfTheDay.deploymentRank <= 9_999
                            ? `Contract #${contractOfTheDay.deploymentRank.toLocaleString()}`
                            : `Contract #${Math.floor(contractOfTheDay.deploymentRank / 1000)}K`}
                        </span>
                      )}
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
              {displayContracts.map((contract) => (
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
              {displayContracts.map((contract) => (
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
            <p className="text-obsidian-400 mb-4 max-w-2xl">
              MCP integration. REST API. Agent skills. Let your bot query historical contract data.
            </p>
            <pre className="bg-obsidian-900/80 border border-obsidian-700 rounded-lg px-4 py-2.5 text-sm font-mono text-obsidian-300 mb-5 overflow-x-auto">
              npx skills add cartoonitunes/ethereum-history-skills
            </pre>
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
              <a
                href="https://github.com/cartoonitunes/ethereum-history-skills"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-obsidian-600 bg-obsidian-800/50 hover:bg-obsidian-700/80 text-obsidian-200 hover:text-obsidian-100 font-medium text-sm transition-colors"
              >
                Agent Skills
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Network exploration */}
      <section className="py-16 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link href="/network" className="block group">
              <div className="rounded-2xl border border-obsidian-700 bg-obsidian-900/40 p-8 md:p-10 hover:border-ether-500/30 transition-colors">
                <h2 className="text-2xl font-bold mb-2 group-hover:text-ether-400 transition-colors">Deployer Network</h2>
                <p className="text-obsidian-400 mb-4 max-w-2xl">
                  Interactive force graph of Ethereum&apos;s earliest builders and their contracts. See who deployed what, when, and how they connect.
                </p>
                <span className="text-sm text-ether-500 group-hover:text-ether-400 transition-colors">
                  Explore the network &rarr;
                </span>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Play the game — EH Explorer */}
      <section className="py-16 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <a href="/game" className="block group">
              <div className="relative overflow-hidden rounded-2xl border border-obsidian-700 bg-gradient-to-br from-obsidian-900/60 via-obsidian-900/40 to-[#0f380f]/25 p-8 md:p-10 hover:border-ether-500/40 transition-colors">
                {/* faint pixel grid, a nod to the Game Boy screen */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      "linear-gradient(#9bbc0f 1px, transparent 1px), linear-gradient(90deg, #9bbc0f 1px, transparent 1px)",
                    backgroundSize: "12px 12px",
                  }}
                />
                <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-14 h-14 shrink-0 rounded-xl bg-ether-500/10 border border-ether-500/20 flex items-center justify-center text-ether-400">
                    <Gamepad2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#9bbc0f]">
                      <Sparkles className="w-3.5 h-3.5" /> New &middot; Game Boy-style RPG
                    </div>
                    <h2 className="text-2xl font-bold mb-2 group-hover:text-ether-400 transition-colors">
                      EH Explorer &mdash; catch Ethereum history
                    </h2>
                    <p className="text-obsidian-400 max-w-2xl">
                      A retro pixel adventure: walk the seven eras, meet real documented smart
                      contracts as creatures, and record them in your Historian&apos;s Dex. Every
                      creature is a true piece of Ethereum history &mdash; learn its story as you play.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ether-600 group-hover:bg-ether-500 text-white font-medium text-sm transition-colors border border-ether-500/30">
                      <Play className="w-4 h-4" /> Play now
                    </span>
                  </div>
                </div>
              </div>
            </a>
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
              {/* Inline SSR-friendly progress widget */}
              {progressStats ? (
                <HomepageProgressInline stats={progressStats} />
              ) : (
                <div className="bg-obsidian-900/30 border border-obsidian-800 rounded-xl p-5">
                  <div className="space-y-3">
                    <div className="h-4 w-48 bg-obsidian-800 rounded animate-pulse" />
                    <div className="h-2 w-full bg-obsidian-800 rounded-full animate-pulse" />
                  </div>
                </div>
              )}
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
                      Contracts deployed this same week in 2015-2018
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
                  {editor.avatarUrl ? (
                    <img
                      src={editor.avatarUrl}
                      alt={editor.name}
                      className="w-12 h-12 rounded-full object-cover mx-auto mb-3"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-ether-500/10 flex items-center justify-center text-ether-400 text-lg font-bold mx-auto mb-3">
                      {editor.name.charAt(0).toUpperCase()}
                    </div>
                  )}
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

      {/* Collections */}
      {collections.length > 0 && (
        <section className="py-16 border-t border-obsidian-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-ether-500/10 flex items-center justify-center text-ether-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Collections</h2>
                    <p className="text-sm text-obsidian-500">Curated galleries of historically significant contracts</p>
                  </div>
                </div>
                <Link
                  href="/collections"
                  className="text-sm text-obsidian-400 hover:text-obsidian-200 transition-colors"
                >
                  View all &rarr;
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {collections.slice(0, 3).map((col, i) => (
                  <motion.div
                    key={col.slug}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <Link
                      href={`/collection/${col.slug}`}
                      className="group block rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-5 hover:border-obsidian-600 hover:bg-obsidian-900/60 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-ether-500/10 flex items-center justify-center text-ether-400 shrink-0">
                          <Archive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-obsidian-100 group-hover:text-ether-400 transition-colors line-clamp-1">
                            {col.title}
                          </h3>
                          {col.subtitle && (
                            <p className="text-xs text-obsidian-400 mt-0.5 line-clamp-2">{col.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-obsidian-500">
                        <span>{col.contractCount.toLocaleString()} contracts</span>
                        {col.deployerAddress && (
                          <code className="font-mono">{formatAddress(col.deployerAddress, 8)}</code>
                        )}
                      </div>
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
              ever deployed. Sign up, start editing, and build your contributor profile.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/historian/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ether-600 hover:bg-ether-500 text-white font-medium text-sm transition-colors border border-ether-500/30"
              >
                <Users className="w-4 h-4" />
                Become a historian
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
                Ethereum smart contracts, with a focus on the 2015-2018 era when
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

      {/* Partners & Sponsors */}
      <section className="py-12 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-widest text-obsidian-600 mb-6 font-medium">
              Partners &amp; Sponsors
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {/* Sourcify */}
              <a
                href="https://sourcify.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity"
                title="Sourcify — Decentralized Smart Contract Verification"
              >
                <img
                  src="/partners/sourcify-logo.svg"
                  alt="Sourcify"
                  className="h-7 w-7"
                />
                <span className="text-sm font-semibold text-obsidian-300 group-hover:text-obsidian-100 transition-colors tracking-tight">
                  Sourcify
                </span>
              </a>
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

            <div className="flex items-center gap-4 text-sm text-obsidian-500">
              <span>A preservation project for Ethereum&apos;s historical smart contracts.</span>
              <Link href="/privacy" className="hover:text-obsidian-300 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-obsidian-300 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** SSR-friendly version of the progress widget (no useEffect fetch) */
function HomepageProgressInline({ stats }: { stats: ProgressStats }) {
  const { total, documented } = stats.overall;
  const pct = percentage(documented, total);

  return (
    <div className="bg-obsidian-900/30 border border-obsidian-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-obsidian-200 text-sm font-medium">
          Documentation Progress
        </span>
        <span className="text-obsidian-400 text-sm">
          {documented.toLocaleString()} of {total.toLocaleString()} contracts
          documented ({pct}%)
        </span>
      </div>
      <div className="bg-obsidian-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: "#8b5cf6" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Year breakdown */}
      {stats.byYear && (
        <div className="mt-4 space-y-2">
          {YEARS.map((year) => {
            const yearStats = stats.byYear[year];
            if (!yearStats) return null;
            const yPct = percentage(yearStats.documented, yearStats.total);
            return (
              <div key={year}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: YEAR_COLORS[year] }}
                    />
                    <span className="text-obsidian-300 text-xs">{year}</span>
                  </div>
                  <span className="text-obsidian-500 text-xs">
                    {yearStats.documented.toLocaleString()}/{yearStats.total.toLocaleString()} ({yPct}%)
                  </span>
                </div>
                <div className="bg-obsidian-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: YEAR_COLORS[year] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${yPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Community stats */}
      {stats.community && (stats.community.historians > 0 || stats.community.totalEdits > 0) && (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-obsidian-800">
          <div className="flex items-center gap-1.5 text-xs text-obsidian-400">
            <UsersIcon className="w-3.5 h-3.5 text-ether-400" />
            <span>{stats.community.historians} historian{stats.community.historians !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-obsidian-400">
            <PenLine className="w-3.5 h-3.5 text-ether-400" />
            <span>{stats.community.totalEdits} edit{stats.community.totalEdits !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-obsidian-400">
            <FileText className="w-3.5 h-3.5 text-ether-400" />
            <span>{documented.toLocaleString()} documented</span>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Link
          href="/browse"
          className="text-obsidian-400 text-sm hover:text-obsidian-200 transition-colors"
        >
          Help us document more contracts &rarr;
        </Link>
      </div>
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
