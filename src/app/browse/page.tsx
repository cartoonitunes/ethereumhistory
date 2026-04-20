"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ContractCard } from "@/components/ContractCard";
import { DocumentationProgress } from "@/components/DocumentationProgress";
import { Search, ArrowLeft, ChevronLeft, ChevronRight, Check, Filter, Database, BookOpen } from "lucide-react";
import { ERAS, CAPABILITY_CATEGORIES } from "@/types";
import { getContractTypeLabel, formatAddress, formatBytes } from "@/lib/utils";
import type { FeaturedContract } from "@/types";

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;

// ─── Documented/undocumented (Neon) ────────────────────────────────────────

interface BrowseContract {
  address: string;
  name: string;
  shortDescription: string | null;
  eraId: string | null;
  deploymentDate: string | null;
  contractType: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  deploymentRank?: number | null;
  codeSizeBytes?: number | null;
  deployStatus?: string | null;
}

function toFeaturedContract(c: BrowseContract): FeaturedContract & { tokenName: string | null; deploymentRank: number | null; codeSizeBytes: number | null; deployStatus: string | null } {
  return {
    address: c.address,
    name: c.name,
    shortDescription: c.shortDescription || "Documented contract.",
    eraId: c.eraId || "frontier",
    deploymentDate: c.deploymentDate || "Unknown",
    significance: "",
    tokenName: c.tokenName,
    deploymentRank: c.deploymentRank ?? null,
    codeSizeBytes: c.codeSizeBytes ?? null,
    deployStatus: c.deployStatus ?? null,
  };
}

// ─── Index (Turso) ──────────────────────────────────────────────────────────

interface IndexContract {
  address: string;
  deployer: string;
  blockNumber: number;
  deploymentDate: string | null;
  bytecodeHash: string | null;
  codeSizeBytes: number;
  era: string;
  year: number;
  isInternal: boolean;
}

function indexToFeaturedContract(c: IndexContract): FeaturedContract & { tokenName: string | null; deploymentRank: number | null; codeSizeBytes: number | null; deployStatus: string | null } {
  return {
    address: c.address,
    name: formatAddress(c.address, 8),
    shortDescription: "",
    eraId: c.era || "frontier",
    deploymentDate: c.deploymentDate || "Unknown",
    significance: "",
    tokenName: null,
    deploymentRank: null,
    codeSizeBytes: c.codeSizeBytes ?? null,
    deployStatus: null,
  };
}

