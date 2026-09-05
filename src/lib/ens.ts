/**
 * ENS reverse resolution: address → primary ENS name
 * Used for contract and deployer ENS names (e.g. Enscribe contract names).
 */

import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";

let publicClient: ReturnType<typeof createPublicClient> | null = null;

/**
 * Read the RPC URL when first used rather than at module evaluation.
 *
 * Captured at module scope it is whatever the environment held the instant this
 * file was first imported, which is before env loading in some entry points and
 * pins a permanent null. Reading it lazily means the client is built the first
 * time someone actually needs it.
 */
function getPublicClient() {
  const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
  if (!rpcUrl?.trim()) return null;
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl.trim(), { timeout: 10_000 }),
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

/**
 * Resolve an ENS name to its avatar URL.
 *
 * viem handles the avatar text record and the NFT-backed forms (eip155 URIs)
 * for us, which is why this goes through the public resolver rather than the
 * Alchemy NFT API: an ENS avatar is frequently a plain https or ipfs URL, and
 * only sometimes an NFT, so the resolver is the more complete source.
 *
 * Returns null when RPC is unconfigured, the name has no avatar, or the record
 * points somewhere unusable. Never throws: a missing avatar is a normal state,
 * not an error.
 */
export async function getEnsAvatar(name: string | null | undefined): Promise<string | null> {
  if (!name || typeof name !== "string") return null;
  const client = getPublicClient();
  if (!client) return null;

  try {
    const avatar = await client.getEnsAvatar({ name: name.trim() });
    if (!avatar || typeof avatar !== "string") return null;
    // Only serve schemes a browser can actually render in an <img>. An
    // unresolved ipfs:// or data: blob would render as a broken image, which
    // looks worse on a shareable card than falling back to the generated one.
    return /^https:\/\//i.test(avatar) ? avatar : null;
  } catch {
    return null;
  }
}

/**
 * Forward resolution: an ENS name to the address it points at.
 *
 * Used by the unauthenticated card preview, where a visitor is far more likely
 * to type their .eth name than a 42 character hex string.
 */
export async function getEnsAddress(name: string | null | undefined): Promise<string | null> {
  if (!name || typeof name !== "string") return null;
  const client = getPublicClient();
  if (!client) return null;
  try {
    const address = await client.getEnsAddress({ name: name.trim().toLowerCase() });
    return address ? address.toLowerCase() : null;
  } catch {
    return null;
  }
}
