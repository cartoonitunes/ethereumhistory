/**
 * The single source of truth for how contracts are categorised.
 *
 * Before this file was authoritative, the same taxonomy was written out by
 * hand in five places — `HeuristicContractType`, `getContractTypeLabel`, the
 * `/types/[type]` landing page, the sitemap, and this options list — each with
 * a different set of keys and labels. That is how the site ended up with two
 * spellings of the same idea ("multisig" the category vs. "Multisig Wallet"
 * the label) and with free-text `contract_type` values like `registrar`,
 * `Token`, `ponzi` and `vending-machine` that nothing could filter on.
 *
 * Everything now derives from `CONTRACT_CATEGORY_OPTIONS`, and every value
 * coming from a historian, an importer, or the database is funnelled through
 * `canonicalizeContractCategory` first.
 */

export const CONTRACT_CATEGORY_OPTIONS = [
  {
    key: "token",
    label: "Token",
    description:
      "ERC-20 compatible tokens and other fungible token contracts deployed on early Ethereum. These contracts implement transfer, balance, and approval mechanisms.",
  },
  {
    key: "nft",
    label: "NFT / Collectible",
    description:
      "Non-fungible tokens and collectible contracts, including the pre-ERC-721 experiments that led to the standard.",
  },
  {
    key: "crowdsale",
    label: "Crowdsale / ICO",
    description:
      "Token sale and crowdfunding contracts from Ethereum's early ICO era. These facilitated the distribution of tokens in exchange for ETH.",
  },
  {
    key: "dao",
    label: "DAO / Governance",
    description:
      "Decentralized Autonomous Organization contracts enabling on-chain governance, voting, and treasury management.",
  },
  {
    key: "exchange",
    label: "Exchange / DEX",
    description:
      "Decentralized exchange contracts, vending machines, and early automated market makers. The predecessors of modern DEX protocols like Uniswap.",
  },
  {
    key: "defi",
    label: "DeFi",
    description:
      "Lending, derivatives, stablecoin and other financial protocol contracts from before DeFi had a name.",
  },
  {
    key: "wallet",
    label: "Wallet",
    description:
      "Smart contract wallets providing enhanced functionality beyond simple EOA accounts, including recovery mechanisms and access control.",
  },
  {
    key: "multisig",
    label: "Multisig",
    description:
      "Multi-signature wallet contracts requiring multiple approvals for transactions. Used by teams and DAOs for secure fund management.",
  },
  {
    key: "registry",
    label: "Registry",
    description:
      "On-chain registry, registrar and name service contracts. These maintain mappings and lookups for various Ethereum infrastructure.",
  },
  {
    key: "library",
    label: "Library",
    description:
      "Shared code deployed once and reused by other contracts, from the era before Solidity had a package ecosystem.",
  },
  {
    key: "factory",
    label: "Factory",
    description: "Contracts whose purpose is deploying other contracts.",
  },
  {
    key: "oracle",
    label: "Oracle",
    description: "Contracts that bring off-chain data on-chain.",
  },
  {
    key: "escrow",
    label: "Escrow",
    description:
      "Conditional-release contracts holding funds on behalf of two or more parties, including arbitration and dead man's switches.",
  },
  {
    key: "lottery",
    label: "Lottery / Gambling",
    description:
      "Games of chance: coin flips, dice, wagers, lotteries, chain letters and pyramid schemes from Ethereum's earliest days.",
  },
  {
    key: "ponzi",
    label: "Ponzi / Pyramid",
    description:
      "Chain letters, pyramid schemes and doublers where new deposits pay earlier entrants. Distinct from games of chance.",
  },
  {
    key: "game",
    label: "Game",
    description:
      "On-chain game contracts and early blockchain gaming experiments, including prediction markets.",
  },
  {
    key: "utility",
    label: "Utility",
    description:
      "Small single-purpose helpers — forwarders, sweepers, canaries, timers and other plumbing.",
  },
  {
    key: "infrastructure",
    label: "Infrastructure / Protocol",
    description: "Protocol-level and ecosystem infrastructure contracts.",
  },
  {
    key: "exploit",
    label: "Exploit",
    description:
      "Contracts written to attack other contracts, preserved for the historical record.",
  },
  {
    key: "experimental",
    label: "Experimental",
    description:
      "Tutorials, tests, and one-off experiments — including the first things anyone deployed to Ethereum.",
  },
  {
    key: "unknown",
    label: "Unclassified",
    description:
      "Contracts whose type could not be determined. These may include custom implementations or contracts still awaiting research.",
  },
] as const;

