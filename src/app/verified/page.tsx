import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { isDatabaseConfigured, getVerifiedContractsFromDb } from "@/lib/db-client";
import { formatAddress, formatDate } from "@/lib/utils";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

const LANGUAGE_LABELS: Record<string, string> = {
  serpent: "Serpent",
  solidity: "Solidity",
  lll: "LLL",
  vyper: "Vyper",
};

const METHOD_LABELS: Record<string, string> = {
  exact_bytecode_match: "Exact bytecode match",
  etherscan_verified: "Etherscan verified",
  partial_match: "Partial match",
};

function getMethodStyle(method: string) {
  switch (method) {
    case "exact_bytecode_match":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "etherscan_verified":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "partial_match":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-obsidian-700 text-obsidian-300 border-obsidian-600";
  }
}

function getLanguageStyle(language: string) {
  switch (language) {
    case "serpent":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "solidity":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "lll":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "vyper":
      return "bg-teal-500/15 text-teal-400 border-teal-500/30";
    default:
      return "bg-obsidian-700 text-obsidian-300 border-obsidian-600";
  }
}

function getMetadataBaseUrl(): URL {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_ENV === "production"
      ? "https://www.ethereumhistory.com"
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "");
  return new URL(explicit || "https://www.ethereumhistory.com");
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = getMetadataBaseUrl();
  const title = "Verified Contracts - Ethereum History";
  const description =
    "Source code verified through compiler archaeology and bytecode matching. Contracts whose original source has been recovered and independently compiled to match on-chain bytecode.";

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical: new URL("/verified", metadataBase).toString(),
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Ethereum History",
    },
  };
}

export default async function VerifiedPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-obsidian-400">Database not configured.</p>
        </main>
      </div>
    );
  }

  const contracts = await getVerifiedContractsFromDb();

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="w-7 h-7 text-green-400" />
            <h1 className="text-3xl font-bold">Verified Contracts</h1>
          </div>
          <p className="text-obsidian-400 max-w-2xl">
            Source code verified through compiler archaeology and bytecode
            matching. These contracts have had their original source recovered
            and independently compiled to match the on-chain bytecode.
          </p>
        </div>

        {/* Contract list */}
        {contracts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-obsidian-500">No verified contracts yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => {
              const name =
                contract.etherscanContractName ||
                contract.tokenName ||
                contract.ensName ||
                formatAddress(contract.address);
              const deploymentDate = contract.deploymentTimestamp
                ? formatDate(contract.deploymentTimestamp)
                : "Unknown";
              const languageLabel = contract.compilerLanguage
                ? LANGUAGE_LABELS[contract.compilerLanguage] ||
                  contract.compilerLanguage
                : null;
              const methodLabel = contract.verificationMethod
                ? METHOD_LABELS[contract.verificationMethod] ||
                  contract.verificationMethod
                : null;

              return (
                <Link
                  key={contract.address}
                  href={`/contract/${contract.address}`}
                  className="block p-5 rounded-xl border border-obsidian-800 bg-obsidian-900/30 hover:border-obsidian-700 hover:bg-obsidian-900/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-semibold text-obsidian-100 truncate">
                          {name}
                        </h2>
                      </div>
                      <p className="text-xs text-obsidian-500 font-mono mb-2">
                        {contract.address}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs text-obsidian-400">
                          {deploymentDate}
                        </span>
                        {languageLabel && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLanguageStyle(contract.compilerLanguage!)}`}
                          >
                            {languageLabel}
                          </span>
                        )}
                        {contract.compilerVersion && (
                          <span className="text-xs text-obsidian-500">
                            {contract.compilerVersion}
                          </span>
                        )}
                        {contract.compilerCommit && (
                          <span className="text-xs text-obsidian-500 font-mono">
                            {contract.compilerCommit.slice(0, 7)}
                          </span>
                        )}
                        {methodLabel && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getMethodStyle(contract.verificationMethod!)}`}
                          >
                            {methodLabel}
                          </span>
                        )}
                      </div>
                      {contract.verificationNotes && (
                        <p className="text-xs text-obsidian-400 line-clamp-2">
                          {contract.verificationNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Count */}
        <div className="mt-8 text-center text-sm text-obsidian-500">
          {contracts.length} verified{" "}
          {contracts.length === 1 ? "contract" : "contracts"}
        </div>
      </main>
    </div>
  );
}
