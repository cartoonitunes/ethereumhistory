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
  const fallbackSocialImage =
    "https://gaccdiscordimages.s3.us-east-1.amazonaws.com/eh_social_image.jpg?v=2";
  const contract = await getContractWithTokenMetadata(address.toLowerCase());
  const tokenName = contract?.tokenName || null;
  const tokenSymbol = contract?.tokenSymbol || null;
  const tokenLogo = contract?.tokenLogo || null;

  // Twitter/X is picky about image formats; SVGs and non-http(s) URLs often won't render in cards.
  const imageUrl = (() => {
    if (!tokenLogo) return null;
    const raw = String(tokenLogo).trim();
    if (!raw) return null;
    if (raw.startsWith("ipfs://") || raw.startsWith("data:")) return null;

    const resolved = new URL(raw, metadataBase).toString();
    const lower = resolved.toLowerCase();
    if (lower.endsWith(".svg") || lower.includes("image/svg+xml")) return null;
    return resolved;
  })();

  const titlePrefix = tokenName
    ? `${tokenName}${tokenSymbol ? ` (${tokenSymbol})` : ""}`
    : contract?.etherscanContractName
    ? contract.etherscanContractName
    : `Contract ${formatAddress(address)}`;

  const title = `${titlePrefix} - Ethereum History`;
  const description = tokenName
    ? `Historical analysis of ${tokenName} on Ethereum (${address}). View bytecode, similar contracts, and historical context.`
    : `Historical analysis of Ethereum contract ${address}. View bytecode, similar contracts, and historical context.`;

  const socialImage = imageUrl || fallbackSocialImage;

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
      images: [
        imageUrl
          ? {
              url: socialImage,
              alt: tokenName ? `${tokenName} logo` : "Token logo",
              width: 512,
              height: 512,
            }
          : {
              url: socialImage,
              alt: "Ethereum History",
              width: 1200,
              height: 630,
              type: "image/jpeg",
            },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: tokenName
        ? `Historical analysis of ${tokenName} on Ethereum.`
        : `Historical analysis of Ethereum contract ${address}.`,
      images: [socialImage],
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
