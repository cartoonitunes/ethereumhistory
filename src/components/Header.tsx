"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, UserPlus, User, Github } from "lucide-react";
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
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/browse"
              className="text-sm text-obsidian-400 hover:text-obsidian-100 transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/#for-agents"
              className="text-sm text-obsidian-400 hover:text-obsidian-100 transition-colors"
            >
              For Agents
            </Link>
            <a
              href="https://discord.gg/3KV6dt2euF"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
              aria-label="Discord"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            <a
              href="https://github.com/cartoonitunes/ethereumhistory"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </nav>

          {/* Mobile: Browse, For Agents, Discord, GitHub, and Login/Profile icons */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href="/browse"
              className="p-2.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors text-sm font-medium"
            >
              Browse
            </Link>
            <Link
              href="/#for-agents"
              className="p-2.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors text-sm font-medium"
            >
              For Agents
            </Link>
            <a
              href="https://discord.gg/3KV6dt2euF"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
              aria-label="Discord"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            <a
              href="https://github.com/cartoonitunes/ethereumhistory"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            {me ? (
              <Link
                href="/historian/profile"
                className="p-2.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
                aria-label="Profile"
              >
                <User className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                href={loginUrl}
                className="p-2.5 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
                aria-label="Historian login"
              >
                <LogIn className="w-5 h-5" />
              </Link>
            )}
          </div>

          {/* Right side (desktop): Profile (if logged in), Invite link (trusted), Login button, or Search hint */}
          <div className="hidden md:flex items-center gap-3">
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
