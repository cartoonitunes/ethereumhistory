const OPCODES: Record<number, string> = {
  0x00: "STOP", 0x01: "ADD", 0x02: "MUL", 0x03: "SUB", 0x04: "DIV",
  0x05: "SDIV", 0x06: "MOD", 0x07: "SMOD", 0x08: "ADDMOD", 0x09: "MULMOD",
  0x0a: "EXP", 0x0b: "SIGNEXTEND",
  0x10: "LT", 0x11: "GT", 0x12: "SLT", 0x13: "SGT", 0x14: "EQ",
  0x15: "ISZERO", 0x16: "AND", 0x17: "OR", 0x18: "XOR", 0x19: "NOT",
  0x1a: "BYTE", 0x1b: "SHL", 0x1c: "SHR", 0x1d: "SAR",
  0x20: "SHA3",
  0x30: "ADDRESS", 0x31: "BALANCE", 0x32: "ORIGIN", 0x33: "CALLER",
  0x34: "CALLVALUE", 0x35: "CALLDATALOAD", 0x36: "CALLDATASIZE",
  0x37: "CALLDATACOPY", 0x38: "CODESIZE", 0x39: "CODECOPY",
  0x3a: "GASPRICE", 0x3b: "EXTCODESIZE", 0x3c: "EXTCODECOPY",
  0x3d: "RETURNDATASIZE", 0x3e: "RETURNDATACOPY", 0x3f: "EXTCODEHASH",
  0x40: "BLOCKHASH", 0x41: "COINBASE", 0x42: "TIMESTAMP", 0x43: "NUMBER",
  0x44: "DIFFICULTY", 0x45: "GASLIMIT",
  0x50: "POP", 0x51: "MLOAD", 0x52: "MSTORE", 0x53: "MSTORE8",
  0x54: "SLOAD", 0x55: "SSTORE", 0x56: "JUMP", 0x57: "JUMPI",
  0x58: "PC", 0x59: "MSIZE", 0x5a: "GAS", 0x5b: "JUMPDEST",
  0xa0: "LOG0", 0xa1: "LOG1", 0xa2: "LOG2", 0xa3: "LOG3", 0xa4: "LOG4",
  0xf0: "CREATE", 0xf1: "CALL", 0xf2: "CALLCODE", 0xf3: "RETURN",
  0xf4: "DELEGATECALL", 0xf5: "CREATE2",
  0xfa: "STATICCALL", 0xfd: "REVERT", 0xfe: "INVALID", 0xff: "SELFDESTRUCT",
};

for (let i = 0; i < 32; i++) {
  OPCODES[0x60 + i] = `PUSH${i + 1}`;
  OPCODES[0x80 + i] = i < 16 ? `DUP${i + 1}` : `SWAP${i - 15}`;
}

export interface Opcode {
  offset: number;
  op: number;
  name: string;
  pushValue?: string;
}

export interface EvmAnalysis {
  opcodes: Opcode[];
  selectors: Set<string>;
  hasSelfdestruct: boolean;
  hasDelegatecall: boolean;
  hasCallvalue: boolean;
  hasBlockhash: boolean;
  hasTimestamp: boolean;
  eventTopics: Set<string>;
  patterns: EvmPatterns;
}

export interface EvmPatterns {
  hasTransferPattern: boolean;
  hasMintPattern: boolean;
  hasBurnPattern: boolean;
  hasOwnerCheck: boolean;
  hasRoleMappingCheck: boolean;
  hasMutexPattern: boolean;
  hasTwoKeyMapping: boolean;
  hasSupplyCapCheck: boolean;
  hasCallvalueWithoutRevert: boolean;
  hasTimestampComparison: boolean;
}

const KNOWN_EVENT_TOPICS: Record<string, string> = {
  "ddf252ad": "Transfer",
  "8c5be1e5": "Approval",
  "e1fffcc4": "Deposit",
  "7fcf532c": "Withdrawal",
};

export function disassemble(bytecodeHex: string): Opcode[] {
  const hex = bytecodeHex.startsWith("0x") ? bytecodeHex.slice(2) : bytecodeHex;
  const opcodes: Opcode[] = [];
  let i = 0;

  while (i < hex.length) {
    const offset = i / 2;
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) break;

    const name = OPCODES[byte] || `UNKNOWN(0x${byte.toString(16)})`;
    const entry: Opcode = { offset, op: byte, name };

    if (byte >= 0x60 && byte <= 0x7f) {
      const pushBytes = byte - 0x5f;
      const valueHex = hex.slice(i + 2, i + 2 + pushBytes * 2);
      entry.pushValue = valueHex.toLowerCase();
      i += 2 + pushBytes * 2;
    } else {
      i += 2;
    }

    opcodes.push(entry);
  }

  return opcodes;
}

