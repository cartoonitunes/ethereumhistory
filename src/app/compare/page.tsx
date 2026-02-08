/**
 * Contract Comparison Page
 *
 * /compare?a=0x...&b=0x...
 *
 * Side-by-side comparison of two Ethereum contracts showing metadata,
 * bytecode stats, heuristics, and deployment info. Useful for research
 * and understanding how early contracts differ.
 *
 * Also creates SEO-rich comparison pages for every pair linked from
 * contract detail pages.
 */

import { Metadata } from "next";
import Link from "next/link";
import { getContract } from "@/lib/db";
import { isValidAddress, formatAddress, formatDate, getContractTypeLabel } from "@/lib/utils";
import { Header } from "@/components/Header";
import { EraCompact } from "@/components/EraTimeline";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { ERAS } from "@/types";
import type { Contract } from "@/types";

export const dynamic = "force-dynamic";

interface ComparePageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const { a, b } = await searchParams;
  if (!a || !b) {
    return {
      title: "Compare Contracts — Ethereum History",
      description: "Compare two early Ethereum smart contracts side by side.",
    };
  }
  const nameA = formatAddress(a, 8);
  const nameB = formatAddress(b, 8);
  return {
    title: `Compare ${nameA} vs ${nameB} — Ethereum History`,
    description: `Side-by-side comparison of Ethereum contracts ${nameA} and ${nameB}: deployment, bytecode, type, and historical context.`,
  };
}

