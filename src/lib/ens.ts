/**
 * ENS reverse resolution: address → primary ENS name
 * Used for contract and deployer ENS names (e.g. Enscribe contract names).
 */

import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";

const RPC_URL = process.env.ETHEREUM_RPC_URL || process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;

let publicClient: ReturnType<typeof createPublicClient> | null = null;

function getPublicClient() {
  if (!RPC_URL?.trim()) return null;
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: mainnet,
      transport: http(RPC_URL.trim(), { timeout: 10_000 }),
    });
  }
  return publicClient;
}

/**
 * Resolve an Ethereum address to its primary ENS name (reverse resolution).
 * Returns null if RPC is not configured, address has no primary name, or on error.
 */
export async function getEnsName(address: string | null | undefined): Promise<string | null> {
  if (!address || typeof address !== "string") return null;
  const trimmed = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/i.test(trimmed)) return null;

  const client = getPublicClient();
  if (!client) return null;

  try {
    const name = await client.getEnsName({
      address: trimmed as Address,
    });
    return name && typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}
