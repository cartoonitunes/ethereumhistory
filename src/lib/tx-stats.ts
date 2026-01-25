type AlchemyAssetTransfersResult = {
  transfers: Array<{
    metadata?: { blockTimestamp?: string } | null;
  }>;
  pageKey?: string;
};

type AlchemyAssetTransfersResponse = {
  jsonrpc?: string;
  id?: number | string;
  result?: AlchemyAssetTransfersResult;
  error?: { code?: number; message?: string };
};

export type TxCountsByYear = {
  counts: Record<string, number>;
  truncated: boolean;
};

export async function fetchTxCountsByYearFromAlchemy(
  rpcUrl: string,
  toAddress: string,
  opts?: { maxTransfers?: number }
): Promise<TxCountsByYear> {
  const maxTransfers = opts?.maxTransfers ?? 50_000;
  const normalized = toAddress.toLowerCase();

  const counts: Record<string, number> = {};
  let pageKey: string | undefined;
  let seen = 0;
  let truncated = false;

  while (true) {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          excludeZeroValue: false,
          withMetadata: true,
          category: ["external"],
          toAddress: normalized,
          maxCount: "0x3e8", // 1000
          ...(pageKey ? { pageKey } : {}),
        },
      ],
    };

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Alchemy RPC error: HTTP ${res.status}`);
    }

    const json = (await res.json()) as AlchemyAssetTransfersResponse;
    if (json.error) {
      throw new Error(`Alchemy RPC error: ${json.error.message || "Unknown error"}`);
    }

    const result = json.result;
    if (!result?.transfers) break;

    for (const t of result.transfers) {
      const ts = t.metadata?.blockTimestamp;
      if (ts) {
        const year = new Date(ts).getUTCFullYear().toString();
        counts[year] = (counts[year] || 0) + 1;
      }
      seen += 1;
      if (seen >= maxTransfers) {
        truncated = true;
        break;
      }
    }

    if (truncated) break;
    if (!result.pageKey) break;
    pageKey = result.pageKey;
  }

  return { counts, truncated };
}

