"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowLeftRight } from "lucide-react";
import { formatAddress } from "@/lib/utils";
import { EraCompact } from "./EraTimeline";
import type { UnifiedSearchResult, UnifiedSearchResponse } from "@/types";

/**
 * Two-step search UI for the /compare page.
 * Lets users pick Contract A, then Contract B, then navigates to the comparison.
 * If `initialAddress` is provided (from ?a= query param), skips step 1.
 */
export function CompareSearch({ initialAddress }: { initialAddress?: string }) {
  const router = useRouter();
  const [addressA, setAddressA] = useState(initialAddress || "");
  const [addressB, setAddressB] = useState("");
  const step = addressA ? 2 : 1;

  function handleSelectA(address: string, title: string) {
    setAddressA(address);
  }

  function handleSelectB(address: string) {
    router.push(`/compare?a=${addressA}&b=${address}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 1 ? "bg-ether-500/20 text-ether-400 border border-ether-500/30" : "bg-obsidian-800 text-obsidian-400"}`}>
          <span className="w-5 h-5 rounded-full bg-ether-500/30 flex items-center justify-center text-xs font-bold">1</span>
          {addressA ? formatAddress(addressA, 6) : "First contract"}
        </div>
        <ArrowLeftRight className="w-4 h-4 text-obsidian-600" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 2 ? "bg-ether-500/20 text-ether-400 border border-ether-500/30" : "bg-obsidian-800 text-obsidian-500"}`}>
          <span className="w-5 h-5 rounded-full bg-obsidian-700 flex items-center justify-center text-xs font-bold">2</span>
          Second contract
        </div>
      </div>

      {step === 1 && (
        <ContractSearchField
          label="Search for the first contract"
          onSelect={handleSelectA}
          autoFocus
        />
      )}

      {step === 2 && (
        <>
          <div className="mb-4 text-center">
            <button
              onClick={() => setAddressA("")}
              className="text-xs text-obsidian-500 hover:text-ether-400 transition-colors"
            >
              &larr; Change first contract
            </button>
          </div>
          <ContractSearchField
            label="Search for the second contract"
            excludeAddress={addressA}
            onSelect={handleSelectB}
            autoFocus
          />
        </>
      )}
    </div>
  );
}

function ContractSearchField({
  label,
  excludeAddress,
  onSelect,
  autoFocus,
}: {
  label: string;
  excludeAddress?: string;
  onSelect: (address: string, title: string) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/unified?q=${encodeURIComponent(query.trim())}&page=1`);
        const json = await res.json();
        const data = json.data as UnifiedSearchResponse | undefined;
        const filtered = (data?.results || [])
          .filter((r) => r.entityType === "contract")
          .filter((r) => !excludeAddress || r.address.toLowerCase() !== excludeAddress.toLowerCase())
          .slice(0, 8);
        setResults(filtered);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, excludeAddress]);

  return (
    <div>
      <label className="block text-sm font-medium text-obsidian-300 mb-2">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, address, or keyword..."
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-obsidian-900/50 border border-obsidian-700 text-obsidian-100 placeholder:text-obsidian-500 outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20 transition-all"
          spellCheck={false}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-500 animate-spin" />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-2 rounded-xl border border-obsidian-800 bg-obsidian-900/80 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.address}
              onClick={() => onSelect(r.address, r.title)}
              className="w-full text-left px-4 py-3 hover:bg-obsidian-800/70 transition-colors border-b border-obsidian-800/50 last:border-b-0"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-obsidian-200 truncate">
                  {r.title}
                </span>
                {r.heuristicContractType && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-obsidian-800 text-obsidian-400">
                    {r.heuristicContractType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-obsidian-500">
                <code className="font-mono">{formatAddress(r.address, 8)}</code>
                {r.eraId && (
                  <>
                    <span className="text-obsidian-600">·</span>
                    <EraCompact eraId={r.eraId} showLabel={false} />
                  </>
                )}
                {r.deploymentTimestamp && (
                  <>
                    <span className="text-obsidian-600">·</span>
                    <span>{r.deploymentTimestamp.split("T")[0]}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !loading && results.length === 0 && (
        <div className="mt-2 rounded-xl border border-obsidian-800 bg-obsidian-900/30 px-4 py-6 text-center text-sm text-obsidian-500">
          No contracts found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
