"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Database,
  LogIn,
  Save,
  X,
  Trash2,
  ArrowLeftRight,
  CodeXml,
  Search,
  Loader2,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { encodeFunctionData, decodeFunctionResult, createWalletClient, createPublicClient, custom, http, parseEther } from "viem";
import { mainnet } from "viem/chains";
import { Header } from "@/components/Header";
import { DonationBanner } from "@/components/DonationBanner";
import { AddressSearch } from "@/components/AddressSearch";
import { getFrontierRegistrarEntry, REGISTRAR_INFO } from "@/lib/frontier-registrar";
import { usePageView, useTrackEvent } from "@/lib/useAnalytics";
import { SuggestEditForm } from "@/components/SuggestEditForm";
import ShareOnX from "@/components/ShareOnX";
import { EraCompact } from "@/components/EraTimeline";
import { SimilarityTable, SimilarityDetail } from "@/components/SimilarityTable";
import { BytecodeViewer } from "@/components/BytecodeViewer";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { CONTRACT_CATEGORY_OPTIONS } from "@/lib/contract-categories";
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
import type { ContractHistoryData, ContractPageData, ContractMedia, HistorianMe, HistoricalLink, UnifiedSearchResult, UnifiedSearchResponse, ProxyInfo } from "@/types";
import { ContractMediaGallery } from "@/components/ContractMedia";
import { VerificationProofCard } from "@/components/VerificationProofCard";

interface ContractPageClientProps {
  address: string;
  data: ContractPageData | null;
  error: string | null;
}

// Max characters for the header short description display.
const SHORT_DESCRIPTION_MAX_CHARS = 160;

