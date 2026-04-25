"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "eh-collections-banner-dismissed";

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
        <p className="text-obsidian-200 leading-snug pr-6">
          <span className="font-semibold text-ether-400">NEW</span>
          {" — Explore Collections — every contract deployed by Ethereum's earliest builders, documented and verified."}
          {" "}
          <Link href="/collections" className="font-medium text-ether-400 hover:text-ether-300 transition-colors whitespace-nowrap">
            Browse Collections →
          </Link>
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
