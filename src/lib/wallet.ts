export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: Eip1193Provider[];
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const NO_WALLET_MESSAGE =
  "No Ethereum wallet detected. Please install a wallet like MetaMask or Coinbase Wallet.";

// Returns an EIP-1193 provider injected by any wallet extension.
// When multiple wallets are installed, some browsers expose them via
// `window.ethereum.providers`. Prefer that array's first entry; otherwise
// fall back to `window.ethereum` itself.
export function getEthereumProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers[0];
  }
  return eth;
}
