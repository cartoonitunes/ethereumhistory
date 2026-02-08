import { Metadata } from "next";
import Link from "next/link";
import { ERAS } from "@/types";
import { isDatabaseConfigured, getDocumentedContractsCountFromDb } from "@/lib/db-client";
import { cached, CACHE_TTL } from "@/lib/cache";
import { Header } from "@/components/Header";
import { Archive, Calendar, Code, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

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

export const metadata: Metadata = {
  title: "Ethereum Eras - Historical Timeline - Ethereum History",
  description:
    "Explore Ethereum's history through its eras: Frontier, Homestead, DAO Fork, Tangerine Whistle, and Spurious Dragon. Browse documented smart contracts from each era.",
  alternates: {
    canonical: "https://www.ethereumhistory.com/eras",
  },
  openGraph: {
    title: "Ethereum Eras - Historical Timeline",
    description:
      "Explore Ethereum's history through its eras. Browse documented smart contracts from Frontier to Spurious Dragon.",
    type: "website",
    siteName: "Ethereum History",
  },
};

export default async function ErasPage() {
  // Get contract counts per era
  const eraEntries = Object.entries(ERAS);
  let eraCounts: Record<string, number> = {};

  if (isDatabaseConfigured()) {
    try {
      const counts = await cached<Record<string, number>>(
        "eras:counts",
        CACHE_TTL.LONG,
        async () => {
          const results: Record<string, number> = {};
          await Promise.all(
            eraEntries.map(async ([eraId]) => {
              results[eraId] = await getDocumentedContractsCountFromDb({
                eraId,
                contractType: null,
                codeQuery: null,
                year: null,
              });
            })
          );
          return results;
        }
      );
      eraCounts = counts;
    } catch (error) {
      console.error("Error fetching era counts:", error);
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ethereum Eras",
    description:
      "Historical timeline of Ethereum network upgrades and eras, with documented smart contracts from each period.",
    url: "https://www.ethereumhistory.com/eras",
    isPartOf: {
      "@type": "WebSite",
      name: "Ethereum History",
      url: "https://www.ethereumhistory.com",
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
          <span className="text-obsidian-200">Eras</span>
        </nav>

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Ethereum Eras
          </h1>
          <p className="text-lg text-obsidian-400 max-w-3xl">
            Ethereum&apos;s early history is organized into eras defined by major
            network upgrades. Each era brought new capabilities, fixed
            vulnerabilities, and shaped the smart contracts deployed during that
            period.
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {eraEntries.map(([eraId, era]) => {
            const count = eraCounts[eraId] || 0;
            return (
              <Link
                key={eraId}
                href={`/eras/${eraId}`}
                className="block rounded-2xl border border-obsidian-800 bg-obsidian-900/50 hover:border-ether-500/30 p-6 md:p-8 transition-colors group"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  <div className="flex items-center gap-4 shrink-0">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: era.color }}
                    />
                    <h2 className="text-xl md:text-2xl font-bold group-hover:text-ether-400 transition-colors">
                      {era.name}
                    </h2>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-obsidian-400 mb-3">{era.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-obsidian-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {era.startDate} &mdash; {era.endDate || "present"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5" />
                        <span>
                          Block {era.startBlock.toLocaleString()}
                          {era.endBlock
                            ? ` \u2013 ${era.endBlock.toLocaleString()}`
                            : "+"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Archive className="w-3.5 h-3.5" />
                        <span>
                          {count} documented contract{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-obsidian-600 group-hover:text-ether-400 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
