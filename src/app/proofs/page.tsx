import { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { isDatabaseConfigured } from "@/lib/db-client";
import { Header } from "@/components/Header";
import { ProofsClient } from "./ProofsClient";
import type { ProofsResponse } from "@/app/api/proofs/route";

// ISR: verified-proof catalogue changes rarely. Cache the rendered page at the
// CDN for 5 minutes, matching the backing /api/proofs route.
export const revalidate = 300;

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
  const title = "Verification Proofs - Ethereum History";
  const description =
    "Source code verified through compiler archaeology and bytecode matching. Contracts whose original source has been recovered and independently compiled to match on-chain bytecode.";

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical: new URL("/proofs", metadataBase).toString(),
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Ethereum History",
    },
  };
}

async function getInitialProofs(): Promise<ProofsResponse> {
  const base = getMetadataBaseUrl();
  try {
    const res = await fetch(`${base}api/proofs?cursor=0&limit=20`, {
      next: { revalidate: 300 },
    });
    if (res.ok) return res.json();
  } catch {
    // fall through to empty
  }
  return { contracts: [], total: 0, hasMore: false, nextCursor: 0 };
}

export default async function ProofsPage() {
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

  const initial = await getInitialProofs();

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="w-7 h-7 text-green-400" />
            <h1 className="text-3xl font-bold">Verification Proofs</h1>
          </div>
          <p className="text-obsidian-400 max-w-2xl">
            Source code recovered through compiler archaeology and proven to
            match on-chain bytecode. Each proof documents the methodology,
            compiler version, and evidence used to verify the original source.
          </p>
        </div>

        <ProofsClient
          initialContracts={initial.contracts}
          initialTotal={initial.total}
          initialHasMore={initial.hasMore}
        />
      </main>
    </div>
  );
}
