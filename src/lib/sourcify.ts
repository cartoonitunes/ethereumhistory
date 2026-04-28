type SourcifyMetadata = {
  compiler?: {
    version?: string;
  };
  language?: string;
  settings?: Record<string, unknown>;
  output?: {
    abi?: unknown;
  };
  sources?: Record<string, unknown>;
};

export type SourcifyMatchType = "full_match" | "partial_match";

export type SourcifySourceResult = {
  matchType: SourcifyMatchType;
  sourceCode: string;
  abi: string | null;
  compilerVersion: string | null;
  compilerLanguage: string | null;
};

const CHAIN_ID = "1";
const REPO_BASE = "https://repo.sourcify.dev/contracts";

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;
  return await res.text();
}

function buildMetadataUrl(matchType: SourcifyMatchType, address: string): string {
  return `${REPO_BASE}/${matchType}/${CHAIN_ID}/${address}/metadata.json`;
}

function buildSourceUrl(matchType: SourcifyMatchType, address: string, sourcePath: string): string {
  const encodedPath = sourcePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${REPO_BASE}/${matchType}/${CHAIN_ID}/${address}/sources/${encodedPath}`;
}

function buildStandardJson(metadata: SourcifyMetadata, sources: Record<string, string>): string {
  return JSON.stringify(
    {
      language: metadata.language || "Solidity",
      sources: Object.fromEntries(
        Object.entries(sources).map(([path, content]) => [path, { content }])
      ),
      settings: metadata.settings || {},
    },
    null,
    2
  );
}

export async function fetchSourcifySource(address: string): Promise<SourcifySourceResult | null> {
  const normalized = address.toLowerCase();

  for (const matchType of ["full_match", "partial_match"] as const) {
    const metadata = await fetchJson<SourcifyMetadata>(buildMetadataUrl(matchType, normalized));
    if (!metadata?.sources || typeof metadata.sources !== "object") continue;

    const sourceEntries = await Promise.all(
      Object.keys(metadata.sources).map(async (sourcePath) => {
        const content = await fetchText(buildSourceUrl(matchType, normalized, sourcePath));
        return content != null ? [sourcePath, content] : null;
      })
    );

    const resolvedSources = Object.fromEntries(
      sourceEntries.filter((entry): entry is [string, string] => entry !== null)
    );

    if (Object.keys(resolvedSources).length === 0) continue;

    const abi = metadata.output?.abi ? JSON.stringify(metadata.output.abi) : null;

    return {
      matchType,
      sourceCode: buildStandardJson(metadata, resolvedSources),
      abi,
      compilerVersion: metadata.compiler?.version || null,
      compilerLanguage:
        typeof metadata.language === "string" ? metadata.language.toLowerCase() : null,
    };
  }

  return null;
}
