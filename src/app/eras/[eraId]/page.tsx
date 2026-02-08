import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ERAS } from "@/types";
import { isDatabaseConfigured, getDocumentedContractsFromDb, getDocumentedContractsCountFromDb } from "@/lib/db-client";
import { formatAddress, formatDate } from "@/lib/utils";
import { ArrowLeft, Archive, Calendar, Code } from "lucide-react";
import { Header } from "@/components/Header";
import { EraCompact } from "@/components/EraTimeline";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ eraId: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Generate static params for all known eras
export function generateStaticParams() {
  return Object.keys(ERAS).map((eraId) => ({ eraId }));
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
  const { eraId } = await params;
  const era = ERAS[eraId];

  if (!era) {
    return { title: "Era Not Found - Ethereum History" };
  }

  const metadataBase = getMetadataBaseUrl();
  const title = `${era.name} Era Contracts - Ethereum History`;
  const description = `Explore smart contracts deployed during the ${era.name} era (${era.startDate} to ${era.endDate || "present"}). ${era.description}`;

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical: new URL(`/eras/${eraId}`, metadataBase).toString(),
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Ethereum History",
    },
  };
}

export default async function EraPage({ params, searchParams }: Props) {
  const { eraId } = await params;
  const { page: pageParam } = await searchParams;
  const era = ERAS[eraId];

  if (!era) {
    notFound();
  }

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
        getDocumentedContractsFromDb({ eraId, contractType: null, codeQuery: null, year: null, limit, offset }),
        getDocumentedContractsCountFromDb({ eraId, contractType: null, codeQuery: null, year: null }),
      ]);
      contracts = results;
      total = count;
    } catch (error) {
      console.error("Error fetching era contracts:", error);
    }
  }

  const totalPages = Math.ceil(total / limit);

  // JSON-LD for this era page
  const metadataBase = getMetadataBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${era.name} Era Smart Contracts`,
    description: era.description,
    url: new URL(`/eras/${eraId}`, metadataBase).toString(),
    isPartOf: {
      "@type": "WebSite",
      name: "Ethereum History",
      url: metadataBase.toString(),
    },
    about: {
      "@type": "Event",
      name: `Ethereum ${era.name}`,
      startDate: era.startDate,
      endDate: era.endDate || undefined,
      description: era.description,
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
          <span className="text-obsidian-300">Eras</span>
          <span>/</span>
          <span className="text-obsidian-200">{era.name}</span>
        </nav>

        {/* Era Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: era.color }}
            />
            <h1 className="text-3xl md:text-4xl font-bold">
              {era.name} Era
            </h1>
          </div>

          <p className="text-lg text-obsidian-400 mb-4 max-w-3xl">
            {era.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-obsidian-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {era.startDate} to {era.endDate || "present"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Code className="w-4 h-4" />
              <span>
                Blocks {era.startBlock.toLocaleString()}{" "}
                {era.endBlock ? `to ${era.endBlock.toLocaleString()}` : "onwards"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Archive className="w-4 h-4" />
              <span>{total} documented contract{total !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Contract Grid */}
        {contracts.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-obsidian-400 mb-2">
              No documented contracts yet
            </h2>
            <p className="text-obsidian-500 mb-6">
              Help us document contracts from the {era.name} era!
            </p>
            <Link
              href={`/browse?era=${eraId}&undocumented=1`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm transition-colors"
            >
              View undocumented contracts
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
                      {contract.heuristics?.contractType && (
                        <span className="px-2 py-0.5 rounded-full bg-obsidian-800 text-obsidian-400 text-xs shrink-0">
                          {contract.heuristics.contractType}
                        </span>
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
                    href={`/eras/${eraId}?page=${page - 1}`}
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
                    href={`/eras/${eraId}?page=${page + 1}`}
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
