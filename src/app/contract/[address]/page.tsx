import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractPageClient } from "./ContractPageClient";
import { getContractPageData, getContractWithTokenMetadata } from "@/lib/db";
import { isValidAddress, formatAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return {
      title: "Invalid Address - Ethereum History",
    };
  }

  const contract = await getContractWithTokenMetadata(address.toLowerCase());
  const tokenName = contract?.tokenName || null;
  const tokenSymbol = contract?.tokenSymbol || null;
  const tokenLogo = contract?.tokenLogo || null;

  const titlePrefix = tokenName
    ? `${tokenName}${tokenSymbol ? ` (${tokenSymbol})` : ""}`
    : contract?.etherscanContractName
    ? contract.etherscanContractName
    : `Contract ${formatAddress(address)}`;

  return {
    title: `${titlePrefix} - Ethereum History`,
    description: tokenName
      ? `Historical analysis of ${tokenName} on Ethereum (${address}). View bytecode, similar contracts, and historical context.`
      : `Historical analysis of Ethereum contract ${address}. View bytecode, similar contracts, and historical context.`,
    openGraph: tokenLogo
      ? {
          title: `${titlePrefix} - Ethereum History`,
          description: tokenName
            ? `Historical analysis of ${tokenName} on Ethereum.`
            : `Historical analysis of Ethereum contract ${address}.`,
          images: [{ url: tokenLogo, alt: tokenName ? `${tokenName} logo` : "Token logo" }],
        }
      : undefined,
    twitter: tokenLogo
      ? {
          card: "summary",
          title: `${titlePrefix} - Ethereum History`,
          description: tokenName
            ? `Historical analysis of ${tokenName} on Ethereum.`
            : `Historical analysis of Ethereum contract ${address}.`,
          images: [tokenLogo],
        }
      : undefined,
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
