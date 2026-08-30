/**
 * Metadata for /coverage.
 *
 * The page itself is a client component and cannot export metadata, so it
 * lives here (same pattern as historian/[id]/layout.tsx). The numbers are read
 * from lib/coverage-stats — the same source the page and the OG image use — so
 * a shared link always quotes the percentage the dashboard is actually showing.
 */

import type { Metadata } from "next";
import { getCoverageStats } from "@/lib/coverage-stats";

/**
 * Regenerate hourly, in step with the refresh-stats cron that feeds
 * contract_stats_cache. Without this the route prerenders once and the shared
 * percentage is frozen at build time. The dashboard body is a client component
 * that fetches /api/coverage, so what a visitor sees is always live — this
 * only governs the <head> tags and the OG image.
 */
export const revalidate = 3600;

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

const KEYWORDS = [
  "Ethereum coverage",
  "smart contract documentation",
  "bytecode verification",
  "contract archaeology",
  "Frontier contracts",
  "Homestead contracts",
  "early Ethereum",
  "blockchain preservation",
];

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = getMetadataBaseUrl();
  const url = new URL("/coverage", metadataBase).toString();

  // Never let a stats hiccup break the page's <head>; fall back to copy that
  // is true regardless of the current numbers.
  let title = "Coverage Dashboard – How Much of Early Ethereum Is Documented";
  let description =
    "Track how much of Ethereum's earliest contract record has been documented by historians and recovered by compiler archaeology, broken down by era and by year.";

  try {
    const { summary } = await getCoverageStats();
    const pct = summary.documentedPct;
    const documented = summary.documented.toLocaleString("en-US");
    const uncovered = summary.uncovered.toLocaleString("en-US");
    const total = summary.total.toLocaleString("en-US");

    title = `Ethereum History Coverage – ${pct}% of early Ethereum documented`;
    description =
      `${documented} of ${total} indexed contracts (${pct}%) from Ethereum's first years are documented, ` +
      `plus ${uncovered} with source recovered by compiler archaeology but no writeup yet. ` +
      `Coverage broken down by era and by year.`;
  } catch {
    // keep the static fallback
  }

  return {
    metadataBase,
    title,
    description,
    keywords: KEYWORDS,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Ethereum History",
      locale: "en_US",
      // og:image resolves to the sibling opengraph-image route, which renders
      // the same numbers.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function CoverageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
