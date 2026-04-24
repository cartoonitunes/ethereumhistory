import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractPageClient } from "./ContractPageClient";
import { IndexedContractPage } from "./IndexedContractPage";
import { getContractPageData, getContractWithTokenMetadata, getContract } from "@/lib/db";
import { isValidAddress, formatAddress } from "@/lib/utils";
import { detectProxyTarget } from "@/lib/proxy-utils";
import { resolveContract } from "@/lib/contract-resolver";
import { isTursoConfigured } from "@/lib/turso";

// Historical contracts are essentially immutable — cache for 10 min at the CDN/ISR layer
export const revalidate = 600;

interface Props {
  params: Promise<{ address: string }>;
}

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

  const titlePrefix = tokenName
    ? `${tokenName}${tokenSymbol ? ` (${tokenSymbol})` : ""}`
    : contract?.etherscanContractName
    ? contract.etherscanContractName
    : `Contract ${formatAddress(address)}`;

  const title = `${titlePrefix} - Ethereum History`;

  // Rich description: prefer historical content over generic fallback
  const richDescription =
    contract?.shortDescription?.trim() ||
    (contract?.historicalSignificance?.trim()
      ? contract.historicalSignificance.trim().split("\n")[0].slice(0, 200)
      : null) ||
    (tokenName
      ? `Historical analysis of ${tokenName} on Ethereum.`
      : `Historical analysis of Ethereum smart contract ${address}.`);

  // Dynamic OG share card — generated server-side as a PNG
  const ogImageUrl = new URL(
    `/api/og/contract/${address.toLowerCase()}`,
    metadataBase
  ).toString();

  const canonicalUrl = new URL(
    `/contract/${address.toLowerCase()}`,
    metadataBase
  ).toString();

  return {
    metadataBase,
    title,
    description: richDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: richDescription,
      type: "website",
      siteName: "Ethereum History",
      url: canonicalUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: `${titlePrefix} — Ethereum History share card`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: richDescription,
      images: [ogImageUrl],
    },
  };
}

function buildJsonLd(address: string, data: NonNullable<Awaited<ReturnType<typeof getContractPageData>>>) {
  const { contract } = data;
  const metadataBase = getMetadataBaseUrl();
  const displayName =
    contract.tokenName || contract.ensName || contract.etherscanContractName || `Contract ${formatAddress(address, 12)}`;

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: displayName,
    description:
      contract.shortDescription ||
      `Historical analysis of Ethereum contract ${address}.`,
    url: new URL(`/contract/${address.toLowerCase()}`, metadataBase).toString(),
    datePublished: contract.deploymentTimestamp || undefined,
    isAccessibleForFree: true,
    keywords: [
      "Ethereum",
      "smart contract",
      contract.eraId || "",
      contract.heuristics?.contractType || "",
      contract.tokenSymbol || "",
    ].filter(Boolean),
    publisher: {
      "@type": "Organization",
      name: "Ethereum History",
      url: metadataBase.toString(),
    },
    about: {
      "@type": "SoftwareApplication",
      name: "Ethereum",
      applicationCategory: "Blockchain",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": new URL(`/contract/${address.toLowerCase()}`, metadataBase).toString(),
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
    // Not in Neon — try the Turso index for Layer 2/3 contracts
    if (isTursoConfigured()) {
      try {
        const resolved = await resolveContract(address.toLowerCase());
        if (resolved && resolved.layer !== "on-chain") {
          // Layer 4 should have been caught by getContractPageData — if resolver
          // returns 'documented' here it means shortDescription is set but page
          // data failed; fall through to ContractPageClient not-found state.
          if (resolved.layer !== "documented") {
            return <IndexedContractPage address={address.toLowerCase()} resolved={resolved} />;
          }
        }
      } catch (resolverError) {
        console.error("Contract resolver error:", resolverError);
        // Fall through to not-found state
      }
    }
    return <ContractPageClient address={address} data={null} error={null} />;
  }

  // Proxy detection — prefer deployed bytecode (actual on-chain code) over runtime
  // runtime_bytecode may be creation code from seed data, not the deployed proxy stub
  let proxyBytecode = data.contract.runtimeBytecode;
  try {
    const db = (await import("@/lib/db-client")).getDb();
    const { contracts } = await import("@/lib/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select({ deployedBytecode: contracts.deployedBytecode })
      .from(contracts)
      .where(eq(contracts.address, address.toLowerCase()))
      .limit(1);
    if (row?.deployedBytecode && row.deployedBytecode !== "0x") {
      proxyBytecode = row.deployedBytecode;
    }
  } catch {}
  const proxyDetection = detectProxyTarget(proxyBytecode);
  let proxyInfo = proxyDetection.isProxy
    ? { ...proxyDetection, targetName: null as string | null }
    : null;

  if (proxyInfo?.targetAddress) {
    try {
      const targetContract = await getContract(proxyInfo.targetAddress.toLowerCase());
      if (targetContract) {
        proxyInfo = {
          ...proxyInfo,
          targetName:
            targetContract.etherscanContractName ||
            targetContract.tokenName ||
            targetContract.ensName ||
            null,
        };
      }
    } catch {
      // non-fatal — just skip the name
    }
  }

  if (proxyInfo) {
    data = { ...data, proxyInfo };
  }

  const jsonLd = buildJsonLd(address, data);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContractPageClient address={address} data={data} error={null} />
    </>
  );
}
