/**
 * Proxy detection utilities for Ethereum contract bytecode.
 * Detects DELEGATECALL and CALLCODE proxy patterns.
 */

export interface ProxyInfo {
  isProxy: boolean;
  targetAddress: string | null;
  proxyType: "delegatecall" | "callcode" | null;
}

/**
 * Detects common proxy patterns in runtime bytecode.
 *
 * Looks for PUSH20 (0x73) followed by a 20-byte address,
 * then DELEGATECALL (0xf4) or CALLCODE (0xf2) nearby.
 *
 * Example bytecode:
 *   3660008037602060003660003473273930d21e01ee25e4c219b63259d214872220a261235a5a03f2
 *   The `73` opcode pushes the next 20 bytes (40 hex chars) as an address.
 */
export function detectProxyTarget(runtimeBytecode: string | null | undefined): ProxyInfo {
  const noProxy: ProxyInfo = { isProxy: false, targetAddress: null, proxyType: null };

  if (!runtimeBytecode) return noProxy;

  // Strip optional 0x prefix and lowercase
  const hex = runtimeBytecode.startsWith("0x")
    ? runtimeBytecode.slice(2).toLowerCase()
    : runtimeBytecode.toLowerCase();

  if (hex.length < 42) return noProxy; // Too short to contain PUSH20 + address

  // Scan for PUSH20 opcode (0x73)
  for (let i = 0; i < hex.length - 41; i += 2) {
    const byte = hex.slice(i, i + 2);
    if (byte !== "73") continue;

    // Next 20 bytes (40 hex chars) is the pushed address
    const addressHex = hex.slice(i + 2, i + 42);

    // Skip zero address
    if (addressHex === "0".repeat(40)) continue;

    // Look for DELEGATECALL (f4) or CALLCODE (f2) within the next ~60 bytes
    const lookAhead = hex.slice(i + 42, Math.min(hex.length, i + 42 + 120));

    for (let j = 0; j < lookAhead.length - 1; j += 2) {
      const opcode = lookAhead.slice(j, j + 2);
      if (opcode === "f4") {
        return {
          isProxy: true,
          targetAddress: "0x" + addressHex,
          proxyType: "delegatecall",
        };
      }
      if (opcode === "f2") {
        return {
          isProxy: true,
          targetAddress: "0x" + addressHex,
          proxyType: "callcode",
        };
      }
    }
  }

  return noProxy;
}
