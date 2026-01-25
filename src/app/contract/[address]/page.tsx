import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractPageClient } from "./ContractPageClient";
import { getContractPageData, getContractWithTokenMetadata } from "@/lib/db";
import { isValidAddress, formatAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ address: string }>;
}

function getMetadataBaseUrl(): URL {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return new URL(explicit || "http://localhost:3000");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return {
      title: "Invalid Address - Ethereum History",
    };
  }

  const metadataBase = getMetadataBaseUrl();
  const contract = await getContractWithTokenMetadata(address.toLowerCase());
  const tokenName = contract?.tokenName || null;
  const tokenSymbol = contract?.tokenSymbol || null;
  const tokenLogo = contract?.tokenLogo || null;
  const imageUrl = tokenLogo ? new URL(tokenLogo, metadataBase).toString() : null;

  const titlePrefix = tokenName
    ? `${tokenName}${tokenSymbol ? ` (${tokenSymbol})` : ""}`
    : contract?.etherscanContractName
    ? contract.etherscanContractName
    : `Contract ${formatAddress(address)}`;

  const title = `${titlePrefix} - Ethereum History`;
  const description = tokenName
    ? `Historical analysis of ${tokenName} on Ethereum (${address}). View bytecode, similar contracts, and historical context.`
    : `Historical analysis of Ethereum contract ${address}. View bytecode, similar contracts, and historical context.`;

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description: tokenName
        ? `Historical analysis of ${tokenName} on Ethereum.`
        : `Historical analysis of Ethereum contract ${address}.`,
      type: "website",
      siteName: "Ethereum History",
      url: new URL(`/contract/${address}`, metadataBase).toString(),
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: tokenName ? `${tokenName} logo` : "Token logo",
              width: 512,
              height: 512,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description: tokenName
        ? `Historical analysis of ${tokenName} on Ethereum.`
        : `Historical analysis of Ethereum contract ${address}.`,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ContractPage({ params }: Props) {
  const { address } = await params;

  // Validate address format
  if (!isValidAddress(address)) {
    notFound();
  }

  // Fetch contract data
  let data;
  try {
    data = await getContractPageData(address.toLowerCase());
  } catch (error) {
    console.error("Error fetching contract:", error);
    // Return client component with error state
    return <ContractPageClient address={address} data={null} error="Failed to fetch contract data" />;
  }

  if (!data) {
    // Return client component with not found state
    return <ContractPageClient address={address} data={null} error={null} />;
  }

  return <ContractPageClient address={address} data={data} error={null} />;
}
