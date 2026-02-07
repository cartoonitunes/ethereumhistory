"use client";

import { ERAS } from "@/types";

interface ShareOnXProps {
  contractAddress: string;
  contractName: string;
  eraId?: string | null;
  shortDescription?: string | null;
}

export default function ShareOnX({
  contractAddress,
  contractName,
  eraId,
  shortDescription,
}: ShareOnXProps) {
  function handleClick() {
    const eraName = eraId && ERAS[eraId] ? ERAS[eraId].name : null;

    const eraPart = eraName
      ? `deployed on Ethereum\u2019s ${eraName} era.`
      : "deployed on early Ethereum.";

    const descriptionPart = shortDescription
      ? shortDescription.length > 120
        ? shortDescription.slice(0, 120) + "\u2026"
        : shortDescription
      : null;

    const lines = [
      `${contractName} \u2014 ${eraPart}`,
      ...(descriptionPart ? [descriptionPart] : []),
      `ethereumhistory.com/contract/${contractAddress}`,
    ];

    const tweetText = lines.join("\n\n");

    const url = new URL("https://x.com/intent/tweet");
    url.searchParams.set("text", tweetText);

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-900/50 hover:bg-obsidian-800 hover:border-obsidian-600 text-obsidian-300 hover:text-obsidian-100 text-sm transition-colors"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Share on X
    </button>
  );
}
