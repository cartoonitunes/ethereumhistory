/**
 * creature-data.ts — maps Ethereum History contract rows into the shape the
 * EH Explorer game consumes ("creatures"). Used by both the static snapshot
 * generator (scripts/gen-game-data.ts) and the live refresh API
 * (src/app/api/game/creatures/route.ts), so the game gets identical data
 * whether it loads the committed JSON or fetches fresh from the DB.
 *
 * Only DOCUMENTED contracts (those with a short_description) become creatures —
 * those are the ones with real editorial history worth learning.
 */

// The row shape we read (snake_case, straight from the contracts table).
export interface ContractRow {
  address: string;
  token_name?: string | null;
  etherscan_contract_name?: string | null;
  token_symbol?: string | null;
  contract_type?: string | null;
  manual_categories?: unknown;
  is_erc20_like?: boolean | null;
  is_proxy?: boolean | null;
  has_selfdestruct?: boolean | null;
  featured?: boolean | null;
  code_size_bytes?: number | null;
  deployment_block?: number | null;
  deployment_timestamp?: string | Date | null;
  short_description?: string | null;
  description?: string | null;
  historical_significance?: string | null;
  deployer_address?: string | null;
  era_id?: string | null;
}

export interface GameCreature {
  addr: string;
  name: string;
  sym: string | null;
  year: number;
  block: number;
  zone: string;          // era id (normalized)
  cat: string;           // TOKEN | NFT | DAO | GAME | DEFI | TOOL | PONZI | UNKNOWN
  size: number;          // runtime bytecode size in bytes
  rarity: string;        // COMMON..LEGENDARY
  blurb: string;         // short_description
  sig: string;           // historical_significance / description (long study text)
  deployer: string | null;
  featured: boolean;
  link: string;
  copies?: number;       // # of byte/name-identical sibling deployments collapsed
}

// The seven canonical eras → game zones, in play order.
// Eras are defined by hard-fork BLOCK ranges, not calendar years, so their date
// spans straddle year boundaries (Frontier runs to the Homestead fork in Mar 2016).
export const ZONES: { id: string; name: string; year: string }[] = [
  { id: "frontier", name: "FRONTIER", year: "2015-16" },
  { id: "homestead", name: "HOMESTEAD", year: "2016" },
  { id: "dao", name: "DAO FORK", year: "2016" },
  { id: "tangerine", name: "TANGERINE WHISTLE", year: "2016" },
  { id: "spurious", name: "SPURIOUS DRAGON", year: "2016-17" },
  { id: "byzantium", name: "BYZANTIUM", year: "2017-19" },
  { id: "constantinople", name: "CONSTANTINOPLE", year: "2019" },
];
const ZONE_IDS = new Set(ZONES.map((z) => z.id));

function normalizeEra(era?: string | null): string {
  if (!era) return "frontier";
  const e = era.toLowerCase().replace(/[\s_]+/g, "-");
  if (e.startsWith("spurious")) return "spurious";
  if (e.startsWith("tangerine")) return "tangerine";
  if (ZONE_IDS.has(e)) return e;
  return "frontier";
}

// DB contract_type / manual_category → one of the game's eight creature types.
const TYPE_MAP: Record<string, string> = {
  token: "TOKEN", erc20: "TOKEN", "erc-20": "TOKEN", coin: "TOKEN", currency: "TOKEN",
  nft: "NFT", erc721: "NFT", "erc-721": "NFT", collectible: "NFT", art: "NFT",
  dao: "DAO", governance: "DAO", multisig: "DAO", crowdsale: "DAO", voting: "DAO", congress: "DAO",
  game: "GAME", gambling: "GAME", lottery: "GAME", casino: "GAME",
  ponzi: "PONZI", pyramid: "PONZI", doubler: "PONZI", scheme: "PONZI",
  exchange: "DEFI", defi: "DEFI", escrow: "DEFI", oracle: "DEFI", "vending-machine": "DEFI",
  conditional_payment: "DEFI", swap: "DEFI", market: "DEFI", lending: "DEFI",
  wallet: "TOOL", registry: "TOOL", registrar: "TOOL", factory: "TOOL", utility: "TOOL",
  infrastructure: "TOOL", initializer: "TOOL", program: "TOOL", log_aggregator: "TOOL",
  dead_mans_switch: "TOOL", forwarder: "TOOL", proxy: "TOOL", namereg: "TOOL",
};

