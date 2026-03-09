"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Heart } from "lucide-react";

const DISMISSED_KEY = "eh_donation_banner_dismissed";
const DISMISS_DAYS = 30;

export function DonationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (raw) {
        const ts = parseInt(raw, 10);
        const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) return;
      }
    } catch {}
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="w-full bg-ether-950/60 border-b border-ether-800/40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <Heart className="w-3.5 h-3.5 text-ether-400 shrink-0" />
        <p className="flex-1 text-xs text-obsidian-300 leading-relaxed">
          EthereumHistory is a free archive, maintained by volunteers.{" "}
          <Link
            href="/donate"
            className="text-ether-400 hover:text-ether-300 font-medium underline underline-offset-2 transition-colors"
          >
            Help keep it that way.
          </Link>
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 rounded text-obsidian-600 hover:text-obsidian-300 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
