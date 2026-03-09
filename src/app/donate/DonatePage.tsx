"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Heart, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";

const DONATION_ADDRESS = "0x123bf3b32fB3986C9251C81430d2542D5054F0d2";
const DONATION_ENS = "ethereumhistory.eth";
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

function CopyButton({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-sm transition-colors ${className}`}
      aria-label={`Copy ${label ?? text}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 shrink-0" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function AddressBox({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-obsidian-900/60 border border-obsidian-800 rounded-2xl p-5">
      <p className="text-xs text-obsidian-500 uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="font-mono text-sm text-obsidian-200 break-all leading-relaxed">{value}</span>
        <CopyButton
          text={value}
          label={label}
          className="text-obsidian-400 hover:text-obsidian-100 shrink-0"
        />
      </div>
      {note && <p className="text-xs text-obsidian-600 mt-3 leading-relaxed">{note}</p>}
    </div>
  );
}

export function DonatePage() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${DONATION_ADDRESS}&bgcolor=18181b&color=a4b8fc&margin=12`;

  return (
    <div className="min-h-screen bg-obsidian-950">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
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

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-ether-500/10 border border-ether-500/20 mb-5">
              <Heart className="w-5 h-5 text-ether-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-obsidian-50 mb-4">
              Keep Ethereum history free
            </h1>
            <p className="text-obsidian-400 text-lg max-w-lg mx-auto leading-relaxed">
              EthereumHistory is a free, open archive run by volunteers.
              No ads, no paywalls. Donations keep the servers running and
              the research going.
            </p>
          </div>

          {/* QR + ENS */}
          <div className="flex flex-col sm:flex-row items-center gap-6 bg-obsidian-900/40 border border-obsidian-800 rounded-2xl p-6 mb-5">
            <img
              src={qrUrl}
              alt="Donation address QR code"
              width={160}
              height={160}
              className="rounded-xl shrink-0"
            />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs text-obsidian-500 uppercase tracking-widest mb-2">Send to</p>
              <p className="text-lg font-semibold text-obsidian-100 mb-1">{DONATION_ENS}</p>
              <p className="font-mono text-xs text-obsidian-500 break-all mb-4">{DONATION_ADDRESS}</p>
              <CopyButton
                text={DONATION_ADDRESS}
                label="donation address"
                className="text-obsidian-400 hover:text-obsidian-100 mx-auto sm:mx-0"
              />
            </div>
          </div>

          {/* ETH + USDC instructions */}
          <div className="space-y-3 mb-8">
            <AddressBox
              label="Send ETH"
              value={DONATION_ADDRESS}
              note="Open your wallet, paste this address, and send any amount of ETH on Ethereum mainnet."
            />
            <AddressBox
              label="Send USDC"
              value={DONATION_ADDRESS}
              note="Same address. In your wallet, select USDC as the token, paste this address, and send on Ethereum mainnet."
            />
            <div className="bg-obsidian-900/40 border border-obsidian-800 rounded-2xl p-5">
              <p className="text-xs text-obsidian-500 uppercase tracking-widest mb-3">USDC contract (for reference)</p>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="font-mono text-xs text-obsidian-500 break-all">{USDC_CONTRACT}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <CopyButton text={USDC_CONTRACT} label="USDC contract" className="text-obsidian-600 hover:text-obsidian-400" />
                  <a
                    href={`https://etherscan.io/token/${USDC_CONTRACT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-obsidian-600 hover:text-obsidian-400 transition-colors"
                  >
                    Etherscan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Verify */}
          <div className="text-center">
            <a
              href={`https://etherscan.io/address/${DONATION_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors"
            >
              Verify this wallet on Etherscan
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-xs text-obsidian-700 mt-3">
              Dedicated wallet for EthereumHistory. Separate from any personal funds. All transactions are publicly verifiable on-chain.
            </p>
          </div>

          {/* View donors */}
          <div className="text-center mt-6">
            <Link
              href="/supporters"
              className="text-sm text-obsidian-500 hover:text-ether-400 transition-colors"
            >
              View donors
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
