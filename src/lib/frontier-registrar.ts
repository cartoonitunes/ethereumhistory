/**
 * Frontier Name Registrar lookup table.
 *
 * Decoded from on-chain calldata for two Frontier-era registrars:
 *   - GlobalRegistrar: 0xc6d9d2cd449a754c494264e1809c50e34d64562b (block 51,844)
 *     The registrar referenced in the original ethereum.org "Register a name for your coin" tutorial.
 *   - NameRegistry:    0xa1a111bc074c9cfa781f0c38e63bd51c91b8af00 (block 52,426)
 *     A parallel registrar used by exchanges (Kraken, Bittrex, etc.)
 *
 * Maps the last-resolved address for each registered name.
 * All addresses are lowercase.
 */
export interface FrontierRegistrarEntry {
  name: string;
  registrar: "GlobalRegistrar" | "NameRegistry";
}

export const FRONTIER_REGISTRAR_NAMES: Record<string, FrontierRegistrarEntry> = {
  // NameRegistry entries
  "0x1c523996cb7cb5b0a4a48d8097e45093626b23f0": { name: "HHKB", registrar: "NameRegistry" },
  "0xad8d3a5d2d92eb14bb56ca9f380be35b8efe0c04": { name: "YUNB", registrar: "NameRegistry" },
  "0x1ff21eca1c3ba96ed53783ab9c92ffbf77862584": { name: "AMBI", registrar: "NameRegistry" },
  "0xc3b0533d965ac6077d6acf8c5510733c1bf025be": { name: "V21g", registrar: "NameRegistry" },
  "0x6c1011f8accc19572b1eb1d967d739d686218a11": { name: "BTRX", registrar: "NameRegistry" },
  "0x25adf743c0fa773b4a37535ee653092822d01d9a": { name: "KRAK", registrar: "NameRegistry" },

  // GlobalRegistrar entries
  "0x5eaa4180e1ecc408f65cae32711c794bd04c1267": { name: "AugurSale", registrar: "GlobalRegistrar" },
  "0x092a5172f796d4c3cd0e03520134317fc25b74f6": { name: "taoteh1221", registrar: "GlobalRegistrar" },
  "0xf62b0173545b61a8604cbe3dcd537ca2fb1de9a2": { name: "AKASHA", registrar: "GlobalRegistrar" },
  "0x156b6df1f5110f095f2990f99517b92a0eb7434f": { name: "uno", registrar: "GlobalRegistrar" },
  "0xc121342c81ff5e4475af5ab769cc6364686f42bc": { name: "papou", registrar: "GlobalRegistrar" },
  "0x00006314ee6ba5a9421e4aa6a47c6867a882bd92": { name: "5chdn", registrar: "GlobalRegistrar" },
  "0x6fd93c524553e05b3a1ac9291bde505d37252dfd": { name: "etherauction", registrar: "GlobalRegistrar" },
  "0xc1b6768036630767c707831d310b969da1088651": { name: "alenl", registrar: "GlobalRegistrar" },
  "0x05b71e90d9f3da4d8b61484560df89063f398fc9": { name: "coin86.org", registrar: "GlobalRegistrar" },
  "0xc36d4635737202510549cdbcd16c95ac2608d16f": { name: "kulisu", registrar: "GlobalRegistrar" },
  "0x2b128ba01b39209b972faf23e956405b4189da2e": { name: "tweth", registrar: "GlobalRegistrar" },
  "0xa2f624b7c0f9d5395277087388e6b19cc68747d4": { name: "ZPT", registrar: "GlobalRegistrar" },
};

export function getFrontierRegistrarEntry(address: string): FrontierRegistrarEntry | null {
  return FRONTIER_REGISTRAR_NAMES[address.toLowerCase()] ?? null;
}
