"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Search, Code, FileCode, Loader2, X } from "lucide-react";
import { formatAddress, formatDate, getContractTypeLabel } from "@/lib/utils";
import { EraCompact } from "./EraTimeline";
import type { BytecodeSearchResult } from "@/types";

interface BytecodeSearchProps {
  onClose?: () => void;
  variant?: "standalone" | "embedded";
  autoFocus?: boolean;
}

export function BytecodeSearch({
  onClose,
  variant = "standalone",
  autoFocus = true,
}: BytecodeSearchProps) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "decompiled" | "bytecode">("decompiled");
  const [results, setResults] = useState<BytecodeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.length < 2) {
      setError("Search query must be at least 2 characters");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search/bytecode?q=${encodeURIComponent(query)}&type=${searchType}&limit=20`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.data || []);
      }
      setHasSearched(true);
    } catch (err) {
      setError("Failed to search. Please try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, searchType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape" && onClose) {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {variant === "standalone" && (
        <>
          {/* Search header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Code className="w-5 h-5 text-ether-400" />
              Search Decompiled Code
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-obsidian-800 rounded transition-colors"
              >
                <X className="w-5 h-5 text-obsidian-500" />
              </button>
            )}
          </div>
        </>
      )}

      {/* Search input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for function names, variables, patterns..."
              className="w-full pl-10 pr-4 py-3 bg-obsidian-800 border border-obsidian-700 rounded-lg text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-ether-500/50"
              autoFocus={autoFocus}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || query.length < 2}
            className="px-6 py-3 bg-ether-500 hover:bg-ether-600 disabled:bg-obsidian-700 disabled:text-obsidian-500 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>

        {/* Search type toggle */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-obsidian-500">Search in:</span>
          <div className="flex gap-2">
            {[
              { value: "decompiled", label: "Decompiled Code" },
              { value: "bytecode", label: "Raw Bytecode" },
              { value: "all", label: "All" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSearchType(option.value as typeof searchType)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  searchType === option.value
                    ? "bg-ether-500/20 text-ether-400 border border-ether-500/30"
                    : "bg-obsidian-800 text-obsidian-400 border border-obsidian-700 hover:border-obsidian-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {hasSearched && !error && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-obsidian-500">
              {results.length} {results.length === 1 ? "result" : "results"} found
            </span>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12 text-obsidian-500">
              <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No contracts found matching "{query}"</p>
              <p className="text-sm mt-2">
                Try searching for function names like "transfer", "balanceOf", or "owner"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <SearchResultCard key={result.address} result={result} query={query} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Example searches */}
      {!hasSearched && variant === "standalone" && (
        <div className="mt-8">
          <p className="text-sm text-obsidian-500 mb-3">Example searches:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "sendCoin",
              "balanceOf",
              "transfer",
              "selfdestruct",
              "caller",
              "storage",
              "payable",
            ].map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuery(example);
                  setSearchType("decompiled");
                }}
                className="px-3 py-1.5 text-sm bg-obsidian-800 hover:bg-obsidian-700 rounded-lg text-obsidian-400 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResultCard({
  result,
  query,
}: {
  result: BytecodeSearchResult;
  query: string;
}) {
  return (
    <Link
      href={`/contract/${result.address}`}
      className="block p-4 rounded-lg border border-obsidian-800 bg-obsidian-900/30 hover:border-obsidian-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Address and match type */}
          <div className="flex items-center gap-2 mb-2">
            <code className="text-sm font-mono text-obsidian-300">
              {formatAddress(result.address)}
            </code>
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${
                result.matchType === "function_name"
                  ? "bg-green-500/20 text-green-400"
                  : result.matchType === "decompiled"
                  ? "bg-ether-500/20 text-ether-400"
                  : "bg-obsidian-700 text-obsidian-400"
              }`}
            >
              {result.matchType === "function_name"
                ? "Function"
                : result.matchType === "decompiled"
                ? "Code"
                : "Bytecode"}
            </span>
            {result.heuristicContractType && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-obsidian-700 text-obsidian-400">
                {getContractTypeLabel(result.heuristicContractType)}
              </span>
            )}
          </div>

          {/* Match context */}
          <div className="font-mono text-xs bg-obsidian-900/50 p-2 rounded border border-obsidian-800 overflow-x-auto">
            <HighlightedMatch text={result.matchContext} query={query} />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs text-obsidian-500">
            {result.deploymentTimestamp && (
              <span>Deployed {formatDate(result.deploymentTimestamp)}</span>
            )}
            {result.eraId && <EraCompact eraId={result.eraId} />}
          </div>
        </div>
      </div>
    </Link>
  );
}

function HighlightedMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <span className="text-obsidian-400 whitespace-pre-wrap">{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let searchIndex = lowerText.indexOf(lowerQuery);

  while (searchIndex !== -1) {
    // Add text before match
    if (searchIndex > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-obsidian-400">
          {text.slice(lastIndex, searchIndex)}
        </span>
      );
    }

    // Add highlighted match
    parts.push(
      <span
        key={`match-${searchIndex}`}
        className="bg-yellow-500/30 text-yellow-200 rounded px-0.5"
      >
        {text.slice(searchIndex, searchIndex + query.length)}
      </span>
    );

    lastIndex = searchIndex + query.length;
    searchIndex = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="text-obsidian-400">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}
