export const CONTRACT_CATEGORY_OPTIONS = [
  { key: "token", label: "Token" },
  { key: "crowdsale", label: "Crowdsale / ICO" },
  { key: "dao", label: "DAO / Governance" },
  { key: "exchange", label: "Exchange / DEX" },
  { key: "wallet", label: "Wallet" },
  { key: "multisig", label: "Multisig" },
  { key: "registry", label: "Registry" },
  { key: "nft", label: "NFT / Collectible" },
  { key: "game", label: "Game" },
  { key: "infrastructure", label: "Infrastructure / Protocol" },
  { key: "defi", label: "DeFi" },
  { key: "governance", label: "Governance" },
  { key: "experimental", label: "Experimental" },
  { key: "unknown", label: "Unclassified" },
] as const;

export type ContractCategoryKey = (typeof CONTRACT_CATEGORY_OPTIONS)[number]["key"];

const CONTRACT_CATEGORY_SET = new Set<string>(CONTRACT_CATEGORY_OPTIONS.map((c) => c.key));

export function normalizeContractCategories(input: unknown): ContractCategoryKey[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const out: ContractCategoryKey[] = [];

  for (const raw of input) {
    const value = String(raw || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    if (!CONTRACT_CATEGORY_SET.has(value)) continue;
    seen.add(value);
    out.push(value as ContractCategoryKey);
  }

  return out;
}
