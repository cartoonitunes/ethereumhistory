"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Trophy } from "lucide-react";

/**
 * Bumped with the message. Dismissal is remembered per announcement, so the
 * people most likely to care about a new one, the returning visitors who
 * dismissed the last, are not the only ones who never see it.
 */
const STORAGE_KEY = "eh-collector-cards-banner-dismissed";

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
      <div className="max-w-site mx-auto flex items-center justify-between gap-4">
        <p className="text-obsidian-200 leading-snug pr-6 flex items-start gap-2">
          <Trophy className="w-4 h-4 mt-0.5 text-ether-400 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ether-400">New: Collector Cards</span>
            {", scored on how early the contracts in your wallet were deployed."}
            {" "}
            <Link
              href="/collectors"
              className="font-medium text-ether-400 hover:text-ether-300 transition-colors whitespace-nowrap"
            >
              Get your collector score →
            </Link>
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
