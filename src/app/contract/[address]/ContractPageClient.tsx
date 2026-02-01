"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Info,
  FileCode,
  History,
  Users,
  Coins,
  Code,
  LogIn,
  Save,
  X,
  Trash2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { AddressSearch } from "@/components/AddressSearch";
import { EraCompact } from "@/components/EraTimeline";
import { SimilarityTable, SimilarityDetail } from "@/components/SimilarityTable";
import { BytecodeViewer } from "@/components/BytecodeViewer";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
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
import type { ContractHistoryData, ContractPageData, HistorianMe, HistoricalLink } from "@/types";

interface ContractPageClientProps {
  address: string;
  data: ContractPageData | null;
  error: string | null;
}

export function ContractPageClient({ address, data, error }: ContractPageClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [me, setMe] = useState<HistorianMe | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "code" | "history">(
    "overview"
  );

  // Load historian status for header
  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/historian/me");
        const json = await res.json();
        if (cancelled) return;
        setMe((json?.data as HistorianMe) || null);
      } catch {
        if (!cancelled) setMe(null);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <Header showHistorianLogin={true} historianMe={me} />
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
        <Header showHistorianLogin={true} historianMe={me} />
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

  const displayName = contract.tokenName || contract.ensName || contract.etherscanContractName || null;
  const title = displayName || `Contract ${formatAddress(address, 12)}`;

  return (
    <div className="min-h-screen">
      <Header showHistorianLogin={!me} />

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
                    <img
                      src={contract.tokenLogo}
                      alt={displayName ? `${displayName} logo` : "Token logo"}
                      width={36}
                      height={36}
                      className="w-9 h-9 object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contract.tokenLogo && (
                <FactItem
                  label="Logo"
                  value={
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-obsidian-800 border border-obsidian-700 overflow-hidden flex items-center justify-center">
                        <img
                          src={contract.tokenLogo}
                          alt={tokenName ? `${tokenName} logo` : "Token logo"}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contract.ensName && (
              <FactItem
                label="ENS name"
                value={
                  <a
                    href="https://app.ens.domains/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ether-400 hover:text-ether-300 transition-colors"
                  >
                    {contract.ensName}
                  </a>
                }
              />
            )}
            <FactItem
              label="Deployer"
              value={
                contract.deployerAddress ? (
                  deployerPerson && deployerPerson.slug ? (
                    <Link
                      href={`/people/${deployerPerson.slug}`}
                      className="text-sm hover:text-ether-400 transition-colors"
                    >
                      <span className="font-medium">{deployerPerson.name}</span>
                      {contract.deployerEnsName ? (
                        <span className="text-obsidian-400"> ({contract.deployerEnsName})</span>
                      ) : (
                        <span className="font-mono text-obsidian-400">
                          {" "}({formatAddress(contract.deployerAddress)})
                        </span>
                      )}
                    </Link>
                  ) : contract.deployerEnsName ? (
                    <span className="text-sm text-obsidian-300">
                      <span className="text-ether-400">{contract.deployerEnsName}</span>
                      <span className="font-mono text-obsidian-400">
                        {" "}({formatAddress(contract.deployerAddress)})
                      </span>
                    </span>
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
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.keys(txCountsByYear.counts)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((year) => (
                    <div
                      key={year}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40"
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
            <MarkdownRenderer content={contract.historicalSummary} />
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
      <dd className="text-obsidian-200 break-words">{value}</dd>
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
  type DraftLink = {
    clientId: string;
    id: number | null;
    contractAddress: string;
    title: string | null;
    url: string;
    source: string | null;
    note: string | null;
    createdAt: string;
    _deleted?: boolean;
  };

  const [historyData, setHistoryData] = useState<ContractHistoryData | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [me, setMe] = useState<HistorianMe | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local editable state (initialized from contract + fetched links)
  const [savedEtherscanContractName, setSavedEtherscanContractName] = useState(
    contract.etherscanContractName || ""
  );
  const [savedTokenName, setSavedTokenName] = useState(contract.tokenName || "");
  const [savedContractType, setSavedContractType] = useState(contract.heuristics.contractType || "");
  const [savedShortDescription, setSavedShortDescription] = useState(contract.shortDescription || "");
  const [savedDescription, setSavedDescription] = useState(contract.description || "");
  const [savedSummary, setSavedSummary] = useState(contract.historicalSummary || "");
  const [savedSignificance, setSavedSignificance] = useState(contract.historicalSignificance || "");
  const [savedContext, setSavedContext] = useState(contract.historicalContext || "");
  const [savedTokenLogo, setSavedTokenLogo] = useState(contract.tokenLogo || "");
  const [savedDeployerAddress, setSavedDeployerAddress] = useState(contract.deployerAddress || "");

  const [draftEtherscanContractName, setDraftEtherscanContractName] = useState(savedEtherscanContractName);
  const [draftTokenName, setDraftTokenName] = useState(savedTokenName);
  const [draftContractType, setDraftContractType] = useState(savedContractType);
  const [draftShortDescription, setDraftShortDescription] = useState(savedShortDescription);
  const [draftDescription, setDraftDescription] = useState(savedDescription);
  const [draftSummary, setDraftSummary] = useState(savedSummary);
  const [draftSignificance, setDraftSignificance] = useState(savedSignificance);
  const [draftContext, setDraftContext] = useState(savedContext);
  const [draftTokenLogo, setDraftTokenLogo] = useState(savedTokenLogo);
  const [draftDeployerAddress, setDraftDeployerAddress] = useState(savedDeployerAddress);
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([]);
  
  // People list for dropdown
  const [people, setPeople] = useState<Array<{ address: string; name: string; slug: string }>>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [creatingPerson, setCreatingPerson] = useState(false);

  useEffect(() => {
    // Reset drafts when navigating between contracts
    setSavedEtherscanContractName(contract.etherscanContractName || "");
    setSavedTokenName(contract.tokenName || "");
    setSavedContractType(contract.heuristics.contractType || "");
    setSavedShortDescription(contract.shortDescription || "");
    setSavedDescription(contract.description || "");
    setSavedSummary(contract.historicalSummary || "");
    setSavedSignificance(contract.historicalSignificance || "");
    setSavedContext(contract.historicalContext || "");
    setSavedTokenLogo(contract.tokenLogo || "");

    setDraftEtherscanContractName(contract.etherscanContractName || "");
    setDraftTokenName(contract.tokenName || "");
    setDraftContractType(contract.heuristics.contractType || "");
    setDraftShortDescription(contract.shortDescription || "");
    setDraftDescription(contract.description || "");
    setDraftSummary(contract.historicalSummary || "");
    setDraftSignificance(contract.historicalSignificance || "");
    setDraftContext(contract.historicalContext || "");
    setDraftTokenLogo(contract.tokenLogo || "");
    setDraftDeployerAddress(contract.deployerAddress || "");
    setDraftLinks([]);
    setEditMode(false);
    setSaveError(null);
    setShowAddPerson(false);
    setNewPersonName("");
  }, [contract.address]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setHistoryError(null);
      try {
        const res = await fetch(`/api/contract/${contract.address}/history`);
        const json = await res.json();
        if (cancelled) return;
        if (json?.error) {
          setHistoryError(String(json.error));
          setHistoryData(null);
          return;
        }
        const data = json.data as ContractHistoryData;
        setHistoryData(data);
        setDraftLinks(
          (data?.links || []).map((l) => ({
            clientId: String(l.id),
            id: l.id,
            contractAddress: l.contractAddress,
            title: l.title,
            url: l.url,
            source: l.source,
            note: l.note,
            createdAt: l.createdAt,
          }))
        );
      } catch {
        if (!cancelled) setHistoryError("Failed to load historical links.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [contract.address]);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      setLoadingMe(true);
      try {
        const res = await fetch("/api/historian/me");
        const json = await res.json();
        if (cancelled) return;
        setMe((json?.data as HistorianMe) || null);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPeople() {
      setLoadingPeople(true);
      try {
        const res = await fetch("/api/people");
        const json = await res.json();
        if (cancelled) return;
        if (json?.data?.people) {
          setPeople(json.data.people);
        }
      } catch {
        // Ignore errors
      } finally {
        if (!cancelled) setLoadingPeople(false);
      }
    }
    loadPeople();
    return () => {
      cancelled = true;
    };
  }, []);

  const canEdit = !!me?.active;

  const visibleLinks = useMemo(() => draftLinks.filter((l) => !l._deleted), [draftLinks]);
  const deletedIds = useMemo(
    () => draftLinks.filter((l) => l._deleted && l.id != null).map((l) => l.id as number),
    [draftLinks]
  );

  async function createNewPerson() {
    if (!newPersonName.trim() || !contract.deployerAddress) {
      setSaveError("Name and deployer address are required.");
      return;
    }
    setCreatingPerson(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: contract.deployerAddress.toLowerCase(),
          name: newPersonName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        const errorMsg = json?.error || `Failed to create person (${res.status})`;
        console.error("Error creating person:", errorMsg, json);
        setSaveError(errorMsg);
        setCreatingPerson(false);
        return;
      }
      if (!json?.data?.person) {
        console.error("Invalid response from API:", json);
        setSaveError("Invalid response from server.");
        setCreatingPerson(false);
        return;
      }
      // Add to people list and select it
      const newPerson = json.data.person;
      setPeople([...people, { address: newPerson.address, name: newPerson.name, slug: newPerson.slug }]);
      setDraftDeployerAddress(newPerson.address);
      setShowAddPerson(false);
      setNewPersonName("");
    } catch (error) {
      console.error("Exception creating person:", error);
      setSaveError(`Failed to create person: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setCreatingPerson(false);
    }
  }

  async function saveHistory() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/contract/${contract.address}/history/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract: {
            etherscanContractName: draftEtherscanContractName,
            tokenName: draftTokenName,
            contractType: draftContractType,
            shortDescription: draftShortDescription,
            description: draftDescription,
            historicalSummary: draftSummary,
            historicalSignificance: draftSignificance,
            historicalContext: draftContext,
            tokenLogo: draftTokenLogo,
            deployerAddress: draftDeployerAddress || null,
          },
          links: visibleLinks.map((l) => ({
            id: l.id,
            title: l.title,
            url: l.url,
            source: l.source,
            note: l.note,
          })),
          deleteIds: deletedIds,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        const errorMsg = json?.error || `Failed to save (${res.status})`;
        console.error("Save error:", errorMsg, json);
        setSaveError(errorMsg);
        return;
      }
      const updated = json.data as ContractHistoryData;
      setHistoryData(updated);
      setSavedEtherscanContractName(draftEtherscanContractName.trim());
      setSavedTokenName(draftTokenName.trim());
      setSavedContractType(draftContractType.trim());
      setSavedShortDescription(draftShortDescription.trim());
      setSavedDescription(draftDescription.trim());
      setSavedSummary(draftSummary.trim());
      setSavedSignificance(draftSignificance.trim());
      setSavedContext(draftContext.trim());
      setSavedTokenLogo(draftTokenLogo.trim());
      setSavedDeployerAddress(draftDeployerAddress.trim());
      setDraftLinks(
        (updated.links || []).map((l) => ({
          clientId: String(l.id),
          id: l.id,
          contractAddress: l.contractAddress,
          title: l.title,
          url: l.url,
          source: l.source,
          note: l.note,
          createdAt: l.createdAt,
        }))
      );
      setEditMode(false);
      
      // Refresh the page data to get updated contract fields from server
      // This ensures tokenName and other contract fields are updated in the UI
      // Use window.location.reload() since router is not available in this scope
      window.location.reload();
    } catch (error) {
      console.error("Exception saving history:", error);
      setSaveError(`Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  function addNewLink() {
    const clientId = `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setDraftLinks([
      ...draftLinks,
      {
        clientId,
        id: null,
        contractAddress: contract.address,
        title: null,
        url: "",
        source: null,
        note: null,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  return (
    <div className="space-y-6" id="history">
      {/* Historical narrative */}
      <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Historical Narrative</h2>
          <div className="flex items-center gap-2">
            {canEdit ? (
              editMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveHistory}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ether-600 hover:bg-ether-500 text-sm text-white disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving…" : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  disabled={loadingMe}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300"
                >
                  Edit
                </button>
              )
            ) : (
              <Link
                href={`/historian/login?next=${encodeURIComponent(`/contract/${contract.address}#history`)}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300 hover:text-obsidian-100"
              >
                <LogIn className="w-4 h-4" />
                Historian login
              </Link>
            )}
          </div>
        </div>

        {saveError && <div className="mb-3 text-sm text-red-400">{saveError}</div>}

        {editMode ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Etherscan contract name</div>
              <input
                value={draftEtherscanContractName}
                onChange={(e) => setDraftEtherscanContractName(e.target.value)}
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="Optional display name override"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-obsidian-500 mb-1">Token name</div>
                <input
                  value={draftTokenName}
                  onChange={(e) => setDraftTokenName(e.target.value)}
                  className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                  placeholder="Optional"
                />
              </div>
              <div>
                <div className="text-xs text-obsidian-500 mb-1">Contract type</div>
                <input
                  value={draftContractType}
                  onChange={(e) => setDraftContractType(e.target.value)}
                  className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                  placeholder="e.g. erc20, exchange, dao, proxy…"
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Deployer</div>
              {showAddPerson ? (
                <div className="space-y-2 p-3 rounded-lg bg-obsidian-900/50 border border-obsidian-800">
                  <div className="text-xs text-obsidian-400 mb-1">
                    Creating person for: <span className="font-mono">{formatAddress(contract.deployerAddress || "")}</span>
                  </div>
                  <input
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                    placeholder="Person name"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={createNewPerson}
                      disabled={creatingPerson || !newPersonName.trim() || !contract.deployerAddress}
                      className="px-3 py-1.5 rounded-lg bg-ether-600 hover:bg-ether-500 text-sm text-white disabled:opacity-50"
                    >
                      {creatingPerson ? "Creating..." : "Create & Select"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPerson(false);
                        setNewPersonName("");
                      }}
                      className="px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={draftDeployerAddress}
                    onChange={(e) => setDraftDeployerAddress(e.target.value)}
                    className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                  >
                    <option value="">None / Unknown</option>
                    {loadingPeople ? (
                      <option disabled>Loading...</option>
                    ) : (
                      people.map((p) => (
                        <option key={p.address} value={p.address}>
                          {p.name} ({formatAddress(p.address)})
                        </option>
                      ))
                    )}
                  </select>
                  {contract.deployerAddress && (
                    <button
                      type="button"
                      onClick={() => setShowAddPerson(true)}
                      className="text-xs text-ether-400 hover:text-ether-300"
                    >
                      + Add New Person for this Deployer
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Short description</div>
              <input
                value={draftShortDescription}
                onChange={(e) => setDraftShortDescription(e.target.value)}
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="One-line summary (used on homepage cards)"
              />
            </div>
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Description</div>
              <MarkdownEditor
                value={draftDescription}
                onChange={setDraftDescription}
                placeholder="Longer description (overview / details)"
                minHeight="120px"
              />
            </div>
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Contract image URL</div>
              <input
                value={draftTokenLogo}
                onChange={(e) => setDraftTokenLogo(e.target.value)}
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="Optional image URL (shown next to the contract name)"
              />
              <div className="text-xs text-obsidian-500 mt-1">
                Tip: this uses the existing <code className="font-mono">tokenLogo</code> field so it renders immediately.
              </div>
            </div>
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Summary</div>
              <MarkdownEditor
                value={draftSummary}
                onChange={setDraftSummary}
                placeholder="What is this contract, historically?"
                minHeight="120px"
              />
            </div>
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Historical Significance</div>
              <MarkdownEditor
                value={draftSignificance}
                onChange={setDraftSignificance}
                placeholder="Why does it matter?"
                minHeight="100px"
              />
            </div>
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Context</div>
              <MarkdownEditor
                value={draftContext}
                onChange={setDraftContext}
                placeholder="What was happening around this time?"
                minHeight="100px"
              />
            </div>
          </div>
        ) : savedShortDescription || savedDescription || savedSummary ? (
          <div className="prose prose-invert max-w-none">
            {savedShortDescription && (
              <p className="text-obsidian-300 leading-relaxed mb-4">
                {savedShortDescription}
              </p>
            )}

            {savedDescription && (
              <div className="mb-4">
                <MarkdownRenderer content={savedDescription} />
              </div>
            )}

            {savedSummary && (
              <div className="mb-4">
                <MarkdownRenderer content={savedSummary} />
              </div>
            )}

            {savedSignificance && (
              <>
                <h3 className="text-base font-medium text-obsidian-200 mt-6 mb-2">
                  Historical Significance
                </h3>
                <MarkdownRenderer content={savedSignificance} />
              </>
            )}

            {savedContext && (
              <>
                <h3 className="text-base font-medium text-obsidian-200 mt-6 mb-2">
                  Context
                </h3>
                <MarkdownRenderer content={savedContext} />
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

      {/* Historical links */}
      <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold">Historical Links</h3>
          {editMode && (
            <button
              type="button"
              onClick={addNewLink}
              className="px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300"
            >
              Add link
            </button>
          )}
        </div>

        {historyError && <div className="text-sm text-red-400">{historyError}</div>}

        {!editMode && (historyData?.links?.length || 0) === 0 ? (
          <div className="text-sm text-obsidian-500">No links yet.</div>
        ) : (
          <div className="space-y-3">
            {(editMode ? visibleLinks : (historyData?.links || []).map((l) => ({
              clientId: String(l.id),
              id: l.id,
              contractAddress: l.contractAddress,
              title: l.title,
              url: l.url,
              source: l.source,
              note: l.note,
              createdAt: l.createdAt,
            }))).map((l) => (
              <div
                key={l.clientId}
                className="rounded-xl border border-obsidian-800 bg-obsidian-900/20 p-4"
              >
                {editMode ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={l.title || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftLinks((prev) =>
                            prev.map((x) => (x.clientId === l.clientId ? { ...x, title: v || null } : x))
                          );
                        }}
                        className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none"
                        placeholder="Title (optional)"
                      />
                      <input
                        value={l.source || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftLinks((prev) =>
                            prev.map((x) => (x.clientId === l.clientId ? { ...x, source: v || null } : x))
                          );
                        }}
                        className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none"
                        placeholder="Source (optional)"
                      />
                    </div>
                    <input
                      value={l.url}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftLinks((prev) =>
                          prev.map((x) => (x.clientId === l.clientId ? { ...x, url: v } : x))
                        );
                      }}
                      className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none"
                      placeholder="URL"
                    />
                    <textarea
                      value={l.note || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftLinks((prev) =>
                          prev.map((x) => (x.clientId === l.clientId ? { ...x, note: v || null } : x))
                        );
                      }}
                      className="w-full min-h-[70px] rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none"
                      placeholder="Note (optional)"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftLinks((prev) =>
                            prev.map((x) => (x.clientId === l.clientId ? { ...x, _deleted: true } : x))
                          );
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-sm text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-ether-400 hover:text-ether-300 break-words"
                      >
                        {l.title || l.url}
                        <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                      {(l.source || l.note) && (
                        <div className="mt-1 text-xs text-obsidian-500">
                          {l.source ? <span>{l.source}</span> : null}
                          {l.source && l.note ? <span> • </span> : null}
                          {l.note ? <span className="text-obsidian-400">{l.note}</span> : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
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
          <a
            href="https://discord.gg/3KV6dt2euF"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-obsidian-200 text-sm"
          >
            Request Historian access on Discord
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
