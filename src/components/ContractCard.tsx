"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { EraCompact } from "./EraTimeline";
import {
  formatAddress,
  formatDate,
  copyToClipboard,
  etherscanUrl,
  getContractTypeLabel,
} from "@/lib/utils";
import { getFrontierRegistrarEntry, REGISTRAR_INFO } from "@/lib/frontier-registrar";
import type { Contract, FeaturedContract } from "@/types";

interface ContractCardProps {
  contract: Contract | FeaturedContract;
  variant?: "default" | "featured" | "compact";
}

export function ContractCard({ contract, variant = "default" }: ContractCardProps) {
  const [copied, setCopied] = useState(false);

  const address = contract.address;
  const eraId = "eraId" in contract ? contract.eraId : (contract as FeaturedContract).eraId;
  const name =
    "etherscanContractName" in contract
      ? contract.etherscanContractName
      : (contract as FeaturedContract).name;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "compact") {
    return (
      <Link href={`/contract/${address}`}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="flex items-center justify-between p-3 rounded-lg bg-obsidian-900/50 border border-obsidian-800 hover:border-obsidian-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <code className="text-sm text-obsidian-300 font-mono">
              {formatAddress(address)}
            </code>
            {eraId && <EraCompact eraId={eraId} />}
          </div>
          <span className="text-obsidian-500 text-sm">
            {"deploymentTimestamp" in contract && contract.deploymentTimestamp
              ? formatDate(contract.deploymentTimestamp)
              : ""}
          </span>
        </motion.div>
      </Link>
    );
  }

  if (variant === "featured") {
    const featured = contract as FeaturedContract & { tokenName?: string | null };
    const registrarEntry = getFrontierRegistrarEntry(address);
    const registrarInfo = registrarEntry ? REGISTRAR_INFO[registrarEntry.registrar] : null;
    // On-chain name() takes priority over registrar name (it's immutable on the contract)
    const displayName = featured.tokenName || registrarEntry?.name || featured.name || "Unknown Contract";
    return (
      <Link href={`/contract/${address}`}>
        <motion.div
          whileHover={{ y: -4 }}
          className="group relative p-6 rounded-xl bg-obsidian-900/50 border border-obsidian-800 hover:border-ether-500/30 transition-all duration-300 card-hover h-full"
        >
          {/* Era indicator + rank */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            {(featured as any).codeSizeBytes === 0 && (featured as any).deployStatus === 'success' ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">Zombie</span>
            ) : (featured as any).codeSizeBytes === 0 ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Failed</span>
            ) : (featured as any).deploymentRank != null && (featured as any).deploymentRank <= 1_000_000 ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono font-medium">
                {(featured as any).deploymentRank <= 9_999
                  ? `#${(featured as any).deploymentRank.toLocaleString()}`
                  : (featured as any).deploymentRank <= 999_999
                  ? `#${Math.floor((featured as any).deploymentRank / 1000)}K`
                  : `#${((featured as any).deploymentRank / 1_000_000).toFixed(1)}M`}
              </span>
            ) : null}
            <EraCompact eraId={featured.eraId} />
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-obsidian-100 group-hover:text-ether-400 transition-colors pr-20">
              {displayName}
            </h3>

            <code className="text-sm text-obsidian-500 font-mono block">
              {formatAddress(address, 8)}
            </code>

            {registrarEntry && registrarInfo && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  {registrarInfo.label}
                </span>
              </div>
            )}

            <p className="text-obsidian-400 text-sm">
              {featured.shortDescription}
            </p>

            <div className="pt-2 text-xs text-obsidian-500">
              Deployed {formatDate(featured.deploymentDate)}
            </div>
          </div>

          {/* Hover gradient */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-ether-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </motion.div>
      </Link>
    );
  }

  // Default variant
  const fullContract = contract as Contract;
  return (
    <Link href={`/contract/${address}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="group relative p-5 rounded-xl bg-obsidian-900/50 border border-obsidian-800 hover:border-obsidian-700 transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Name and type */}
            <div className="flex items-center gap-2 mb-2">
              {name && (
                <span className="font-medium text-obsidian-100">{name}</span>
              )}
              {fullContract.heuristics?.contractType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-obsidian-800 text-obsidian-400">
                  {getContractTypeLabel(fullContract.heuristics.contractType)}
                </span>
              )}
            </div>

            {/* Address */}
            <div className="flex items-center gap-2">
              <code className="text-sm text-obsidian-400 font-mono">
                {formatAddress(address, 10)}
              </code>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-obsidian-800 transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-obsidian-500" />
                )}
              </button>
              <a
                href={etherscanUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-obsidian-800 transition-colors"
                title="View on Etherscan"
              >
                <ExternalLink className="w-3.5 h-3.5 text-obsidian-500" />
              </a>
            </div>

            {/* Deployment info */}
            {fullContract.deploymentTimestamp && (
              <div className="mt-2 text-xs text-obsidian-500">
                Deployed {formatDate(fullContract.deploymentTimestamp)}
                {fullContract.deploymentBlock && (
                  <span className="ml-2 font-mono">
                    (block {fullContract.deploymentBlock.toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Era badge + rank tag */}
          <div className="flex items-center gap-2 flex-wrap">
            {eraId && <EraCompact eraId={eraId} />}
            {(fullContract.codeSizeBytes === 0 || fullContract.runtimeBytecode === '0x' || fullContract.runtimeBytecode === '') && fullContract.deployStatus === 'success' ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium" title="Zombie Account — Yellow Paper §7.1">
                Zombie Account
              </span>
            ) : fullContract.codeSizeBytes === 0 || fullContract.runtimeBytecode === '0x' || fullContract.runtimeBytecode === '' ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                Failed Deploy
              </span>
            ) : fullContract.deploymentRank != null && fullContract.deploymentRank <= 1_000_000 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono font-medium">
                {fullContract.deploymentRank <= 9_999
                  ? `#${fullContract.deploymentRank.toLocaleString()}`
                  : fullContract.deploymentRank <= 999_999
                  ? `#${Math.floor(fullContract.deploymentRank / 1000)}K`
                  : `#${(fullContract.deploymentRank / 1_000_000).toFixed(1)}M`}
              </span>
            ) : null}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
