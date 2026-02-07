"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ERAS } from "@/types";
import { Users, FileText, PenLine } from "lucide-react";

interface ProgressStats {
  overall: { total: number; documented: number };
  byEra: Record<string, { total: number; documented: number }>;
  byYear: Record<string, { total: number; documented: number }>;
  community: { historians: number; totalEdits: number };
}

interface DocumentationProgressProps {
  variant: "homepage" | "browse";
  filterEra?: string;
  filterYear?: string;
}

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;
const YEARS = ["2015", "2016", "2017"] as const;

const ERA_COLORS: Record<string, string> = {
  frontier: "#8b5cf6",
  homestead: "#3b82f6",
  dao: "#ef4444",
  tangerine: "#f97316",
  spurious: "#eab308",
};

const YEAR_COLORS: Record<string, string> = {
  "2015": "#8b5cf6",
  "2016": "#3b82f6",
  "2017": "#f97316",
};

function percentage(documented: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((documented / total) * 100);
}

export function DocumentationProgress({
  variant,
  filterEra,
  filterYear,
}: DocumentationProgressProps) {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/progress")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.data) {
          setStats(json.data);
        }
      })
      .catch(() => {
        // silently fail
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-obsidian-900/30 border border-obsidian-800 rounded-xl p-5">
        <div className="space-y-3">
          <div className="h-4 w-48 bg-obsidian-800 rounded animate-pulse" />
          <div className="h-2 w-full bg-obsidian-800 rounded-full animate-pulse" />
          {variant === "browse" && (
            <>
              <div className="h-3 w-32 bg-obsidian-800 rounded animate-pulse mt-4" />
              <div className="h-2 w-full bg-obsidian-800 rounded-full animate-pulse" />
              <div className="h-3 w-32 bg-obsidian-800 rounded animate-pulse" />
              <div className="h-2 w-full bg-obsidian-800 rounded-full animate-pulse" />
            </>
          )}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  if (variant === "homepage") {
    return <HomepageProgress stats={stats} />;
  }

  return <BrowseProgress stats={stats} filterEra={filterEra} filterYear={filterYear} />;
}

function HomepageProgress({ stats }: { stats: ProgressStats }) {
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
                    {yearStats.documented}/{yearStats.total.toLocaleString()} ({yPct}%)
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
            <Users className="w-3.5 h-3.5 text-ether-400" />
            <span>{stats.community.historians} historian{stats.community.historians !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-obsidian-400">
            <PenLine className="w-3.5 h-3.5 text-ether-400" />
            <span>{stats.community.totalEdits} edit{stats.community.totalEdits !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-obsidian-400">
            <FileText className="w-3.5 h-3.5 text-ether-400" />
            <span>{documented} documented</span>
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

function BrowseProgress({
  stats,
  filterEra,
  filterYear,
}: {
  stats: ProgressStats;
  filterEra?: string;
  filterYear?: string;
}) {
  const [view, setView] = useState<"year" | "era">(filterEra ? "era" : "year");

  const erasToShow = filterEra
    ? ERA_IDS.filter((id) => id === filterEra)
    : ERA_IDS;

  const yearsToShow = filterYear
    ? YEARS.filter((y) => y === filterYear)
    : YEARS;

  return (
    <div className="bg-obsidian-900/30 border border-obsidian-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-obsidian-200 text-sm font-medium">
          Documentation Progress
        </h3>
        {!filterEra && !filterYear && (
          <div className="flex items-center gap-1 rounded-lg bg-obsidian-800/60 p-0.5">
            <button
              onClick={() => setView("year")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                view === "year"
                  ? "bg-obsidian-700 text-obsidian-100"
                  : "text-obsidian-400 hover:text-obsidian-200"
              }`}
            >
              By Year
            </button>
            <button
              onClick={() => setView("era")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                view === "era"
                  ? "bg-obsidian-700 text-obsidian-100"
                  : "text-obsidian-400 hover:text-obsidian-200"
              }`}
            >
              By Era
            </button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {view === "year"
          ? yearsToShow.map((year) => {
              const yearStats = stats.byYear?.[year];
              if (!yearStats) return null;
              const pct = percentage(yearStats.documented, yearStats.total);
              const isHighlighted = filterYear === year;
              return (
                <div
                  key={year}
                  className={
                    isHighlighted
                      ? "bg-obsidian-800/40 rounded-lg p-3 -mx-1"
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: YEAR_COLORS[year] }}
                      />
                      <span className="text-obsidian-200 text-sm">{year}</span>
                    </div>
                    <span className="text-obsidian-400 text-sm">
                      {yearStats.documented}/{yearStats.total.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="bg-obsidian-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: YEAR_COLORS[year] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        delay: 0.1,
                      }}
                    />
                  </div>
                </div>
              );
            })
          : erasToShow.map((eraId) => {
              const era = ERAS[eraId];
              const eraStats = stats.byEra[eraId];
              if (!era || !eraStats) return null;
              const pct = percentage(eraStats.documented, eraStats.total);
              const isHighlighted = filterEra === eraId;
              return (
                <div
                  key={eraId}
                  className={
                    isHighlighted
                      ? "bg-obsidian-800/40 rounded-lg p-3 -mx-1"
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: ERA_COLORS[eraId] }}
                      />
                      <span className="text-obsidian-200 text-sm">
                        {era.name}
                      </span>
                    </div>
                    <span className="text-obsidian-400 text-sm">
                      {eraStats.documented}/{eraStats.total.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="bg-obsidian-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: ERA_COLORS[eraId] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        delay: 0.1,
                      }}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
