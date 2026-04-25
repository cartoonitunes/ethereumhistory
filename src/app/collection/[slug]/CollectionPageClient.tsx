"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { ArrowLeft, Archive, CheckCircle, ExternalLink } from "lucide-react";
import { formatAddress, formatDate } from "@/lib/utils";
import { ERAS } from "@/types";
import type { CollectionContract } from "@/lib/db/collections";
import type { Collection } from "@/lib/schema";

interface Props {
  collection: Collection;
  contracts: CollectionContract[];
}

function isVerified(method: string | null): boolean {
  return (
    method === "etherscan_verified" ||
    method === "exact_bytecode_match" ||
    method === "near_exact_match" ||
    method === "author_published_source" ||
    method === "author_published"
  );
}

function getEraLabel(eraId: string | null): string | null {
  if (!eraId) return null;
  return ERAS[eraId]?.name ?? eraId.replace(/_/g, " ");
}

function DocumentedCard({ contract, index }: { contract: CollectionContract; index: number }) {
  const name = contract.name ?? formatAddress(contract.address, 10);
  const verified = isVerified(contract.verificationMethod);
  const era = getEraLabel(contract.eraId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.6) }}
    >
      <Link
        href={`/contract/${contract.address}`}
        className="group block rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-4 hover:border-obsidian-600 hover:bg-obsidian-900/70 transition-all h-full"
      >
        {/* Top row: name + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold group-hover:text-ether-400 transition-colors truncate">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {verified && (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            )}
            {era && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ether-500/10 border border-ether-500/20 text-ether-400 whitespace-nowrap">
                {era}
              </span>
            )}
          </div>
        </div>

        {/* Short description */}
        {contract.shortDescription && (
          <p className="text-xs text-obsidian-400 line-clamp-2 mb-3">
            {contract.shortDescription}
          </p>
        )}

        {/* Bottom: address + date */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-obsidian-600">
          <code className="font-mono">{formatAddress(contract.address, 8)}</code>
          {contract.deploymentTimestamp && (
            <span>{formatDate(contract.deploymentTimestamp)}</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function GhostCard({ contract, index }: { contract: CollectionContract; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.6) }}
    >
      <Link
        href={`/contract/${contract.address}`}
        className="group block rounded-xl border border-obsidian-800/50 bg-obsidian-900/20 p-4 hover:border-obsidian-700 hover:bg-obsidian-900/40 transition-all h-full"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <code className="text-xs font-mono text-obsidian-500 group-hover:text-obsidian-400 transition-colors truncate">
            {formatAddress(contract.address, 12)}
          </code>
          {contract.deploymentTimestamp && (
            <span className="text-[10px] text-obsidian-600 flex-shrink-0">
              {formatDate(contract.deploymentTimestamp)}
            </span>
          )}
        </div>

        <p className="text-xs text-obsidian-600 mb-3">Not yet documented</p>

        <div className="text-[11px] text-ether-600 group-hover:text-ether-500 transition-colors">
          Document this contract →
        </div>
      </Link>
    </motion.div>
  );
}

export default function CollectionPageClient({ collection, contracts }: Props) {
  const documentedContracts = contracts.filter((c) => c.documented);
  const verifiedCount = documentedContracts.filter((c) => isVerified(c.verificationMethod)).length;
  const documentedCount = documentedContracts.length;
  const totalCount = contracts.length;

  const eras = [...new Set(documentedContracts.map((c) => c.eraId).filter(Boolean))];

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative py-16 border-b border-obsidian-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(98,110,241,0.07),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            All Collections
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-ether-500/10 border border-ether-500/20 text-ether-400 text-xs mb-4">
              <Archive className="w-3.5 h-3.5" />
              Collection
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              {collection.title}
            </h1>

            {collection.subtitle && (
              <p className="text-lg text-obsidian-300 mb-4">{collection.subtitle}</p>
            )}

            {collection.description && (
              <p className="text-sm text-obsidian-400 max-w-2xl leading-relaxed mb-6">
                {collection.description}
              </p>
            )}

            {/* Deployer */}
            {collection.deployerAddress && (
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-obsidian-500">Deployer</span>
                <Link
                  href={`/deployer/${collection.deployerAddress}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-ether-400 hover:text-ether-300 hover:underline transition-colors"
                >
                  {formatAddress(collection.deployerAddress, 14)}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div>
                <span className="text-2xl font-bold text-obsidian-100">
                  {totalCount.toLocaleString()}
                </span>
                <span className="ml-1.5 text-obsidian-500">contracts</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-ether-400">
                  {documentedCount.toLocaleString()}
                </span>
                <span className="ml-1.5 text-obsidian-500">
                  of {totalCount} documented
                </span>
              </div>
              {verifiedCount > 0 && (
                <div>
                  <span className="text-2xl font-bold text-green-400">
                    {verifiedCount.toLocaleString()}
                  </span>
                  <span className="ml-1.5 text-obsidian-500">verified</span>
                </div>
              )}
              {eras.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {eras.slice(0, 4).map((eraId) => (
                    <span
                      key={eraId}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-ether-500/10 border border-ether-500/20 text-ether-400"
                    >
                      {getEraLabel(eraId)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contract grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
        {contracts.length === 0 ? (
          <div className="text-center py-24 text-obsidian-500">
            No contracts in this collection yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract, i) =>
              contract.documented ? (
                <DocumentedCard key={contract.address} contract={contract} index={i} />
              ) : (
                <GhostCard key={contract.address} contract={contract} index={i} />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
