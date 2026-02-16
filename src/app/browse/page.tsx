"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { ContractCard } from "@/components/ContractCard";
import { DocumentationProgress } from "@/components/DocumentationProgress";
import { Search, ArrowLeft, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { ERAS, CAPABILITY_CATEGORIES } from "@/types";
import { getContractTypeLabel } from "@/lib/utils";
import type { FeaturedContract } from "@/types";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;

interface BrowseContract {
  address: string;
  name: string;
  shortDescription: string | null;
  eraId: string | null;
  deploymentDate: string | null;
  contractType: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
}

function toFeaturedContract(c: BrowseContract): FeaturedContract {
  return {
    address: c.address,
    name: c.name,
    shortDescription: c.shortDescription || "Documented contract.",
    eraId: c.eraId || "frontier",
    deploymentDate: c.deploymentDate || "Unknown",
    significance: "",
  };
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const [contracts, setContracts] = useState<BrowseContract[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<string[]>([]);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const era = searchParams.get("era") || "";
  const year = searchParams.get("year") || "";
  const type = searchParams.get("type") || "";
  const q = searchParams.get("q") || "";
  const undocumented = searchParams.get("undocumented") === "1";
  const capabilities = searchParams.get("capabilities") || "";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/browse/types")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.data?.types) setTypeOptions(json.data.types);
      })
      .catch(() => {});
    fetch("/api/browse/capabilities")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.data?.categories) setAvailableCapabilities(json.data.categories);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (era) params.set("era", era);
    if (year) params.set("year", year);
    if (type) params.set("type", type);
    if (q.trim()) params.set("q", q.trim());
    if (undocumented) params.set("undocumented", "1");
    if (capabilities) params.set("capabilities", capabilities);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/browse?${params.toString()}`);
      const json = await res.json();
      const data = json?.data;
      if (data) {
        setContracts(data.contracts || []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
      }
    } catch {
      setContracts([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [era, year, type, q, undocumented, capabilities, page]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const setFilter = (key: "era" | "year" | "type" | "q" | "page" | "undocumented" | "capabilities", value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    window.history.replaceState(null, "", `?${next.toString()}`);
  };

  const toggleCapability = (slug: string) => {
    const current = capabilities ? capabilities.split(",").filter(Boolean) : [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setFilter("capabilities", next.join(","));
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="relative py-8 md:py-12 overflow-hidden">
        <div className="absolute inset-0 gradient-radial opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-ether-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Browse archived contracts
            </h1>
            <p className="text-obsidian-400">
              Find documented contracts for your research. Filter by era, type, or search in code.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row gap-4 mb-8"
          >
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-obsidian-400">Year</span>
                <select
                  value={year}
                  onChange={(e) => setFilter("year", e.target.value)}
                  className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ether-500/50 focus:border-ether-500/50"
                >
                  <option value="">All years</option>
                  <option value="2015">2015</option>
                  <option value="2016">2016</option>
                  <option value="2017">2017</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-obsidian-400">Era</span>
                <select
                  value={era}
                  onChange={(e) => setFilter("era", e.target.value)}
                  className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ether-500/50 focus:border-ether-500/50"
                >
                  <option value="">All eras</option>
                  {ERA_IDS.map((id) => (
                    <option key={id} value={id}>
                      {ERAS[id]?.name ?? id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-obsidian-400">Type</span>
                <select
                  value={type}
                  onChange={(e) => setFilter("type", e.target.value)}
                  className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ether-500/50 focus:border-ether-500/50"
                >
                  <option value="">All types</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {getContractTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-0">
                <span className="text-obsidian-400">Search in code</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-500" />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setFilter("q", e.target.value)}
                    placeholder="e.g. transfer, balanceOf"
                    className="w-full rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ether-500/50 focus:border-ether-500/50 placeholder:text-obsidian-500"
                  />
                </div>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter("undocumented", undocumented ? "" : "1")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
                  undocumented
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                    : "border-obsidian-700 bg-obsidian-900/80 text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100"
                }`}
              >
                {undocumented ? "✓ Undocumented only" : "Show undocumented"}
              </button>
            </div>
          </motion.div>

          {/* Capability Pills — grouped by Type / Standard / Token / Feature */}
          {availableCapabilities.length > 0 && (() => {
            const groups: Record<string, string[]> = {};
            for (const slug of availableCapabilities) {
              const cat = CAPABILITY_CATEGORIES[slug];
              if (!cat) continue;
              const g = cat.group;
              if (!groups[g]) groups[g] = [];
              groups[g].push(slug);
            }
            const groupOrder = ["Type", "Standard", "Token", "Feature"];
            const visibleGroups = groupOrder.filter((g) => groups[g]?.length);
            if (!visibleGroups.length) return null;

            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col gap-3 mb-8"
              >
                {visibleGroups.map((group) => (
                  <div key={group} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-obsidian-500 uppercase tracking-wider w-20 shrink-0">{group}</span>
                    {groups[group].map((slug) => {
                      const cat = CAPABILITY_CATEGORIES[slug]!;
                      const active = capabilities.split(",").includes(slug);
                      return (
                        <button
                          key={slug}
                          onClick={() => toggleCapability(slug)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            active
                              ? "bg-ether-500/20 border border-ether-500/40 text-ether-300"
                              : "bg-obsidian-900/80 border border-obsidian-700 text-obsidian-400 hover:text-obsidian-200 hover:border-obsidian-600"
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            );
          })()}

          {/* Documentation Progress */}
          <div className="mb-8">
            <DocumentationProgress variant="browse" filterEra={era || undefined} filterYear={year || undefined} />
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-obsidian-900/30 border border-obsidian-800 animate-pulse"
                />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-12 text-center">
              <p className="text-obsidian-400 mb-2">No documented contracts match your filters.</p>
              <p className="text-sm text-obsidian-500">
                Try changing era, type, or search in code.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-obsidian-500 mb-4">
                {total} contract{total !== 1 ? "s" : ""} found
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contracts.map((contract, index) => (
                  <motion.div
                    key={contract.address}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ContractCard
                      contract={toFeaturedContract(contract)}
                      variant="featured"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (() => {
                const prevParams = new URLSearchParams(searchParams.toString());
                prevParams.set("page", String(page - 1));
                const nextParams = new URLSearchParams(searchParams.toString());
                nextParams.set("page", String(page + 1));
                return (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    {page > 1 ? (
                      <Link
                        href={`?${prevParams.toString()}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-600 cursor-not-allowed">
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </span>
                    )}
                    <span className="px-3 py-2 text-sm text-obsidian-400">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages ? (
                      <Link
                        href={`?${nextParams.toString()}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100 transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-600 cursor-not-allowed">
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="h-8 w-48 bg-obsidian-800 rounded animate-pulse mb-8" />
          <div className="h-12 flex gap-4 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-obsidian-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