// ─── Main browse content ────────────────────────────────────────────────────

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // If the query is an exact Ethereum address, redirect to the contract page
  const rawQ = searchParams.get("q") || "";
  useEffect(() => {
    if (/^0x[0-9a-fA-F]{40}$/i.test(rawQ.trim())) {
      router.replace(`/contract/${rawQ.trim().toLowerCase()}`);
    }
  }, [rawQ, router]);

  // Mode: "documented" (Neon) vs "index" (Turso)
  const mode = (searchParams.get("mode") || "documented") as "documented" | "index";

  const [contracts, setContracts] = useState<BrowseContract[] | IndexContract[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const era = searchParams.get("era") || "";
  const year = searchParams.get("year") || "";
  const type = searchParams.get("type") || "";
  const q = searchParams.get("q") || "";
  const undocumented = searchParams.get("undocumented") === "1";
  const capabilities = searchParams.get("capabilities") || "";
  const verification = searchParams.get("verification") || "";
  const registrar = searchParams.get("registrar") || "";
  const sort = searchParams.get("sort") || "";
  const selfDestructed = searchParams.get("self_destructed") || "";
  // Index-specific filters
  const deployer = searchParams.get("deployer") || "";
  const minSize = searchParams.get("min_size") || "";
  const maxSize = searchParams.get("max_size") || "";

  useEffect(() => {
    if (mode === "documented") {
      let cancelled = false;
      fetch("/api/browse/types")
        .then((res) => res.json())
        .then((json) => { if (!cancelled && json?.data?.types) setTypeOptions(json.data.types); })
        .catch(() => {});
      fetch("/api/browse/capabilities")
        .then((res) => res.json())
        .then((json) => { if (!cancelled && json?.data?.categories) setAvailableCapabilities(json.data.categories); })
        .catch(() => {});
      return () => { cancelled = true; };
    }
  }, [mode]);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "index") {
        const params = new URLSearchParams();
        params.set("source", "index");
        if (era) params.set("era", era);
        if (year) params.set("year", year);
        if (deployer) params.set("deployer", deployer);
        if (minSize) params.set("min_size", minSize);
        if (maxSize) params.set("max_size", maxSize);
        if (sort) params.set("sort", sort);
        params.set("page", String(page));
        const res = await fetch(`/api/browse?${params.toString()}`);
        const json = await res.json();
        const d = json?.data;
        if (d) {
          setContracts(d.contracts || []);
          setTotal(d.total ?? 0);
          setTotalPages(d.totalPages ?? 0);
        }
      } else {
        const params = new URLSearchParams();
        if (era) params.set("era", era);
        if (year) params.set("year", year);
        if (type) params.set("type", type);
        if (q.trim()) params.set("q", q.trim());
        if (undocumented) params.set("undocumented", "1");
        if (registrar) params.set("registrar", registrar);
        if (capabilities) params.set("capabilities", capabilities);
        if (verification) params.set("verification", verification);
        if (sort) params.set("sort", sort);
        if (selfDestructed) params.set("self_destructed", selfDestructed);
        params.set("page", String(page));
        const res = await fetch(`/api/browse?${params.toString()}`);
        const json = await res.json();
        const d = json?.data;
        if (d) {
          setContracts(d.contracts || []);
          setTotal(d.total ?? 0);
          setTotalPages(d.totalPages ?? 0);
        }
      }
    } catch {
      setContracts([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [mode, era, year, type, q, undocumented, capabilities, verification, registrar, sort, selfDestructed, deployer, minSize, maxSize, page]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    window.history.replaceState(null, "", `?${next.toString()}`);
  };

  const setMode = (newMode: "documented" | "index") => {
    const next = new URLSearchParams();
    next.set("mode", newMode);
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
            className="mb-6"
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Browse archived contracts
            </h1>
            <p className="text-obsidian-400">
              Find documented contracts for your research. Filter by era, type, or search in code.
            </p>
          </motion.div>

          {/* Mode tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-obsidian-900/60 border border-obsidian-800 w-fit mb-6">
            <button
              onClick={() => setMode("documented")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "documented"
                  ? "bg-ether-500/20 text-ether-300 border border-ether-500/30"
                  : "text-obsidian-400 hover:text-obsidian-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Documented
            </button>
            <button
              onClick={() => setMode("index")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "index"
                  ? "bg-obsidian-700/60 text-obsidian-100 border border-obsidian-600"
                  : "text-obsidian-400 hover:text-obsidian-200"
              }`}
            >
              <Database className="w-4 h-4" />
              All Contracts
            </button>
          </div>

          {/* Documentation Progress (documented mode only) */}
          {mode === "documented" && (
            <div className="mb-6">
              <DocumentationProgress variant="browse" filterEra={era || undefined} filterYear={year || undefined} />
            </div>
          )}

          {/* Index mode total count banner */}
          {mode === "index" && !loading && total > 0 && (
            <div className="mb-4 text-sm text-obsidian-400">
              Showing{" "}
              <span className="text-obsidian-200 font-medium">{total.toLocaleString()}</span>{" "}
              contracts from the full on-chain index
            </div>
          )}

          {/* Search + filters */}
          {(() => {
            if (mode === "index") {
              // Index mode filters
              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="mb-4"
                >
                  <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-5 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3">
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-obsidian-400">Era</span>
                        <select value={era} onChange={(e) => setFilter("era", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                          <option value="">All eras</option>
                          {ERA_IDS.map((id) => (<option key={id} value={id}>{ERAS[id]?.name ?? id}</option>))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-obsidian-400">Year</span>
                        <select value={year} onChange={(e) => setFilter("year", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                          <option value="">All years</option>
                          <option value="2015">2015</option>
                          <option value="2016">2016</option>
                          <option value="2017">2017</option>
                          <option value="2018">2018</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-obsidian-400">Sort</span>
                        <select value={sort} onChange={(e) => setFilter("sort", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                          <option value="">Oldest first</option>
                          <option value="block_desc">Newest first</option>
                          <option value="size_desc">Largest code</option>
                          <option value="size_asc">Smallest code</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-48">
                        <span className="text-obsidian-400">Deployer address</span>
                        <input
                          type="text"
                          value={deployer}
                          onChange={(e) => setFilter("deployer", e.target.value)}
                          placeholder="0x..."
                          className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50 placeholder:text-obsidian-500 font-mono text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm w-28">
                        <span className="text-obsidian-400">Min size (bytes)</span>
                        <input
                          type="number"
                          value={minSize}
                          onChange={(e) => setFilter("min_size", e.target.value)}
                          placeholder="0"
                          min={0}
                          className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm w-28">
                        <span className="text-obsidian-400">Max size (bytes)</span>
                        <input
                          type="number"
                          value={maxSize}
                          onChange={(e) => setFilter("max_size", e.target.value)}
                          placeholder="24576"
                          min={0}
                          className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50"
                        />
                      </label>
                    </div>
                  </div>
                </motion.div>
              );
            }

            // Documented mode filters
            const activeFilterCount = [
              era, year, type, verification, sort, selfDestructed, registrar,
              undocumented ? "1" : "",
              capabilities ? "1" : "",
            ].filter(Boolean).length;

            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-4"
              >
                <div className="flex gap-3 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-500" />
                    <input
                      type="search"
                      value={q}
                      onChange={(e) => setFilter("q", e.target.value)}
                      placeholder="Search contracts, names, code..."
                      className="w-full rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ether-500/50 focus:border-ether-500/50 placeholder:text-obsidian-500"
                    />
                  </div>
                  <button
                    onClick={() => setFiltersOpen((v) => !v)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                      filtersOpen || activeFilterCount > 0
                        ? "bg-ether-500/10 border-ether-500/30 text-ether-300 hover:bg-ether-500/20"
                        : "border-obsidian-700 bg-obsidian-900/80 text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-ether-500 text-white text-xs font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {filtersOpen && (
                    <motion.div
                      key="filter-panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-5 mb-3 flex flex-col gap-5">
                        <div className="flex flex-wrap gap-3">
                          <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-obsidian-400">Year</span>
                            <select value={year} onChange={(e) => setFilter("year", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                              <option value="">All years</option>
                              <option value="2015">2015</option>
                              <option value="2016">2016</option>
                              <option value="2017">2017</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-obsidian-400">Era</span>
                            <select value={era} onChange={(e) => setFilter("era", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                              <option value="">All eras</option>
                              {ERA_IDS.map((id) => (<option key={id} value={id}>{ERAS[id]?.name ?? id}</option>))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-obsidian-400">Type</span>
                            <select value={type} onChange={(e) => setFilter("type", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                              <option value="">All types</option>
                              {typeOptions.map((t) => (<option key={t} value={t}>{getContractTypeLabel(t)}</option>))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-obsidian-400">Verification</span>
                            <select value={verification} onChange={(e) => setFilter("verification", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                              <option value="">All</option>
                              <option value="unverified">Unverified</option>
                              <option value="etherscan">Etherscan only</option>
                              <option value="proof">Has proof</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-obsidian-400">Status</span>
                            <select value={selfDestructed} onChange={(e) => setFilter("self_destructed", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                              <option value="">All contracts</option>
                              <option value="0">Live only</option>
                              <option value="1">Self-destructed only</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-obsidian-400">Sort</span>
                            <select value={sort} onChange={(e) => setFilter("sort", e.target.value)} className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50">
                              <option value="">Oldest first</option>
                              <option value="newest">Newest first</option>
                              <option value="most_active">Most active</option>
                            </select>
                          </label>
                          <div className="flex items-end">
                            <button
                              onClick={() => setFilter("undocumented", undocumented ? "" : "1")}
                              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${undocumented ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "border-obsidian-700 bg-obsidian-900/80 text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100"}`}
                            >
                              {undocumented ? "✓ Undocumented only" : "Show undocumented"}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs text-obsidian-500 font-medium uppercase tracking-wider">Named in</span>
                          {([
                            { value: "any", label: "Any Registrar" },
                            { value: "GlobalRegistrar", label: "Frontier GlobalRegistrar" },
                            { value: "LinageeRegistrar", label: "Linagee Registrar" },
                            { value: "NameRegistry", label: "NameRegistry" },
                          ] as const).map(({ value, label }) => (
                            <button key={value} onClick={() => setFilter("registrar", registrar === value ? "" : value)}
                              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${registrar === value ? "bg-amber-900/40 border-amber-700/40 text-amber-400" : "border-obsidian-700 bg-obsidian-900/50 text-obsidian-400 hover:text-amber-400 hover:border-amber-700/40"}`}>
                              {registrar === value ? "✓ " : ""}{label}
                            </button>
                          ))}
                        </div>

                        {availableCapabilities.length > 0 && (() => {
                          const groups: Record<string, string[]> = {};
                          for (const slug of availableCapabilities) {
                            const cat = CAPABILITY_CATEGORIES[slug];
                            if (!cat) continue;
                            if (!groups[cat.group]) groups[cat.group] = [];
                            groups[cat.group].push(slug);
                          }
                          const visibleGroups = ["Type", "Standard", "Token", "Feature"].filter((g) => groups[g]?.length);
                          if (!visibleGroups.length) return null;
                          return (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-obsidian-300">Capabilities</span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">Beta</span>
                              </div>
                              {visibleGroups.map((group) => (
                                <div key={group} className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-obsidian-500 uppercase tracking-wider w-20 shrink-0">{group}</span>
                                  {groups[group].map((slug) => {
                                    const cat = CAPABILITY_CATEGORIES[slug]!;
                                    const active = capabilities.split(",").includes(slug);
                                    return (
                                      <button key={slug} onClick={() => toggleCapability(slug)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-ether-500/20 border border-ether-500/40 text-ether-300" : "bg-obsidian-900/80 border border-obsidian-700 text-obsidian-400 hover:text-obsidian-200 hover:border-obsidian-600"}`}>
                                        {active && <Check className="w-3 h-3" />}
                                        {cat.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })()}

          {/* Results */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-obsidian-900/30 border border-obsidian-800 animate-pulse" />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-12 text-center">
              <p className="text-obsidian-400 mb-2">
                {mode === "index"
                  ? "No contracts match your filters in the index."
                  : "No documented contracts match your filters."}
              </p>
              <p className="text-sm text-obsidian-500">Try changing era, type, or filters.</p>
            </div>
          ) : (
            <>
              {mode !== "index" && (
                <p className="text-sm text-obsidian-500 mb-4">
                  {total} contract{total !== 1 ? "s" : ""} found
                </p>
              )}

              {mode === "index" ? (
                // Index mode: compact list
                <div className="flex flex-col gap-2">
                  {(contracts as IndexContract[]).map((contract, index) => (
                    <motion.div
                      key={contract.address}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Link
                        href={`/contract/${contract.address}`}
                        className="flex items-center gap-4 px-4 py-3 rounded-xl border border-obsidian-800 bg-obsidian-900/30 hover:bg-obsidian-900/60 hover:border-obsidian-700 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-obsidian-200 group-hover:text-ether-300 transition-colors truncate">
                            {contract.address}
                          </div>
                          <div className="text-xs text-obsidian-500 mt-0.5 flex items-center gap-3 flex-wrap">
                            {contract.era && (
                              <span className="capitalize">{contract.era}</span>
                            )}
                            {contract.deploymentDate && (
                              <span>{contract.deploymentDate}</span>
                            )}
                            {contract.codeSizeBytes > 0 && (
                              <span>{formatBytes(contract.codeSizeBytes)}</span>
                            )}
                            {contract.isInternal && (
                              <span className="text-obsidian-600">internal</span>
                            )}
                          </div>
                        </div>
                        {contract.deployer && (
                          <div className="font-mono text-xs text-obsidian-500 shrink-0 hidden sm:block">
                            {formatAddress(contract.deployer, 6)}
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(contracts as BrowseContract[]).map((contract, index) => (
                    <motion.div
                      key={contract.address}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <ContractCard contract={toFeaturedContract(contract)} variant="featured" />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (() => {
                const prevParams = new URLSearchParams(searchParams.toString());
                prevParams.set("page", String(page - 1));
                const nextParams = new URLSearchParams(searchParams.toString());
                nextParams.set("page", String(page + 1));
                return (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    {page > 1 ? (
                      <Link href={`?${prevParams.toString()}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100 transition-colors">
                        <ChevronLeft className="w-4 h-4" />Previous
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-600 cursor-not-allowed">
                        <ChevronLeft className="w-4 h-4" />Previous
                      </span>
                    )}
                    <span className="px-3 py-2 text-sm text-obsidian-400">Page {page} of {totalPages}</span>
                    {page < totalPages ? (
                      <Link href={`?${nextParams.toString()}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100 transition-colors">
                        Next<ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-600 cursor-not-allowed">
                        Next<ChevronRight className="w-4 h-4" />
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
