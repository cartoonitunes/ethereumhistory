/**
 * Proxy detection utilities for Ethereum contract bytecode.
 * Detects DELEGATECALL and CALLCODE proxy patterns by properly
 * walking the EVM opcode stream.
 */

export interface ProxyInfo {
  isProxy: boolean;
  targetAddress: string | null;
  proxyType: "delegatecall" | "callcode" | null;
}

/**
 * Detects common proxy patterns in runtime bytecode.
 *
 * Properly walks the EVM opcode stream to find PUSH20 (0x73)
 * followed by DELEGATECALL (0xf4) or CALLCODE (0xf2).
 *
 * Only flags as proxy if:
 * 1. The contract is small (< 200 bytes) — large contracts with DELEGATECALL
 *    are libraries/complex contracts, not simple proxies
 * 2. PUSH20 is followed by DELEGATECALL or CALLCODE within ~30 opcodes
 */
export function detectProxyTarget(runtimeBytecode: string | null | undefined): ProxyInfo {
  const noProxy: ProxyInfo = { isProxy: false, targetAddress: null, proxyType: null };

  if (!runtimeBytecode) return noProxy;

  // Strip optional 0x prefix and lowercase
  const hex = runtimeBytecode.startsWith("0x")
    ? runtimeBytecode.slice(2).toLowerCase()
    : runtimeBytecode.toLowerCase();

  const byteLen = hex.length / 2;

  // Large contracts aren't simple proxies — they may use DELEGATECALL internally
  // but that doesn't make them proxy stubs
  if (byteLen > 200) return noProxy;

  // Walk the opcode stream properly
  // PUSH1-PUSH32 (0x60-0x7f) consume 1-32 bytes of data after the opcode
  let i = 0;
  const candidates: Array<{ address: string; offset: number }> = [];

  while (i < hex.length) {
    const opByte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(opByte)) break;

    if (opByte === 0x73) {
      // PUSH20: next 20 bytes is the address
      if (i + 42 <= hex.length) {
        const addressHex = hex.slice(i + 2, i + 42);
        // Skip zero address and addresses that look like bytecode artifacts
        if (addressHex !== "0".repeat(40)) {
          candidates.push({ address: addressHex, offset: i });
        }
      }
      i += 42; // opcode (2 chars) + 20 bytes (40 chars)
    } else if (opByte >= 0x60 && opByte <= 0x7f) {
      // PUSHn: skip n bytes of data
      const pushSize = opByte - 0x5f;
      i += 2 + pushSize * 2;
    } else if (opByte === 0xf4) {
      // DELEGATECALL — check if we saw a PUSH20 recently
      if (candidates.length > 0) {
        const last = candidates[candidates.length - 1];
        return {
          isProxy: true,
          targetAddress: "0x" + last.address,
          proxyType: "delegatecall",
        };
      }
      i += 2;
    } else if (opByte === 0xf2) {
      // CALLCODE — check if we saw a PUSH20 recently
      if (candidates.length > 0) {
        const last = candidates[candidates.length - 1];
        return {
          isProxy: true,
          targetAddress: "0x" + last.address,
          proxyType: "callcode",
        };
      }
      i += 2;
    } else {
      i += 2; // single-byte opcode
    }
  }

  return noProxy;
}
