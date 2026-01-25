"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Info,
  FileCode,
  GitCompare,
  History,
  Users,
  Coins,
  Code,
} from "lucide-react";
import { Header } from "@/components/Header";
import { AddressSearch } from "@/components/AddressSearch";
import { EraCompact } from "@/components/EraTimeline";
import { SimilarityTable, SimilarityDetail } from "@/components/SimilarityTable";
import { BytecodeViewer } from "@/components/BytecodeViewer";
import {
  formatAddress,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatBlockNumber,
  formatBytes,
  copyToClipboard,
  etherscanUrl,
  etherscanTxUrl,
  etherscanBlockUrl,
  getContractTypeLabel,
  getVerificationStatusLabel,
  getVerificationStatusColor,
} from "@/lib/utils";
import type { ContractPageData } from "@/types";

interface ContractPageClientProps {
  address: string;
  data: ContractPageData | null;
  error: string | null;
}

export function ContractPageClient({ address, data, error }: ContractPageClientProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "code" | "similarity" | "history">(
    "overview"
  );

  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Not found state
  if (!data && !error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-obsidian-800 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Contract Not Found</h1>
            <p className="text-obsidian-400 mb-6 max-w-md mx-auto">
              This address is not in our historical archive. It may be a newer contract
              or an externally owned account (EOA).
            </p>
            <code className="block text-sm text-obsidian-500 font-mono mb-8">
              {address}
            </code>
            <div className="space-y-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <a
                href={etherscanUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-ether-400 hover:text-ether-300 transition-colors"
              >
                View on Etherscan
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Error Loading Contract</h1>
            <p className="text-obsidian-400 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const {
    contract,
    bytecodeAnalysis,
    similarContracts,
    detectedPatterns,
    functionSignatures,
    deployerPerson,
    txCountsByYear,
    archiveNotice,
  } = data!;

  const displayName = contract.tokenName || contract.etherscanContractName || null;
  const title = displayName || `Contract ${formatAddress(address, 12)}`;

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {archiveNotice && (
          <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-obsidian-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-400">Outside the curated archive</div>
                <div className="text-obsidian-300 mt-1">{archiveNotice}</div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
            <div>
              {/* Contract name */}
              <div className="flex items-center gap-3 mb-2">
                {contract.tokenLogo && (
                  <div className="w-9 h-9 rounded-full bg-obsidian-800 border border-obsidian-700 overflow-hidden flex items-center justify-center">
                    <Image
                      src={contract.tokenLogo}
                      alt={displayName ? `${displayName} logo` : "Token logo"}
                      width={36}
                      height={36}
                      className="w-9 h-9 object-cover"
                    />
                  </div>
                )}
                <h1 className="text-2xl font-bold">
                  {title}
                  {displayName && contract.tokenSymbol ? (
                    <span className="ml-2 text-base font-medium text-obsidian-400">
                      ({contract.tokenSymbol})
                    </span>
                  ) : null}
                </h1>
                {contract.heuristics.contractType && (
                  <span className="text-sm px-2 py-0.5 rounded-full bg-obsidian-800 text-obsidian-400 heuristic-badge">
                    {getContractTypeLabel(contract.heuristics.contractType)}
                  </span>
                )}
              </div>

              {/* Address */}
              <div className="flex items-center gap-2">
                <code className="text-lg text-obsidian-300 font-mono">
                  {formatAddress(address, 12)}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-obsidian-800 transition-colors"
                  title="Copy full address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-obsidian-500" />
                  )}
                </button>
                <a
                  href={etherscanUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-obsidian-800 transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-4 h-4 text-obsidian-500" />
                </a>
              </div>

              {/* ENS */}
              {contract.ensName && (
                <div className="mt-1 text-sm text-ether-400">{contract.ensName}</div>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-3">
              {contract.eraId && <EraCompact eraId={contract.eraId} showLabel />}
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${getVerificationStatusColor(
                  contract.verificationStatus
                )}`}
              >
                {getVerificationStatusLabel(contract.verificationStatus)}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-obsidian-500">
            {contract.deploymentTimestamp && (
              <span>
                Deployed {formatDate(contract.deploymentTimestamp)} (
                {formatRelativeTime(contract.deploymentTimestamp)})
              </span>
            )}
            {contract.deploymentBlock && (
              <a
                href={etherscanBlockUrl(contract.deploymentBlock)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ether-400 transition-colors"
              >
                Block {formatBlockNumber(contract.deploymentBlock)}
              </a>
            )}
          </div>
        </motion.div>

        {/* Tabs (scrollable on mobile) */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-6 border-b border-obsidian-800">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={<Info className="w-4 h-4" />}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === "code"}
              onClick={() => setActiveTab("code")}
              icon={<FileCode className="w-4 h-4" />}
            >
              Code
            </TabButton>
            <TabButton
              active={activeTab === "similarity"}
              onClick={() => setActiveTab("similarity")}
              icon={<GitCompare className="w-4 h-4" />}
              badge={similarContracts.length > 0 ? similarContracts.length : undefined}
            >
              Similar
            </TabButton>
            <TabButton
              active={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              icon={<History className="w-4 h-4" />}
            >
              History
            </TabButton>
          </div>
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              contract={contract}
              bytecodeAnalysis={bytecodeAnalysis}
              deployerPerson={deployerPerson ?? null}
              txCountsByYear={txCountsByYear ?? null}
            />
          )}
          {activeTab === "code" && (
            <CodeTab
              bytecode={contract.runtimeBytecode}
              analysis={bytecodeAnalysis}
              patterns={detectedPatterns}
              signatures={functionSignatures}
              decompiledCode={contract.decompiledCode}
              decompilationSuccess={contract.decompilationSuccess}
              sourceCode={contract.sourceCode}
              abi={contract.abi}
            />
          )}
          {activeTab === "similarity" && (
            <SimilarityTab similarities={similarContracts} />
          )}
          {activeTab === "history" && (
            <HistoryTab contract={contract} />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon,
  badge,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-none flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative
        ${active ? "text-obsidian-100" : "text-obsidian-500 hover:text-obsidian-300"}
      `}
    >
      {icon}
      {children}
      {badge !== undefined && (
        <span className="px-1.5 py-0.5 rounded-full bg-ether-500/20 text-ether-400 text-xs">
          {badge}
        </span>
      )}
      {active && (
        <motion.div
          layoutId="activeContractTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-ether-500"
        />
      )}
    </button>
  );
}

function OverviewTab({
  contract,
  bytecodeAnalysis,
  deployerPerson,
  txCountsByYear,
}: {
  contract: ContractPageData["contract"];
  bytecodeAnalysis: ContractPageData["bytecodeAnalysis"];
  deployerPerson: ContractPageData["deployerPerson"];
  txCountsByYear: ContractPageData["txCountsByYear"];
}) {
  // Token info is sourced from DB (and optionally filled server-side from RPC)
  const tokenName = contract.tokenName;
  const tokenSymbol = contract.tokenSymbol;
  const tokenDecimals = contract.tokenDecimals;
  const tokenSupply = contract.tokenTotalSupply;
  const hasTokenInfo = tokenName || tokenSymbol || tokenDecimals !== null || tokenSupply || contract.tokenLogo;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Token Info - Show if available */}
        {hasTokenInfo && (
          <section className="p-6 rounded-xl border border-ether-500/20 bg-ether-500/5">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-ether-400" />
              <h2 className="text-lg font-semibold">Token Information</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {contract.tokenLogo && (
                <FactItem
                  label="Logo"
                  value={
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-obsidian-800 border border-obsidian-700 overflow-hidden flex items-center justify-center">
                        <Image
                          src={contract.tokenLogo}
                          alt={tokenName ? `${tokenName} logo` : "Token logo"}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover"
                        />
                      </div>
                      <span className="text-xs text-obsidian-500">via RPC</span>
                    </div>
                  }
                />
              )}
              {tokenName && (
                <FactItem label="Token Name" value={tokenName} />
              )}
              {tokenSymbol && (
                <FactItem label="Symbol" value={tokenSymbol} />
              )}
              {tokenDecimals !== null && tokenDecimals !== undefined && (
                <FactItem label="Decimals" value={tokenDecimals.toString()} />
              )}
              {tokenSupply && (
                <FactItem
                  label="Total Supply"
                  value={formatTokenSupplyDisplay(tokenSupply, tokenDecimals ?? 0)}
                />
              )}
            </div>
          </section>
        )}

        {/* Key facts */}
        <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h2 className="text-lg font-semibold mb-4">Key Facts</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <FactItem
              label="Deployer"
              value={
                contract.deployerAddress ? (
                  deployerPerson && deployerPerson.slug ? (
                    <Link
                      href={`/people/${deployerPerson.slug}`}
                      className="text-sm hover:text-ether-400 transition-colors"
                    >
                      <span className="font-medium">{deployerPerson.name}</span>{" "}
                      <span className="font-mono text-obsidian-400">
                        ({formatAddress(contract.deployerAddress)})
                      </span>
                    </Link>
                  ) : (
                    <span className="font-mono text-sm text-obsidian-300">
                      {formatAddress(contract.deployerAddress)}
                    </span>
                  )
                ) : (
                  "Unknown"
                )
              }
            />
            <FactItem
              label="Deployment Block"
              value={
                contract.deploymentBlock ? (
                  <a
                    href={etherscanBlockUrl(contract.deploymentBlock)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono hover:text-ether-400 transition-colors"
                  >
                    {formatBlockNumber(contract.deploymentBlock)}
                  </a>
                ) : (
                  "Unknown"
                )
              }
            />
            <FactItem
              label="Deployment Date"
              value={contract.deploymentTimestamp ? formatDateTime(contract.deploymentTimestamp) : "Unknown"}
            />
            <FactItem
              label="Code Size"
              value={contract.codeSizeBytes ? formatBytes(contract.codeSizeBytes) : "Unknown"}
            />
            {contract.transactionCount != null && (
              <FactItem
                label="Transaction Count"
                value={contract.transactionCount.toLocaleString()}
              />
            )}
          </div>

          {txCountsByYear && Object.keys(txCountsByYear.counts || {}).length > 0 && (
            <div className="mt-4 pt-4 border-t border-obsidian-800">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-obsidian-500">Transactions by Year</span>
                {txCountsByYear.truncated && (
                  <span className="text-xs text-yellow-400">Partial (capped)</span>
                )}
              </div>
              <div className="mt-2 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 min-w-max">
                  {Object.keys(txCountsByYear.counts)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((year) => (
                      <div
                        key={year}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40"
                      >
                        <span className="text-xs font-mono text-obsidian-400">{year}</span>
                        <span className="text-xs font-semibold text-obsidian-200">
                          {txCountsByYear.counts[year]?.toLocaleString?.() ??
                            String(txCountsByYear.counts[year] ?? 0)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {contract.deploymentTxHash && (
            <div className="mt-4 pt-4 border-t border-obsidian-800">
              <span className="text-xs text-obsidian-500">Deployment Transaction: </span>
              <a
                href={etherscanTxUrl(contract.deploymentTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-ether-400 hover:text-ether-300"
              >
                {formatAddress(contract.deploymentTxHash, 16)}
              </a>
            </div>
          )}
        </section>

        {/* Heuristics */}
        {contract.heuristics.contractType && (
          <section className="p-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-400 mb-1">
                  Heuristic Analysis
                </h3>
                <p className="text-sm text-obsidian-400 mb-3">
                  The following characteristics were detected through bytecode analysis
                  and may not be accurate.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-obsidian-500">Detected Type: </span>
                    <span className="text-obsidian-300">
                      {getContractTypeLabel(contract.heuristics.contractType)}
                    </span>
                    {Math.round(contract.heuristics.confidence * 100) !== 50 && (
                      <span className="text-obsidian-500 ml-1">
                        ({Math.round(contract.heuristics.confidence * 100)}% confidence)
                      </span>
                    )}
                  </div>
                  {contract.heuristics.isProxy && (
                    <div className="text-obsidian-300">Appears to be a proxy contract</div>
                  )}
                  {contract.heuristics.hasSelfDestruct && (
                    <div className="text-obsidian-300">Contains SELFDESTRUCT opcode</div>
                  )}
                  {contract.heuristics.isErc20Like && (
                    <div className="text-obsidian-300">Has ERC-20-like patterns</div>
                  )}
                </div>
                {contract.heuristics.notes && (
                  <p className="mt-3 text-xs text-obsidian-500">{contract.heuristics.notes}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Historical summary */}
        {contract.historicalSummary && (
          <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
            <h2 className="text-lg font-semibold mb-4">Historical Summary</h2>
            <p className="text-obsidian-300 leading-relaxed">{contract.historicalSummary}</p>
          </section>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Era info */}
        {contract.era && (
          <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: contract.era.color }}
              />
              <h3 className="font-semibold">{contract.era.name} Era</h3>
            </div>
            <p className="text-sm text-obsidian-400 mb-3">{contract.era.description}</p>
            <div className="text-xs text-obsidian-500">
              {formatDate(contract.era.startDate)} — {contract.era.endDate ? formatDate(contract.era.endDate) : "Present"}
            </div>
          </section>
        )}

        {/* Quick bytecode stats */}
        {bytecodeAnalysis && (
          <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
            <h3 className="font-semibold mb-4">Bytecode Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-obsidian-500">Opcodes</span>
                <span className="font-mono">{bytecodeAnalysis.opcodeCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-obsidian-500">Unique Opcodes</span>
                <span className="font-mono">{bytecodeAnalysis.uniqueOpcodeCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-obsidian-500">Jump Instructions</span>
                <span className="font-mono">{bytecodeAnalysis.jumpCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-obsidian-500">Storage Operations</span>
                <span className="font-mono">{bytecodeAnalysis.storageOpsCount}</span>
              </div>
            </div>
          </section>
        )}

        {/* Verified Source Code */}
        {contract.sourceCode && (
          <section className="p-6 rounded-xl border border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-4 h-4 text-green-400" />
              <h3 className="font-semibold text-green-400">Verified Source Available</h3>
            </div>
            <p className="text-xs text-obsidian-400 mb-3">
              This contract has verified source code on Etherscan.
            </p>
            <a
              href={`https://etherscan.io/address/${contract.address}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-ether-400 hover:text-ether-300"
            >
              View Source Code
              <ExternalLink className="w-3 h-3" />
            </a>
          </section>
        )}

        {/* External links */}
        <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h3 className="font-semibold mb-4">External Links</h3>
          <div className="space-y-2">
            <a
              href={etherscanUrl(contract.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-sm text-obsidian-400 hover:text-ether-400 transition-colors"
            >
              <span>Etherscan</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={`https://etherscan.io/address/${contract.address}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-sm text-obsidian-400 hover:text-ether-400 transition-colors"
            >
              <span>Verified Source (if any)</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function FactItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-obsidian-500 mb-1">{label}</dt>
      <dd className="text-obsidian-200">{value}</dd>
    </div>
  );
}

function formatTokenSupplyDisplay(supply: string, decimals: number): string {
  try {
    const supplyBigInt = BigInt(supply);
    if (decimals === 0) {
      return supplyBigInt.toLocaleString();
    }
    const divisor = BigInt(10 ** decimals);
    const whole = supplyBigInt / divisor;
    const remainder = supplyBigInt % divisor;

    if (remainder === BigInt(0)) {
      return whole.toLocaleString();
    }

    const remainderStr = remainder.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${remainderStr}`;
  } catch {
    return supply;
  }
}

function CodeTab({
  bytecode,
  analysis,
  patterns,
  signatures,
  decompiledCode,
  decompilationSuccess,
  sourceCode,
  abi,
}: {
  bytecode: string | null;
  analysis: ContractPageData["bytecodeAnalysis"];
  patterns: ContractPageData["detectedPatterns"];
  signatures: ContractPageData["functionSignatures"];
  decompiledCode?: string | null;
  decompilationSuccess?: boolean;
  sourceCode?: string | null;
  abi?: string | null;
}) {
  return (
    <div className="space-y-6">
      <BytecodeViewer
        bytecode={bytecode}
        analysis={analysis}
        decompiledCode={decompiledCode}
        decompilationSuccess={decompilationSuccess}
        sourceCode={sourceCode}
        abi={abi}
      />

      {/* Function signatures */}
      {signatures.length > 0 && (
        <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h3 className="font-semibold mb-4">Detected Function Signatures</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Selector</th>
                  <th>Signature</th>
                  <th>Source</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((sig) => (
                  <tr key={sig.selector}>
                    <td>
                      <code className="text-xs">{sig.selector}</code>
                    </td>
                    <td>
                      <code className="text-xs text-obsidian-300">
                        {sig.signature || "Unknown"}
                      </code>
                    </td>
                    <td className="text-xs text-obsidian-500">{sig.source}</td>
                    <td className="text-xs">{Math.round(sig.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SimilarityTab({
  similarities,
}: {
  similarities: ContractPageData["similarContracts"];
}) {
  return (
    <div className="space-y-6">
      <SimilarityTable similarities={similarities} />

      {/* Show detail for top match */}
      {similarities.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-4">Top Match Details</h3>
          <SimilarityDetail similarity={similarities[0]} />
        </div>
      )}
    </div>
  );
}

function HistoryTab({ contract }: { contract: ContractPageData["contract"] }) {
  return (
    <div className="space-y-6">
      {/* Historical narrative */}
      <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
        <h2 className="text-lg font-semibold mb-4">Historical Narrative</h2>

        {contract.historicalSummary ? (
          <div className="prose prose-invert max-w-none">
            <p className="text-obsidian-300 leading-relaxed mb-4">
              {contract.historicalSummary}
            </p>

            {contract.historicalSignificance && (
              <>
                <h3 className="text-base font-medium text-obsidian-200 mt-6 mb-2">
                  Historical Significance
                </h3>
                <p className="text-obsidian-300 leading-relaxed">
                  {contract.historicalSignificance}
                </p>
              </>
            )}

            {contract.historicalContext && (
              <>
                <h3 className="text-base font-medium text-obsidian-200 mt-6 mb-2">
                  Context
                </h3>
                <p className="text-obsidian-300 leading-relaxed">
                  {contract.historicalContext}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-obsidian-500">
            <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No historical narrative available for this contract yet.</p>
            <p className="text-sm mt-2">
              Historical context is researched and added manually for significant contracts.
            </p>
          </div>
        )}
      </section>

      {/* Era context */}
      {contract.era && (
        <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: contract.era.color }}
            />
            About the {contract.era.name} Era
          </h3>
          <p className="text-obsidian-300 leading-relaxed mb-4">
            {contract.era.description}
          </p>
          <div className="text-sm text-obsidian-500">
            This contract was deployed during blocks {contract.era.startBlock.toLocaleString()} —{" "}
            {contract.era.endBlock?.toLocaleString() || "present"} ({formatDate(contract.era.startDate)}{" "}
            — {contract.era.endDate ? formatDate(contract.era.endDate) : "present"}).
          </div>
        </section>
      )}

      {/* Community contribution */}
      <section className="p-6 rounded-xl border border-dashed border-obsidian-700 bg-obsidian-900/20">
        <div className="text-center">
          <Users className="w-8 h-8 mx-auto mb-3 text-obsidian-500" />
          <h3 className="font-medium mb-2">Contribute Historical Context</h3>
          <p className="text-sm text-obsidian-500 mb-4">
            Know something about this contract? We welcome contributions from the community
            to help preserve Ethereum's history.
          </p>
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-obsidian-800 text-obsidian-500 text-sm cursor-not-allowed"
          >
            Suggest Context (Coming Soon)
          </button>
        </div>
      </section>
    </div>
  );
}
