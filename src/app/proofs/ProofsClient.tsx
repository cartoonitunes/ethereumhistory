"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { ProofContract } from "@/app/api/proofs/route";
import { formatAddress, formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const LANGUAGE_LABELS: Record<string, string> = {
  serpent: "Serpent",
  solidity: "Solidity",
  lll: "LLL",
  vyper: "Vyper",
};

const METHOD_LABELS: Record<string, string> = {
  exact_bytecode_match: "Exact bytecode match",
  author_published_source: "Author-published source",
  etherscan_verified: "Etherscan verified",
  near_exact_match: "Near-exact bytecode match",
};

function getMethodStyle(method: string) {
  switch (method) {
    case "exact_bytecode_match":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "author_published_source":
    case "etherscan_verified":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "near_exact_match":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-obsidian-700 text-obsidian-300 border-obsidian-600";
  }
}

function getLanguageStyle(language: string) {
  switch (language) {
    case "serpent":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "solidity":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "lll":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "vyper":
      return "bg-teal-500/15 text-teal-400 border-teal-500/30";
    default:
      return "bg-obsidian-700 text-obsidian-300 border-obsidian-600";
  }
}

function ContractCard({ contract }: { contract: ProofContract }) {
  const name =
    contract.name || formatAddress(contract.address);
  const deploymentDate = contract.deploymentTimestamp
    ? formatDate(contract.deploymentTimestamp)
    : "Unknown";
  const languageLabel = contract.compilerLanguage
    ? LANGUAGE_LABELS[contract.compilerLanguage] || contract.compilerLanguage
    : null;
  const methodLabel = contract.verificationMethod
    ? METHOD_LABELS[contract.verificationMethod] || contract.verificationMethod
    : null;

  return (
    <Link
      href={`/contract/${contract.address}`}
      className="block p-5 rounded-xl border border-obsidian-800 bg-obsidian-900/30 hover:border-obsidian-700 hover:bg-obsidian-900/50 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-obsidian-100 truncate">
              {name}
            </h2>
            {contract.siblingCount > 0 && (
              <span className="flex-none rounded-full border border-obsidian-700 bg-obsidian-800 px-2 py-0.5 text-xs font-mono text-obsidian-400">
                ×{contract.siblingCount + 1}
              </span>
            )}
          </div>
          <p className="text-xs text-obsidian-500 font-mono mb-2">
            {contract.address}
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-obsidian-400">{deploymentDate}</span>
            {languageLabel && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLanguageStyle(contract.compilerLanguage!)}`}
              >
                {languageLabel}
              </span>
            )}
            {contract.compilerVersion && (
              <span className="text-xs text-obsidian-500">
                {contract.compilerVersion}
              </span>
            )}
            {contract.compilerCommit && (
              <span className="text-xs text-obsidian-500 font-mono">
                {contract.compilerCommit.slice(0, 7)}
              </span>
            )}
            {methodLabel && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getMethodStyle(contract.verificationMethod!)}`}
              >
                {methodLabel}
              </span>
            )}
          </div>
          {contract.verificationNotes && (
            <p className="text-xs text-obsidian-400 line-clamp-2">
              {contract.verificationNotes}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

interface Props {
  initialContracts: ProofContract[];
  initialTotal: number;
  initialHasMore: boolean;
}

export function ProofsClient({ initialContracts, initialTotal, initialHasMore }: Props) {
  const [contracts, setContracts] = useState<ProofContract[]>(initialContracts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialContracts.length);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/proofs?cursor=${cursor}&limit=${PAGE_SIZE}`);
      if (!res.ok) return;
      const data = await res.json();
      setContracts((prev) => [...prev, ...data.contracts]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch {
      // silent — retry on next scroll
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <p className="text-sm text-obsidian-500 mb-6">
        {initialTotal} {initialTotal === 1 ? "proof" : "proofs"}
      </p>

      {contracts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-obsidian-500">No verification proofs yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((c) => (
            <ContractCard key={c.address} contract={c} />
          ))}
        </div>
      )}

      {/* Sentinel — triggers next load when it scrolls into view */}
      <div ref={sentinelRef} className="py-4 flex justify-center">
        {loading && (
          <span className="text-sm text-obsidian-500 animate-pulse">Loading…</span>
        )}
        {!hasMore && contracts.length > 0 && (
          <span className="text-xs text-obsidian-600">All {initialTotal} proofs loaded</span>
        )}
      </div>
    </>
  );
}