function parseCats(raw: unknown): string[] {
  if (!raw) return [];
  let v: unknown = raw;
  if (typeof raw === "string") { try { v = JSON.parse(raw); } catch { return [String(raw).toLowerCase()]; } }
  if (Array.isArray(v)) return v.map((x) => String(x).toLowerCase());
  if (typeof v === "string") return [v.toLowerCase()];
  return [];
}

// Keyword fallback over the name + description, so the many contracts the DB
// left as "unknown" still get a meaningful type from what we wrote about them.
// Ordered most-specific first.
const KEYWORD_RULES: [RegExp, string][] = [
  [/ponzi|doubler|pyramid|2x|double your|exit scam/i, "PONZI"],
  [/lotter|gambl|casino|dice|jackpot|\bbet\b|wager|roulette|coin ?flip/i, "GAME"],
  [/\bnft\b|non-fungible|erc-?721|erc-?1155|collectib|cryptokitt|crypto ?punk|crypto ?cats|digital art|curio/i, "NFT"],
  [/\bdao\b|governance|crowdsale|crowdfund|multi-?sig|congress|voting|\bvote\b|shareholder/i, "DAO"],
  [/exchange|\bdex\b|\bswap\b|escrow|oracle|lending|liquidity|market ?maker|vending|order ?book|trade/i, "DEFI"],
  [/wallet|registr|namereg|\bens\b|forwarder|proxy|factory|deployer|library|dispatcher|utility|messag|mailbox|name ?service/i, "TOOL"],
  [/token|\bcoin\b|erc-?20|currency|\bgav\b|fungible/i, "TOKEN"],
];
function keywordType(row: ContractRow): string | null {
  const hay = `${row.token_name || ""} ${row.etherscan_contract_name || ""} ${row.short_description || ""}`;
  for (const [re, t] of KEYWORD_RULES) if (re.test(hay)) return t;
  return null;
}

// Famous contracts whose TYPE the DB gets wrong (most pre-ERC-721 NFTs look
// "erc20-like"). These name overrides win over everything. CryptoKitties is a
// GAME (and gets the kitty sprite, fittingly).
const NAME_TYPE: [RegExp, string][] = [
  [/cryptokitt/i, "GAME"],
  [/cryptopunk|mooncat|^curio|etheria|rare ?pepe|peperium/i, "NFT"],
  [/^the ?dao$|^thedao|dark ?dao|protodao/i, "DAO"],
];
function mapType(row: ContractRow): string {
  const hay = `${row.token_name || ""} ${row.etherscan_contract_name || ""}`;
  for (const [re, t] of NAME_TYPE) if (re.test(hay)) return t;
  const cats = parseCats(row.manual_categories);
  for (const c of cats) if (TYPE_MAP[c]) return TYPE_MAP[c];
  const t = (row.contract_type || "").toLowerCase().trim();
  if (TYPE_MAP[t] && TYPE_MAP[t] !== "TOKEN") return TYPE_MAP[t]; // explicit non-token DB type
  const kw = keywordType(row);                                   // keyword (incl. NFT) BEFORE erc20 fallback
  if (kw) return kw;
  if (TYPE_MAP[t] === "TOKEN" || row.is_erc20_like || (row.token_symbol && row.token_symbol.trim())) return "TOKEN";
  if (cats.includes("token")) return "TOKEN";
  return "UNKNOWN";
}

