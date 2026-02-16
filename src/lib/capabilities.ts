import {
  analyzeEvm,
  WELL_KNOWN_SELECTORS as SEL,
  WELL_KNOWN_EVENT_PREFIXES as EVT,
  type EvmAnalysis,
} from "./evm-analyzer";

export type CapabilityStatus = "present" | "probable";

export interface CapabilityRow {
  contractAddress: string;
  capabilityKey: string;
  status: CapabilityStatus;
  confidence: number;
  primaryEvidenceType: string;
}

interface ContractInput {
  address: string;
  runtimeBytecode: string | null;
  sourceCode: string | null;
  decompiledCode: string | null;
  isErc20Like?: boolean;
  contractType?: string | null;
  hasSelfDestruct?: boolean;
}

function textLower(source: string | null, decompiled: string | null): string {
  return `${source ?? ""}\n${decompiled ?? ""}`.toLowerCase();
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

function hasAll(haystack: string, needles: string[]): boolean {
  return needles.every((n) => haystack.includes(n));
}

function countMatches(haystack: string, needles: string[]): number {
  return needles.filter((n) => haystack.includes(n)).length;
}

// Structural regex checks on decompiled code
function decompiledHasTransfer(decompiled: string): boolean {
  if (!decompiled) return false;
  const d = decompiled.toLowerCase();
  return /stor\[.*\]\s*[-=]/.test(d) && /stor\[.*\]\s*[+=]/.test(d);
}

function decompiledHasOwnerCheck(decompiled: string): boolean {
  if (!decompiled) return false;
  const d = decompiled.toLowerCase();
  return /require.*caller\s*==\s*stor/.test(d) || /require.*msg\.sender\s*==\s*stor/.test(d);
}

function decompiledHasNestedMapping(decompiled: string): boolean {
  if (!decompiled) return false;
  return /stor\[.*\]\[.*\]/.test(decompiled.toLowerCase());
}

// ============================================================================
// Type detectors
// ============================================================================

function detectToken(
  evm: EvmAnalysis,
  src: string,
  hasBytecode: boolean
): { status: CapabilityStatus; confidence: number } | null {
  // A fungible token IS a contract that:
  //   1. Maintains per-address balances (address → uint mapping)
  //   2. Transfers value between addresses (decrements sender, increments receiver)
  //
  // The bytecode transfer pattern (SLOAD→SUB→SSTORE + SLOAD→ADD→SSTORE) is
  // the definitive behavior. Selectors are interface — they tell us what the
  // contract claims to do, not what it actually does.

  const sel = evm.selectors;
  const hasTransferBehavior = evm.patterns.hasTransferPattern;
  const hasBalanceOfSelector = sel.has(SEL.balanceOf);
  const hasTransferSelector = sel.has(SEL.transfer);
  const hasTotalSupplySelector = sel.has(SEL.totalSupply);
  const hasTransferEvent = evm.eventTopics.has(EVT.transfer);

  // PRESENT: confirmed token behavior
  // - bytecode proves transfer pattern + has balanceOf (tracking per-address state)
  // - OR: all 3 core ERC-20 selectors (the contract explicitly implements the interface)
  if (hasTransferBehavior && (hasBalanceOfSelector || hasTransferEvent))
    return { status: "present", confidence: 0.92 };
  if (hasBalanceOfSelector && hasTransferSelector && hasTotalSupplySelector)
    return { status: "present", confidence: 0.88 };

  // PROBABLE: strong interface signals but can't confirm bytecode behavior
  // - balanceOf + transfer selectors (claims to be a token)
  // - OR: transfer event + balanceOf (emits Transfer, tracks balances)
  if (hasBalanceOfSelector && hasTransferSelector)
    return { status: "probable", confidence: 0.7 };
  if (hasTransferEvent && hasBalanceOfSelector)
    return { status: "probable", confidence: 0.65 };

  // Keywords alone never make something a token
  return null;
}

function detectNft(
  evm: EvmAnalysis,
  _src: string
): { status: CapabilityStatus; confidence: number } | null {
  // An NFT IS a contract with per-token ownership (ownerOf) and token transfers.
  // Detection is selector-based — these are compiled function signatures, not names.

  const sel = evm.selectors;
  const hasOwnerOf = sel.has(SEL.ownerOf);
  const hasSafeTransfer = sel.has(SEL.safeTransferFrom);
  const hasTransferFrom = sel.has(SEL.transferFrom);
  const hasBalanceOf = sel.has(SEL.balanceOf);

  // Don't classify as NFT if it has ERC-20 totalSupply but no ownerOf
  if (sel.has(SEL.totalSupply) && !hasOwnerOf) return null;

  // ownerOf is the defining selector — without it, it's not an NFT
  if (!hasOwnerOf) return null;

  const interfaceSignals = [hasSafeTransfer, hasTransferFrom, hasBalanceOf].filter(Boolean).length;
  if (interfaceSignals >= 2) return { status: "present", confidence: 0.85 };
  if (interfaceSignals >= 1) return { status: "probable", confidence: 0.6 };
  return null;
}

function detectDao(
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  // A DAO IS a contract where token/share holders propose, vote, and execute.
  // This is a semantic category — can't be proven from bytecode alone.
  // Keywords in source/decompiled code can only reach "probable".

  const hasProposal = hasAny(src, ["proposal", "proposals["]);
  const hasVote = hasAny(src, ["vote(", "voting", "votes["]);
  const hasExecute = hasAny(src, ["execute(", "execution"]);
  const hasQuorum = hasAny(src, ["quorum", "threshold", "majority"]);

  if (!hasProposal || !hasVote) return null;
  if (hasAny(src, ["balanceof"]) && !hasExecute && !hasQuorum) return null;

  const signals = [hasProposal, hasVote, hasExecute, hasQuorum].filter(Boolean).length;
  if (signals >= 3) return { status: "probable", confidence: 0.75 };
  return null;
}

function detectMultisig(
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  // A multisig IS a contract where multiple parties must approve before execution.
  // Core elements: multiple owners + confirmation threshold + transaction execution.

  const hasMultipleOwners = hasAny(src, ["owners", "addowner", "removeowner", "isowner"]);
  const hasConfirmation = hasAny(src, ["confirmtransaction", "confirm(", "numconfirmations", "confirmation"]);
  const hasThreshold = hasAny(src, ["required", "threshold", "numconfirmationsrequired"]);
  const hasExplicitMultisig = hasAny(src, ["multisig", "multisigwallet"]);

  // Keyword-only detection can never reach "present" — names are unreliable
  if (hasMultipleOwners && hasConfirmation)
    return { status: "probable", confidence: 0.8 };
  if (hasExplicitMultisig && (hasMultipleOwners || hasConfirmation))
    return { status: "probable", confidence: 0.75 };
  if (hasMultipleOwners && hasThreshold)
    return { status: "probable", confidence: 0.65 };

  return null;
}

function detectCrowdsale(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  // A crowdsale IS a contract that sells tokens for ETH at a rate.
  // Behavioral anchor: must accept ETH (CALLVALUE opcode).
  // Keywords alone → "probable" only.

  if (!evm.hasCallvalue) return null;

  const signals = countMatches(src, [
    "buytokens", "weiraised", "crowdsale", "ico", "tokensale", "presale",
  ]);
  const hasPricing = hasAny(src, ["rate", "price", "tokenspereth"]);

  if (signals >= 2 && hasPricing) return { status: "probable", confidence: 0.75 };
  if (signals >= 2) return { status: "probable", confidence: 0.65 };
  return null;
}

function detectExchange(
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  // An exchange IS a contract that matches orders between counterparties.
  // Core: order book (orders + fill/trade) + two-party matching (maker/taker or bid/ask).

  const hasOrderBook = hasAny(src, ["orderbook", "orders[", "orderhash"]);
  const hasTrade = hasAny(src, ["trade(", "fill(", "filledamount", "fillorder"]);
  const hasCounterparties = hasAny(src, ["maker", "taker"]) || (hasAny(src, ["bid"]) && hasAny(src, ["ask"]));
  const hasExplicitExchange = hasAny(src, ["exchange(", "decentralized exchange", "dex"]);

  // Keywords alone → "probable" only
  if (hasOrderBook && hasTrade)
    return { status: "probable", confidence: 0.75 };
  if (hasTrade && hasCounterparties)
    return { status: "probable", confidence: 0.7 };

  return null;
}

function detectGambling(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  const hasBet = hasAny(src, ["bet", "wager", "gambl"]);
  const hasPayout = hasAny(src, ["payout", "jackpot", "prize", "lottery"]);
  const hasRandomness = evm.hasBlockhash;

  // BLOCKHASH is bytecode-proven, but "bet" and "payout" are keywords → cap at "probable"
  if (hasBet && hasPayout && hasRandomness)
    return { status: "probable", confidence: 0.8 };
  if (hasBet && hasRandomness)
    return { status: "probable", confidence: 0.65 };
  return null;
}

function detectGame(
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  // A game IS a contract with:
  //   1. Game state (rounds, turns, board, level)
  //   2. Player interaction (move, play, join)
  // Both elements must be present — "player" alone means nothing.

  const hasGameState = hasAny(src, ["round", "turn", "board", "level", "score", "piece"]);
  const hasPlayerAction = hasAny(src, ["move(", "play(", "joingame", "newgame", "startgame"]);
  const hasGameIdentity = hasAny(src, ["game(", "game[", "gameid", "gameover"]);

  // All keyword-based → "probable" only
  if (hasGameState && hasPlayerAction && hasGameIdentity)
    return { status: "probable", confidence: 0.7 };
  return null;
}

function detectRegistry(
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  // A registry IS a contract that maps names/keys to records and provides lookup.
  // Core: registration + resolution/lookup. Not just "register" alone.

  const hasRegistration = hasAny(src, ["register(", "registrar", "registration"]);
  const hasResolution = hasAny(src, ["resolve(", "lookup(", "getaddress(", "addr("]);
  const hasExplicitRegistry = hasAny(src, ["registry", "ens", "namehash"]);
  const hasDomainConcept = hasAny(src, ["domain", "subdomain", "tld"]);

  // Keywords alone → "probable" only — names are unreliable
  if (hasRegistration && hasResolution)
    return { status: "probable", confidence: 0.75 };
  if (hasExplicitRegistry && (hasRegistration || hasResolution))
    return { status: "probable", confidence: 0.7 };
  if (hasRegistration && hasDomainConcept)
    return { status: "probable", confidence: 0.6 };

  return null;
}

// ============================================================================
// Standard compliance
// ============================================================================

function detectErc20(
  evm: EvmAnalysis
): { status: CapabilityStatus; confidence: number } | null {
  const sel = evm.selectors;
  const required = [
    SEL.balanceOf, SEL.transfer, SEL.totalSupply,
    SEL.approve, SEL.allowance, SEL.transferFrom,
  ];
  const matched = required.filter((s) => sel.has(s)).length;
  const hasTransferEvent = evm.eventTopics.has(EVT.transfer);

  if (matched === 6 && hasTransferEvent) return { status: "present", confidence: 0.95 };
  if (matched === 6) return { status: "present", confidence: 0.9 };
  if (matched >= 5) return { status: "probable", confidence: 0.7 };
  return null;
}

function detectErc721(
  evm: EvmAnalysis
): { status: CapabilityStatus; confidence: number } | null {
  const sel = evm.selectors;
  const hasOwnerOf = sel.has(SEL.ownerOf);
  const hasSafeTransfer = sel.has(SEL.safeTransferFrom);
  const hasTransferFrom = sel.has(SEL.transferFrom);
  const hasBalanceOf = sel.has(SEL.balanceOf);

  // Don't classify as ERC-721 if it has ERC-20 totalSupply (likely a token)
  if (sel.has(SEL.totalSupply) && !hasOwnerOf) return null;

  const signals = [hasOwnerOf, hasSafeTransfer, hasTransferFrom, hasBalanceOf].filter(Boolean).length;
  if (hasOwnerOf && signals >= 3) return { status: "present", confidence: 0.85 };
  if (hasOwnerOf && signals >= 2) return { status: "probable", confidence: 0.6 };
  return null;
}

function detectErc165(
  evm: EvmAnalysis
): { status: CapabilityStatus; confidence: number } | null {
  if (evm.selectors.has(SEL.supportsInterface))
    return { status: "present", confidence: 0.95 };
  return null;
}

// ============================================================================
// Token properties
// ============================================================================

function detectMintable(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  const hasMintSelector = evm.selectors.has(SEL.mint2arg);
  const hasMintKeyword = hasAny(src, ["mint(", "_mint(", "mint ("]);
  const hasBytecodePattern = evm.patterns.hasMintPattern;

  if (hasMintSelector || (hasMintKeyword && hasBytecodePattern))
    return { status: "present", confidence: 0.85 };
  if (hasMintKeyword || hasBytecodePattern)
    return { status: "probable", confidence: 0.65 };
  return null;
}

function detectMintControlled(
  src: string,
  isMintable: boolean
): { status: CapabilityStatus; confidence: number } | null {
  if (!isMintable) return null;

  // Keywords alone → "probable" only — can't prove access gating from names
  const hasGuard = hasAny(src, ["onlyowner", "require(msg.sender", "onlyminter", "hasrole"]);
  if (hasGuard) return { status: "probable", confidence: 0.7 };
  return null;
}

function detectMintOpen(
  src: string,
  isMintable: boolean,
  isMintControlled: boolean
): { status: CapabilityStatus; confidence: number } | null {
  if (!isMintable || isMintControlled) return null;
  // Mint exists but no access control detected
  return { status: "probable", confidence: 0.6 };
}

function detectBurnable(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  const hasBurnSelector = evm.selectors.has(SEL.burn);
  const hasBurnKeyword = hasAny(src, ["burn(", "_burn(", "burn ("]);
  const hasBytecodePattern = evm.patterns.hasBurnPattern;

  if (hasBurnSelector || (hasBurnKeyword && hasBytecodePattern))
    return { status: "present", confidence: 0.85 };
  if (hasBurnKeyword || hasBytecodePattern)
    return { status: "probable", confidence: 0.65 };
  return null;
}

function detectSupplyCapped(
  src: string,
  isMintable: boolean
): { status: CapabilityStatus; confidence: number } | null {
  if (!isMintable) return null;

  // Keywords alone → "probable" only — can't prove supply cap from names
  if (hasAny(src, ["cap", "maxsupply", "max_supply", "total_supply", "totalsupply"]) &&
      hasAny(src, ["require", "assert", "revert"])) {
    return { status: "probable", confidence: 0.65 };
  }
  return null;
}

function detectSupplyUncapped(
  isMintable: boolean,
  isCapped: boolean
): { status: CapabilityStatus; confidence: number } | null {
  if (!isMintable || isCapped) return null;
  return { status: "probable", confidence: 0.55 };
}

function detectHasAllowance(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  const hasApprove = evm.selectors.has(SEL.approve);
  const hasTransferFrom = evm.selectors.has(SEL.transferFrom);
  const hasKeywords = hasAny(src, ["approve(", "allowance", "transferfrom("]);

  if (hasApprove && hasTransferFrom) return { status: "present", confidence: 0.9 };
  if (hasApprove || hasTransferFrom || hasKeywords)
    return { status: "probable", confidence: 0.65 };
  return null;
}

function detectHasMetadata(
  evm: EvmAnalysis
): { status: CapabilityStatus; confidence: number } | null {
  const hasName = evm.selectors.has(SEL.name);
  const hasSymbol = evm.selectors.has(SEL.symbol);
  const hasDecimals = evm.selectors.has(SEL.decimals);

  if (hasName && hasSymbol && hasDecimals)
    return { status: "present", confidence: 0.9 };
  if (hasName && hasSymbol)
    return { status: "probable", confidence: 0.7 };
  return null;
}

function detectDeflationary(
  src: string,
  isToken: boolean
): { status: CapabilityStatus; confidence: number } | null {
  if (!isToken) return null;

  const hasFeeKeyword = hasAny(src, ["fee", "tax", "burn"]);
  const nearTransfer = hasAny(src, ["transfer"]);

  if (hasFeeKeyword && nearTransfer)
    return { status: "probable", confidence: 0.5 };
  return null;
}

// ============================================================================
// General features
// ============================================================================

function detectPausable(
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  // Keywords alone → "probable" only — names are unreliable
  const signals = countMatches(src, ["pause", "unpause", "whennotpaused", "paused"]);
  if (signals >= 2) return { status: "probable", confidence: 0.75 };
  if (signals >= 1 && hasAny(src, ["pause(", "unpause("])) return { status: "probable", confidence: 0.55 };
  return null;
}

function detectOwnable(
  evm: EvmAnalysis,
  src: string,
  decompiled: string | null
): { status: CapabilityStatus; confidence: number } | null {
  // Ownable IS a contract that stores an owner address and gates functions behind it.
  // CALLER → SLOAD → EQ is common — but many contracts check caller for other reasons.
  // We need "owner" as a concept (stored address) + access gating (onlyOwner/require).

  const hasOwnerConcept = hasAny(src, ["owner", "onlyowner", "ownable", "transferownership"]);
  const hasAccessGating = hasAny(src, ["onlyowner", "require(msg.sender == owner", "require(msg.sender==owner"]);
  const hasDecompiledPattern = decompiledHasOwnerCheck(decompiled ?? "");
  const hasOwnershipTransfer = hasAny(src, ["transferownership", "newowner", "changeowner"]);

  // Present: explicit owner concept + access gating in source/decompiled
  if (hasAccessGating && hasOwnerConcept)
    return { status: "present", confidence: 0.9 };
  if (hasOwnerConcept && hasDecompiledPattern)
    return { status: "present", confidence: 0.85 };
  if (hasOwnerConcept && hasOwnershipTransfer)
    return { status: "present", confidence: 0.85 };

  // Probable: owner keyword + bytecode caller check (less certain)
  if (hasOwnerConcept && evm.patterns.hasOwnerCheck)
    return { status: "probable", confidence: 0.6 };

  // Bytecode caller check alone is NOT ownable — too generic
  return null;
}

function detectRoleBased(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  const hasRoleKeywords = hasAny(src, ["hasrole", "onlyrole", "role", "admin"]) &&
    hasAny(src, ["require", "modifier"]);
  const hasBytecodePattern = evm.patterns.hasRoleMappingCheck;

  if (hasRoleKeywords && hasBytecodePattern) return { status: "present", confidence: 0.85 };
  if (hasRoleKeywords || hasBytecodePattern) return { status: "probable", confidence: 0.6 };
  return null;
}

function detectUpgradeable(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  if (!evm.hasDelegatecall) return null;

  const hasKeywords = hasAny(src, ["proxy", "implementation", "upgrade", "delegatecall"]);
  if (hasKeywords) return { status: "present", confidence: 0.9 };
  return { status: "probable", confidence: 0.7 };
}

function detectSelfDestruct(
  evm: EvmAnalysis
): { status: CapabilityStatus; confidence: number } | null {
  if (evm.hasSelfdestruct) return { status: "present", confidence: 1.0 };
  return null;
}

function detectPayable(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  if (!evm.hasCallvalue) return null;

  if (hasAny(src, ["payable", "msg.value"]))
    return { status: "present", confidence: 0.9 };
  if (evm.patterns.hasCallvalueWithoutRevert)
    return { status: "present", confidence: 0.85 };
  return { status: "probable", confidence: 0.7 };
}

function detectTimeLocked(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  if (!evm.hasTimestamp) return null;

  const hasKeywords = hasAny(src, ["deadline", "unlock", "lock", "timelock", "expir"]);
  if (hasKeywords && evm.patterns.hasTimestampComparison)
    return { status: "present", confidence: 0.85 };
  if (hasKeywords || evm.patterns.hasTimestampComparison)
    return { status: "probable", confidence: 0.6 };
  return null;
}

function detectReentrancyGuard(
  evm: EvmAnalysis,
  src: string
): { status: CapabilityStatus; confidence: number } | null {
  const hasKeywords = hasAny(src, ["locked", "mutex", "reentrancy", "nonreentrant"]);
  const hasBytecodePattern = evm.patterns.hasMutexPattern;

  if (hasKeywords && hasBytecodePattern) return { status: "present", confidence: 0.9 };
  if (hasKeywords) return { status: "probable", confidence: 0.65 };
  if (hasBytecodePattern) return { status: "probable", confidence: 0.55 };
  return null;
}

// ============================================================================
// Main classifier
// ============================================================================

export function classifyContract(contract: ContractInput): CapabilityRow[] {
  const rows: CapabilityRow[] = [];
  const addr = contract.address.toLowerCase();

  const evm = contract.runtimeBytecode
    ? analyzeEvm(contract.runtimeBytecode)
    : null;

  const src = textLower(contract.sourceCode, contract.decompiledCode);
  const hasBytecode = !!contract.runtimeBytecode;
  const hasSrc = src.trim().length > 0;

  // If no bytecode and no source, we can't classify
  if (!evm && !hasSrc) return rows;

  // Create a dummy analysis if no bytecode
  const analysis: EvmAnalysis = evm ?? {
    opcodes: [],
    selectors: new Set(),
    hasSelfdestruct: false,
    hasDelegatecall: false,
    hasCallvalue: false,
    hasBlockhash: false,
    hasTimestamp: false,
    eventTopics: new Set(),
    patterns: {
      hasTransferPattern: false,
      hasMintPattern: false,
      hasBurnPattern: false,
      hasOwnerCheck: false,
      hasRoleMappingCheck: false,
      hasMutexPattern: false,
      hasTwoKeyMapping: false,
      hasSupplyCapCheck: false,
      hasCallvalueWithoutRevert: false,
      hasTimestampComparison: false,
    },
  };

  function push(key: string, result: { status: CapabilityStatus; confidence: number } | null, evidenceType: string) {
    if (result) {
      rows.push({
        contractAddress: addr,
        capabilityKey: key,
        status: result.status,
        confidence: result.confidence,
        primaryEvidenceType: evidenceType,
      });
    }
    return result;
  }

  // --- Contract Types ---
  const tokenResult = push("type:token", detectToken(analysis, src, hasBytecode), "selector");
  const isToken = !!tokenResult;
  push("type:nft", detectNft(analysis, src), "selector");
  push("type:dao", detectDao(src), "keyword");
  push("type:multisig", detectMultisig(src), "keyword");
  push("type:crowdsale", detectCrowdsale(analysis, src), "keyword");
  push("type:exchange", detectExchange(src), "keyword");
  push("type:gambling", detectGambling(analysis, src), "keyword");
  push("type:game", detectGame(src), "keyword");
  push("type:registry", detectRegistry(src), "keyword");

  // Unclassified: if no type was detected
  const hasAnyType = rows.some((r) => r.capabilityKey.startsWith("type:"));
  if (!hasAnyType) {
    rows.push({
      contractAddress: addr,
      capabilityKey: "type:unclassified",
      status: "present",
      confidence: 1.0,
      primaryEvidenceType: "none",
    });
  }

  // --- Standards ---
  push("standard:erc20", detectErc20(analysis), "selector");
  push("standard:erc721", detectErc721(analysis), "selector");
  push("standard:erc165", detectErc165(analysis), "selector");

  // --- Token Properties (only if type:token detected) ---
  if (isToken) {
    const mintResult = push("token:mintable", detectMintable(analysis, src), "selector");
    const isMintable = !!mintResult;

    const mintControlledResult = push(
      "token:mint-controlled",
      detectMintControlled(src, isMintable),
      "keyword"
    );
    const isMintControlled = !!mintControlledResult;

    push("token:mint-open", detectMintOpen(src, isMintable, isMintControlled), "keyword");
    push("token:burnable", detectBurnable(analysis, src), "selector");

    const capResult = push("token:supply-capped", detectSupplyCapped(src, isMintable), "keyword");
    const isCapped = !!capResult;
    push("token:supply-uncapped", detectSupplyUncapped(isMintable, isCapped), "keyword");

    push("token:has-allowance", detectHasAllowance(analysis, src), "selector");
    push("token:has-metadata", detectHasMetadata(analysis), "selector");
    push("token:deflationary", detectDeflationary(src, isToken), "keyword");
  }

  // --- General Features ---
  push("feature:pausable", detectPausable(src), "keyword");
  push("feature:ownable", detectOwnable(analysis, src, contract.decompiledCode), "keyword");
  push("feature:role-based", detectRoleBased(analysis, src), "keyword");
  push("feature:upgradeable", detectUpgradeable(analysis, src), "opcode");
  push("feature:self-destruct", detectSelfDestruct(analysis), "opcode");
  push("feature:payable", detectPayable(analysis, src), "opcode");
  push("feature:time-locked", detectTimeLocked(analysis, src), "opcode");
  push("feature:reentrancy-guard", detectReentrancyGuard(analysis, src), "keyword");

  // Use existing DB heuristics as tiebreakers
  if (contract.hasSelfDestruct && !rows.find((r) => r.capabilityKey === "feature:self-destruct")) {
    rows.push({
      contractAddress: addr,
      capabilityKey: "feature:self-destruct",
      status: "present",
      confidence: 0.95,
      primaryEvidenceType: "db-heuristic",
    });
  }

  if (contract.isErc20Like && !rows.find((r) => r.capabilityKey === "type:token")) {
    rows.push({
      contractAddress: addr,
      capabilityKey: "type:token",
      status: "probable",
      confidence: 0.6,
      primaryEvidenceType: "db-heuristic",
    });
    // Remove unclassified if we just added a type
    const unclassifiedIdx = rows.findIndex((r) => r.capabilityKey === "type:unclassified");
    if (unclassifiedIdx !== -1) rows.splice(unclassifiedIdx, 1);
  }

  return rows;
}
