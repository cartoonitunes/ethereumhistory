"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { copyToClipboard, etherscanUrl } from "@/lib/utils";

export function PeopleWallets({
  wallets,
}: {
  wallets: Array<{ address: string; label: string | null }>;
}) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = async (address: string) => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 1500);
    }
  };

  if (!wallets || wallets.length === 0) return null;

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold mb-3">Wallets</h2>
      <div className="divide-y divide-obsidian-800/60">
        {wallets.map((w) => (
          <div
            key={w.address}
            className="flex items-center justify-between gap-3 py-2"
          >
            <code className="font-mono text-sm text-obsidian-200 min-w-0 truncate">
              {w.address}
            </code>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(w.address)}
                className="p-2 rounded-lg hover:bg-obsidian-800 transition-colors"
                title="Copy address"
              >
                {copiedAddress === w.address ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-obsidian-400" />
                )}
              </button>
              <a
                href={etherscanUrl(w.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-obsidian-800 transition-colors"
                title="View on Etherscan"
              >
                <ExternalLink className="w-4 h-4 text-obsidian-400" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

