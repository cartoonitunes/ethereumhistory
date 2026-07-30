"use client";

import { useState, useEffect } from "react";
import { X, Cake } from "lucide-react";

const STORAGE_KEY = "eh-eth11-banner-dismissed";

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="relative z-50 w-full bg-ether-500/10 border-b border-ether-500/30 px-4 py-2.5 text-sm"
      role="banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-obsidian-200 leading-snug pr-6 flex items-start gap-2">
          <Cake className="w-4 h-4 mt-0.5 text-ether-400 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ether-400">Happy 11th Birthday, Ethereum</span>
            {" — the Frontier genesis block was mined July 30, 2015."}
            {" "}
            <a
              href="https://ethereum.org/en/whitepaper/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ether-400 hover:text-ether-300 transition-colors whitespace-nowrap"
            >
              Read the white paper →
            </a>
          </span>
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="flex-shrink-0 text-obsidian-500 hover:text-obsidian-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