export type ContractCategoryKey = (typeof CONTRACT_CATEGORY_OPTIONS)[number]["key"];

export const CONTRACT_CATEGORY_KEYS: readonly ContractCategoryKey[] =
  CONTRACT_CATEGORY_OPTIONS.map((c) => c.key);

const CONTRACT_CATEGORY_SET = new Set<string>(CONTRACT_CATEGORY_KEYS);

const CONTRACT_CATEGORY_BY_KEY = new Map(
  CONTRACT_CATEGORY_OPTIONS.map((c) => [c.key as string, c])
);

/**
 * Every spelling that has ever reached the database, mapped onto the canonical
 * key. Keys here are already lower-cased and stripped of separators, so
 * "Multi-Sig", "multi sig" and "multisig_wallet" all land on the same entry.
 */
const CATEGORY_SYNONYMS: Record<string, ContractCategoryKey> = {
  // Multisig — the case that motivated this cleanup.
  multisig: "multisig",
  multisigwallet: "multisig",
  multisignature: "multisig",
  multisignaturewallet: "multisig",

  // Registry family.
  registrar: "registry",
  nameregistry: "registry",
  nameservice: "registry",
  namereg: "registry",

  // Governance is not a separate axis from DAO; one way to find them.
  governance: "dao",
  daogovernance: "dao",

  // Games of chance.
  ponzi: "ponzi",
  pyramid: "ponzi",
  chainletter: "ponzi",
  doubler: "ponzi",
  scheme: "ponzi",
  gambling: "lottery",
  gamble: "lottery",
  casino: "lottery",
  dice: "lottery",
  coinflip: "lottery",
  lottery: "lottery",

  // Curio-style vending machines sell cards for ETH.
  vendingmachine: "exchange",
  dex: "exchange",

  // Tokens and collectibles.
  erc20: "token",
  erc721: "nft",
  collectible: "nft",

  // Buckets that carry no information.
  other: "unknown",
  unclassified: "unknown",
  none: "unknown",
  null: "unknown",

  // One-off experiments and tutorials.
  program: "experimental",
  tutorial: "experimental",
  test: "experimental",
  initializer: "experimental",
  experiment: "experimental",

  // Remaining direct spellings.
  helper: "utility",
  forwarder: "utility",
  attack: "exploit",
  hack: "exploit",
  proxy: "infrastructure",
  protocol: "infrastructure",
  ico: "crowdsale",
  tokensale: "crowdsale",
  presale: "crowdsale",
};

/**
 * Fold a free-text type/category into the canonical vocabulary.
 * Returns null for anything that cannot be mapped, so callers can decide
 * between dropping the value and falling back to "unknown".
 */
export function canonicalizeContractCategory(input: unknown): ContractCategoryKey | null {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return null;

  if (CONTRACT_CATEGORY_SET.has(raw)) return raw as ContractCategoryKey;

  // Collapse separators so "multi-sig", "multi sig" and "multi_sig" agree.
  const collapsed = raw.replace(/[\s._/-]+/g, "");
  if (CONTRACT_CATEGORY_SET.has(collapsed)) return collapsed as ContractCategoryKey;

  return CATEGORY_SYNONYMS[collapsed] ?? null;
}

export function normalizeContractCategories(input: unknown): ContractCategoryKey[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<ContractCategoryKey>();
  const out: ContractCategoryKey[] = [];

  for (const raw of input) {
    const key = canonicalizeContractCategory(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

export function getContractCategoryLabel(key: string | null | undefined): string {
  if (!key) return "Unknown";
  const canonical = canonicalizeContractCategory(key);
  if (!canonical) return String(key);
  return CONTRACT_CATEGORY_BY_KEY.get(canonical)?.label ?? canonical;
}

export function getContractCategoryDescription(key: string | null | undefined): string | null {
  const canonical = canonicalizeContractCategory(key);
  if (!canonical) return null;
  return CONTRACT_CATEGORY_BY_KEY.get(canonical)?.description ?? null;
}
