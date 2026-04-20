import { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidAddress, formatAddress } from "@/lib/utils";
import { DeployerPageClient } from "./DeployerPageClient";
import { getPersonByAddressFromDb } from "@/lib/db/people";
import { isDatabaseConfigured } from "@/lib/db-client";
import type { Person } from "@/types";

interface Props {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  if (!isValidAddress(address)) return { title: "Invalid Address - Ethereum History" };
  return {
    title: `Deployer ${formatAddress(address)} - Ethereum History`,
    description: `All contracts deployed by ${address} on Ethereum.`,
  };
}

export default async function DeployerPage({ params }: Props) {
  const { address } = await params;

  if (!isValidAddress(address)) notFound();

  const addr = address.toLowerCase();

  let person: Person | null = null;
  if (isDatabaseConfigured()) {
    try {
      person = await getPersonByAddressFromDb(addr);
    } catch {
      // non-fatal
    }
  }

  return <DeployerPageClient address={addr} person={person} />;
}
