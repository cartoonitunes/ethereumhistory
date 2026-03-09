"use client";

import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";

function claimMessage(txHash: string, displayName: string): string {
  return `I am claiming my donation to EthereumHistory.com. Transaction: ${txHash}. Display name: ${displayName}`;
}

interface ClaimModalProps {
  onClose: () => void;
}

type Step = "form" | "signing" | "success" | "error";

export function ClaimModal({ onClose }: ClaimModalProps) {
  const [txHash, setTxHash] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!txHash.trim() || !displayName.trim()) return;

    setStep("signing");
    setErrorMsg("");

    try {
      // Check for window.ethereum
      const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum;
      if (!eth) {
        setErrorMsg("No Ethereum wallet detected. Please install MetaMask or another wallet.");
        setStep("error");
        return;
      }

      // Request accounts
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];

      if (!accounts || accounts.length === 0) {
        setErrorMsg("No wallet connected.");
        setStep("error");
        return;
      }

      const address = accounts[0];
      const message = claimMessage(txHash.trim(), displayName.trim());

      // Sign message
      const signature = (await eth.request({
        method: "personal_sign",
        params: [message, address],
      })) as string;

      // Submit to API
      const res = await fetch("/api/donations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: txHash.trim(),
          address,
          displayName: displayName.trim(),
          note: note.trim() || undefined,
          signature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStep("error");
        return;
      }

      setStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("4001")) {
        setErrorMsg("Signature cancelled.");
      } else {
        setErrorMsg(msg || "Something went wrong.");
      }
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-obsidian-950 border border-obsidian-800 rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-obsidian-500 hover:text-obsidian-200 hover:bg-obsidian-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {step === "success" ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-ether-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-ether-400" />
              </div>
              <h2 className="text-xl font-bold text-obsidian-100 mb-2">Claimed.</h2>
              <p className="text-obsidian-400 text-sm mb-6">
                Your display name will appear in the supporters log. Thank you for supporting Ethereum History.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-ether-600 hover:bg-ether-500 text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-obsidian-100 mb-1">Claim your donation</h2>
              <p className="text-sm text-obsidian-500 mb-5">
                Sign a message with the wallet that sent the donation to add your name to the log.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-obsidian-500 uppercase tracking-widest mb-1.5">
                    Transaction hash
                  </label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x..."
                    required
                    className="w-full bg-obsidian-900 border border-obsidian-800 rounded-xl px-4 py-2.5 text-sm text-obsidian-100 placeholder-obsidian-700 focus:outline-none focus:border-ether-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-obsidian-500 uppercase tracking-widest mb-1.5">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="vitalik.eth, CryptoNerd, etc."
                    required
                    maxLength={64}
                    className="w-full bg-obsidian-900 border border-obsidian-800 rounded-xl px-4 py-2.5 text-sm text-obsidian-100 placeholder-obsidian-700 focus:outline-none focus:border-ether-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-obsidian-500 uppercase tracking-widest mb-1.5">
                    Note <span className="normal-case text-obsidian-700">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Keep up the great archival work!"
                    maxLength={200}
                    className="w-full bg-obsidian-900 border border-obsidian-800 rounded-xl px-4 py-2.5 text-sm text-obsidian-100 placeholder-obsidian-700 focus:outline-none focus:border-ether-500"
                  />
                </div>

                {step === "error" && (
                  <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={step === "signing"}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ether-600 hover:bg-ether-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {step === "signing" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for signature...
                    </>
                  ) : (
                    "Sign and claim"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
