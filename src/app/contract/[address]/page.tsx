import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractPageClient } from "./ContractPageClient";
import { getContractPageData } from "@/lib/db";
import { isValidAddress, formatAddress } from "@/lib/utils";

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

  return {
    title: `Contract ${formatAddress(address)} - Ethereum History`,
    description: `Historical analysis of Ethereum contract ${address}. View bytecode, similar contracts, and historical context.`,
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