export function ContractPageClient({ address, data, error }: ContractPageClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [me, setMe] = useState<HistorianMe | null>(null);
  // Hash-based tab persistence: read from URL hash on mount, update hash on change
  const validTabs = useMemo(() => new Set(["overview", "history", "code", "siblings", "interact"] as const), []);
  type TabId = "overview" | "history" | "code" | "siblings"  | "interact";
  const [activeTab, setActiveTabRaw] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hash.replace("#", "") as TabId;
      if (validTabs.has(h)) return h;
    }
    return "overview";
  });

  type SiblingContract = {
    address: string;
    etherscanContractName: string | null;
    tokenName: string | null;
    ensName: string | null;
    deploymentBlock: number | null;
    deploymentTimestamp: string | null;
    verificationMethod: string | null;
    canonicalAddress: string | null;
    codeSizeBytes: number | null;
  };
  // Siblings (same bytecode) state
  const [verifiedBy, setVerifiedBy] = useState<{ name: string; editedAt: string } | null>(null);

  const [siblings, setSiblings] = useState<{
    hash: string | null;
    count: number;
    groupVerified: boolean;
    groupVerificationMethod: string | null;
    groupDocumented: boolean;
    groupName: string | null;
    groupContractType: string | null;
    contracts: SiblingContract[];
    hasMore: boolean;
  } | null>(null);
  const [siblingsLoading, setSiblingsLoading] = useState(false);

  // ABI availability check for "Interact" tab
  type AbiData = {
    abi: string;
    source: "direct" | "sibling";
    siblingAddress?: string;
  } | null;
  const [abiData, setAbiData] = useState<AbiData | undefined>(undefined); // undefined = loading

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabRaw(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.hash = tab === "overview" ? "" : tab;
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Listen for back/forward navigation hash changes
  useEffect(() => {
    function onHashChange() {
      const h = window.location.hash.replace("#", "") as TabId;
      if (validTabs.has(h)) {
        setActiveTabRaw(h);
      } else {
        setActiveTabRaw("overview");
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [validTabs]);

  usePageView(`/contract/${address}`, address);
  const trackEvent = useTrackEvent();

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

  // Load verifiedBy attribution (who first set verificationMethod)
  useEffect(() => {
    let cancelled = false;
    async function loadVerifiedBy() {
      try {
        const res = await fetch(`/api/contract/${address}/edits`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const edits: Array<{ historianName: string; fieldsChanged: string[]; editedAt: string }> =
          json?.data?.edits || [];
        const proofEdit = edits.find(
          (e) => Array.isArray(e.fieldsChanged) && e.fieldsChanged.includes("verificationMethod")
        );
        if (proofEdit) {
          setVerifiedBy({ name: proofEdit.historianName, editedAt: proofEdit.editedAt });
        }
      } catch {
        // non-fatal
      }
    }
    loadVerifiedBy();
    return () => { cancelled = true; };
  }, [address]);

  // Load siblings (same bytecode contracts)
  useEffect(() => {
    let cancelled = false;
    async function loadSiblings() {
      try {
        const res = await fetch(`/api/contracts/${address}/siblings`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setSiblings(json);
      } catch {
        // non-fatal
      }
    }
    loadSiblings();
    return () => { cancelled = true; };
  }, [address]);

  // Load ABI availability
  useEffect(() => {
    let cancelled = false;
    async function loadAbi() {
      try {
        const res = await fetch(`/api/contract/${address}/abi`);
        const json = await res.json();
        if (cancelled) return;
        setAbiData(json?.data ?? null);
      } catch {
        if (!cancelled) setAbiData(null);
      }
    }
    loadAbi();
    return () => { cancelled = true; };
  }, [address]);

  const loadMoreSiblings = useCallback(async () => {
    if (!siblings || siblingsLoading) return;
    setSiblingsLoading(true);
    try {
      const offset = siblings.contracts.length;
      const res = await fetch(`/api/contracts/${address}/siblings?offset=${offset}`);
      if (!res.ok) return;
      const json = await res.json();
      setSiblings(prev => prev ? {
        ...json,
        contracts: [...prev.contracts, ...json.contracts],
      } : json);
    } catch {
      // non-fatal
    } finally {
      setSiblingsLoading(false);
    }
  }, [address, siblings, siblingsLoading]);

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
    media,
    proxyInfo,
  } = data!;

  const frontierEntry = getFrontierRegistrarEntry(address);
  const displayName = frontierEntry?.name || contract.tokenName || contract.ensName || contract.etherscanContractName || null;
  const title = displayName || `Contract ${formatAddress(address, 12)}`;
  const shortDescriptionText = contract.shortDescription?.trim();
  const shortDescriptionDisplay = shortDescriptionText
    ? truncateText(shortDescriptionText, SHORT_DESCRIPTION_MAX_CHARS)
    : null;

  return (
    <div className="min-h-screen">
      <Header showHistorianLogin={!me} />
      <DonationBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
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
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-1">
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
                {frontierEntry && (() => {
                  const info = REGISTRAR_INFO[frontierEntry.registrar];
                  return (
                    <div className="relative group/namereg">
                      <span className="text-sm px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/40 cursor-help">
                        {info.label}
                      </span>
                      {/* Hover tooltip */}
                      <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover/namereg:block w-72 rounded-lg border border-amber-700/40 bg-obsidian-900 p-3 shadow-xl text-sm">
                        <div className="font-semibold text-amber-400 mb-1">{info.label}</div>
                        <div className="text-obsidian-300 leading-relaxed mb-2">{info.description}</div>
                        <a
                          href={info.etherscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-obsidian-400 hover:text-amber-400 font-mono break-all transition-colors"
                          onClick={e => e.stopPropagation()}
                          title="View registrar contract"
                        >
                          {info.address} ↗
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Address */}
              <div className="flex items-center gap-2">
                <code className="text-md text-obsidian-300 font-mono">
                  {formatAddress(address, 12)}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-obsidian-800 transition-colors"
                  title="Copy full address"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-obsidian-500" />
                  )}
                </button>
                <a
                  href={etherscanUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-obsidian-800 transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-3 h-3 text-obsidian-500" />
                </a>
              </div>

              {/* ENS */}
              {contract.ensName && (
                <div className="mt-1 text-sm text-ether-400">{contract.ensName}</div>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              {contract.eraId && <EraCompact eraId={contract.eraId} showLabel />}
              {(contract.codeSizeBytes === 0 || contract.runtimeBytecode === '0x' || contract.runtimeBytecode === '') && contract.deployStatus === 'success' ? (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20" title="A zombie account — deployed with empty init code (input=0x). The tx succeeded but no bytecode was written. Per Ethereum Yellow Paper §7.1.">
                  Zombie Account
                </span>
              ) : (contract.codeSizeBytes === 0 || contract.runtimeBytecode === '0x' || contract.runtimeBytecode === '') ? (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20" title="The deployment transaction failed — no contract code was written to this address">
                  Failed Deploy
                </span>
              ) : contract.deploymentRank != null && contract.deploymentRank <= 1_000_000 ? (
                <span className="px-2 py-1 rounded-md text-xs font-medium font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {contract.deploymentRank <= 9_999
                    ? `Contract #${contract.deploymentRank.toLocaleString()}`
                    : contract.deploymentRank <= 999_999
                    ? `Contract #${Math.floor(contract.deploymentRank / 1000)}K`
                    : `Contract #${(contract.deploymentRank / 1_000_000).toFixed(1)}M`}
                </span>
              ) : null}
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${getVerificationStatusColor(
                  contract.verificationStatus
                )}`}
              >
                {getVerificationStatusLabel(contract.verificationStatus, contract.verificationMethod)}
              </span>

              {/* Edit CTA — visible to logged-out users only */}
              {!me && (
                <Link
                  href={`/historian/login?next=${encodeURIComponent(`/contract/${address}#history`)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-ether-900/30 text-ether-400 border border-ether-500/30 hover:bg-ether-900/50 hover:text-ether-300 transition-colors"
                >
                  <LogIn className="w-3 h-3" />
                  Edit this contract
                </Link>
              )}
            </div>
          </div>

          {contract.isInheritedVerification && contract.canonicalAddress && (
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-3 mt-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 flex-none mt-0.5" />
              <div>
                <p className="text-sm text-blue-300 font-medium">Bytecode verified via sibling</p>
                <p className="text-xs text-obsidian-400 mt-1">
                  This contract shares identical runtime bytecode with{" "}
                  <Link href={`/contract/${contract.canonicalAddress}`} className="text-blue-400 hover:underline">
                    {contract.canonicalContractName || "a verified contract"} ({contract.canonicalAddress.slice(0,10)}...)
                  </Link>
                  {" "}which has been verified through compiler archaeology.
                </p>
              </div>
            </div>
          )}

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

          {shortDescriptionDisplay && (
                <p
                  className="mt-4 text-lg text-obsidian-400 max-w-2xl"
                  title={shortDescriptionText}
                >
                  {shortDescriptionDisplay}
                </p>
              )}

          {/* Undocumented callout */}
          {!contract.shortDescription && !contract.description && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-300 font-medium">This contract is not yet documented</p>
                <p className="text-xs text-obsidian-400 mt-1">
                  Know something about this contract? Switch to the History tab and suggest an edit to help preserve Ethereum history.
                </p>
              </div>
            </div>
          )}

          {/* Action buttons: Share, Embed, Compare */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ShareOnX
              contractAddress={address}
              contractName={title}
              eraId={contract.eraId}
              shortDescription={contract.shortDescription}
              deploymentTimestamp={contract.deploymentTimestamp}
            />
            <EmbedButton address={address} />
            <CompareButton sourceAddress={address} />
          </div>
        </motion.div>

        {/* Tabs (scrollable on mobile) */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-6 border-b border-obsidian-800">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => { setActiveTab("overview"); trackEvent({ eventType: "tab_click", pagePath: `/contract/${address}`, contractAddress: address, eventData: { tab: "overview" } }); }}
              icon={<Info className="w-4 h-4" />}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === "history"}
              onClick={() => { setActiveTab("history"); trackEvent({ eventType: "tab_click", pagePath: `/contract/${address}`, contractAddress: address, eventData: { tab: "history" } }); }}
              icon={<History className="w-4 h-4" />}
            >
              History
            </TabButton>
            <TabButton
              active={activeTab === "code"}
              onClick={() => { setActiveTab("code"); trackEvent({ eventType: "tab_click", pagePath: `/contract/${address}`, contractAddress: address, eventData: { tab: "code" } }); }}
              icon={<FileCode className="w-4 h-4" />}
            >
              Code
              {(contract.sourcifyMatch || contract.etherscanVerified || contract.verificationMethod === "etherscan_verified" || contract.verificationMethod === "exact_bytecode_match" || contract.verificationMethod === "near_exact_match" || contract.verificationMethod === "author_published_source") && (
                <span className="ml-1 text-green-400" title="Verified source available">✓</span>
              )}
            </TabButton>
            {siblings && siblings.count > 0 && (
              <TabButton
                active={activeTab === "siblings"}
                onClick={() => { setActiveTab("siblings"); trackEvent({ eventType: "tab_click", pagePath: `/contract/${address}`, contractAddress: address, eventData: { tab: "siblings" } }); }}
                icon={<Copy className="w-4 h-4" />}
              >
                Same Bytecode{" "}
                <span className="ml-1 rounded-full bg-obsidian-700 px-1.5 py-0.5 text-xs font-mono text-obsidian-300">
                  {siblings.count}
                </span>
              </TabButton>
            )}
            {abiData && (
              <TabButton
                active={activeTab === "interact"}
                onClick={() => { setActiveTab("interact"); trackEvent({ eventType: "tab_click", pagePath: `/contract/${address}`, contractAddress: address, eventData: { tab: "interact" } }); }}
                icon={<BookOpen className="w-4 h-4" />}
              >
                Interact
              </TabButton>
            )}
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
              media={media ?? []}
              proxyInfo={proxyInfo}
              verifiedBy={verifiedBy}
            />
          )}
          {activeTab === "history" && (
            <div className="min-w-0 space-y-6">
              <HistoricalDocsSection contract={contract} />
              <EditHistorySection contractAddress={address} />
              {me?.active && (
                <MediaUploadSection contractAddress={address} />
              )}
              <SuggestEditForm contractAddress={address} />
            </div>
          )}
          {activeTab === "code" && (
            <>
              {/* Inline verification badges — visible immediately on mobile */}
              {(contract.sourcifyMatch || contract.etherscanVerified || contract.verificationMethod === "etherscan_verified" || contract.sourceCode) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(contract.etherscanVerified || contract.verificationMethod === "etherscan_verified") && (
                    <a
                      href={`https://etherscan.io/address/${contract.address}#code`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Verified on Etherscan
                    </a>
                  )}
                  {contract.sourcifyMatch && (
                    <a
                      href={`https://repo.sourcify.dev/1/${contract.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Verified on Sourcify
                    </a>
                  )}
                  {contract.verificationProofUrl && (
                    <a
                      href={contract.verificationProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-ether-500/10 text-ether-400 border border-ether-500/20 hover:bg-ether-500/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Proof
                    </a>
                  )}
                </div>
              )}
            <CodeTab
              bytecode={contract.runtimeBytecode}
              analysis={bytecodeAnalysis}
              patterns={detectedPatterns}
              signatures={functionSignatures}
              decompiledCode={contract.decompiledCode}
              decompilationSuccess={contract.decompilationSuccess}
              sourceCode={contract.sourceCode}
              abi={contract.abi}
              isInheritedVerification={contract.isInheritedVerification}
              proxyInfo={proxyInfo}
            />
            </>
          )}
          {activeTab === "siblings" && siblings && siblings.count > 0 && (
            <SiblingBytecodeTab siblings={siblings} currentAddress={address} onLoadMore={loadMoreSiblings} loadingMore={siblingsLoading} />
          )}
          {activeTab === "interact" && abiData && (
            <ReadContractPanel address={address} abiData={abiData} currentBalanceWei={contract.currentBalanceWei} isSelfDestructed={contract.codeSizeBytes === 0 && contract.deployStatus === 'success'} />
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

// =============================================================================
// Interact Panel
// =============================================================================

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

type AbiItem = {
  name: string;
  type: string;
  stateMutability?: string | null;
  constant?: boolean; // legacy pre-2016 ABI format uses constant:true instead of stateMutability:"view"
  payable?: boolean; // legacy ABI format
  inputs: Array<{ name: string; type: string; internalType?: string }>;
  outputs: Array<{ name: string; type: string; internalType?: string }>;
};

const isReadFunction = (item: AbiItem) =>
  item.type === "function" &&
  (item.stateMutability === "view" ||
    item.stateMutability === "pure" ||
    (item.constant === true && !item.stateMutability));

const isWriteFunction = (item: AbiItem) =>
  item.type === "function" &&
  (item.stateMutability === "nonpayable" ||
    item.stateMutability === "payable" ||
    (item.stateMutability == null && item.constant !== true));

const RISKY_FUNCTION_KEYWORDS = ["withdraw", "payout", "claim", "drain"];

const isRiskyFunction = (fn: AbiItem): boolean => {
  const nameLower = fn.name.toLowerCase();
  // Only flag functions whose primary purpose is moving ETH out — not generic transfer/send
  return RISKY_FUNCTION_KEYWORDS.some((kw) => nameLower === kw || nameLower.startsWith(kw));
};

function formatReturnValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return "null";
  if (type === "bool") return value ? "✓ true" : "✗ false";
  if (type === "address") return String(value);
  if (type.startsWith("uint") || type.startsWith("int")) {
    try {
      return BigInt(value as string | number | bigint).toLocaleString();
    } catch {
      return String(value);
    }
  }
  if (type === "string") return `"${String(value)}"`;
  if (type.startsWith("bytes")) return String(value);
  return String(value);
}

const ARRAY_PREVIEW_LIMIT = 10;

function ArrayValueDisplay({ items, itemType }: { items: unknown[]; itemType: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, ARRAY_PREVIEW_LIMIT);
  const hidden = items.length - ARRAY_PREVIEW_LIMIT;
  return (
    <div className="space-y-0.5">
      <div className="text-obsidian-500 text-xs mb-1">{itemType}[{items.length}]</div>
      {visible.map((item, i) => (
        <div key={i} className="text-sm font-mono break-all text-obsidian-200">
          <span className="text-obsidian-600 mr-1.5 select-none">[{i}]</span>
          {formatReturnValue(item, itemType)}
        </div>
      ))}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-ether-400 hover:text-ether-300 mt-1"
        >
          + {hidden} more items — expand
        </button>
      )}
      {expanded && items.length > ARRAY_PREVIEW_LIMIT && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-obsidian-500 hover:text-obsidian-300 mt-1"
        >
          collapse
        </button>
      )}
    </div>
  );
}

function ReturnValueDisplay({ value, outputs }: { value: unknown; outputs: AbiItem["outputs"] }) {
  if (outputs.length === 0) return <span className="text-obsidian-500 text-xs italic">void</span>;

  if (outputs.length === 1) {
    const type = outputs[0].type;
    const name = outputs[0].name;

    // Array return type
    if (Array.isArray(value)) {
      const itemType = type.replace(/\[\d*\]$/, "") || "bytes32";
      return (
        <div>
          {name && <div className="text-obsidian-500 text-xs mb-1">{name}</div>}
          <ArrayValueDisplay items={value} itemType={itemType} />
        </div>
      );
    }

    const formatted = formatReturnValue(value, type);
    return (
      <div className="text-sm font-mono break-all">
        {name && <span className="text-obsidian-500 mr-1">{name}:</span>}
        <span className="text-obsidian-500 mr-1">{type}:</span>
        {type === "address" ? (
          <span className="text-ether-400">{formatted}</span>
        ) : type === "bool" ? (
          <span className={(value as boolean) ? "text-green-400" : "text-red-400"}>{formatted}</span>
        ) : (
          <span className="text-obsidian-200">{formatted}</span>
        )}
      </div>
    );
  }

  // Multiple outputs (tuple-like)
  const values = Array.isArray(value) ? (value as unknown[]) : [value];
  return (
    <div className="space-y-1 text-sm font-mono">
      {outputs.map((out, i) => {
        const val = values[i];
        if (Array.isArray(val)) {
          const itemType = out.type.replace(/\[\d*\]$/, "") || "bytes32";
          return (
            <div key={i}>
              {out.name && <div className="text-obsidian-500 text-xs mb-1">{out.name}</div>}
              <ArrayValueDisplay items={val} itemType={itemType} />
            </div>
          );
        }
        const formatted = formatReturnValue(val, out.type);
        return (
          <div key={i} className="break-all">
            {out.name && <span className="text-obsidian-500 mr-1">{out.name}:</span>}
            <span className="text-obsidian-500 mr-1">{out.type}:</span>
            <span className="text-obsidian-200">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}

function FunctionInput({
  input,
  value,
  onChange,
}: {
  input: AbiItem["inputs"][0];
  value: string;
  onChange: (v: string) => void;
}) {
  const type = input.type;

  if (type === "bool") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-1.5 text-sm text-obsidian-100 outline-none focus:border-ether-500/50"
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  return (
    <input
      type={type.startsWith("uint") || type.startsWith("int") ? "text" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={
        type.startsWith("uint") || type.startsWith("int")
          ? "0"
          : type === "address"
          ? "0x..."
          : type.startsWith("bytes")
          ? "0x..."
          : type.endsWith("[]")
          ? "comma-separated"
          : ""
      }
      className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-1.5 text-sm text-obsidian-100 font-mono outline-none focus:border-ether-500/50"
    />
  );
}

function parseInputValue(value: string, type: string): unknown {
  if (type === "bool") return value === "true";
  if (type.startsWith("uint") || type.startsWith("int")) {
    return BigInt(value.trim());
  }
  if (type.endsWith("[]")) {
    const baseType = type.slice(0, -2);
    return value.split(",").map((v) => parseInputValue(v.trim(), baseType));
  }
  return value.trim();
}

function FunctionRow({
  fn,
  address,
  autoCall,
  isSelfDestructed,
}: {
  fn: AbiItem;
  address: string;
  autoCall: boolean;
  isSelfDestructed?: boolean;
}) {
  const [inputValues, setInputValues] = useState<string[]>(
    fn.inputs.map((i) => (i.type === "bool" ? "true" : ""))
  );
  const [result, setResult] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calledRef = useRef(false);

  const callFn = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(undefined);
    try {
      // Parse inputs
      const args = fn.inputs.map((inp, i) => parseInputValue(inputValues[i] ?? "", inp.type));

      // Encode call data using viem
      const data = encodeFunctionData({
        abi: [fn] as Parameters<typeof encodeFunctionData>[0]["abi"],
        functionName: fn.name,
        args,
      });

      const rpcRes = await fetch("https://eth.drpc.org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: address, data }, "latest"],
        }),
      });

      const rpcJson = await rpcRes.json();
      if (rpcJson.error) {
        setError(rpcJson.error.message || "RPC error");
        return;
      }

      const rawResult = rpcJson.result as `0x${string}`;
      if (!rawResult || rawResult === "0x") {
        setError(isSelfDestructed
          ? "This contract has self-destructed and is no longer executable on-chain."
          : "No data returned by this function.");
        return;
      }

      // Decode result using viem
      const decoded = decodeFunctionResult({
        abi: [fn] as Parameters<typeof decodeFunctionResult>[0]["abi"],
        functionName: fn.name,
        data: rawResult,
      });

      setResult(decoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fn, address, inputValues]);

  // Auto-call zero-argument functions
  useEffect(() => {
    if (autoCall && fn.inputs.length === 0 && !calledRef.current) {
      calledRef.current = true;
      callFn();
    }
  }, [autoCall, fn.inputs.length, callFn]);

  const hasInputs = fn.inputs.length > 0;

  return (
    <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-4">
      <div className="font-mono text-sm text-obsidian-200 font-medium mb-2">
        {fn.name}
        <span className="text-obsidian-600 ml-1 font-normal text-xs">
          ({fn.inputs.map((i) => `${i.type} ${i.name}`).join(", ")})
          {fn.outputs.length > 0 && (
            <> → {fn.outputs.map((o) => o.type).join(", ")}</>
          )}
        </span>
      </div>

      {hasInputs && (
        <div className="space-y-2 mb-3">
          {fn.inputs.map((inp, i) => (
            <div key={i}>
              <label className="block text-xs text-obsidian-500 mb-1">
                {inp.name || `arg${i}`} <span className="text-obsidian-600">({inp.type})</span>
              </label>
              <FunctionInput
                input={inp}
                value={inputValues[i] ?? ""}
                onChange={(v) => {
                  const next = [...inputValues];
                  next[i] = v;
                  setInputValues(next);
                }}
              />
            </div>
          ))}
          <button
            onClick={callFn}
            disabled={loading}
            className="mt-1 px-4 py-1.5 rounded-lg bg-ether-600 hover:bg-ether-500 disabled:opacity-50 text-sm text-white font-medium transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Call
          </button>
        </div>
      )}

      {/* Result area */}
      <div className="mt-2 min-h-[24px]">
        {loading && !hasInputs && (
          <div className="flex items-center gap-2 text-obsidian-500 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Calling…
          </div>
        )}
        {error && (
          <div className="text-xs text-red-400 bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/20">
            {error}
          </div>
        )}
        {!loading && !error && result !== undefined && (
          <div className="bg-obsidian-950 rounded-lg px-3 py-2 border border-obsidian-800">
            <ReturnValueDisplay value={result} outputs={fn.outputs} />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Write Function Row
// =============================================================================

function WriteFunctionRow({
  fn,
  address,
  walletAddress,
}: {
  fn: AbiItem;
  address: string;
  walletAddress: string | null;
}) {
  const [inputValues, setInputValues] = useState<string[]>(
    fn.inputs.map((i) => (i.type === "bool" ? "true" : ""))
  );
  const [ethValue, setEthValue] = useState("");
  const [status, setStatus] = useState<"idle" | "simulating" | "sending" | "waiting" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [showPayableConfirm, setShowPayableConfirm] = useState(false);

  const isPayable = fn.stateMutability === "payable" || fn.payable === true;
  const isDisabled = !walletAddress;
  const isRisky = isRiskyFunction(fn);

  const estimateGas = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const args = fn.inputs.map((inp, i) => parseInputValue(inputValues[i] ?? "", inp.type));
      const publicClient = createPublicClient({ chain: mainnet, transport: http("https://eth.drpc.org") });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gas = await publicClient.estimateContractGas({
        address: address as `0x${string}`,
        abi: [fn] as Parameters<typeof publicClient.estimateContractGas>[0]["abi"],
        functionName: fn.name,
        args,
        account: walletAddress as `0x${string}`,
        value: (ethValue && isPayable ? parseEther(ethValue) : undefined),
      } as Parameters<typeof publicClient.estimateContractGas>[0]);
      setGasEstimate(gas.toLocaleString());
    } catch {
      setGasEstimate(null);
    }
  }, [fn, address, walletAddress, inputValues, ethValue, isPayable]);

  const sendTx = useCallback(async () => {
    if (!walletAddress || !window.ethereum) return;
    setError(null);
    setTxHash(null);
    setStatus("simulating");
    try {
      const args = fn.inputs.map((inp, i) => parseInputValue(inputValues[i] ?? "", inp.type));
      const publicClient = createPublicClient({ chain: mainnet, transport: http("https://eth.drpc.org") });
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: mainnet,
        transport: custom(window.ethereum),
      });

      const { request } = await publicClient.simulateContract({
        address: address as `0x${string}`,
        abi: [fn] as Parameters<typeof publicClient.simulateContract>[0]["abi"],
        functionName: fn.name,
        args,
        account: walletAddress as `0x${string}`,
        value: (ethValue && isPayable ? parseEther(ethValue) : undefined),
      } as Parameters<typeof publicClient.simulateContract>[0]);

      setStatus("sending");
      const hash = await walletClient.writeContract(request);
      setTxHash(hash);

      setStatus("waiting");
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      const e = err as { shortMessage?: string; message?: string };
      setError(e.shortMessage || e.message || "Transaction failed");
    }
  }, [fn, address, walletAddress, inputValues, ethValue, isPayable]);

  const handleSendClick = useCallback(() => {
    // If payable and ETH value > 0, show confirmation modal first
    if (isPayable && ethValue && parseFloat(ethValue) > 0) {
      setShowPayableConfirm(true);
      return;
    }
    sendTx();
  }, [isPayable, ethValue, sendTx]);

  return (
    <div className={`rounded-xl border p-4 transition-opacity ${isDisabled ? "border-obsidian-800 bg-obsidian-900/20 opacity-60" : "border-obsidian-700 bg-obsidian-900/30"}`}>
      {/* Payable confirmation modal */}
      {showPayableConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-obsidian-900 shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-obsidian-100 mb-1">
                  You are about to send {ethValue} ETH
                </h3>
                <p className="text-sm text-obsidian-400 leading-relaxed">
                  This transaction cannot be undone. ETH sent to a contract may be permanently locked if the contract has no withdrawal mechanism.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPayableConfirm(false)}
                className="px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-800 hover:bg-obsidian-700 text-sm text-obsidian-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPayableConfirm(false);
                  sendTx();
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm text-white font-medium transition-colors"
              >
                Confirm &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="font-mono text-sm text-obsidian-200 font-medium mb-2 flex flex-wrap items-center gap-1.5">
        {fn.name}
        <span className="text-obsidian-600 font-normal text-xs">
          ({fn.inputs.map((i) => `${i.type} ${i.name}`).join(", ")})
        </span>
        {isPayable && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
            payable
          </span>
        )}
        {isRisky && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
            ⚠ May transfer ETH
          </span>
        )}
      </div>

      {fn.inputs.length > 0 && (
        <div className="space-y-2 mb-3">
          {fn.inputs.map((inp, i) => (
            <div key={i}>
              <label className="block text-xs text-obsidian-500 mb-1">
                {inp.name || `arg${i}`} <span className="text-obsidian-600">({inp.type})</span>
              </label>
              <FunctionInput
                input={inp}
                value={inputValues[i] ?? ""}
                onChange={(v) => {
                  const next = [...inputValues];
                  next[i] = v;
                  setInputValues(next);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {isPayable && (
        <div className="mb-3">
          <label className="block text-xs text-obsidian-500 mb-1">ETH value to send</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={ethValue}
              onChange={(e) => setEthValue(e.target.value)}
              placeholder="0.0"
              className="w-full rounded-lg bg-obsidian-900/50 border border-amber-500/30 px-3 py-1.5 text-sm text-obsidian-100 font-mono outline-none focus:border-amber-500/60"
            />
            <span className="text-xs text-obsidian-400 font-medium shrink-0">ETH</span>
          </div>
        </div>
      )}

      {!isDisabled && (
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={handleSendClick}
            disabled={status === "simulating" || status === "sending" || status === "waiting"}
            className="px-4 py-1.5 rounded-lg bg-ether-600 hover:bg-ether-500 disabled:opacity-50 text-sm text-white font-medium transition-colors flex items-center gap-2"
          >
            {(status === "simulating" || status === "sending" || status === "waiting") && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {status === "simulating" ? "Simulating…" : status === "sending" ? "Sending…" : status === "waiting" ? "Confirming…" : "Send Transaction"}
          </button>
          <button
            onClick={estimateGas}
            disabled={status !== "idle" && status !== "success" && status !== "error"}
            className="px-3 py-1.5 rounded-lg border border-obsidian-700 hover:border-obsidian-600 text-xs text-obsidian-400 hover:text-obsidian-300 transition-colors"
          >
            Estimate Gas
          </button>
          {gasEstimate && (
            <span className="text-xs text-obsidian-500">~{gasEstimate} gas</span>
          )}
        </div>
      )}

      {status === "success" && txHash && (
        <div className="text-xs bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-green-400">
          ✓ Transaction confirmed!{" "}
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-green-300 font-mono"
          >
            {txHash.slice(0, 18)}…
          </a>
          <ExternalLink className="w-3 h-3 inline ml-1" />
        </div>
      )}

      {status === "error" && error && (
        <div className="text-xs bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 break-all">
          {error}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Interact Panel (Read + Write)
// =============================================================================

function ReadContractPanel({
  address,
  abiData,
  currentBalanceWei,
  isSelfDestructed,
}: {
  address: string;
  abiData: {
    abi: string;
    source: "direct" | "sibling";
    siblingAddress?: string;
  };
  currentBalanceWei?: string | null;
  isSelfDestructed?: boolean;
}) {
  const [autoCallDone, setAutoCallDone] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Trigger auto-call when panel is first shown
  useEffect(() => {
    setAutoCallDone(true);
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      const accs = accounts as string[];
      if (accs.length > 0) setWalletAddress(accs[0]);
    }).catch(() => {});
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handler = (...args: unknown[]) => {
      const accs = args[0] as string[];
      setWalletAddress(accs.length > 0 ? accs[0] : null);
    };
    window.ethereum.on("accountsChanged", handler);
    return () => window.ethereum?.removeListener("accountsChanged", handler);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletError("No Ethereum wallet detected. Please install MetaMask.");
      return;
    }
    setConnecting(true);
    setWalletError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      setWalletAddress(accounts[0]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setWalletError(e.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  // Parse and filter ABI
  const { readFunctions, writeFunctions } = useMemo<{ readFunctions: AbiItem[]; writeFunctions: AbiItem[] }>(() => {
    try {
      const parsed = JSON.parse(abiData.abi) as AbiItem[];
      return {
        readFunctions: parsed.filter(isReadFunction),
        writeFunctions: parsed.filter(isWriteFunction),
      };
    } catch {
      return { readFunctions: [], writeFunctions: [] };
    }
  }, [abiData.abi]);

  // Source badge
  const sourceBadge = (() => {
    if (abiData.source === "direct") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium">
          <Check className="w-3 h-3" />
          Verified ABI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-obsidian-700 border border-obsidian-600 text-obsidian-300 text-xs font-medium">
        ABI from verified sibling{" "}
        {abiData.siblingAddress && (
          <Link
            href={`/contract/${abiData.siblingAddress}`}
            className="text-ether-400 hover:text-ether-300 font-mono ml-1"
          >
            {abiData.siblingAddress.slice(0, 10)}…
          </Link>
        )}
      </span>
    );
  })();

  if (readFunctions.length === 0 && writeFunctions.length === 0) {
    return (
      <div className="text-center py-12 text-obsidian-500">
        <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p>No callable functions found in this contract's ABI.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {sourceBadge}
        </div>
        {writeFunctions.length > 0 && (
          <div className="flex items-center gap-2">
            {walletAddress ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium font-mono">
                <Check className="w-3 h-3" />
                {walletAddress.slice(0, 8)}…{walletAddress.slice(-4)}
              </span>
            ) : (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ether-600 hover:bg-ether-500 disabled:opacity-50 text-sm text-white font-medium transition-colors"
              >
                {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {connecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        )}
      </div>
      {walletError && (
        <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">{walletError}</div>
      )}

      {/* Mainnet warning — only when wallet connected */}
      {walletAddress && writeFunctions.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-amber-300">
            <span className="font-semibold">Ethereum mainnet.</span> Transactions cost real ETH and are permanent. Review parameters before sending.
          </span>
        </div>
      )}

      {/* Self-destructed notice */}
      {isSelfDestructed && (
        <div className="rounded-xl border border-obsidian-600 bg-obsidian-800/50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-obsidian-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-obsidian-400">
            This contract has self-destructed. Read calls will return empty data and write transactions will not execute any code, though they will still be recorded on-chain.
          </span>
        </div>
      )}

      {/* Read Functions */}
      {readFunctions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-obsidian-300">Read Functions</h3>
            <span className="text-xs text-obsidian-600">{readFunctions.length}</span>
            <span className="text-xs text-obsidian-600 italic">No gas required</span>
          </div>
          {readFunctions.map((fn, i) => (
            <FunctionRow
              key={`read-${fn.name}-${i}`}
              fn={fn}
              address={address}
              autoCall={autoCallDone}
              isSelfDestructed={isSelfDestructed}
            />
          ))}
        </div>
      )}

      {/* Write Functions */}
      {writeFunctions.length > 0 && (
        <div className="space-y-3">
          {/* Balance display in header */}
          {(() => {
            const balanceEth = currentBalanceWei && currentBalanceWei !== "0"
              ? (Number(BigInt(currentBalanceWei)) / 1e18)
              : null;
            const isSibling = abiData.source === "sibling";
            return (
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-sm font-semibold text-obsidian-300">Write Functions</h3>
                <span className="text-xs text-obsidian-600">{writeFunctions.length}</span>
                {balanceEth !== null && balanceEth > 0 && (
                  <span className="text-xs text-obsidian-400 font-mono">
                    Contract holds:{" "}
                    <span className="text-amber-400 font-semibold">
                      {balanceEth.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH
                    </span>
                  </span>
                )}
                {isSibling && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-obsidian-700 border border-obsidian-600 text-obsidian-400">
                    Sibling ABI
                  </span>
                )}
              </div>
            );
          })()}

          {/* Disclaimer — always visible */}
          <div className="px-1 py-1">
            <p className="text-xs text-obsidian-500 leading-relaxed">
              Write transactions are permanent. Calls are simulated first to catch obvious errors, but always verify what a function does before sending.
            </p>
          </div>

          {/* Sibling gate: disable writes for sibling-sourced ABI */}
          {abiData.source === "sibling" ? (
            <div className="rounded-xl border border-obsidian-700 bg-obsidian-900/20 px-4 py-4 text-sm text-obsidian-400">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-obsidian-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-obsidian-300 mb-1">Write functions are disabled for sibling contracts.</p>
                  <p className="text-xs text-obsidian-500 leading-relaxed">
                    The ABI is inherited from a verified sibling — connect to{" "}
                    {abiData.siblingAddress ? (
                      <Link
                        href={`/contract/${abiData.siblingAddress}`}
                        className="text-ether-400 hover:text-ether-300 font-mono"
                      >
                        {abiData.siblingAddress.slice(0, 10)}…
                      </Link>
                    ) : (
                      "the sibling contract"
                    )}{" "}
                    to interact directly.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {!walletAddress && (
                <div className="rounded-xl border border-obsidian-700 bg-obsidian-900/20 px-4 py-3 text-sm text-obsidian-400 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-obsidian-500 flex-shrink-0" />
                  Connect your wallet above to send write transactions.
                </div>
              )}
              {writeFunctions.map((fn, i) => (
                <WriteFunctionRow
                  key={`write-${fn.name}-${i}`}
                  fn={fn}
                  address={address}
                  walletAddress={walletAddress}
                />
              ))}
            </>
          )}
        </div>
      )}
      {/* I Was Here */}
      <IWasHereButton address={address} />
    </div>
  );
}

function IWasHereButton({ address }: { address: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sendIWasHere = async () => {
    if (!window.ethereum) {
      setErrorMsg("No Ethereum wallet detected. Please install MetaMask.");
      setStatus("error");
      return;
    }
    setStatus("pending");
    setErrorMsg(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts.length) throw new Error("No account connected");
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: accounts[0],
          to: address,
          data: "0x39ae461f", // iWasHere()
          value: "0x0",
        }],
      }) as string;
      setTxHash(hash);
      setStatus("success");
    } catch (err: unknown) {
      const e = err as { message?: string; code?: number };
      if (e.code === 4001) {
        setStatus("idle");
      } else {
        setErrorMsg(e.message || "Transaction failed");
        setStatus("error");
      }
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-obsidian-300">Leave Your Mark</h3>
        <span className="text-xs px-1.5 py-0.5 rounded bg-ether-500/15 border border-ether-500/30 text-ether-400">
          EthereumHistory
        </span>
      </div>
      <div className="rounded-xl border border-ether-500/20 bg-obsidian-900/30 p-4">
        <div className="font-mono text-sm text-obsidian-200 font-medium mb-2 flex flex-wrap items-center gap-1.5">
          iWasHere()
          <span className="text-xs px-1.5 py-0.5 rounded bg-obsidian-700 border border-obsidian-600 text-obsidian-400">
            write
          </span>
          <span className="text-xs text-obsidian-500 font-sans font-normal">
            0x39ae461f
          </span>
        </div>
        <p className="text-xs text-obsidian-500 leading-relaxed mb-3">
          Send a transaction to this contract that will be permanently recorded on-chain and visible on Etherscan as an &quot;iWasHere&quot; call. No ETH is sent and no contract code is executed. Costs only the base gas fee (~21,000 gas).
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={sendIWasHere}
            disabled={status === "pending"}
            className="px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
          >
            {status === "pending" ? "Confirming..." : "✍️ Leave your mark"}
          </button>
          {status === "success" && txHash && (
            <span className="text-xs text-green-400">
              Marked!{" "}
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-green-300"
              >
                View on Etherscan
              </a>
            </span>
          )}
          {status === "error" && errorMsg && (
            <span className="text-xs text-red-400">{errorMsg}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SiblingBytecodeTab({
  siblings,
  currentAddress,
  onLoadMore,
  loadingMore,
}: {
  siblings: {
    hash: string | null;
    count: number;
    groupVerified?: boolean;
    groupVerificationMethod?: string | null;
    groupDocumented?: boolean;
    groupName?: string | null;
    groupContractType?: string | null;
    contracts: Array<{
      address: string;
      etherscanContractName: string | null;
      tokenName: string | null;
      ensName: string | null;
      deploymentBlock: number | null;
      deploymentTimestamp: string | null;
      verificationMethod: string | null;
      canonicalAddress: string | null;
      codeSizeBytes: number | null;
      hasDescription?: boolean;
    }>;
    hasMore: boolean;
  };
  currentAddress: string;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const CONTRACT_TYPE_LABELS: Record<string, string> = {
    wallet: "Wallet",
    token: "Token",
    dao: "DAO",
    crowdsale: "Crowdsale",
    registry: "Registry",
    exchange: "Exchange",
    unknown: "",
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-obsidian-900/50 border border-obsidian-800">
        <p className="text-sm text-obsidian-400">
          {siblings.count.toLocaleString()} other contract{siblings.count !== 1 ? "s" : ""} share identical runtime
          bytecode — compiled from the same source with the same compiler settings.
          {siblings.contracts.length < siblings.count && (
            <span className="text-obsidian-500"> Showing first {siblings.contracts.length.toLocaleString()}.</span>
          )}
        </p>
        {siblings.hash && (
          <p className="mt-1 text-xs text-obsidian-600 font-mono">
            bytecode md5: {siblings.hash}
          </p>
        )}
        {(siblings as any).lifecycle && (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {(siblings as any).lifecycle.live > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                🟢 {(siblings as any).lifecycle.live} live
              </span>
            )}
            {(siblings as any).lifecycle.selfDestructed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-obsidian-600 bg-obsidian-800 px-2 py-0.5 text-xs text-obsidian-400">
                💀 {(siblings as any).lifecycle.selfDestructed} self-destructed
              </span>
            )}
            {(siblings as any).lifecycle.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                ❌ {(siblings as any).lifecycle.failed} failed
              </span>
            )}
          </div>
        )}
        {siblings.groupVerified && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
              <Check className="w-3 h-3" />
              Verified Source Code
            </span>
            <span className="text-xs text-obsidian-500">
              All {(siblings.count + 1).toLocaleString()} contracts inherit source code from a verified sibling
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-obsidian-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-obsidian-800 bg-obsidian-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-obsidian-400 uppercase tracking-wide">Address</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-obsidian-400 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-obsidian-400 uppercase tracking-wide">Deployed</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-obsidian-400 uppercase tracking-wide">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-obsidian-800">
            {siblings.contracts.map((c) => {
              // Individual name, or fall back to group-level name/type
              const individualName = c.etherscanContractName || c.tokenName || c.ensName || null;
              const fallbackName = siblings.groupName || (siblings.groupContractType ? CONTRACT_TYPE_LABELS[siblings.groupContractType] || siblings.groupContractType : null);
              const name = individualName || fallbackName;
              const date = c.deploymentTimestamp
                ? new Date(c.deploymentTimestamp).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : c.deploymentBlock
                  ? `Block ${c.deploymentBlock.toLocaleString()}`
                  : "Unknown";
              const hasDirectVerification = c.verificationMethod === "exact_bytecode_match" ||
                c.verificationMethod === "near_exact_match" ||
                c.verificationMethod === "author_published_source" ||
                c.verificationMethod === "etherscan_verified";
              const hasInheritedVerification = !hasDirectVerification && !!siblings.groupVerified;

              return (
                <tr key={c.address} className="hover:bg-obsidian-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contract/${c.address}`}
                      className="font-mono text-xs text-ether-400 hover:text-ether-300 transition-colors"
                    >
                      {formatAddress(c.address)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-obsidian-300 text-xs">
                    {individualName ? name : (fallbackName ? <span className="text-obsidian-500 italic">{fallbackName}</span> : <span className="text-obsidian-600">—</span>)}
                  </td>
                  <td className="px-4 py-3 text-obsidian-400 text-xs whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hasDirectVerification ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                          <Check className="w-3 h-3" />
                          {c.verificationMethod === "etherscan_verified" ? "Etherscan Verified" : "Cracked"}
                        </span>
                      ) : hasInheritedVerification ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
                          <Check className="w-3 h-3" />
                          Inherits Verified Source
                        </span>
                      ) : (
                        <span className="text-xs text-obsidian-600">Unverified</span>
                      )}
                      {c.hasDescription && (
                        <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">
                          Documented
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {siblings.hasMore && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-obsidian-500">
            Showing {siblings.contracts.length.toLocaleString()} of {siblings.count.toLocaleString()}
          </p>
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-lg border border-obsidian-700 bg-obsidian-900 px-4 py-2 text-sm text-obsidian-300 hover:border-obsidian-600 hover:text-obsidian-100 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
      {!siblings.hasMore && siblings.contracts.length > 0 && (
        <p className="pt-2 text-xs text-obsidian-600 text-center">
          All {siblings.count.toLocaleString()} contracts shown
        </p>
      )}
    </div>
  );
}

function OverviewTab({
  contract,
  bytecodeAnalysis,
  deployerPerson,
  txCountsByYear,
  media,
  proxyInfo,
  verifiedBy,
}: {
  contract: ContractPageData["contract"];
  bytecodeAnalysis: ContractPageData["bytecodeAnalysis"];
  deployerPerson: ContractPageData["deployerPerson"];
  txCountsByYear: ContractPageData["txCountsByYear"];
  media: ContractMedia[];
  proxyInfo?: ProxyInfo | null;
  verifiedBy?: { name: string; editedAt: string } | null;
}) {
  // Token info is sourced from DB (and optionally filled server-side from RPC)
  const tokenName = contract.tokenName;
  const tokenSymbol = contract.tokenSymbol;
  const tokenDecimals = contract.tokenDecimals;
  const tokenSupply = contract.tokenTotalSupply;
  const hasTokenInfo = tokenName || tokenSymbol || tokenDecimals !== null || tokenSupply || contract.tokenLogo;

  const frontierEntryForSection = getFrontierRegistrarEntry(contract.address);
  const balanceDisplay = contract.currentBalanceWei && contract.currentBalanceWei !== "0"
    ? `${(Number(BigInt(contract.currentBalanceWei)) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH`
    : null;
  const hasContractInfo = frontierEntryForSection || balanceDisplay;

  return (
    <div className="grid lg:grid-cols-3 gap-6 min-w-0">
      {/* Main info */}
      <div className="lg:col-span-2 space-y-6 min-w-0">
        {/* Proxy Banner */}
        {proxyInfo?.isProxy && proxyInfo.targetAddress && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-300 flex gap-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
            <span>
              This contract is a proxy that delegates all calls to{" "}
              <Link
                href={`/contract/${proxyInfo.targetAddress.toLowerCase()}`}
                className="font-mono underline decoration-blue-500/50 hover:text-blue-200 transition-colors"
              >
                {proxyInfo.targetAddress.toLowerCase()}
              </Link>
              {proxyInfo.targetName && (
                <span className="ml-1 text-blue-400">({proxyInfo.targetName})</span>
              )}
              . See the master contract for the full logic.
            </span>
          </div>
        )}
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

        {/* Contract Information */}
        {hasContractInfo && (
          <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-obsidian-400" />
              <h2 className="text-lg font-semibold">Contract Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {frontierEntryForSection && (() => {
                const regInfo = REGISTRAR_INFO[frontierEntryForSection.registrar];
                return (
                  <FactItem
                    label="Registered Name"
                    value={
                      <div className="space-y-1">
                        <div className="font-medium">{frontierEntryForSection.name}</div>
                        <a
                          href={regInfo.etherscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                        >
                          {regInfo.label} ↗
                        </a>
                        <div className="text-xs text-obsidian-500 leading-relaxed">{regInfo.description}</div>
                      </div>
                    }
                  />
                );
              })()}
              {balanceDisplay && (
                <FactItem label="ETH Balance" value={balanceDisplay} />
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
                    href={`https://app.ens.domains/${contract.ensName}`}
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
                    <span className="text-sm">
                      <Link
                        href={`/people/${deployerPerson.slug}`}
                        className="hover:text-ether-400 transition-colors font-medium"
                      >
                        {deployerPerson.name}
                      </Link>
                      {contract.deployerEnsName ? (
                        <a
                          href={etherscanUrl(contract.deployerAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-obsidian-400 hover:text-ether-400 transition-colors ml-1"
                        >
                          ({contract.deployerEnsName})
                        </a>
                      ) : (
                        <span className="font-mono text-obsidian-400 ml-1">
                          ({formatAddress(contract.deployerAddress)})
                        </span>
                      )}
                    </span>
                  ) : contract.deployerEnsName ? (
                    <span className="text-sm text-obsidian-300">
                      <a
                        href={etherscanUrl(contract.deployerAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ether-400 hover:text-ether-300 transition-colors"
                      >
                        {contract.deployerEnsName}
                      </a>
                      <span className="font-mono text-obsidian-400">
                        {" "}({formatAddress(contract.deployerAddress)})
                      </span>
                    </span>
                  ) : (
                    <a
                      href={etherscanUrl(contract.deployerAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-obsidian-300 hover:text-ether-400 transition-colors"
                    >
                      {formatAddress(contract.deployerAddress)}
                    </a>
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
            {contract.gasUsed != null && (
              <FactItem label="Gas at Deploy" value={contract.gasUsed.toLocaleString()} />
            )}
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

        {/* Description (from contract data, above Heuristics when present) */}
        {contract.description?.trim() && (
          <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30 overflow-hidden">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <div className="prose prose-invert max-w-none overflow-hidden break-words">
              <MarkdownRenderer content={contract.description.trim()} />
            </div>
          </section>
        )}

        {/* Verification Proof Card */}
        <VerificationProofCard contract={contract} />

        {/* Manual category overrides */}
        {(contract.manualCategories || []).length > 0 && (
          <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
            <h3 className="text-sm font-medium text-obsidian-300 mb-2">Historian Categories</h3>
            <div className="flex flex-wrap gap-2">
              {(contract.manualCategories || []).map((key: string) => {
                const option = CONTRACT_CATEGORY_OPTIONS.find((o) => o.key === key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-full border border-ether-500/30 bg-ether-500/10 px-2.5 py-1 text-xs text-ether-300"
                  >
                    {option?.label || key}
                  </span>
                );
              })}
            </div>
          </section>
        )}

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
                  </div>
                  {contract.heuristics.isProxy && (
                    <div className="text-obsidian-300">
                      {proxyInfo?.isProxy && proxyInfo.targetAddress ? (
                        <>
                          Proxy contract — delegates to{" "}
                          <Link
                            href={`/contract/${proxyInfo.targetAddress.toLowerCase()}`}
                            className="font-mono text-blue-400 hover:text-blue-300 underline decoration-blue-500/50 transition-colors"
                          >
                            {formatAddress(proxyInfo.targetAddress)}
                          </Link>
                          {proxyInfo.targetName && (
                            <span className="ml-1 text-obsidian-400">({proxyInfo.targetName})</span>
                          )}
                        </>
                      ) : (
                        "Appears to be a proxy contract"
                      )}
                    </div>
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
        {/* Contract Media */}
        {media.length > 0 && <ContractMediaGallery items={media} />}
      </div>

      {/* Sidebar */}
      <div className="space-y-6 min-w-0">
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
            <div className="space-y-1 text-xs text-obsidian-500">
              <div>
                Block span: {contract.era.startBlock.toLocaleString()} — {contract.era.endBlock?.toLocaleString() || "present"}
              </div>
              <div>
                {formatDate(contract.era.startDate)} — {contract.era.endDate ? formatDate(contract.era.endDate) : "Present"}
              </div>
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
              {contract.verificationMethod
                ? contract.verificationMethod === "exact_bytecode_match"
                  ? "Source verified through compiler archaeology and exact bytecode matching."
                  : contract.verificationMethod === "near_exact_match"
                  ? "Source verified through compiler archaeology (near-exact bytecode match)."
                  : contract.verificationMethod === "author_published_source"
                  ? "Source code published by the original contract author."
                  : contract.verificationMethod === "author_published"
                  ? "Source code published by the original contract author."
                  : contract.verificationMethod === "etherscan_verified"
                  ? "Source verified on Etherscan."
                  : "This contract has verified source code."
                : "This contract has verified source code on Etherscan."}
            </p>

            {/* Verification badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(contract.etherscanVerified || contract.verificationMethod === "etherscan_verified") && (
                <a
                  href={`https://etherscan.io/address/${contract.address}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Verified on Etherscan
                </a>
              )}
              {contract.sourcifyMatch && (
                <a
                  href={`https://repo.sourcify.dev/1/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Verified on Sourcify
                </a>
              )}
            </div>

            {contract.verificationProofUrl && (
              <a
                href={contract.verificationProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-ether-400 hover:text-ether-300"
              >
                View Verification Proof
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {verifiedBy && (
              <p className="text-xs text-obsidian-500 mt-2">
                Verified by <span className="text-obsidian-300">{verifiedBy.name}</span> · {formatRelativeTime(verifiedBy.editedAt)}
              </p>
            )}
            {contract.sourceCode && (
              <details className="mt-4">
                <summary className="text-xs text-obsidian-400 cursor-pointer hover:text-obsidian-300">
                  Show source code ({contract.compilerLanguage ? contract.compilerLanguage.charAt(0).toUpperCase() + contract.compilerLanguage.slice(1) : "Solidity"})
                </summary>
                <pre className="mt-2 p-4 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs text-obsidian-300 overflow-x-auto max-h-96 whitespace-pre">
                  {contract.sourceCode}
                </pre>
              </details>
            )}
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

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}...`;
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
  isInheritedVerification,
  proxyInfo,
}: {
  bytecode: string | null;
  analysis: ContractPageData["bytecodeAnalysis"];
  patterns: ContractPageData["detectedPatterns"];
  signatures: ContractPageData["functionSignatures"];
  decompiledCode?: string | null;
  decompilationSuccess?: boolean;
  sourceCode?: string | null;
  abi?: string | null;
  isInheritedVerification?: boolean;
  proxyInfo?: ProxyInfo | null;
}) {
  return (
    <div className="space-y-6">
      {proxyInfo?.isProxy && proxyInfo.targetAddress && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-300 flex gap-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
          <span>
            This contract is a proxy that delegates all calls to{" "}
            <Link
              href={`/contract/${proxyInfo.targetAddress.toLowerCase()}`}
              className="font-mono underline decoration-blue-500/50 hover:text-blue-200 transition-colors"
            >
              {proxyInfo.targetAddress.toLowerCase()}
            </Link>
            {proxyInfo.targetName && (
              <span className="ml-1 text-blue-400">({proxyInfo.targetName})</span>
            )}
            . The code below is the proxy stub. See the master contract for the full logic.
          </span>
        </div>
      )}
      {sourceCode && isInheritedVerification && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-300">
          Source code inherited from verified sibling contract.
        </div>
      )}
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
  sourceAddress,
}: {
  similarities: ContractPageData["similarContracts"];
  sourceAddress: string;
}) {
  return (
    <div className="space-y-6">
      <SimilarityTable similarities={similarities} sourceAddress={sourceAddress} />

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

function MediaUploadSection({ contractAddress }: { contractAddress: string }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mediaType, setMediaType] = useState("screenshot");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/contract/${contractAddress}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          caption: caption.trim() || null,
          sourceLabel: sourceLabel.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
          mediaType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save media.");
      } else {
        setSuccess(true);
        setUrl("");
        setCaption("");
        setSourceLabel("");
        setSourceUrl("");
        setMediaType("screenshot");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
      <h3 className="font-semibold mb-4">Add Media</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-obsidian-500 mb-1">Image URL *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
            className="w-full px-3 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-sm text-obsidian-100 placeholder-obsidian-500 focus:outline-none focus:border-ether-500"
          />
        </div>
        <div>
          <label className="block text-xs text-obsidian-500 mb-1">Caption</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe the image…"
            className="w-full px-3 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-sm text-obsidian-100 placeholder-obsidian-500 focus:outline-none focus:border-ether-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-obsidian-500 mb-1">Source Label</label>
            <input
              type="text"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="e.g. Etherscan"
              className="w-full px-3 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-sm text-obsidian-100 placeholder-obsidian-500 focus:outline-none focus:border-ether-500"
            />
          </div>
          <div>
            <label className="block text-xs text-obsidian-500 mb-1">Source URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-sm text-obsidian-100 placeholder-obsidian-500 focus:outline-none focus:border-ether-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-obsidian-500 mb-1">Media Type</label>
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-sm text-obsidian-100 focus:outline-none focus:border-ether-500"
          >
            <option value="screenshot">Screenshot</option>
            <option value="photo">Photo</option>
            <option value="diagram">Diagram</option>
            <option value="artwork">Artwork</option>
            <option value="other">Other</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">Media added successfully.</p>}
        <button
          type="submit"
          disabled={saving || !url.trim()}
          className="px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : "Add Media"}
        </button>
      </form>
    </section>
  );
}

function HistoricalDocsSection({ contract }: { contract: ContractPageData["contract"] }) {
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
  const [pendingReview, setPendingReview] = useState(false);
  const [pendingFields, setPendingFields] = useState<string[]>([]);

  // Local editable state (initialized from contract + fetched links)
  const [savedEtherscanContractName, setSavedEtherscanContractName] = useState(
    contract.etherscanContractName || ""
  );
  const [savedTokenName, setSavedTokenName] = useState(contract.tokenName || "");
  const [savedContractType, setSavedContractType] = useState(contract.heuristics.contractType || "");
  const [savedManualCategories, setSavedManualCategories] = useState<string[]>(contract.manualCategories || []);
  const [savedShortDescription, setSavedShortDescription] = useState(contract.shortDescription || "");
  const [savedDescription, setSavedDescription] = useState(contract.description || "");
  const [savedSignificance, setSavedSignificance] = useState(contract.historicalSignificance || "");
  const [savedContext, setSavedContext] = useState(contract.historicalContext || "");
  const [savedTokenLogo, setSavedTokenLogo] = useState(contract.tokenLogo || "");
  const [savedDeployerAddress, setSavedDeployerAddress] = useState(contract.deployerAddress || "");

  const [draftEtherscanContractName, setDraftEtherscanContractName] = useState(savedEtherscanContractName);
  const [draftTokenName, setDraftTokenName] = useState(savedTokenName);
  const [draftContractType, setDraftContractType] = useState(savedContractType);
  const [draftManualCategories, setDraftManualCategories] = useState<string[]>(savedManualCategories);
  const [draftShortDescription, setDraftShortDescription] = useState(savedShortDescription);
  const [draftDescription, setDraftDescription] = useState(savedDescription);
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
    setSavedManualCategories(contract.manualCategories || []);
    setSavedShortDescription(contract.shortDescription || "");
    setSavedDescription(contract.description || "");
    setSavedSignificance(contract.historicalSignificance || "");
    setSavedContext(contract.historicalContext || "");
    setSavedTokenLogo(contract.tokenLogo || "");

    setDraftEtherscanContractName(contract.etherscanContractName || "");
    setDraftTokenName(contract.tokenName || "");
    setDraftContractType(contract.heuristics.contractType || "");
    setDraftManualCategories(contract.manualCategories || []);
    setDraftShortDescription(contract.shortDescription || "");
    setDraftDescription(contract.description || "");
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
  const isTrusted = !!me?.trusted;

  const visibleLinks = useMemo(() => draftLinks.filter((l) => !l._deleted), [draftLinks]);
  const deletedIds = useMemo(
    () => draftLinks.filter((l) => l._deleted && l.id != null).map((l) => l.id as number),
    [draftLinks]
  );

  const persistedLinks = useMemo(
    () =>
      (historyData?.links || []).map((l) => ({
        clientId: String(l.id),
        id: l.id,
        contractAddress: l.contractAddress,
        title: l.title,
        url: l.url,
        source: l.source,
        note: l.note,
        createdAt: l.createdAt,
      })),
    [historyData?.links]
  );

  const isRelatedContractLink = useCallback((url: string) => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      return (
        (host === "ethereumhistory.com" || host.endsWith(".ethereumhistory.com")) &&
        u.pathname.toLowerCase().startsWith("/contract/")
      );
    } catch {
      return false;
    }
  }, []);

  const relatedContractLinks = useMemo(
    () => persistedLinks.filter((l) => isRelatedContractLink(l.url)),
    [persistedLinks, isRelatedContractLink]
  );
  const historicalReferenceLinks = useMemo(
    () => persistedLinks.filter((l) => !isRelatedContractLink(l.url)),
    [persistedLinks, isRelatedContractLink]
  );

  const hasLinks = persistedLinks.length > 0;

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
            manualCategories: draftManualCategories,
            shortDescription: draftShortDescription,
            description: draftDescription,
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

      // Check if edits were queued for review (untrusted historian)
      if (json?.meta?.pendingReview) {
        setPendingReview(true);
        setPendingFields(json.meta.fieldsSubmitted || []);
        setEditMode(false);
        return;
      }

      const updated = json.data as ContractHistoryData;
      setHistoryData(updated);
      setSavedEtherscanContractName(draftEtherscanContractName.trim());
      setSavedTokenName(draftTokenName.trim());
      setSavedContractType(draftContractType.trim());
      setSavedManualCategories(draftManualCategories);
      setSavedShortDescription(draftShortDescription.trim());
      setSavedDescription(draftDescription.trim());
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
    <div className="space-y-6 min-w-0 overflow-hidden" id="history">
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
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white disabled:opacity-50 ${
                      isTrusted
                        ? "bg-ether-600 hover:bg-ether-500"
                        : "bg-amber-600 hover:bg-amber-500"
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {saving
                      ? isTrusted ? "Saving…" : "Submitting…"
                      : isTrusted ? "Save" : "Submit for Review"}
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

        {/* Pending review banner (shown after untrusted submit) */}
        {pendingReview && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            <span className="font-medium">Edit submitted for review.</span>{" "}
            {pendingFields.length > 0 && (
              <span className="text-amber-400">
                Fields: {pendingFields.map(f => f.replace(/([A-Z])/g, " $1").trim()).join(", ")}.
              </span>
            )}{" "}
            A trusted historian will review your changes before they go live.
          </div>
        )}

        {/* Info banner for untrusted historians in edit mode */}
        {editMode && canEdit && !isTrusted && (
          <div className="mb-4 p-3 rounded-lg bg-obsidian-800/50 border border-obsidian-700 text-obsidian-300 text-sm flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-obsidian-400" />
            <span>New historians: your edits will be reviewed by a trusted historian before going live. Link and deployer edits require trusted status.</span>
          </div>
        )}

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
              <div className="text-xs text-obsidian-500 mb-2">Category overrides (multi-select)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONTRACT_CATEGORY_OPTIONS.map((option) => {
                  const checked = draftManualCategories.includes(option.key);
                  return (
                    <label
                      key={option.key}
                      className="flex items-center gap-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40 px-2 py-1.5 text-xs text-obsidian-300"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setDraftManualCategories((prev) => {
                            if (e.target.checked) return [...prev, option.key];
                            return prev.filter((k) => k !== option.key);
                          });
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="text-xs text-obsidian-500 mt-1">
                Use these to override or augment auto-detected categories for this contract.
              </div>
            </div>
            {isTrusted && (
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
            )}
            <div>
              <div className="text-xs text-obsidian-500 mb-1">Short description</div>
              <input
                value={draftShortDescription}
                onChange={(e) => setDraftShortDescription(e.target.value)}
                maxLength={SHORT_DESCRIPTION_MAX_CHARS}
                className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder={`One-line summary (${SHORT_DESCRIPTION_MAX_CHARS} characters max)`}
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
        ) : savedSignificance || savedContext ? (
          <div className="prose prose-invert max-w-none overflow-hidden break-words">
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

      {((editMode && isTrusted) || hasLinks) && (
        <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold">Historical Links</h3>
          {editMode && isTrusted && (
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

        {editMode && isTrusted ? (
          <div className="space-y-3">
            {visibleLinks.map((l) => (
              <div
                key={l.clientId}
                className="rounded-xl border border-obsidian-800 bg-obsidian-900/20 p-4"
              >
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
              </div>
            ))}
          </div>
        ) : !hasLinks ? (
          <div className="text-sm text-obsidian-500">No links yet.</div>
        ) : (
          <div className="space-y-6">
            {historicalReferenceLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-obsidian-300 mb-3">Historical Sources</h4>
                <div className="space-y-3">
                  {historicalReferenceLinks.map((l) => (
                    <div key={l.clientId} className="rounded-xl border border-obsidian-800 bg-obsidian-900/20 p-4">
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
                  ))}
                </div>
              </div>
            )}

            {relatedContractLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-obsidian-300 mb-3">Related Contracts</h4>
                <div className="space-y-3">
                  {relatedContractLinks.map((l) => (
                    <div key={l.clientId} className="rounded-xl border border-obsidian-800 bg-obsidian-900/20 p-4">
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </section>
      )}

      {/* Community contribution: show only for non-historians or when no narrative yet */}
      {(!me?.active || (!savedSignificance && !savedContext && (historyData?.links?.length ?? 0) === 0)) && (
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
              <ExternalLink className="w-3.5 h-3.5 mb-[3px]" />
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

// =============================================================================
// Edit History Section — shows who edited what and when
// =============================================================================

interface EditHistoryEntry {
  historianName: string;
  historianAvatarUrl: string | null;
  fieldsChanged: string[] | null;
  editedAt: string;
}

function EditHistorySection({ contractAddress }: { contractAddress: string }) {
  const [edits, setEdits] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/contract/${contractAddress}/edits`);
        const json = await res.json();
        if (!cancelled && json?.data?.edits) {
          setEdits(json.data.edits);
        }
      } catch {
        // silently fail — edit history is supplementary
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractAddress]);

  if (loading) {
    return (
      <section className="p-5 rounded-xl border border-obsidian-800 bg-obsidian-900/50">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-obsidian-400" />
          <h3 className="text-sm font-semibold text-obsidian-300">Edit History</h3>
        </div>
        <div className="text-sm text-obsidian-500 animate-pulse">Loading edit history...</div>
      </section>
    );
  }

  if (edits.length === 0) {
    return (
      <section className="p-5 rounded-xl border border-obsidian-800 bg-obsidian-900/50">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-obsidian-400" />
          <h3 className="text-sm font-semibold text-obsidian-300">Edit History</h3>
        </div>
        <p className="text-sm text-obsidian-500">
          No edits recorded yet. Be the first to document this contract!
        </p>
      </section>
    );
  }

  return (
    <section className="p-5 rounded-xl border border-obsidian-800 bg-obsidian-900/50">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-obsidian-400" />
        <h3 className="text-sm font-semibold text-obsidian-300">
          Edit History
          <span className="ml-2 text-xs text-obsidian-500 font-normal">
            {edits.length} edit{edits.length !== 1 ? "s" : ""}
          </span>
        </h3>
      </div>
      <div className="space-y-3">
        {edits.map((edit, i) => (
          <div
            key={`${edit.editedAt}-${i}`}
            className="flex items-start gap-3 text-sm"
          >
            {/* Avatar */}
            {edit.historianAvatarUrl ? (
              <img
                src={edit.historianAvatarUrl}
                alt={edit.historianName}
                className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-obsidian-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-3 h-3 text-obsidian-400" />
              </div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-obsidian-200">
                  {edit.historianName}
                </span>
                <span className="text-obsidian-500 text-xs">
                  {formatRelativeTime(edit.editedAt)}
                </span>
              </div>
              {edit.fieldsChanged && edit.fieldsChanged.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {edit.fieldsChanged.map((field) => (
                    <span
                      key={field}
                      className="px-1.5 py-0.5 rounded bg-obsidian-800 text-obsidian-400 text-xs"
                    >
                      {field.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Embed button with copy-to-clipboard popover */
function EmbedButton({ address }: { address: string }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const embedUrl = `https://www.ethereumhistory.com/embed/contract/${address.toLowerCase()}`;
  const snippet = `<iframe src="${embedUrl}" width="420" height="200" frameborder="0" style="border-radius:12px;overflow:hidden;" loading="lazy"></iframe>`;

  return (
    <div className="relative">
      <button
        onClick={() => setShowEmbed(!showEmbed)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-900/50 hover:bg-obsidian-800 hover:border-obsidian-600 text-obsidian-300 hover:text-obsidian-100 text-sm transition-colors"
      >
        <CodeXml className="w-3.5 h-3.5" />
        Embed
      </button>
      {showEmbed && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[380px] p-4 rounded-xl border border-obsidian-700 bg-obsidian-900 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-obsidian-200">Embed this contract</h4>
            <button
              onClick={() => setShowEmbed(false)}
              className="p-1 rounded hover:bg-obsidian-800 text-obsidian-500 hover:text-obsidian-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-obsidian-500 mb-3">
            Copy the iframe snippet below and paste it into your website or blog.
          </p>
          <div className="relative rounded-lg bg-obsidian-950 border border-obsidian-800 p-3">
            <pre className="text-xs text-obsidian-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
              {snippet}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(snippet);
                setEmbedCopied(true);
                setTimeout(() => setEmbedCopied(false), 2000);
              }}
              className="absolute top-2 right-2 p-1.5 rounded bg-obsidian-800 hover:bg-obsidian-700 text-obsidian-400 hover:text-obsidian-200 transition-colors"
            >
              {embedCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-obsidian-500">Theme:</span>
            <a href={`${embedUrl}?theme=dark`} target="_blank" rel="noopener noreferrer" className="text-xs text-ether-400 hover:text-ether-300 transition-colors">Dark</a>
            <span className="text-obsidian-700">·</span>
            <a href={`${embedUrl}?theme=light`} target="_blank" rel="noopener noreferrer" className="text-xs text-ether-400 hover:text-ether-300 transition-colors">Light</a>
          </div>
        </div>
      )}
    </div>
  );
}

/** Compare button with inline search popover */
function CompareButton({ sourceAddress }: { sourceAddress: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/unified?q=${encodeURIComponent(query.trim())}&page=1`);
        const json = await res.json();
        const data = json.data as UnifiedSearchResponse | undefined;
        // Filter to contracts only and exclude the current contract
        const filtered = (data?.results || []).filter(
          (r) => r.entityType === "contract" && r.address.toLowerCase() !== sourceAddress.toLowerCase()
        );
        setResults(filtered.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sourceAddress]);

  function selectContract(targetAddress: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/compare?a=${sourceAddress}&b=${targetAddress}`);
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-900/50 hover:bg-obsidian-800 hover:border-obsidian-600 text-obsidian-300 hover:text-obsidian-100 text-sm transition-colors"
      >
        <ArrowLeftRight className="w-3.5 h-3.5" />
        Compare
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[380px] rounded-xl border border-obsidian-700 bg-obsidian-900 shadow-xl overflow-hidden">
          <div className="p-3 border-b border-obsidian-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-obsidian-200">Compare with...</h4>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-obsidian-800 text-obsidian-500 hover:text-obsidian-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, address, or keyword..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-obsidian-950 border border-obsidian-800 text-sm text-obsidian-100 placeholder:text-obsidian-500 outline-none focus:border-ether-500/50 focus:ring-1 focus:ring-ether-500/20"
                spellCheck={false}
                autoComplete="off"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-500 animate-spin" />
              )}
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-[280px] overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.address}
                  onClick={() => selectContract(r.address)}
                  className="w-full text-left px-4 py-3 hover:bg-obsidian-800/70 transition-colors border-b border-obsidian-800/50 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-obsidian-200 truncate">
                      {r.title}
                    </span>
                    {r.heuristicContractType && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-obsidian-800 text-obsidian-400">
                        {r.heuristicContractType}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-obsidian-500">
                    <code className="font-mono">{formatAddress(r.address, 8)}</code>
                    {r.eraId && <span className="text-obsidian-600">·</span>}
                    {r.eraId && <span>{r.eraId}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-obsidian-500">
              No contracts found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Hint when empty */}
          {query.trim().length < 2 && (
            <div className="px-4 py-6 text-center text-xs text-obsidian-500">
              Type at least 2 characters to search for a contract to compare with.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