export function extractSelectors(opcodes: Opcode[]): Set<string> {
  const selectors = new Set<string>();

  for (let i = 0; i < opcodes.length - 2; i++) {
    const op = opcodes[i];
    if (op.name === "PUSH4" && op.pushValue && op.pushValue.length === 8) {
      const next1 = opcodes[i + 1];
      const next2 = opcodes[i + 2];
      if (next1?.name === "EQ" && next2?.name === "PUSH2") {
        selectors.add(op.pushValue);
      }
      if (next1?.name === "EQ" &&
        (next2?.name === "PUSH1" || next2?.name === "PUSH2" || next2?.name === "PUSH3")) {
        const next3 = opcodes[i + 3];
        if (next3?.name === "JUMPI") {
          selectors.add(op.pushValue);
        }
      }
      if (next1?.name === "DUP2" || next1?.name === "DUP3") {
        const next2b = opcodes[i + 2];
        if (next2b?.name === "EQ") {
          selectors.add(op.pushValue);
        }
      }
    }
    if (op.name === "PUSH4" && op.pushValue && op.pushValue.length === 8) {
      if (i + 1 < opcodes.length && opcodes[i + 1]?.name === "EQ") {
        selectors.add(op.pushValue);
      }
    }
  }

  return selectors;
}

export function extractEventTopics(opcodes: Opcode[]): Set<string> {
  const topics = new Set<string>();

  for (let i = 0; i < opcodes.length; i++) {
    const op = opcodes[i];
    if (op.name.startsWith("LOG") && op.op >= 0xa1 && op.op <= 0xa4) {
      for (let j = Math.max(0, i - 10); j < i; j++) {
        const prev = opcodes[j];
        if (prev.name === "PUSH32" && prev.pushValue) {
          const topicPrefix = prev.pushValue.slice(0, 8);
          topics.add(topicPrefix);
        }
      }
    }
  }

  return topics;
}

