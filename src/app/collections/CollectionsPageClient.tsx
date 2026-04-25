"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Archive, ExternalLink } from "lucide-react";
import { formatAddress } from "@/lib/utils";
import type { CollectionSummary } from "@/lib/db/collections";

const COLLECTION_GRADIENTS = [
  "from-ether-700/40 to-ether-900/20",
  "from-purple-700/40 to-purple-900/20",
  "from-blue-700/40 to-blue-900/20",
  "from-emerald-700/40 to-emerald-900/20",
  "from-amber-700/40 to-amber-900/20",
];

function gradientForIndex(i: number) {
  return COLLECTION_GRADIENTS[i % COLLECTION_GRADIENTS.length];
}

interface Props {
  collections: CollectionSummary[];
}

export default function CollectionsPageClient({ collections }: Props) {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(98,110,241,0.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ether-500/10 border border-ether-500/20 text-ether-400 text-sm mb-5">
              <Archive className="w-4 h-4" />
              Curated galleries
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Collections
            </h1>
            <p className="text-lg text-obsidian-400 max-w-xl">
              Curated sets of historically significant contracts, organized by
              deployer, era, or theme.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {collections.length === 0 ? (
          <div className="text-center py-24 text-obsidian-500">
            No collections yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((col, i) => (
              <motion.div
                key={col.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  href={`/collection/${col.slug}`}
                  className="group relative block h-56 rounded-2xl border border-obsidian-800 bg-obsidian-900/40 overflow-hidden hover:border-obsidian-600 transition-colors"
                >
                  {col.coverImageUrl ? (
                    <>
                      <img
                        src={col.coverImageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover object-top opacity-40 group-hover:opacity-50 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/70 to-transparent" />
                    </>
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientForIndex(i)}`} />
                  )}

                  {/* Content pinned to bottom */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                    <h2 className="text-base font-semibold group-hover:text-ether-400 transition-colors line-clamp-1 mb-1">
                      {col.title}
                    </h2>
                    {col.subtitle && (
                      <p className="text-xs text-obsidian-400 line-clamp-2 mb-2">
                        {col.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-obsidian-500">
                      <span>{col.contractCount.toLocaleString()} contracts</span>
                      {col.deployerAddress && (
                        <span className="font-mono">
                          {formatAddress(col.deployerAddress, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
