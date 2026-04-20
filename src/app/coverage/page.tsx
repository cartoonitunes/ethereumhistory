"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { ArrowLeft, BookOpen, Layers, Database, TrendingUp } from "lucide-react";
import { ERAS } from "@/types";

interface EraStats {
  eraId: string;
  total: number;
  documented: number;
  uncovered: number;
  indexed: number;
  documentedPct: number;
}

interface YearStats {
  year: number;
  total: number;
  documented: number;
  uncovered: number;
  indexed: number;
  documentedPct: number;
}

interface CoverageSummary {
  total: number;
  documented: number;
  uncovered: number;
  indexed: number;
  documentedPct: number;
}

interface CoverageData {
  summary: CoverageSummary;
  eras: EraStats[];
  years: YearStats[];
}

const ERA_COLOR: Record<string, string> = {
  frontier: "#8b5cf6",
  homestead: "#3b82f6",
  dao: "#ef4444",
  tangerine: "#f97316",
  spurious: "#eab308",
};

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold text-obsidian-100 mb-0.5">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-sm font-medium text-obsidian-300">{label}</div>
      {sub && <div className="text-xs text-obsidian-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function StackedBar({ documented, uncovered, indexed, total }: { documented: number; uncovered: number; indexed: number; total: number }) {
  if (total === 0) return <div className="h-3 rounded-full bg-obsidian-800 w-full" />;
  const docPct = (documented / total) * 100;
  const uncPct = (uncovered / total) * 100;
  const idxPct = (indexed / total) * 100;
  return (
    <div className="h-3 rounded-full bg-obsidian-800 overflow-hidden flex">
      {docPct > 0 && <div className="h-full bg-ether-500 transition-all" style={{ width: `${docPct}%` }} title={`Documented: ${documented.toLocaleString()}`} />}
      {uncPct > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${uncPct}%` }} title={`Uncovered: ${uncovered.toLocaleString()}`} />}
      {idxPct > 0 && <div className="h-full bg-obsidian-600 transition-all" style={{ width: `${idxPct}%` }} title={`Indexed only: ${indexed.toLocaleString()}`} />}
    </div>
  );
}

function SkeletonBar() {
  return <div className="h-3 rounded-full bg-obsidian-800 animate-pulse w-full" />;
}

export default function CoveragePage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coverage")
      .then((r) => r.json())
      .then((json) => {
        if (json?.data) setData(json.data);
        else setError(json?.error || "Failed to load coverage data.");
      })
      .catch(() => setError("Failed to load coverage data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      <div className="relative py-8 md:py-12 overflow-hidden">
        <div className="absolute inset-0 gradient-radial opacity-30" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-ether-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Coverage Dashboard</h1>
            <p className="text-obsidian-400">
              How much of the historical Ethereum contract record has been documented by historians.
            </p>
          </motion.div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-8 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-ether-500 shrink-0" />
              <span className="text-obsidian-300">Documented</span>
              <span className="text-obsidian-500">— has historian writeup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
              <span className="text-obsidian-300">Source Uncovered</span>
              <span className="text-obsidian-500">— bytecode family is cracked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-obsidian-600 shrink-0" />
              <span className="text-obsidian-300">Indexed</span>
              <span className="text-obsidian-500">— on-chain, not yet researched</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-red-400 mb-8">{error}</div>
          )}

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-obsidian-900/40 border border-obsidian-800 animate-pulse" />
              ))
            ) : data ? (
              <>
                <StatCard
                  label="Total Indexed"
                  value={data.summary.total}
                  icon={Database}
                  color="bg-obsidian-700/60 text-obsidian-300"
                />
                <StatCard
                  label="Documented"
                  value={data.summary.documented}
                  sub={`${data.summary.documentedPct}% of total`}
                  icon={BookOpen}
                  color="bg-ether-500/20 text-ether-300"
                />
                <StatCard
                  label="Source Uncovered"
                  value={data.summary.uncovered}
                  sub="bytecode family cracked"
                  icon={Layers}
                  color="bg-amber-500/20 text-amber-300"
                />
                <StatCard
                  label="Still Unknown"
                  value={data.summary.indexed}
                  sub="awaiting historians"
                  icon={TrendingUp}
                  color="bg-obsidian-600/40 text-obsidian-400"
                />
              </>
            ) : null}
          </motion.div>

          {/* Per-era breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h2 className="text-lg font-semibold text-obsidian-100 mb-4">By Era</h2>
            <div className="flex flex-col gap-4">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-4 w-28 bg-obsidian-800 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-obsidian-800 rounded animate-pulse" />
                      </div>
                      <SkeletonBar />
                    </div>
                  ))
                : data?.eras.map((era) => {
                    const eraInfo = ERAS[era.eraId];
                    const color = ERA_COLOR[era.eraId] ?? "#6b7280";
                    return (
                      <div key={era.eraId} className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <Link
                              href={`/eras/${era.eraId}`}
                              className="font-medium text-obsidian-200 hover:text-ether-300 transition-colors"
                            >
                              {eraInfo?.name ?? era.eraId}
                            </Link>
                            <span className="text-xs text-obsidian-500">{era.total.toLocaleString()} contracts</span>
                          </div>
                          <div className="text-sm font-medium text-obsidian-300">
                            {era.documentedPct}%
                          </div>
                        </div>
                        <StackedBar
                          documented={era.documented}
                          uncovered={era.uncovered}
                          indexed={era.indexed}
                          total={era.total}
                        />
                        <div className="flex gap-4 mt-2 text-xs text-obsidian-500">
                          <span className="text-ether-400">{era.documented.toLocaleString()} documented</span>
                          {era.uncovered > 0 && <span className="text-amber-400">{era.uncovered.toLocaleString()} uncovered</span>}
                          <span>{era.indexed.toLocaleString()} unknown</span>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </motion.div>

          {/* Per-year summary */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-lg font-semibold text-obsidian-100 mb-4">By Year</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-xl border border-obsidian-800 bg-obsidian-900/30 animate-pulse" />
                  ))
                : data?.years.map((yr) => (
                    <div key={yr.year} className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-obsidian-100">{yr.year}</span>
                        <span className="text-xs font-medium text-obsidian-400">{yr.total.toLocaleString()} total</span>
                      </div>
                      <StackedBar
                        documented={yr.documented}
                        uncovered={yr.uncovered}
                        indexed={yr.indexed}
                        total={yr.total}
                      />
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
                        <span className="text-ether-400">{yr.documented.toLocaleString()} documented</span>
                        {yr.uncovered > 0 && <span className="text-amber-400">{yr.uncovered.toLocaleString()} uncovered</span>}
                        <span className="text-obsidian-500">{yr.documentedPct}% coverage</span>
                      </div>
                    </div>
                  ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 rounded-xl border border-ether-500/20 bg-ether-500/5 p-6"
          >
            <h3 className="font-semibold text-ether-300 mb-1">Help close the gap</h3>
            <p className="text-sm text-obsidian-400 mb-4">
              Thousands of contracts from Ethereum&apos;s earliest years are still undocumented.
              Join the historian community and help preserve this history.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/browse?mode=index"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-obsidian-300 hover:bg-obsidian-700 hover:text-obsidian-100 transition-colors text-sm font-medium"
              >
                <Database className="w-4 h-4" />
                Browse undocumented contracts
              </Link>
              <Link
                href="/historian/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-500/10 border border-ether-500/30 text-ether-300 hover:bg-ether-500/20 transition-colors text-sm font-medium"
              >
                <BookOpen className="w-4 h-4" />
                Become a historian
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
