"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Check, BookOpen, Layers, Unlink2 } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/Header";
import { EraCompact } from "@/components/EraTimeline";
import {
  formatAddress,
  formatDate,
  formatBytes,
  formatBlockNumber,
  copyToClipboard,
  etherscanUrl,
  etherscanBlockUrl,
} from "@/lib/utils";
import { ERAS } from "@/types";
import type { ResolvedContract } from "@/lib/contract-resolver";

interface Props {
  address: string;
  resolved: ResolvedContract;
}

const STATUS_META = {
  documented: {
    label: "Documented",
    color: "bg-ether-500/20 border-ether-500/40 text-ether-300",
    dot: "bg-ether-400",
  },
  uncovered: {
    label: "Source Uncovered",
    color: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    dot: "bg-amber-400",
  },
  indexed: {
    label: "Indexed",
    color: "bg-obsidian-700/60 border-obsidian-600 text-obsidian-300",
    dot: "bg-obsidian-400",
  },
  "on-chain": {
    label: "On-chain",
    color: "bg-obsidian-700/60 border-obsidian-600 text-obsidian-300",
    dot: "bg-obsidian-400",
  },
};

export function IndexedContractPage({ address, resolved }: Props) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedDeployer, setCopiedDeployer] = useState(false);

  const statusMeta = STATUS_META[resolved.layer] ?? STATUS_META.indexed;
  const era = resolved.era ? ERAS[resolved.era] : null;
  const deploymentDate = resolved.timestamp
    ? formatDate(new Date(resolved.timestamp * 1000).toISOString())
    : null;

  const handleCopyAddress = async () => {
    const ok = await copyToClipboard(address);
    if (ok) { setCopiedAddress(true); setTimeout(() => setCopiedAddress(false), 2000); }
  };

  const handleCopyDeployer = async () => {
    if (!resolved.deployer) return;
    const ok = await copyToClipboard(resolved.deployer);
    if (ok) { setCopiedDeployer(true); setTimeout(() => setCopiedDeployer(false), 2000); }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="relative py-8 md:py-12 overflow-hidden">
        <div className="absolute inset-0 gradient-radial opacity-30" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-ether-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* Status badge + era */}
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${statusMeta.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
              {era && <EraCompact eraId={resolved.era!} />}
            </div>

            {/* Address */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-mono text-xl md:text-2xl font-bold tracking-tight text-obsidian-100 break-all">
                {address}
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyAddress}
                  title="Copy address"
                  className="p-1.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800 transition-colors"
                >
                  {copiedAddress ? <Check className="w-4 h-4 text-ether-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={etherscanUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on Etherscan"
                  className="p-1.5 rounded-lg text-obsidian-400 hover:text-ether-400 hover:bg-obsidian-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Metadata grid */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {resolved.deployer && (
                <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-4">
                  <div className="text-xs font-medium text-obsidian-500 uppercase tracking-wider mb-1.5">Deployer</div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/deployer/${resolved.deployer}`}
                      className="font-mono text-sm text-ether-400 hover:text-ether-300 transition-colors"
                    >
                      {formatAddress(resolved.deployer, 10)}
                    </Link>
                    <button
                      onClick={handleCopyDeployer}
                      className="p-1 rounded text-obsidian-500 hover:text-obsidian-300 transition-colors"
                    >
                      {copiedDeployer ? <Check className="w-3 h-3 text-ether-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}

              {resolved.blockNumber && (
                <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-4">
                  <div className="text-xs font-medium text-obsidian-500 uppercase tracking-wider mb-1.5">Deployment Block</div>
                  <a
                    href={etherscanBlockUrl(resolved.blockNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-obsidian-200 hover:text-ether-400 transition-colors font-mono"
                  >
                    #{formatBlockNumber(resolved.blockNumber)}
                  </a>
                  {deploymentDate && (
                    <div className="text-xs text-obsidian-500 mt-0.5">{deploymentDate}</div>
                  )}
                </div>
              )}

              {resolved.codeSize !== undefined && (
                <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-4">
                  <div className="text-xs font-medium text-obsidian-500 uppercase tracking-wider mb-1.5">Code Size</div>
                  <div className="text-sm text-obsidian-200">
                    {resolved.codeSize === 0
                      ? <span className="text-red-400">Self-destructed (0 bytes)</span>
                      : formatBytes(resolved.codeSize)}
                  </div>
                </div>
              )}

              {resolved.siblingCount !== undefined && resolved.siblingCount > 0 && (
                <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-4">
                  <div className="text-xs font-medium text-obsidian-500 uppercase tracking-wider mb-1.5">Bytecode Family</div>
                  <div className="text-sm text-obsidian-200">
                    {resolved.siblingCount.toLocaleString()} contract{resolved.siblingCount !== 1 ? "s" : ""} share this bytecode
                  </div>
                </div>
              )}
            </div>

            {/* Layer 3: Source Uncovered */}
            {resolved.layer === "uncovered" && resolved.crackedSiblingAddress && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6"
              >
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-semibold text-amber-300 mb-1">Source code uncovered</h2>
                    <p className="text-sm text-obsidian-400 mb-4">
                      A sibling contract with identical bytecode has been documented. The source code
                      and compilation history are known.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/contract/${resolved.crackedSiblingAddress}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors text-sm font-medium"
                      >
                        <BookOpen className="w-4 h-4" />
                        View documented sibling
                      </Link>
                      {resolved.proofUrl && (
                        <a
                          href={resolved.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-obsidian-800/60 border border-obsidian-700 text-obsidian-300 hover:bg-obsidian-800 transition-colors text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View proof
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Layer 2: Indexed — CTA to document */}
            {resolved.layer === "indexed" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 rounded-xl border border-obsidian-700 bg-obsidian-900/30 p-6"
              >
                <div className="flex items-start gap-3">
                  <Unlink2 className="w-5 h-5 text-obsidian-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-semibold text-obsidian-200 mb-1">Be the first historian to document this contract</h2>
                    <p className="text-sm text-obsidian-400 mb-4">
                      This contract is in our index but has not yet been researched or documented.
                      If you know its history, help us preserve it.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={etherscanUrl(address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-obsidian-300 hover:bg-obsidian-700 hover:text-obsidian-100 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Research on Etherscan
                      </a>
                      <Link
                        href="/historian/login"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-500/10 border border-ether-500/30 text-ether-300 hover:bg-ether-500/20 transition-colors text-sm font-medium"
                      >
                        <BookOpen className="w-4 h-4" />
                        Become a historian
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}
