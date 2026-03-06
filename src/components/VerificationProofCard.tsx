"use client";

import { ExternalLink, ShieldCheck, Search } from "lucide-react";
import type { Contract } from "@/types";

interface VerificationProofCardProps {
  contract: Contract;
}

const LANGUAGE_LABELS: Record<string, string> = {
  serpent: "Serpent",
  solidity: "Solidity",
  lll: "LLL",
  vyper: "Vyper",
};

const METHOD_LABELS: Record<string, string> = {
  exact_bytecode_match: "Exact bytecode match",
  etherscan_verified: "Etherscan verified",
  partial_match: "Partial match",
};

function getMethodAccent(method: string) {
  switch (method) {
    case "exact_bytecode_match":
      return {
        border: "border-green-500/30",
        bg: "bg-green-500/5",
        badge: "bg-green-500/15 text-green-400 border-green-500/30",
        icon: "text-green-400",
      };
    case "etherscan_verified":
      return {
        border: "border-blue-500/30",
        bg: "bg-blue-500/5",
        badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        icon: "text-blue-400",
      };
    case "partial_match":
      return {
        border: "border-yellow-500/30",
        bg: "bg-yellow-500/5",
        badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
        icon: "text-yellow-400",
      };
    default:
      return {
        border: "border-obsidian-700",
        bg: "bg-obsidian-900/30",
        badge: "bg-obsidian-700 text-obsidian-300 border-obsidian-600",
        icon: "text-obsidian-400",
      };
  }
}

export function VerificationProofCard({ contract }: VerificationProofCardProps) {
  if (!contract.verificationMethod) return null;

  const accent = getMethodAccent(contract.verificationMethod);
  const isExact = contract.verificationMethod === "exact_bytecode_match";
  const languageLabel = contract.compilerLanguage
    ? LANGUAGE_LABELS[contract.compilerLanguage] || contract.compilerLanguage
    : null;
  const methodLabel =
    METHOD_LABELS[contract.verificationMethod] || contract.verificationMethod;

  const commitUrl =
    contract.compilerRepo && contract.compilerCommit
      ? `https://github.com/${contract.compilerRepo}/commit/${contract.compilerCommit}`
      : null;

  return (
    <section className={`p-5 rounded-xl border ${accent.border} ${accent.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        {isExact ? (
          <ShieldCheck className={`w-5 h-5 ${accent.icon}`} />
        ) : (
          <Search className={`w-5 h-5 ${accent.icon}`} />
        )}
        <h3 className="text-sm font-semibold text-obsidian-100">
          {isExact ? "Source Verified" : "Partially Verified"}
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        {/* Language badge + method */}
        <div className="flex flex-wrap items-center gap-2">
          {languageLabel && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${accent.badge}`}
            >
              {languageLabel}
            </span>
          )}
          <span className="text-obsidian-400">{methodLabel}</span>
          {contract.codeSizeBytes && isExact && (
            <span className="text-obsidian-500">
              ({contract.codeSizeBytes.toLocaleString()} bytes)
            </span>
          )}
        </div>

        {/* Compiler version + commit */}
        {(contract.compilerVersion || contract.compilerCommit) && (
          <div className="text-obsidian-400">
            <span className="text-obsidian-500">Compiler: </span>
            {contract.compilerVersion && (
              <span>{contract.compilerVersion}</span>
            )}
            {contract.compilerCommit && (
              <>
                {contract.compilerVersion && <span> · </span>}
                {commitUrl ? (
                  <a
                    href={commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ether-400 hover:text-ether-300 transition-colors"
                  >
                    {contract.compilerCommit.slice(0, 7)}
                    <ExternalLink className="w-3 h-3 inline ml-1 -mt-0.5" />
                  </a>
                ) : (
                  <span className="font-mono">
                    {contract.compilerCommit.slice(0, 7)}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Proof link */}
        {contract.verificationProofUrl && (
          <div>
            <a
              href={contract.verificationProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ether-400 hover:text-ether-300 transition-colors text-sm"
            >
              View verification proof
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Notes */}
        {contract.verificationNotes && (
          <p className="text-obsidian-400 text-xs leading-relaxed mt-1">
            {contract.verificationNotes}
          </p>
        )}
      </div>
    </section>
  );
}
