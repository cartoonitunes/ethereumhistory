/**
 * Utility functions for ethereumhistory.com
 */

import { clsx, type ClassValue } from "clsx";

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format an Ethereum address for display
 * Shows first 6 and last 4 characters
 */
export function formatAddress(address: string, chars = 6): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a timestamp to a human-readable date
 */
export function formatDate(timestamp: string | Date | null): string {
  if (!timestamp) return "Unknown date";

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a timestamp to include time
 */
export function formatDateTime(timestamp: string | Date | null): string {
  if (!timestamp) return "Unknown";

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a relative time (e.g., "2 years ago")
 */
export function formatRelativeTime(timestamp: string | Date | null): string {
  if (!timestamp) return "Unknown";

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return "Today";
}

/**
 * Format Wei to ETH
 */
export function formatEth(weiString: string | null): string {
  if (!weiString) return "0 ETH";

  try {
    const wei = BigInt(weiString);
    const eth = Number(wei) / 1e18;

    if (eth === 0) return "0 ETH";
    if (eth < 0.0001) return "< 0.0001 ETH";

    return `${eth.toFixed(4)} ETH`;
  } catch {
    return "Unknown";
  }
}

/**
 * Format a block number with commas
 */
export function formatBlockNumber(block: number | null): string {
  if (block === null || block === undefined) return "Unknown";
  return block.toLocaleString();
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "Unknown";
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Validate an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize an address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate Etherscan URL for an address
 */
export function etherscanUrl(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

/**
 * Generate Etherscan URL for a transaction
 */
export function etherscanTxUrl(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}

/**
 * Generate Etherscan URL for a block
 */
export function etherscanBlockUrl(blockNumber: number): string {
  return `https://etherscan.io/block/${blockNumber}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Get similarity type label
 */
export function getSimilarityTypeLabel(type: string): string {
  switch (type) {
    case "exact":
      return "Exact Match";
    case "structural":
      return "Structural Match";
    case "weak":
      return "Weak Match";
    default:
      return "Unknown";
  }
}

/**
 * Get similarity type color
 */
export function getSimilarityTypeColor(type: string): string {
  switch (type) {
    case "exact":
      return "text-green-400";
    case "structural":
      return "text-blue-400";
    case "weak":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
}

/**
 * Get contract type label
 */
export function getContractTypeLabel(type: string | null): string {
  if (!type) return "Unknown";

  const labels: Record<string, string> = {
    token: "Token",
    multisig: "Multisig Wallet",
    crowdsale: "Crowdsale",
    exchange: "Exchange",
    wallet: "Wallet",
    registry: "Registry",
    dao: "DAO",
    game: "Game",
    unknown: "Unknown",
  };

  return labels[type] || type;
}

/**
 * Get verification status label
 */
export function getVerificationStatusLabel(status: string): string {
  switch (status) {
    case "verified":
      return "Source Verified";
    case "decompiled":
      return "Decompiled";
    case "partial":
      return "Partial";
    case "bytecode_only":
      return "Bytecode Only";
    default:
      return "Unknown";
  }
}

/**
 * Get verification status color
 */
export function getVerificationStatusColor(status: string): string {
  switch (status) {
    case "verified":
      return "text-green-400 bg-green-400/10";
    case "decompiled":
      return "text-blue-400 bg-blue-400/10";
    case "partial":
      return "text-yellow-400 bg-yellow-400/10";
    case "bytecode_only":
      return "text-gray-400 bg-gray-400/10";
    default:
      return "text-gray-400 bg-gray-400/10";
  }
}
