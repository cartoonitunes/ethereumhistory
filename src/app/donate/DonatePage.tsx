"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Heart, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";

const DONATION_ADDRESS = "0x123bf3b32fB3986C9251C81430d2542D5054F0d2";
const DONATION_ENS = "ethereumhistory.eth";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const ETH_AMOUNTS = ["0.01", "0.05", "0.1", "0.25"];
const USDC_AMOUNTS = ["10", "50", "100", "250"];

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-obsidian-400 hover:text-obsidian-100 transition-colors"
      aria-label={`Copy ${label ?? text}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function AmountButton({
  amount,
  selected,
  onClick,
}: {
  amount: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
        selected
          ? "border-ether-500 bg-ether-500/10 text-ether-300"
          : "border-obsidian-700 bg-obsidian-900/40 text-obsidian-400 hover:border-obsidian-500 hover:text-obsidian-200"
      }`}
    >
      {amount}
    </button>
  );
}

function TokenCard({
  token,
  symbol,
  amounts,
  address,
  contractAddress,
  etherscanPath,
}: {
  token: string;
  symbol: string;
  amounts: string[];
  address: string;
  contractAddress?: string;
  etherscanPath: string;
}) {
  const [selected, setSelected] = useState(amounts[1]);

  const sendUrl =
    symbol === "ETH"
      ? `https://app.uniswap.org/send?recipient=${address}&amount=${selected}&chain=mainnet`
      : `https://app.uniswap.org/send?recipient=${address}&inputCurrency=${contractAddress}&amount=${selected}&chain=mainnet`;

  const unit = symbol === "ETH" ? "ETH" : "USDC";

  return (
    <div className="bg-obsidian-950/60 border border-obsidian-800 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-obsidian-800 flex items-center justify-center text-lg">
          {symbol === "ETH" ? "⟠" : "$"}
        </div>
        <div>
          <div className="font-semibold text-obsidian-100">{token}</div>
          <div className="text-xs text-obsidian-500">Ethereum mainnet</div>
        </div>
      </div>

      <div>
        <p className="text-xs text-obsidian-500 mb-2 uppercase tracking-widest">Amount</p>
        <div className="flex flex-wrap gap-2">
          {amounts.map((a) => (
            <AmountButton
              key={a}
              amount={`${a} ${unit}`}
              selected={selected === a}
              onClick={() => setSelected(a)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-obsidian-500 mb-2 uppercase tracking-widest">Send to</p>
        <div className="bg-obsidian-900 border border-obsidian-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-obsidian-100">{DONATION_ENS}</div>
            <div className="text-xs text-obsidian-600 font-mono mt-0.5 truncate">
              {address.slice(0, 20)}...{address.slice(-6)}
            </div>
          </div>
          <CopyButton text={address} label="address" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={sendUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ether-600 hover:bg-ether-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Open in Uniswap
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={etherscanPath}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-obsidian-700 hover:border-obsidian-500 text-obsidian-400 hover:text-obsidian-200 text-sm rounded-xl transition-colors"
        >
          Verify on Etherscan
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export function DonatePage() {
  return (
    <div className="min-h-screen bg-obsidian-950">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to archive
          </Link>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-ether-500/10 border border-ether-500/20 mb-5">
              <Heart className="w-5 h-5 text-ether-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-obsidian-50 mb-4">
              Keep Ethereum history free
            </h1>
            <p className="text-obsidian-400 text-lg max-w-xl mx-auto leading-relaxed">
              EthereumHistory is a free, open archive maintained by volunteers.
              No ads, no paywalls, no tracking. Donations keep the servers on
              and the research going.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <TokenCard
              token="Ether"
              symbol="ETH"
              amounts={ETH_AMOUNTS}
              address={DONATION_ADDRESS}
              etherscanPath={`https://etherscan.io/address/${DONATION_ADDRESS}`}
            />
            <TokenCard
              token="USD Coin"
              symbol="USDC"
              amounts={USDC_AMOUNTS}
              address={DONATION_ADDRESS}
              contractAddress={USDC_ADDRESS}
              etherscanPath={`https://etherscan.io/address/${DONATION_ADDRESS}`}
            />
          </div>

          <div className="bg-obsidian-900/40 border border-obsidian-800 rounded-2xl p-5 text-center">
            <p className="text-xs text-obsidian-500 leading-relaxed mb-1">
              Prefer to send directly? Copy the address below.
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="font-mono text-sm text-obsidian-300 break-all">
                {DONATION_ADDRESS}
              </span>
              <CopyButton text={DONATION_ADDRESS} label="donation address" />
            </div>
          </div>

          <p className="text-center text-xs text-obsidian-700 mt-6">
            Donations go directly to{" "}
            <span className="font-medium text-obsidian-500">{DONATION_ENS}</span>,
            a dedicated wallet separate from any personal funds.
            All transactions are publicly verifiable on-chain.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
