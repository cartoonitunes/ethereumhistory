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
                  className="group block h-full rounded-2xl border border-obsidian-800 bg-obsidian-900/40 overflow-hidden hover:border-obsidian-600 transition-colors"
                >
                  {/* Cover gradient */}
                  <div
                    className={`h-32 bg-gradient-to-br ${gradientForIndex(i)} border-b border-obsidian-800 flex items-end p-5`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Archive className="w-5 h-5 text-obsidian-300" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col gap-3">
                    <div>
                      <h2 className="text-lg font-semibold group-hover:text-ether-400 transition-colors line-clamp-1">
                        {col.title}
                      </h2>
                      {col.subtitle && (
                        <p className="text-sm text-obsidian-400 mt-1 line-clamp-2">
                          {col.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-obsidian-500 pt-1">
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
