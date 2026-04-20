"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { EraCompact } from "@/components/EraTimeline";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  User,
} from "lucide-react";
import {
  formatAddress,
  formatBytes,
  formatBlockNumber,
  copyToClipboard,
  etherscanUrl,
} from "@/lib/utils";
import { ERAS } from "@/types";
import type { Person } from "@/types";

interface DeployerContract {
  address: string;
  blockNumber: number;
  deploymentDate: string | null;
  bytecodeHash: string | null;
  codeSizeBytes: number;
  era: string;
  year: number;
  isInternal: boolean;
  gasUsed: number | null;
}

interface DeployerData {
  deployer: string;
  contracts: DeployerContract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  address: string;
  person: Person | null;
}

const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;

export function DeployerPageClient({ address, person }: Props) {
  const [data, setData] = useState<DeployerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [era, setEra] = useState("");
  const [sort, setSort] = useState("block_asc");
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("sort", sort);
    if (era) params.set("era", era);
    try {
      const res = await fetch(`/api/deployer/${address}?${params.toString()}`);
      const json = await res.json();
      if (json?.data) setData(json.data);
      else setError(json?.error || "Failed to load deployer data.");
    } catch {
      setError("Failed to load deployer data.");
    } finally {
      setLoading(false);
    }
  }, [address, page, sort, era]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(address);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // Group by bytecodeHash for family summary
  const familySummary = data
    ? Object.entries(
        data.contracts.reduce<Record<string, number>>((acc, c) => {
          const key = c.bytecodeHash || "__unique__";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      )
        .filter(([k, v]) => k !== "__unique__" && v > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

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

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* Header */}
            <div className="mb-6">
              {person ? (
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-ether-500/20 border border-ether-500/30 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-ether-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/people/${person.slug}`}
                        className="text-xl font-bold text-obsidian-100 hover:text-ether-300 transition-colors"
                      >
                        {person.name}
                      </Link>
                      {person.role && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-obsidian-700/60 border border-obsidian-600 text-obsidian-400">
                          {person.role}
                        </span>
                      )}
                    </div>
                    {person.shortBio && (
                      <p className="text-sm text-obsidian-400">{person.shortBio}</p>
                    )}
                  </div>
                </div>
              ) : (
                <h1 className="text-xl font-bold text-obsidian-200 mb-2">Deployer</h1>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono text-sm text-obsidian-300 bg-obsidian-900/60 border border-obsidian-800 rounded-lg px-3 py-1.5">
                  {address}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-ether-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={etherscanUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-obsidian-400 hover:text-ether-400 hover:bg-obsidian-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Stats row */}
            {data && (
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 px-5 py-3">
                  <div className="text-xl font-bold text-obsidian-100">{data.total.toLocaleString()}</div>
                  <div className="text-xs text-obsidian-500">total deployments</div>
                </div>
                {familySummary.length > 0 && (
                  <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 px-5 py-3">
                    <div className="text-xl font-bold text-obsidian-100">{familySummary.length}+</div>
                    <div className="text-xs text-obsidian-500">repeated bytecodes</div>
                  </div>
                )}
              </div>
            )}

            {/* Bytecode family summary */}
            {familySummary.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-obsidian-400 uppercase tracking-wider mb-3">Repeated Bytecodes (this page)</h2>
                <div className="flex flex-wrap gap-2">
                  {familySummary.map(([hash, count]) => (
                    <div
                      key={hash}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-obsidian-700 bg-obsidian-900/50 text-xs text-obsidian-400"
                    >
                      <span className="font-mono">{hash.slice(0, 10)}…</span>
                      <span className="bg-obsidian-700 rounded-full px-1.5 py-0.5 text-obsidian-300">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-obsidian-400">Era</span>
                <select
                  value={era}
                  onChange={(e) => { setEra(e.target.value); setPage(1); }}
                  className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50"
                >
                  <option value="">All eras</option>
                  {ERA_IDS.map((id) => (<option key={id} value={id}>{ERAS[id]?.name ?? id}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-obsidian-400">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 text-obsidian-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ether-500/50"
                >
                  <option value="block_asc">Oldest first</option>
                  <option value="block_desc">Newest first</option>
                  <option value="size_desc">Largest code</option>
                  <option value="size_asc">Smallest code</option>
                </select>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-red-400 mb-6">{error}</div>
            )}

            {/* Contract list */}
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-obsidian-900/30 border border-obsidian-800 animate-pulse" />
                ))}
              </div>
            ) : data && data.contracts.length === 0 ? (
              <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-12 text-center">
                <p className="text-obsidian-400">No contracts found for this deployer.</p>
              </div>
            ) : data ? (
              <>
                <p className="text-sm text-obsidian-500 mb-3">
                  Showing {((page - 1) * data.limit + 1).toLocaleString()}–{Math.min(page * data.limit, data.total).toLocaleString()} of {data.total.toLocaleString()}
                </p>
                <div className="flex flex-col gap-2">
                  {data.contracts.map((contract, index) => (
                    <motion.div
                      key={contract.address}
                      initial={{ opacity: 0, y: 6 }}
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
                              <span className="capitalize">{ERAS[contract.era]?.name ?? contract.era}</span>
                            )}
                            {contract.deploymentDate && <span>{contract.deploymentDate}</span>}
                            {contract.blockNumber && (
                              <span className="font-mono">#{formatBlockNumber(contract.blockNumber)}</span>
                            )}
                            {contract.codeSizeBytes > 0 && <span>{formatBytes(contract.codeSizeBytes)}</span>}
                            {contract.isInternal && (
                              <span className="text-obsidian-600">internal</span>
                            )}
                          </div>
                        </div>
                        {contract.bytecodeHash && (
                          <div className="font-mono text-xs text-obsidian-600 shrink-0 hidden md:block" title={contract.bytecodeHash}>
                            {contract.bytecodeHash.slice(0, 10)}…
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100 transition-colors disabled:text-obsidian-600 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-obsidian-400">
                      Page {page} of {data.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                      disabled={page >= data.totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100 transition-colors disabled:text-obsidian-600 disabled:cursor-not-allowed"
                    >
                      Next<ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : null}

          </motion.div>
        </div>
      </div>
    </div>
  );
}
