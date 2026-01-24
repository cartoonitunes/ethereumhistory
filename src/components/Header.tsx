"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Header() {
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
              ethereumhistory
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
          </nav>

          {/* Search hint */}
          <div className="hidden sm:flex items-center gap-2 text-obsidian-500 text-sm">
            <kbd className="px-2 py-1 rounded bg-obsidian-800 text-obsidian-400 text-xs font-mono">
              0x...
            </kbd>
            <span>to search</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
