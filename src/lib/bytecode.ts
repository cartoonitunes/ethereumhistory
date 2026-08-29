import {
  RpcUnavailableError,
  isRateLimitRpcError,
  parseRetryAfterHeader,
} from "./rpc-errors";

type JsonRpcResponse<T> = {
  jsonrpc?: string;
  id?: number | string;
  result?: T;
  error?: { code?: number; message?: string };
};

/** A single RPC call should never hold a request open longer than this. */
const RPC_TIMEOUT_MS = 8_000;

async function jsonRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[]
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
  } catch (error) {
    // Timeout, DNS failure, connection reset — the provider, not the caller.
    throw new RpcUnavailableError(`RPC ${method} request failed`, { cause: error });
  }

  if (!res.ok) {
    // 429 is the rate limit; 5xx is the provider having a bad day. Both are
    // worth retrying, so they are reported as unavailability rather than a bug.
    if (res.status === 429 || res.status >= 500) {
      throw new RpcUnavailableError(`RPC ${method} failed: HTTP ${res.status}`, {
        status: res.status,
        retryAfterSeconds: parseRetryAfterHeader(res.headers.get("retry-after")) ?? undefined,
      });
    }
    throw new Error(`RPC error: HTTP ${res.status}`);
  }

  let json: JsonRpcResponse<T>;
  try {
    json = (await res.json()) as JsonRpcResponse<T>;
  } catch (error) {
    // Throttling proxies often answer 200 with an HTML error page.
    throw new RpcUnavailableError(`RPC ${method} returned a non-JSON response`, { cause: error });
  }

  if (json.error) {
    if (isRateLimitRpcError(json.error)) {
      throw new RpcUnavailableError(`RPC ${method} rate limited: ${json.error.message ?? "limit exceeded"}`);
    }
    throw new Error(`RPC error: ${json.error.message || "Unknown error"}`);
  }

  return json.result as T;
}

function toQuantity(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid quantity");
  return "0x" + Math.floor(n).toString(16);
}

export async function fetchRuntimeBytecodeFromRpc(
  rpcUrl: string,
  address: string
): Promise<string | null> {
  const normalized = address.toLowerCase();
  const code = await jsonRpc<string>(rpcUrl, "eth_getCode", [normalized, "latest"]);
  return typeof code === "string" ? code : null;
}

export async function fetchRuntimeBytecodeAtBlockFromRpc(
  rpcUrl: string,
  address: string,
  blockNumber: number
): Promise<string | null> {
  const normalized = address.toLowerCase();
  const code = await jsonRpc<string>(rpcUrl, "eth_getCode", [normalized, toQuantity(blockNumber)]);
  return typeof code === "string" ? code : null;
}

export async function fetchLatestBlockNumberFromRpc(rpcUrl: string): Promise<number> {
  const hex = await jsonRpc<string>(rpcUrl, "eth_blockNumber", []);
  if (typeof hex !== "string") throw new Error("Invalid eth_blockNumber result");
  return parseInt(hex, 16);
}

export async function fetchBlockTimestampFromRpc(
  rpcUrl: string,
  blockNumber: number
): Promise<string | null> {
  const block = await jsonRpc<{ timestamp?: string } | null>(
    rpcUrl,
    "eth_getBlockByNumber",
    [toQuantity(blockNumber), false]
  );
  const tsHex = block?.timestamp;
  if (!tsHex || typeof tsHex !== "string") return null;
  const seconds = parseInt(tsHex, 16);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

/**
 * Find the first block where code exists for an address (binary search).
 * Returns null if there is no code at latest (EOA or selfdestructed).
 */
export async function findDeploymentBlockFromRpc(
  rpcUrl: string,
  address: string,
  opts?: { maxSteps?: number }
): Promise<{ deploymentBlock: number; deploymentTimestamp: string | null } | null> {
  const maxSteps = opts?.maxSteps ?? 32;
  const latest = await fetchLatestBlockNumberFromRpc(rpcUrl);
  const latestCode = await fetchRuntimeBytecodeAtBlockFromRpc(rpcUrl, address, latest);
  if (!latestCode || latestCode === "0x") return null;

  let lo = 0;
  let hi = latest;
  let steps = 0;

  while (lo < hi && steps < maxSteps) {
    steps += 1;
    const mid = Math.floor((lo + hi) / 2);
    const code = await fetchRuntimeBytecodeAtBlockFromRpc(rpcUrl, address, mid);
    if (code && code !== "0x") {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  const deploymentTimestamp = await fetchBlockTimestampFromRpc(rpcUrl, lo);
  return { deploymentBlock: lo, deploymentTimestamp };
}

