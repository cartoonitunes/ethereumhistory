"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ERAS } from "@/types";

interface ProgressStats {
  overall: { total: number; documented: number };
  byEra: Record<string, { total: number; documented: number }>;
}

interface DocumentationProgressProps {
  variant: "homepage" | "browse";
  filterEra?: string;
}

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;

const ERA_COLORS: Record<string, string> = {
  frontier: "#8b5cf6",
  homestead: "#3b82f6",
  dao: "#ef4444",
  tangerine: "#f97316",
  spurious: "#eab308",
};

function percentage(documented: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((documented / total) * 100);
}

export function DocumentationProgress({
  variant,
  filterEra,
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

  return <BrowseProgress stats={stats} filterEra={filterEra} />;
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
}: {
  stats: ProgressStats;
  filterEra?: string;
}) {
  const erasToShow = filterEra
    ? ERA_IDS.filter((id) => id === filterEra)
    : ERA_IDS;

  return (
    <div className="bg-obsidian-900/30 border border-obsidian-800 rounded-xl p-5">
      <h3 className="text-obsidian-200 text-sm font-medium mb-4">
        Documentation Progress by Era
      </h3>
      <div className="space-y-3">
        {erasToShow.map((eraId) => {
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
                  {eraStats.documented}/{eraStats.total} ({pct}%)
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
