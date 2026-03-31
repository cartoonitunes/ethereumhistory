import { Metadata } from "next";
import dynamic from "next/dynamic";

const NetworkClient = dynamic(() => import("./NetworkClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center">
      <span className="text-sm text-obsidian-400 animate-pulse">Loading network...</span>
    </div>
  ),
});

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
  const title = "Contract Network - Ethereum History";
  const description =
    "Explore 187,905 early Ethereum contracts as a force-directed network. Every deployer, every cluster — from Frontier through Spurious Dragon. Filter by era, click any contract, help document history.";
  const ogImage = new URL("/og-network.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical: new URL("/network", metadataBase).toString(),
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Ethereum History",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "Ethereum Contract Network — 187,905 early contracts visualized by deployer cluster",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function NetworkPage() {
  return <NetworkClient />;
}
