/**
 * On-the-fly EVM bytecode decompilation using SEVM.
 *
 * Produces Solidity-like pseudocode from raw bytecode for contracts
 * that have no verified source code and no pre-existing decompilation.
 * Results are cached to the database after the first run.
 */

import { Contract } from "sevm";
import "sevm/4bytedb";

/** Skip decompilation for bytecode larger than this (hex chars, so 100K hex = 50KB) */
const MAX_BYTECODE_HEX_LENGTH = 200_000;

/** Maximum time to spend on decompilation (ms) */
const DECOMPILE_TIMEOUT_MS = 5_000;

export interface DecompileResult {
  decompiledCode: string;
  success: boolean;
}

/**
 * Decompile EVM bytecode into Solidity-like pseudocode.
 *
 * Uses the SEVM symbolic interpreter to produce readable output with
 * resolved function names (from the 4byte signature database).
 *
 * @param bytecodeHex - Raw runtime bytecode hex string (with or without 0x prefix)
 * @returns Decompiled pseudocode and success flag
 */
export function decompileContract(bytecodeHex: string): DecompileResult {
  if (!bytecodeHex || bytecodeHex === "0x" || bytecodeHex === "0X") {
    return { decompiledCode: "", success: false };
  }

  const hex = bytecodeHex.startsWith("0x") || bytecodeHex.startsWith("0X")
    ? bytecodeHex
    : `0x${bytecodeHex}`;

  // Safety valve for unusually large contracts
  if (hex.length > MAX_BYTECODE_HEX_LENGTH) {
    console.warn(
      `[decompile] Skipping decompilation: bytecode too large (${hex.length} hex chars)`
    );
    return { decompiledCode: "", success: false };
  }

  try {
    const contract = new Contract(hex).patchdb();
    const solidified = contract.solidify();

    if (!solidified || solidified.trim().length === 0) {
      return { decompiledCode: "", success: false };
    }

    // Prepend header for UI detection
    const header = [
      "// Decompiled by ethereumhistory.com",
      "// Auto-generated pseudocode from bytecode — not verified source code",
      "",
    ].join("\n");

    return {
      decompiledCode: header + solidified,
      success: true,
    };
  } catch (err) {
    console.warn("[decompile] SEVM failed:", err);
    return { decompiledCode: "", success: false };
  }
}

/**
 * Decompile with a timeout to protect against pathological bytecode.
 * Returns a failed result if decompilation takes too long.
 */
export async function decompileContractWithTimeout(
  bytecodeHex: string,
  timeoutMs: number = DECOMPILE_TIMEOUT_MS
): Promise<DecompileResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(
        `[decompile] Timed out after ${timeoutMs}ms`
      );
      resolve({ decompiledCode: "", success: false });
    }, timeoutMs);

    try {
      const result = decompileContract(bytecodeHex);
      clearTimeout(timer);
      resolve(result);
    } catch (err) {
      clearTimeout(timer);
      console.warn("[decompile] Error:", err);
      resolve({ decompiledCode: "", success: false });
    }
  });
}
