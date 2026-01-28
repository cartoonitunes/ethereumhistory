"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, UserPlus, User } from "lucide-react";
import type { HistorianMe } from "@/types";

interface HeaderProps {
  showHistorianLogin?: boolean;
  historianMe?: HistorianMe | null;
}

export function Header({ showHistorianLogin = false, historianMe: propHistorianMe }: HeaderProps) {
  const pathname = usePathname();
  const loginUrl = `/historian/login?next=${encodeURIComponent(pathname || "/")}`;
  
  // If not provided as prop, fetch it
  const [me, setMe] = useState<HistorianMe | null>(propHistorianMe ?? null);
  const [loadingMe, setLoadingMe] = useState(propHistorianMe === undefined);
  
  useEffect(() => {
    if (propHistorianMe !== undefined) {
      setMe(propHistorianMe);
      setLoadingMe(false);
      return;
    }
    
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/historian/me");
        const json = await res.json();
        if (cancelled) return;
        setMe((json?.data as HistorianMe) || null);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, [propHistorianMe]);
  
  // Only show login button if we're sure user is not logged in (not loading and me is null)
  const shouldShowLogin = showHistorianLogin && !loadingMe && !me;

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 glass border-b border-obsidian-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ether-500 to-ether-700 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
                <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
              </svg>
            </div>
            <span className="font-semibold text-lg group-hover:text-ether-400 transition-colors">
              Ethereum History
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm text-obsidian-400 hover:text-obsidian-100 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/#eras"
              className="text-sm text-obsidian-400 hover:text-obsidian-100 transition-colors"
            >
              Eras
            </Link>
            <Link
              href="/#about"
              className="text-sm text-obsidian-400 hover:text-obsidian-100 transition-colors"
            >
              About
            </Link>
            <a
              href="https://discord.gg/3KV6dt2euF"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-obsidian-400 hover:text-obsidian-100 transition-colors"
            >
              Discord
            </a>
          </nav>

          {/* Right side: Profile (if logged in), Invite link (trusted), Login button, or Search hint */}
          <div className="hidden sm:flex items-center gap-3">
            {me ? (
              <>
                {me.trusted && (
                  <Link
                    href="/historian/invite"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40 hover:bg-obsidian-800 text-obsidian-300 hover:text-obsidian-100 text-sm font-medium transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite
                  </Link>
                )}
                <Link
                  href="/historian/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40 hover:bg-obsidian-800 text-obsidian-300 hover:text-obsidian-100 text-sm font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  {me.name}
                </Link>
              </>
            ) : shouldShowLogin ? (
              <Link
                href={loginUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm font-medium transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Historian Login
              </Link>
            ) : (
              <div className="flex items-center gap-2 text-obsidian-500 text-sm">
                <kbd className="px-2 py-1 rounded bg-obsidian-800 text-obsidian-400 text-xs font-mono">
                  0x...
                </kbd>
                <span>to search</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
