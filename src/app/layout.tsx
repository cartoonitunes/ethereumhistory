import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethereum History - Historical Smart Contract Archive",
  description:
    "A historical archive and analysis tool for Ethereum smart contracts from 2015-2017. Explore the origins of decentralized applications.",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Ethereum History",
    description: "Historical archive of Ethereum smart contracts from 2015-2017",
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
      </body>
    </html>
  );
}