function nonEmpty(s?: string | null): boolean { return !!(s && s.trim().length > 0); }

// ---- editorial importance (the EH historian audit) -------------------------
// Rarity should reflect HISTORICAL IMPORTANCE, not just age + bytecode. These
// curated name patterns force the most coveted contracts (and their wrappers/
// siblings, per the "a wrapper is as important as the original" principle) into
// the top tiers regardless of the algorithmic score.
// Unicorns + Unicorn Meat are LEGENDARY: alongside MistCoin they're the only
// contracts made by the Ethereum team/Foundation itself (avsa), and they shaped
// how developers thought about tokens and on-chain swaps at the time.
const ALWAYS_LEGENDARY = /^the ?dao$|^thedao|cryptopunk|mooncat|^mistcoin|etheria v0|cryptokitt|ethereum name service|^ens$|^maker$|makerdao|^mkr$|digix gold|unicorn/i;
const ALWAYS_EPIC = /darkdao|the ?dao extra|digixdao|^dgd$|golem|^gnt$|augur|0xbitcoin|curio cards original|curio.*factory|gavcoin|etheria v1|wrapped ?ether|^weth$/i;
// a project is "famous" (a notability nudge) if it matches either tier
const FAMOUS = new RegExp(ALWAYS_LEGENDARY.source + "|" + ALWAYS_EPIC.source, "i");

// Wrappers/reissues sometimes carry a modern deploy date + wrong era. Pin known
// ones back to the era of the original they wrap (the WRAPPER principle).
const ZONE_PIN: [RegExp, string][] = [
  [/unicorn meat/i, "homestead"],
];

// reject auto-generated placeholder blurbs — a history game shouldn't teach with
// "test_no_op" or "Foo contract." stubs.
function isStubBlurb(b?: string | null): boolean {
  const s = (b || "").trim();
  return /^test_no_op$/i.test(s) || /^[\w .-]{1,24} contract\.?$/i.test(s) || s.length < 6;
}

// A "notability" score — importance-weighted. buildGameData() ranks these into a
// PER-ZONE rarity pyramid (so every era has its own rares/epics), then the
// curated lists above force the truly coveted contracts to the top.
function notability(row: ContractRow, zone: string): number {
  let s = 0;
  if (nonEmpty(row.historical_significance)) s += 2;
  if (nonEmpty(row.description)) s += 1.5;
  s += Math.min(2.5, Math.log2((row.code_size_bytes || 1) + 1) / 5);    // size, gentle
  const blk = row.deployment_block || 9e9;
  s += Math.max(0, 1.6 - Math.log10(Math.max(10, blk)) / 4);            // earliness, halved
  if (zone === "frontier") s += 1.0; else if (zone === "homestead") s += 0.5; // reduced bias
  const nm = (row.token_name || row.etherscan_contract_name || "").trim();
  if (nm && nm !== "?" && nm.toLowerCase() !== "unknown") s += 0.5;
  if (FAMOUS.test(nm)) s += 3;                                          // editorial fame leaks in
  return s;
}

function deriveYear(row: ContractRow, zone: string): number {
  if (row.deployment_timestamp) {
    const d = new Date(row.deployment_timestamp);
    if (!isNaN(d.getTime())) return d.getUTCFullYear();
  }
  return { frontier: 2015, homestead: 2016, dao: 2016, tangerine: 2016, spurious: 2017, byzantium: 2018, constantinople: 2019 }[zone] || 2015;
}

function prettyName(s: string): string {
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}
function realName(row: ContractRow): string | null {
  const n = (row.token_name || row.etherscan_contract_name || "").trim();
  if (n && n !== "?" && n.toLowerCase() !== "unknown") return prettyName(n);
  if (row.token_symbol && row.token_symbol.trim()) return prettyName(row.token_symbol.trim());
  return null;
}
function cleanName(row: ContractRow): string {
  return realName(row) || row.address.slice(0, 6) + "..." + row.address.slice(-4);
}
// Only contracts with an actual name/symbol become creatures — no bare 0x… ones.
export function isNamed(row: ContractRow): boolean { return realName(row) !== null; }

