import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isDatabaseConfigured, getDocumentedContractsFromDb, getDocumentedContractsCountFromDb } from "@/lib/db-client";
import { formatAddress, formatDate, getContractTypeLabel } from "@/lib/utils";
import { ArrowLeft, Archive, Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { EraCompact } from "@/components/EraTimeline";
import type { HeuristicContractType } from "@/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: HeuristicContractType[] = [
  "token", "multisig", "crowdsale", "exchange", "wallet", "registry", "dao", "game", "unknown",
];

const TYPE_DESCRIPTIONS: Record<string, string> = {
  token: "ERC-20 compatible tokens and other fungible token contracts deployed on early Ethereum. These contracts implement transfer, balance, and approval mechanisms.",
  multisig: "Multi-signature wallet contracts requiring multiple approvals for transactions. Used by teams and DAOs for secure fund management.",
  crowdsale: "Token sale and crowdfunding contracts from Ethereum's early ICO era. These facilitated the distribution of tokens in exchange for ETH.",
  exchange: "Decentralized exchange contracts and early automated market makers. The predecessors of modern DEX protocols like Uniswap.",
  wallet: "Smart contract wallets providing enhanced functionality beyond simple EOA accounts, including recovery mechanisms and access control.",
  registry: "On-chain registry and name service contracts. These maintain mappings and lookups for various Ethereum infrastructure.",
  dao: "Decentralized Autonomous Organization contracts enabling on-chain governance, voting, and treasury management.",
  game: "On-chain game contracts and early blockchain gaming experiments, including lotteries and prediction markets.",
  unknown: "Contracts whose type could not be automatically classified. These may include custom implementations, libraries, or experimental contracts.",
};

interface Props {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;

  if (!VALID_TYPES.includes(type as HeuristicContractType)) {
    return { title: "Type Not Found - Ethereum History" };
  }

  const label = getContractTypeLabel(type);
  const metadataBase = getMetadataBaseUrl();
  const description = TYPE_DESCRIPTIONS[type] || `Explore ${label} contracts on early Ethereum.`;

  return {
    metadataBase,
    title: `${label} Contracts - Ethereum History`,
    description,
    alternates: {
      canonical: new URL(`/types/${type}`, metadataBase).toString(),
    },
    openGraph: {
      title: `${label} Smart Contracts on Ethereum`,
      description,
      type: "website",
      siteName: "Ethereum History",
    },
  };
}

export default async function TypePage({ params, searchParams }: Props) {
  const { type } = await params;
  const { page: pageParam } = await searchParams;

  if (!VALID_TYPES.includes(type as HeuristicContractType)) {
    notFound();
  }

  const label = getContractTypeLabel(type);
  const description = TYPE_DESCRIPTIONS[type] || `Explore ${label} contracts on early Ethereum.`;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = 24;
  const offset = (page - 1) * limit;

  let contracts: Array<{
    address: string;
    etherscanContractName: string | null;
    tokenName: string | null;
    tokenSymbol: string | null;
    shortDescription: string | null;
    deploymentTimestamp: string | null;
    eraId: string | null;
    heuristics: { contractType: string | null };
  }> = [];
  let total = 0;

  if (isDatabaseConfigured()) {
    try {
      const [results, count] = await Promise.all([
        getDocumentedContractsFromDb({ eraId: null, contractType: type, codeQuery: null, year: null, limit, offset }),
        getDocumentedContractsCountFromDb({ eraId: null, contractType: type, codeQuery: null, year: null }),
      ]);
      contracts = results;
      total = count;
    } catch (error) {
      console.error("Error fetching type contracts:", error);
    }
  }

  const totalPages = Math.ceil(total / limit);

  const metadataBase = getMetadataBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${label} Smart Contracts`,
    description,
    url: new URL(`/types/${type}`, metadataBase).toString(),
    isPartOf: {
      "@type": "WebSite",
      name: "Ethereum History",
      url: metadataBase.toString(),
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-obsidian-500 mb-6">
          <Link href="/" className="hover:text-obsidian-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-obsidian-300">Types</span>
          <span>/</span>
          <span className="text-obsidian-200">{label}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {label} Contracts
          </h1>
          <p className="text-lg text-obsidian-400 mb-4 max-w-3xl">
            {description}
          </p>
          <div className="flex items-center gap-1.5 text-sm text-obsidian-500">
            <Archive className="w-4 h-4" />
            <span>{total} documented contract{total !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Contract Grid */}
        {contracts.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-obsidian-400 mb-2">
              No documented {label.toLowerCase()} contracts yet
            </h2>
            <p className="text-obsidian-500 mb-6">
              Help us document {label.toLowerCase()} contracts!
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm transition-colors"
            >
              Browse all contracts
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map((contract) => {
                const name =
                  contract.etherscanContractName ||
                  contract.tokenName ||
                  `Contract ${contract.address.slice(0, 10)}...`;
                return (
                  <Link
                    key={contract.address}
                    href={`/contract/${contract.address}`}
                    className="rounded-xl border border-obsidian-800 bg-obsidian-900/50 hover:border-ether-500/30 p-5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-obsidian-100 group-hover:text-ether-400 transition-colors truncate">
                        {name}
                      </h3>
                      {contract.eraId && (
                        <EraCompact eraId={contract.eraId} showLabel={false} />
                      )}
                    </div>
                    {contract.shortDescription && (
                      <p className="text-sm text-obsidian-400 line-clamp-2 mb-3">
                        {contract.shortDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-obsidian-500">
                      <code className="font-mono">
                        {formatAddress(contract.address, 6)}
                      </code>
                      {contract.deploymentTimestamp && (
                        <span>
                          {formatDate(contract.deploymentTimestamp.split("T")[0])}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                {page > 1 && (
                  <Link
                    href={`/types/${type}?page=${page - 1}`}
                    className="px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-900/50 hover:bg-obsidian-800 text-sm transition-colors"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-sm text-obsidian-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/types/${type}?page=${page + 1}`}
                    className="px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-900/50 hover:bg-obsidian-800 text-sm transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