export function analyzePatterns(opcodes: Opcode[]): EvmPatterns {
  let hasTransferPattern = false;
  let hasMintPattern = false;
  let hasBurnPattern = false;
  let hasOwnerCheck = false;
  let hasRoleMappingCheck = false;
  let hasMutexPattern = false;
  let hasTwoKeyMapping = false;
  let hasSupplyCapCheck = false;
  let hasCallvalueWithoutRevert = false;
  let hasTimestampComparison = false;

  const len = opcodes.length;

  for (let i = 0; i < len; i++) {
    const op = opcodes[i];

    // Transfer pattern: SLOAD → SUB → SSTORE ... SLOAD → ADD → SSTORE in window
    if (op.name === "SLOAD") {
      const window = opcodes.slice(i, Math.min(i + 30, len));
      const names = window.map((o) => o.name);
      const hasSub = names.indexOf("SUB");
      const hasAdd = names.indexOf("ADD");
      if (hasSub !== -1 && hasAdd !== -1) {
        const afterSub = names.indexOf("SSTORE", hasSub);
        const afterAdd = names.indexOf("SSTORE", hasAdd);
        if (afterSub !== -1 && afterAdd !== -1 && afterSub < afterAdd) {
          hasTransferPattern = true;
        }
      }
    }

    // Mint pattern: SLOAD → ADD → SSTORE without a preceding SUB→SSTORE
    if (op.name === "SLOAD" && !hasTransferPattern) {
      const window = opcodes.slice(i, Math.min(i + 15, len));
      const names = window.map((o) => o.name);
      const addIdx = names.indexOf("ADD");
      if (addIdx !== -1) {
        const storeAfterAdd = names.indexOf("SSTORE", addIdx);
        const subIdx = names.indexOf("SUB");
        if (storeAfterAdd !== -1 && (subIdx === -1 || subIdx > storeAfterAdd)) {
          hasMintPattern = true;
        }
      }
    }

    // Burn pattern: SLOAD → SUB → SSTORE without a subsequent ADD→SSTORE
    if (op.name === "SLOAD") {
      const window = opcodes.slice(i, Math.min(i + 15, len));
      const names = window.map((o) => o.name);
      const subIdx = names.indexOf("SUB");
      if (subIdx !== -1) {
        const storeAfterSub = names.indexOf("SSTORE", subIdx);
        const addIdx = names.indexOf("ADD");
        if (storeAfterSub !== -1 && (addIdx === -1 || addIdx > storeAfterSub + 5)) {
          hasBurnPattern = true;
        }
      }
    }

    // Owner check: CALLER → (optional ops) → EQ → JUMPI near function entry
    if (op.name === "CALLER") {
      const window = opcodes.slice(i, Math.min(i + 8, len));
      const names = window.map((o) => o.name);
      if (names.includes("EQ") && names.includes("JUMPI")) {
        hasOwnerCheck = true;
      }
      if (names.includes("SLOAD") && names.includes("EQ")) {
        hasOwnerCheck = true;
      }
    }

    // Role mapping check: CALLER → SHA3 → SLOAD → ISZERO → JUMPI
    if (op.name === "CALLER") {
      const window = opcodes.slice(i, Math.min(i + 12, len));
      const names = window.map((o) => o.name);
      if (names.includes("SHA3") && names.includes("SLOAD") && names.includes("ISZERO")) {
        hasRoleMappingCheck = true;
      }
    }

    // Mutex: SLOAD → check-zero → SSTORE(1) → ... → SSTORE(0)
    if (op.name === "SLOAD") {
      const window = opcodes.slice(i, Math.min(i + 8, len));
      const names = window.map((o) => o.name);
      if (names.includes("ISZERO") && names.filter((n) => n === "SSTORE").length >= 1) {
        const push1Count = window.filter(
          (o) => o.name === "PUSH1" && (o.pushValue === "01" || o.pushValue === "00")
        ).length;
        if (push1Count >= 1) {
          hasMutexPattern = true;
        }
      }
    }

    // Two-key mapping: two SHA3 operations composing nested keys
    if (op.name === "SHA3") {
      const window = opcodes.slice(i + 1, Math.min(i + 15, len));
      const names = window.map((o) => o.name);
      if (names.includes("SHA3")) {
        hasTwoKeyMapping = true;
      }
    }

    // Supply cap check: comparison (LT/GT) near a SLOAD→ADD→SSTORE
    if ((op.name === "LT" || op.name === "GT") && hasMintPattern) {
      const surroundingWindow = opcodes.slice(Math.max(0, i - 10), Math.min(i + 10, len));
      const names = surroundingWindow.map((o) => o.name);
      if (names.includes("SLOAD") && names.includes("ADD")) {
        hasSupplyCapCheck = true;
      }
    }

    // CALLVALUE not immediately followed by ISZERO→JUMPI (accepting ETH)
    if (op.name === "CALLVALUE") {
      const next = opcodes.slice(i + 1, Math.min(i + 4, len));
      const names = next.map((o) => o.name);
      if (!(names[0] === "ISZERO" || (names[0] === "DUP1" && names[1] === "ISZERO"))) {
        hasCallvalueWithoutRevert = true;
      } else {
        // Even with ISZERO check, if it jumps to NOT revert, it's payable
        // But basic heuristic: if CALLVALUE exists at all, mark it
        hasCallvalueWithoutRevert = true;
      }
    }

    // Timestamp comparison: TIMESTAMP → (ops) → comparison → JUMPI
    if (op.name === "TIMESTAMP") {
      const window = opcodes.slice(i, Math.min(i + 8, len));
      const names = window.map((o) => o.name);
      if (
        (names.includes("LT") || names.includes("GT") || names.includes("SLT") || names.includes("SGT")) &&
        names.includes("JUMPI")
      ) {
        hasTimestampComparison = true;
      }
    }
  }

  return {
    hasTransferPattern,
    hasMintPattern,
    hasBurnPattern,
    hasOwnerCheck,
    hasRoleMappingCheck,
    hasMutexPattern,
    hasTwoKeyMapping,
    hasSupplyCapCheck,
    hasCallvalueWithoutRevert,
    hasTimestampComparison,
  };
}

export function analyzeEvm(bytecodeHex: string): EvmAnalysis {
  const opcodes = disassemble(bytecodeHex);
  const selectors = extractSelectors(opcodes);
  const eventTopics = extractEventTopics(opcodes);
  const patterns = analyzePatterns(opcodes);

  let hasSelfdestruct = false;
  let hasDelegatecall = false;
  let hasCallvalue = false;
  let hasBlockhash = false;
  let hasTimestamp = false;

  for (const op of opcodes) {
    if (op.op === 0xff) hasSelfdestruct = true;
    if (op.op === 0xf4) hasDelegatecall = true;
    if (op.op === 0x34) hasCallvalue = true;
    if (op.op === 0x40) hasBlockhash = true;
    if (op.op === 0x42) hasTimestamp = true;
  }

  return {
    opcodes,
    selectors,
    hasSelfdestruct,
    hasDelegatecall,
    hasCallvalue,
    hasBlockhash,
    hasTimestamp,
    eventTopics,
    patterns,
  };
}

export const WELL_KNOWN_SELECTORS = {
  balanceOf: "70a08231",
  transfer: "a9059cbb",
  totalSupply: "18160ddd",
  approve: "095ea7b3",
  allowance: "dd62ed3e",
  transferFrom: "23b872dd",
  name: "06fdde03",
  symbol: "95d89b41",
  decimals: "313ce567",
  ownerOf: "6352211e",
  safeTransferFrom: "42842e0e",
  supportsInterface: "01ffc9a7",
  mint2arg: "40c10f19",
  burn: "42966c68",
} as const;

export const WELL_KNOWN_EVENT_PREFIXES = {
  transfer: "ddf252ad",
  approval: "8c5be1e5",
} as const;