export function mapContract(row: ContractRow): GameCreature {
  let zone = normalizeEra(row.era_id);
  const nm = (row.token_name || row.etherscan_contract_name || "");
  for (const [re, z] of ZONE_PIN) if (re.test(nm)) { zone = z; break; }
  return {
    addr: row.address.toLowerCase(),
    name: cleanName(row),
    sym: row.token_symbol && row.token_symbol.trim() ? row.token_symbol.trim() : null,
    year: deriveYear(row, zone),
    block: row.deployment_block || 0,
    zone,
    cat: mapType(row),
    size: row.code_size_bytes || 0,
    rarity: "COMMON",                 // overwritten by buildGameData's ranking
    blurb: (row.short_description || "").trim(),
    sig: (row.historical_significance || row.description || "").trim(),
    deployer: row.deployer_address || null,
    featured: !!row.featured,
    link: "https://ethereumhistory.com/contract/" + row.address.toLowerCase(),
  };
}

export interface GameData {
  generatedAt: string;
  count: number;
  zones: typeof ZONES;
  contracts: GameCreature[];
}

const RANK = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];
function atLeast(cur: string, floor: string): string {
  return RANK.indexOf(cur) >= RANK.indexOf(floor) ? cur : floor;
}

export function buildGameData(rows: ContractRow[], generatedAt: string): GameData {
  const docRows = rows.filter((r) => nonEmpty(r.short_description) && isNamed(r) && !isStubBlurb(r.short_description));
  let items = docRows.map((row) => ({
    creature: mapContract(row),
    featured: !!row.featured,
    score: notability(row, normalizeEra(row.era_id)),
  }));

  // Collapse duplicate-name spam (50× Greeter, 11× Unicorns, …) into one
  // canonical creature, keeping the most notable instance + a copies count.
  const byName = new Map<string, typeof items[number]>();
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = it.creature.name.toLowerCase();
    counts.set(k, (counts.get(k) || 0) + 1);
    const cur = byName.get(k);
    if (!cur || it.score > cur.score) byName.set(k, it);
  }
  items = [...byName.values()];
  for (const it of items) {
    const c = counts.get(it.creature.name.toLowerCase()) || 1;
    if (c > 1) it.creature.copies = c;
  }

  // Rank into a rarity pyramid PER ZONE — so every era has its own commons →
  // epics to find (not all epics stranded in Frontier).
  const byZone = new Map<string, typeof items>();
  for (const it of items) {
    if (it.featured) continue;
    const z = it.creature.zone;
    if (!byZone.has(z)) byZone.set(z, []);
    byZone.get(z)!.push(it);
  }
  for (const list of byZone.values()) {
    list.sort((a, b) => b.score - a.score);
    const n = list.length;
    const epicEnd = Math.max(1, Math.round(n * 0.06));
    const rareEnd = Math.round(n * 0.20);
    const uncEnd = Math.round(n * 0.50);
    list.forEach((it, i) => {
      it.creature.rarity = i < epicEnd ? "EPIC" : i < rareEnd ? "RARE" : i < uncEnd ? "UNCOMMON" : "COMMON";
    });
  }

  // Curated overrides: featured → LEGENDARY; the coveted name lists force tiers.
  for (const it of items) {
    if (it.featured) it.creature.rarity = "LEGENDARY";
    const nm = it.creature.name;
    if (ALWAYS_LEGENDARY.test(nm)) it.creature.rarity = "LEGENDARY";
    else if (ALWAYS_EPIC.test(nm)) it.creature.rarity = atLeast(it.creature.rarity, "EPIC");
  }

  const contracts = items.map((it) => it.creature);
  return { generatedAt, count: contracts.length, zones: ZONES, contracts };
}
