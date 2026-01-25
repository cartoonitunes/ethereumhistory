type JsonRpcResponse<T> = {
  jsonrpc?: string;
  id?: number | string;
  result?: T;
  error?: { code?: number; message?: string };
};

export async function fetchRuntimeBytecodeFromRpc(
  rpcUrl: string,
  address: string
): Promise<string | null> {
  const normalized = address.toLowerCase();

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [normalized, "latest"],
    }),
  });

  if (!res.ok) {
    throw new Error(`RPC error: HTTP ${res.status}`);
  }

  const json = (await res.json()) as JsonRpcResponse<string>;
  if (json.error) {
    throw new Error(`RPC error: ${json.error.message || "Unknown error"}`);
  }

  if (typeof json.result !== "string") return null;
  return json.result;
}

