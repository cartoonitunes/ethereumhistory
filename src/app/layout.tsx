import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

function getMetadataBaseUrl(): URL {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return new URL(explicit || "http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: "Ethereum History - Historical Smart Contract Archive",
  description:
    "A historical archive and analysis tool for Ethereum smart contracts from 2015-2017. Explore the origins of decentralized applications.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  keywords: [
    "Ethereum",
    "smart contracts",
    "blockchain history",
    "Solidity",
    "EVM",
    "decentralized",
    "archive",
  ],
  authors: [{ name: "ethereumhistory.com" }],
  openGraph: {
    title: "Ethereum History - Historical Smart Contract Archive",
    description:
      "Explore Ethereum's early smart contracts. A museum-grade archive of blockchain history.",
    type: "website",
    locale: "en_US",
    siteName: "Ethereum History",
    images: [
      {
        url: "https://gaccdiscordimages.s3.us-east-1.amazonaws.com/og-image-1200x630.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Ethereum History",
      },
      {
        url: "https://gaccdiscordimages.s3.us-east-1.amazonaws.com/social-square-512.png",
        width: 512,
        height: 512,
        type: "image/png",
        alt: "Ethereum History",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ethereum History",
    description: "Historical archive of Ethereum smart contracts from 2015-2017",
    images: [
      "https://gaccdiscordimages.s3.us-east-1.amazonaws.com/og-image-1200x630.png",
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-obsidian-950 text-obsidian-50 antialiased">
        <div className="relative min-h-screen">
          {/* Background gradient */}
          <div className="fixed inset-0 gradient-radial pointer-events-none" />

          {/* Main content */}
          <main className="relative z-10">{children}</main>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
