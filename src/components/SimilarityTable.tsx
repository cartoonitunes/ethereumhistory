"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Info, ArrowUpRight, HelpCircle } from "lucide-react";
import { EraCompact } from "./EraTimeline";
import {
  formatAddress,
  formatDate,
  formatPercent,
  getSimilarityTypeLabel,
  getSimilarityTypeColor,
} from "@/lib/utils";
import type { ContractSimilarity } from "@/types";

interface SimilarityTableProps {
  similarities: ContractSimilarity[];
}

export function SimilarityTable({ similarities }: SimilarityTableProps) {
  if (similarities.length === 0) {
    return (
      <div className="text-center py-12 text-obsidian-500">
        <p>No similar contracts found above the similarity threshold.</p>
        <p className="text-sm mt-2">
          This contract may be unique or use patterns not seen in other indexed contracts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-obsidian-900/50 border border-obsidian-800">
        <Info className="w-5 h-5 text-ether-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-obsidian-400">
          <p className="font-medium text-obsidian-300 mb-1">
            About Bytecode Similarity
          </p>
          <p>
            Similarity is computed by comparing the structural patterns in bytecode,
            ignoring specific values like addresses and constants. Two contracts with
            high similarity likely share the same source code or template.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-obsidian-800">
        <table className="data-table">
          <thead className="bg-obsidian-900/50">
            <tr>
              <th>Contract</th>
              <th>Similarity</th>
              <th>Type</th>
              <th>Deployed</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {similarities.map((sim, index) => (
              <SimilarityRow key={sim.matchedAddress} similarity={sim} index={index} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-obsidian-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500"></span>
          <span>Exact (&ge;95%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-500"></span>
          <span>Structural (70-95%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500"></span>
          <span>Weak (60-70%)</span>
        </div>
      </div>
    </div>
  );
}

function SimilarityRow({
  similarity,
  index,
}: {
  similarity: ContractSimilarity;
  index: number;
}) {
  const typeColor = getSimilarityTypeColor(similarity.similarityType);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      {/* Contract */}
      <td>
        <div className="flex flex-col gap-1">
          <Link
            href={`/contract/${similarity.matchedAddress}`}
            className="font-mono text-sm text-obsidian-300 hover:text-ether-400 transition-colors"
          >
            {formatAddress(similarity.matchedAddress, 8)}
          </Link>
          {similarity.matchedContract?.eraId && (
            <EraCompact eraId={similarity.matchedContract.eraId} showLabel={false} />
          )}
        </div>
      </td>

      {/* Similarity score */}
      <td>
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="w-20 h-2 bg-obsidian-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${similarity.similarityScore * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={`h-full rounded-full ${
                similarity.similarityType === "exact"
                  ? "bg-green-500"
                  : similarity.similarityType === "structural"
                  ? "bg-blue-500"
                  : "bg-yellow-500"
              }`}
            />
          </div>
          <span className="font-mono text-sm text-obsidian-300">
            {formatPercent(similarity.similarityScore)}
          </span>
        </div>
      </td>

      {/* Type */}
      <td>
        <div className="relative group/tooltip">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium similarity-${similarity.similarityType}`}
          >
            {getSimilarityTypeLabel(similarity.similarityType)}
            <HelpCircle className="w-3 h-3 opacity-50" />
          </span>

          {/* Tooltip with explanation */}
          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 rounded-lg bg-obsidian-800 border border-obsidian-700 text-xs text-obsidian-300 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10">
            <p className="font-medium mb-1">{similarity.explanation}</p>
            {similarity.sharedPatterns.length > 0 && (
              <ul className="mt-2 space-y-1 text-obsidian-400">
                {similarity.sharedPatterns.slice(0, 3).map((pattern, i) => (
                  <li key={i}>{pattern}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </td>

      {/* Deployed */}
      <td>
        <span className="text-sm text-obsidian-400">
          {similarity.matchedContract?.deploymentTimestamp
            ? formatDate(similarity.matchedContract.deploymentTimestamp)
            : "Unknown"}
        </span>
      </td>

      {/* Link */}
      <td>
        <Link
          href={`/contract/${similarity.matchedAddress}`}
          className="p-2 rounded-lg hover:bg-obsidian-800 transition-colors inline-flex"
        >
          <ArrowUpRight className="w-4 h-4 text-obsidian-500 group-hover:text-ether-400" />
        </Link>
      </td>
    </motion.tr>
  );
}

export function SimilarityDetail({ similarity }: { similarity: ContractSimilarity }) {
  return (
    <div className="p-4 rounded-lg border border-obsidian-800 bg-obsidian-900/30">
      <h4 className="font-medium text-sm text-obsidian-200 mb-3">Similarity Breakdown</h4>

      <div className="space-y-3">
        {/* N-gram similarity */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-obsidian-400">Opcode Patterns</span>
            <span className="font-mono text-obsidian-300">
              {formatPercent(similarity.ngramSimilarity)}
            </span>
          </div>
          <div className="h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-ether-500 rounded-full"
              style={{ width: `${similarity.ngramSimilarity * 100}%` }}
            />
          </div>
          <p className="text-xs text-obsidian-500 mt-1">
            Based on shared opcode sequences (3-grams)
          </p>
        </div>

        {/* Control flow similarity */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-obsidian-400">Control Flow</span>
            <span className="font-mono text-obsidian-300">
              {formatPercent(similarity.controlFlowSimilarity)}
            </span>
          </div>
          <div className="h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-ether-500 rounded-full"
              style={{ width: `${similarity.controlFlowSimilarity * 100}%` }}
            />
          </div>
          <p className="text-xs text-obsidian-500 mt-1">
            Based on jump patterns and branching structure
          </p>
        </div>

        {/* Shape similarity */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-obsidian-400">Shape</span>
            <span className="font-mono text-obsidian-300">
              {formatPercent(similarity.shapeSimilarity)}
            </span>
          </div>
          <div className="h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-ether-500 rounded-full"
              style={{ width: `${similarity.shapeSimilarity * 100}%` }}
            />
          </div>
          <p className="text-xs text-obsidian-500 mt-1">
            Based on contract size and opcode diversity
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-4 pt-4 border-t border-obsidian-800">
        <p className="text-sm text-obsidian-300">{similarity.explanation}</p>
      </div>
    </div>
  );
}
