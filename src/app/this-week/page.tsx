"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ArrowLeft, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { EraCompact } from "@/components/EraTimeline";
import { formatDate, formatAddress } from "@/lib/utils";

interface ThisWeekContract {
  address: string;
  name: string;
  shortDescription: string | null;
  eraId: string | null;
  deploymentDate: string | null;
  deploymentYear: number | null;
}

interface ThisWeekData {
  weekRange: string;
  contracts: ThisWeekContract[];
}

export default function ThisWeekPage() {
  const [data, setData] = useState<ThisWeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await fetch("/api/this-week");
        const json = await res.json();
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
        } else {
          setData(json.data);
        }
      } catch {
        if (!cancelled) setError("Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      <div className="relative py-8 md:py-12 overflow-hidden">
        <div className="absolute inset-0 gradient-radial opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-ether-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          {/* Title section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-7 h-7 text-ether-400" />
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                This Week in Ethereum History
              </h1>
            </div>
            {data?.weekRange && (
              <p className="text-obsidian-400 text-lg">
                Contracts deployed during{" "}
                <span className="text-obsidian-200 font-medium">
                  {data.weekRange}
                </span>{" "}
                in 2015-2017
              </p>
            )}
            {loading && (
              <div className="h-6 w-80 bg-obsidian-800 rounded animate-pulse mt-1" />
            )}
          </motion.div>

          {/* Content */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-52 rounded-xl bg-obsidian-900/30 border border-obsidian-800 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-12 text-center">
              <p className="text-obsidian-400">{error}</p>
            </div>
          ) : data && data.contracts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-12 text-center"
            >
              <Clock className="w-10 h-10 text-obsidian-600 mx-auto mb-4" />
              <p className="text-obsidian-400 mb-2">
                No contracts were deployed during this week in 2015-2017.
              </p>
              <p className="text-sm text-obsidian-500">
                Check back next week for a different slice of Ethereum history.
              </p>
            </motion.div>
          ) : data ? (
            <>
              <p className="text-sm text-obsidian-500 mb-4">
                {data.contracts.length} contract
                {data.contracts.length !== 1 ? "s" : ""} found
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.contracts.map((contract, index) => (
                  <motion.div
                    key={contract.address}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link
                      href={`/contract/${contract.address}`}
                      className="block rounded-xl border border-obsidian-800 bg-obsidian-900/50 hover:border-ether-500/30 p-5 transition-colors group"
                    >
                      {/* Top row: name + year badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-obsidian-100 group-hover:text-ether-400 transition-colors leading-tight line-clamp-2">
                          {contract.name}
                        </h3>
                        {contract.deploymentYear && (
                          <span className="text-xs px-2 py-1 rounded bg-ether-500/10 text-ether-400 font-medium shrink-0">
                            {contract.deploymentYear}
                          </span>
                        )}
                      </div>

                      {/* Era badge */}
                      {contract.eraId && (
                        <div className="mb-3">
                          <EraCompact eraId={contract.eraId} />
                        </div>
                      )}

                      {/* Description */}
                      {contract.shortDescription && (
                        <p className="text-sm text-obsidian-400 mb-3 line-clamp-3">
                          {contract.shortDescription.length > 120
                            ? contract.shortDescription.slice(0, 117) + "..."
                            : contract.shortDescription}
                        </p>
                      )}

                      {/* Bottom row: address + date */}
                      <div className="flex items-center justify-between text-xs text-obsidian-500">
                        <span className="font-mono">
                          {formatAddress(contract.address)}
                        </span>
                        {contract.deploymentDate && (
                          <span>{formatDate(contract.deploymentDate)}</span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
