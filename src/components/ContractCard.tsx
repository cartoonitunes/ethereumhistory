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
    const featured = contract as FeaturedContract;
    return (
      <Link href={`/contract/${address}`}>
        <motion.div
          whileHover={{ y: -4 }}
          className="group relative p-6 rounded-xl bg-obsidian-900/50 border border-obsidian-800 hover:border-ether-500/30 transition-all duration-300 card-hover h-full"
        >
          {/* Era indicator */}
          <div className="absolute top-4 right-4">
            <EraCompact eraId={featured.eraId} />
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-obsidian-100 group-hover:text-ether-400 transition-colors pr-20">
              {featured.name || "Unknown Contract"}
            </h3>

            <code className="text-sm text-obsidian-500 font-mono block">
              {formatAddress(address, 8)}
            </code>

            <p className="text-obsidian-400 text-sm line-clamp-2">
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

          {/* Era badge */}
          {eraId && (
            <div>
              <EraCompact eraId={eraId} />
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
