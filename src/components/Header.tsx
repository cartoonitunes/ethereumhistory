"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, User, Github, ClipboardCheck, Menu, X, Heart, Search } from "lucide-react";
import type { HistorianMe } from "@/types";

interface HeaderProps {
  showHistorianLogin?: boolean;
  historianMe?: HistorianMe | null;
}

export function Header({ showHistorianLogin = false, historianMe: propHistorianMe }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const loginUrl = `/historian/login?next=${encodeURIComponent(pathname || "/")}`;

  const [me, setMe] = useState<HistorianMe | null>(propHistorianMe ?? null);
  const [loadingMe, setLoadingMe] = useState(propHistorianMe === undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    return () => { cancelled = true; };
  }, [propHistorianMe]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [searchOpen]);

  // Escape closes search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const shouldShowLogin = showHistorianLogin && !loadingMe && !me;

  const navLinks = [
    { href: "/browse", label: "Browse" },
    { href: "/proofs", label: "Proofs" },
    { href: "/for-agents", label: "For Agents" },
    { href: "/supporters", label: "Supporters" },
    { href: "/donate", label: "Donate", highlight: true },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glass border-b border-obsidian-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ether-500 to-ether-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
                  <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
                </svg>
              </div>
              <span className="font-semibold text-lg group-hover:text-ether-400 transition-colors whitespace-nowrap">
                Ethereum History
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-4">
              {navLinks.map(({ href, label, highlight }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm transition-colors ${
                    highlight
                      ? "text-ether-400 hover:text-ether-300 font-medium"
                      : "text-obsidian-400 hover:text-obsidian-100"
                  }`}
                >
                  {label}
                </Link>
              ))}
              <a
                href="https://discord.gg/3KV6dt2euF"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
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

            {/* Search icon — desktop */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-3">
              {loadingMe ? (
                <div className="h-9 w-24 bg-obsidian-800/50 rounded-lg animate-pulse" />
              ) : me ? (
                <>
                  {me.trusted && (
                    <Link href="/historian/review" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40 hover:bg-obsidian-800 text-obsidian-300 hover:text-obsidian-100 text-sm font-medium transition-colors">
                      <ClipboardCheck className="w-4 h-4" />
                      Review
                    </Link>
                  )}
                  {me.trusted && (
                    <Link href="/historian/invite" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40 hover:bg-obsidian-800 text-obsidian-300 hover:text-obsidian-100 text-sm font-medium transition-colors">
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </Link>
                  )}
                  <Link href="/historian/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40 hover:bg-obsidian-800 text-obsidian-300 hover:text-obsidian-100 text-sm font-medium transition-colors">
                    {me.avatarUrl ? (
                      <img src={me.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-ether-500/20 flex items-center justify-center text-ether-400 text-xs font-bold">
                        {me.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {me.name}
                  </Link>
                </>
              ) : (
                <>
                  <Link href={loginUrl} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-obsidian-800 bg-obsidian-900/40 hover:bg-obsidian-800 text-obsidian-300 hover:text-obsidian-100 text-sm font-medium transition-colors">
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </Link>
                  <a href="/api/auth/github" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm font-medium transition-colors">
                    <Github className="w-4 h-4" />
                    Sign up with GitHub
                  </a>
                </>
              )}
            </div>

            {/* Mobile: search + hamburger */}
            <div className="md:hidden flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-obsidian-950/90 backdrop-blur-md flex items-start justify-center pt-20 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-2xl"
            >
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-400" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contracts, addresses, names..."
                  className="w-full rounded-xl border border-obsidian-700 bg-obsidian-900 text-obsidian-100 text-lg pl-12 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-ether-500/50 focus:border-ether-500/50 placeholder:text-obsidian-500"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-obsidian-400 hover:text-obsidian-100 transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </form>
              <p className="text-center text-xs text-obsidian-500 mt-3">Press Enter to search · Esc to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed top-16 inset-x-0 z-40 bg-obsidian-950/95 backdrop-blur-lg border-b border-obsidian-800 shadow-xl"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map(({ href, label, highlight }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    highlight
                      ? "text-ether-400 hover:text-ether-300 hover:bg-ether-500/10"
                      : "text-obsidian-300 hover:text-obsidian-100 hover:bg-obsidian-800/60"
                  }`}
                >
                  {label === "Donate" ? (
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      {label}
                    </span>
                  ) : label}
                </Link>
              ))}

              <div className="border-t border-obsidian-800 my-2" />

              <div className="flex items-center gap-3 px-3 py-2">
                <a href="https://discord.gg/3KV6dt2euF" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors" aria-label="Discord">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
                <a href="https://github.com/cartoonitunes/ethereumhistory" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/50 transition-colors" aria-label="GitHub">
                  <Github className="w-5 h-5" />
                </a>
              </div>

              <div className="border-t border-obsidian-800 mt-1 pt-3 pb-1 flex flex-col gap-2 px-3">
                {me ? (
                  <Link href="/historian/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-obsidian-300 text-sm font-medium">
                    {me.avatarUrl ? (
                      <img src={me.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-ether-500/20 flex items-center justify-center text-ether-400 text-xs font-bold">
                        {me.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {me.name}
                  </Link>
                ) : (
                  <>
                    <Link href={loginUrl} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-obsidian-300 text-sm font-medium transition-colors">
                      <LogIn className="w-4 h-4" />
                      Sign in
                    </Link>
                    <a href="/api/auth/github" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm font-medium transition-colors">
                      <Github className="w-4 h-4" />
                      Sign up with GitHub
                    </a>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
