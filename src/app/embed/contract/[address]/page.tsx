/**
 * Embeddable Contract Card
 *
 * /embed/contract/[address]
 *
 * A minimal, self-contained page designed to be loaded in an <iframe>.
 * Renders a compact contract card with name, era, description, and link.
 * Supports theme=dark|light query param (default: dark).
 *
 * Usage:
 *   <iframe src="https://www.ethereumhistory.com/embed/contract/0x..." width="400" height="180" frameborder="0"></iframe>
 */

import { notFound } from "next/navigation";
import { getContract } from "@/lib/db";
import { isValidAddress, formatAddress, formatDate } from "@/lib/utils";
import { ERAS } from "@/types";

export const revalidate = 3600; // Re-render every hour

interface EmbedPageProps {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export async function generateMetadata({ params }: EmbedPageProps) {
  const { address } = await params;
  return {
    title: `Ethereum History — ${formatAddress(address, 10)}`,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedContractPage({ params, searchParams }: EmbedPageProps) {
  const { address } = await params;
  const { theme: themeParam } = await searchParams;

  if (!isValidAddress(address)) notFound();

  const contract = await getContract(address.toLowerCase());
  if (!contract) notFound();

  const theme = themeParam === "light" ? "light" : "dark";
  const name =
    contract.etherscanContractName ||
    contract.tokenName ||
    contract.ensName ||
    formatAddress(contract.address, 10);

  const eraName = contract.eraId && ERAS[contract.eraId] ? ERAS[contract.eraId].name : null;
  const contractUrl = `https://www.ethereumhistory.com/contract/${contract.address}`;

  // Inline styles for full self-containment (no external CSS deps in iframes)
  const isDark = theme === "dark";
  const styles = {
    wrapper: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: isDark ? "#0a0a0f" : "#ffffff",
      color: isDark ? "#e4e4e7" : "#18181b",
      borderRadius: "12px",
      border: `1px solid ${isDark ? "#27272a" : "#e4e4e7"}`,
      padding: "16px 20px",
      maxWidth: "480px",
      overflow: "hidden",
    } as React.CSSProperties,
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      marginBottom: "8px",
    } as React.CSSProperties,
    name: {
      fontWeight: 700,
      fontSize: "16px",
      lineHeight: "1.3",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
      color: isDark ? "#f4f4f5" : "#09090b",
      textDecoration: "none",
    } as React.CSSProperties,
    eraBadge: {
      display: "inline-block",
      fontSize: "11px",
      fontWeight: 600,
      lineHeight: "1",
      padding: "3px 8px",
      borderRadius: "9999px",
      backgroundColor: isDark ? "rgba(98,110,241,0.15)" : "rgba(98,110,241,0.1)",
      color: isDark ? "#8b9cf7" : "#626ef1",
      whiteSpace: "nowrap" as const,
      flexShrink: 0,
    } as React.CSSProperties,
    description: {
      fontSize: "13px",
      lineHeight: "1.5",
      color: isDark ? "#a1a1aa" : "#71717a",
      marginBottom: "10px",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical" as const,
      overflow: "hidden",
    } as React.CSSProperties,
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "12px",
      color: isDark ? "#71717a" : "#a1a1aa",
    } as React.CSSProperties,
    address: {
      fontFamily: '"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: "11px",
      color: isDark ? "#52525b" : "#d4d4d8",
    } as React.CSSProperties,
    link: {
      fontSize: "11px",
      color: isDark ? "#626ef1" : "#626ef1",
      textDecoration: "none",
      fontWeight: 500,
    } as React.CSSProperties,
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "10px",
      color: isDark ? "#52525b" : "#a1a1aa",
      textDecoration: "none",
    } as React.CSSProperties,
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`body { margin: 0; padding: 8px; background: transparent; }`}</style>
      </head>
      <body>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <a href={contractUrl} target="_blank" rel="noopener noreferrer" style={styles.name}>
              {name}
            </a>
            {eraName && <span style={styles.eraBadge}>{eraName}</span>}
          </div>

          {contract.shortDescription && (
            <div style={styles.description}>{contract.shortDescription}</div>
          )}

          <div style={styles.footer}>
            <span style={styles.address}>{formatAddress(contract.address, 8)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {contract.deploymentTimestamp && (
                <span>{formatDate(contract.deploymentTimestamp.split("T")[0])}</span>
              )}
              <a
                href={contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                View on Ethereum History &rarr;
              </a>
            </div>
          </div>

          <div style={{ marginTop: "8px", borderTop: `1px solid ${isDark ? "#1c1c22" : "#f4f4f5"}`, paddingTop: "6px" }}>
            <a
              href="https://www.ethereumhistory.com"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.logo}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={isDark ? "#52525b" : "#a1a1aa"}>
                <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
                <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
              </svg>
              ethereumhistory.com
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
