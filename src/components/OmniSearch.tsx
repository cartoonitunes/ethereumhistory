"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ArrowRight, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import type { UnifiedSearchResponse, UnifiedSearchResult } from "@/types";
import { formatAddress, formatDate, getContractTypeLabel, isValidAddress } from "@/lib/utils";
import { useTrackEvent } from "@/lib/useAnalytics";
import { EraCompact } from "./EraTimeline";

export function OmniSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackEvent = useTrackEvent();

  const qParam = (searchParams.get("q") || "").trim();
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [input, setInput] = useState(qParam);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"Loading" | "Analyzing" | "Documenting" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UnifiedSearchResponse | null>(null);

  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const stageTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Staged loading label for long-running operations
  useEffect(() => {
    // Clear any prior timers
    for (const t of stageTimers.current) clearTimeout(t);
    stageTimers.current = [];

    if (!loading) {
      setLoadingStage(null);
      return;
    }

    setLoadingStage("Loading");
    stageTimers.current.push(setTimeout(() => setLoadingStage("Analyzing"), 700));
    stageTimers.current.push(setTimeout(() => setLoadingStage("Documenting"), 1600));

    return () => {
      for (const t of stageTimers.current) clearTimeout(t);
      stageTimers.current = [];
    };
  }, [loading]);

  // Keep input in sync when navigating back/forward
  useEffect(() => {
    setInput(qParam);
  }, [qParam]);

  const canSearch = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    if (isValidAddress(trimmed)) return true;
    return trimmed.length >= 2;
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!qParam) {
        setData(null);
        setError(null);
        return;
      }

      const cacheKey = `unifiedSearch:${qParam.toLowerCase()}:p${page}`;

      // Fast path: restore cached results on back/forward without refetching
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { savedAt: number; data: UnifiedSearchResponse };
          if (parsed?.data && typeof parsed.savedAt === "number") {
            const age = Date.now() - parsed.savedAt;
            if (age >= 0 && age < CACHE_TTL_MS) {
              setData(parsed.data);
              setError(null);
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // ignore cache errors
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search/unified?q=${encodeURIComponent(qParam)}&page=${page}`);
        const json = await res.json();
        if (cancelled) return;

        if (json?.error) {
          setError(String(json.error));
          setData(null);
        } else {
          const next = json.data as UnifiedSearchResponse;
          setData(next);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data: next }));
          } catch {
            // ignore quota / privacy mode
          }
        }
      } catch {
        if (cancelled) return;
        setError("Failed to search. Please try again.");
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [qParam, page]);

  function pushSearch(nextQuery: string, nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", nextQuery);
    params.set("page", String(nextPage));
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isValidAddress(trimmed)) {
      // Contract page may do on-demand ingestion; show a staged loading state.
      setError(null);
      setLoading(true);
      router.push(`/contract/${trimmed.toLowerCase()}`);
      return;
    }

    if (trimmed.length < 2) {
      setError("Search query must be at least 2 characters.");
      return;
    }

    trackEvent({ eventType: "search", pagePath: "/", eventData: { query: trimmed } });
    pushSearch(trimmed, 1);
  }

  const results = data?.results || [];
  const hasMore = !!data?.hasMore;

  return (
    <div className="w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={`
            relative flex items-center
            bg-obsidian-900/50 border border-obsidian-700
            rounded-xl overflow-hidden
            transition-all duration-200
            focus-within:border-ether-500/50 focus-within:ring-2 focus-within:ring-ether-500/20
            h-12 sm:h-16
          `}
        >
          <div className="pl-3 pr-2 sm:pl-4 sm:pr-3">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-obsidian-500" />
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder="Address (0x…) or keyword…"
            className="flex-1 bg-transparent border-none outline-none text-base sm:text-lg text-obsidian-100 placeholder:text-obsidian-400 placeholder:font-sans"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            disabled={loading}
          />

          <motion.button
            type="submit"
            disabled={loading || !canSearch}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 bg-ether-600 hover:bg-ether-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-9 sm:h-12 px-3 sm:px-6 mr-2 rounded-lg min-w-[44px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="hidden sm:inline text-base">
              {loading ? loadingStage || "Loading" : "Search"}
            </span>
          </motion.button>
        </div>
      </form>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

      {qParam && !error && (
        <div className="mt-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="text-sm text-obsidian-500">
              {loading ? "Searching…" : `${results.length} result${results.length === 1 ? "" : "s"} (page ${page})`}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => pushSearch(qParam, page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/30 text-sm text-obsidian-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => pushSearch(qParam, page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/30 text-sm text-obsidian-300 disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {results.length === 0 && !loading ? (
            <div className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30 text-obsidian-500">
              No matches found for “{qParam}”.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <SearchResultRow key={`${r.address}-${r.matchType}`} result={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultRow({ result }: { result: UnifiedSearchResult }) {
  const matchLabel = labelForMatchType(result.matchType);
  const typeLabel = result.heuristicContractType
    ? getContractTypeLabel(result.heuristicContractType)
    : null;

  // Avoid redundant badges like "Token" + "Token"
  const showTypeBadge =
    !!typeLabel &&
    typeLabel.toLowerCase() !== matchLabel.toLowerCase();

  const href =
    result.entityType === "person" && result.personSlug
      ? `/people/${result.personSlug}`
      : `/contract/${result.address}`;

  return (
    <Link
      href={href}
      className="block p-4 rounded-xl border border-obsidian-800 bg-obsidian-900/30 hover:border-obsidian-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="font-medium text-obsidian-100 truncate">{result.title}</div>
            <span className="px-2 py-0.5 text-xs rounded bg-obsidian-800 text-obsidian-400">
              {matchLabel}
            </span>
            {result.entityType === "person" ? (
              <span className="px-2 py-0.5 text-xs rounded bg-ether-500/20 text-ether-300 border border-ether-500/30">
                Person
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 text-xs rounded ${badgeForVerification(
                  result.verificationStatus || "bytecode_only"
                )}`}
              >
                {result.verificationStatus === "verified"
                  ? "Verified"
                  : result.verificationStatus === "decompiled"
                  ? "Decompiled"
                  : "Bytecode"}
              </span>
            )}
            {showTypeBadge && (
              <span className="px-2 py-0.5 text-xs rounded bg-obsidian-800 text-obsidian-400">
                {typeLabel}
              </span>
            )}
          </div>

          {result.subtitle && <div className="text-sm text-obsidian-400 mb-2">{result.subtitle}</div>}

          <div className="flex items-center gap-3 text-xs text-obsidian-500">
            {result.entityType === "contract" ? (
              <>
                <code className="font-mono">{formatAddress(result.address, 10)}</code>
                {result.eraId && <EraCompact eraId={result.eraId} />}
                {result.deploymentTimestamp && (
                  <span>Deployed {formatDate(result.deploymentTimestamp)}</span>
                )}
              </>
            ) : (
              <code className="font-mono">{formatAddress(result.address, 10)}</code>
            )}
          </div>

          {result.matchSnippet && (
            <div className="mt-3 text-xs text-obsidian-400 font-mono bg-obsidian-900/50 border border-obsidian-800 rounded-lg p-2 overflow-x-auto">
              {result.matchSnippet}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function labelForMatchType(type: UnifiedSearchResult["matchType"]): string {
  switch (type) {
    case "address":
      return "Address";
    case "contract_name":
      return "Contract name";
    case "token_name":
      return "Token name";
    case "token_symbol":
      return "Ticker";
    case "decompiled_code":
      return "Decompiled code";
    case "source_code":
      return "Source";
    case "abi":
      return "ABI";
    case "person_name":
      return "Person";
    case "person_wallet":
      return "Wallet";
    default:
      return "Match";
  }
}

function badgeForVerification(status: UnifiedSearchResult["verificationStatus"]): string {
  switch (status) {
    case "verified":
      return "text-green-400 bg-green-400/10";
    case "decompiled":
      return "text-blue-400 bg-blue-400/10";
    case "partial":
      return "text-yellow-400 bg-yellow-400/10";
    default:
      return "text-gray-400 bg-gray-400/10";
  }
}