function ComparisonRow({
  label,
  valueA,
  valueB,
  highlight,
}: {
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  highlight?: boolean;
}) {
  const isDifferent = String(valueA) !== String(valueB);
  return (
    <tr className={highlight ? "bg-ether-500/5" : ""}>
      <td className="py-2.5 px-4 text-sm text-obsidian-400 font-medium whitespace-nowrap border-r border-obsidian-800">
        {label}
      </td>
      <td className={`py-2.5 px-4 text-sm ${isDifferent ? "text-obsidian-200" : "text-obsidian-400"}`}>
        {valueA || <span className="text-obsidian-600">—</span>}
      </td>
      <td className={`py-2.5 px-4 text-sm border-l border-obsidian-800 ${isDifferent ? "text-obsidian-200" : "text-obsidian-400"}`}>
        {valueB || <span className="text-obsidian-600">—</span>}
      </td>
    </tr>
  );
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { a, b } = await searchParams;

  // No addresses provided — show empty state
  if (!a || !b) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-ether-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to browse
          </Link>
          <div className="text-center py-20">
            <ArrowLeftRight className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Compare Contracts</h1>
            <p className="text-obsidian-400 max-w-md mx-auto mb-8">
              Compare two early Ethereum contracts side by side. Add two addresses as query parameters:
            </p>
            <code className="text-sm text-ether-400 bg-obsidian-900/50 border border-obsidian-800 rounded-lg px-4 py-2">
              /compare?a=0x...&b=0x...
            </code>
          </div>
        </div>
      </div>
    );
  }

  // Validate addresses
  if (!isValidAddress(a) || !isValidAddress(b)) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Invalid Address</h1>
          <p className="text-obsidian-400">
            Both addresses must be valid Ethereum addresses (0x followed by 40 hex characters).
          </p>
        </div>
      </div>
    );
  }

  // Fetch both contracts in parallel
  const [contractA, contractB] = await Promise.all([
    getContract(a.toLowerCase()),
    getContract(b.toLowerCase()),
  ]);

  if (!contractA || !contractB) {
    const missing = !contractA ? a : b;
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Contract Not Found</h1>
          <p className="text-obsidian-400">
            Contract {formatAddress(missing, 10)} is not in our historical archive.
          </p>
        </div>
      </div>
    );
  }

  const nameA = contractA.etherscanContractName || contractA.tokenName || contractA.ensName || formatAddress(a, 10);
  const nameB = contractB.etherscanContractName || contractB.tokenName || contractB.ensName || formatAddress(b, 10);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-ether-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to browse
        </Link>

        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <ArrowLeftRight className="w-6 h-6 text-ether-400" />
          <h1 className="text-2xl md:text-3xl font-bold">
            {nameA} <span className="text-obsidian-500 font-normal">vs</span> {nameB}
          </h1>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto rounded-xl border border-obsidian-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-obsidian-800 bg-obsidian-900/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-obsidian-500 uppercase tracking-wider border-r border-obsidian-800 w-40">
                  Field
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-obsidian-500 uppercase tracking-wider">
                  <Link href={`/contract/${contractA.address}`} className="text-ether-400 hover:text-ether-300 transition-colors">
                    {nameA}
                  </Link>
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-obsidian-500 uppercase tracking-wider border-l border-obsidian-800">
                  <Link href={`/contract/${contractB.address}`} className="text-ether-400 hover:text-ether-300 transition-colors">
                    {nameB}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-800/50">
              <ComparisonRow
                label="Address"
                valueA={<code className="text-xs font-mono">{contractA.address}</code>}
                valueB={<code className="text-xs font-mono">{contractB.address}</code>}
              />
              <ComparisonRow
                label="Era"
                valueA={contractA.eraId ? <EraCompact eraId={contractA.eraId} /> : null}
                valueB={contractB.eraId ? <EraCompact eraId={contractB.eraId} /> : null}
                highlight
              />
              <ComparisonRow
                label="Deployed"
                valueA={contractA.deploymentTimestamp ? formatDate(contractA.deploymentTimestamp.split("T")[0]) : null}
                valueB={contractB.deploymentTimestamp ? formatDate(contractB.deploymentTimestamp.split("T")[0]) : null}
              />
              <ComparisonRow
                label="Type"
                valueA={contractA.heuristics?.contractType ? getContractTypeLabel(contractA.heuristics.contractType) : null}
                valueB={contractB.heuristics?.contractType ? getContractTypeLabel(contractB.heuristics.contractType) : null}
                highlight
              />
              <ComparisonRow
                label="Token Name"
                valueA={contractA.tokenName}
                valueB={contractB.tokenName}
              />
              <ComparisonRow
                label="Token Symbol"
                valueA={contractA.tokenSymbol}
                valueB={contractB.tokenSymbol}
              />
              <ComparisonRow
                label="Code Size"
                valueA={contractA.codeSizeBytes ? `${contractA.codeSizeBytes.toLocaleString()} bytes` : null}
                valueB={contractB.codeSizeBytes ? `${contractB.codeSizeBytes.toLocaleString()} bytes` : null}
                highlight
              />
              <ComparisonRow
                label="Gas Used"
                valueA={contractA.gasUsed ? contractA.gasUsed.toLocaleString() : null}
                valueB={contractB.gasUsed ? contractB.gasUsed.toLocaleString() : null}
              />
              <ComparisonRow
                label="ERC-20 Like"
                valueA={contractA.heuristics?.isErc20Like ? "Yes" : "No"}
                valueB={contractB.heuristics?.isErc20Like ? "Yes" : "No"}
              />
              <ComparisonRow
                label="Is Proxy"
                valueA={contractA.heuristics?.isProxy ? "Yes" : "No"}
                valueB={contractB.heuristics?.isProxy ? "Yes" : "No"}
              />
              <ComparisonRow
                label="SELFDESTRUCT"
                valueA={contractA.heuristics?.hasSelfDestruct ? "Yes" : "No"}
                valueB={contractB.heuristics?.hasSelfDestruct ? "Yes" : "No"}
                highlight
              />
              <ComparisonRow
                label="Verified"
                valueA={contractA.etherscanVerified ? "Yes" : "No"}
                valueB={contractB.etherscanVerified ? "Yes" : "No"}
              />
              <ComparisonRow
                label="Deployer"
                valueA={contractA.deployerAddress ? <code className="text-xs font-mono">{formatAddress(contractA.deployerAddress, 10)}</code> : null}
                valueB={contractB.deployerAddress ? <code className="text-xs font-mono">{formatAddress(contractB.deployerAddress, 10)}</code> : null}
              />
              <ComparisonRow
                label="ENS Name"
                valueA={contractA.ensName}
                valueB={contractB.ensName}
              />
              <ComparisonRow
                label="Documented"
                valueA={contractA.shortDescription ? "Yes" : "No"}
                valueB={contractB.shortDescription ? "Yes" : "No"}
                highlight
              />
            </tbody>
          </table>
        </div>

        {/* Description comparison (if either has one) */}
        {(contractA.shortDescription || contractB.shortDescription) && (
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-5">
              <h3 className="font-semibold text-obsidian-200 mb-2">{nameA}</h3>
              <p className="text-sm text-obsidian-400">
                {contractA.shortDescription || "No description yet."}
              </p>
            </div>
            <div className="rounded-xl border border-obsidian-800 bg-obsidian-900/30 p-5">
              <h3 className="font-semibold text-obsidian-200 mb-2">{nameB}</h3>
              <p className="text-sm text-obsidian-400">
                {contractB.shortDescription || "No description yet."}
              </p>
            </div>
          </div>
        )}

        {/* Swap button */}
        <div className="mt-6 flex justify-center">
          <Link
            href={`/compare?a=${contractB.address}&b=${contractA.address}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-900/40 hover:bg-obsidian-800 text-sm text-obsidian-300 hover:text-obsidian-100 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap order
          </Link>
        </div>
      </div>
    </div>
  );
}
