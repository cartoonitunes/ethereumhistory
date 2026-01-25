"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ArrowRight, AlertCircle } from "lucide-react";
import { isValidAddress } from "@/lib/utils";

interface AddressSearchProps {
  size?: "default" | "large";
  placeholder?: string;
  autoFocus?: boolean;
}

export function AddressSearch({
  size = "default",
  placeholder = "Contract address (0x…)",
  autoFocus = false,
}: AddressSearchProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmed = address.trim().toLowerCase();

      if (!trimmed) {
        setError("Please enter an address");
        return;
      }

      if (!isValidAddress(trimmed)) {
        setError("Invalid address format. Must be 0x followed by 40 hex characters.");
        return;
      }

      setIsLoading(true);

      // Navigate to contract page
      router.push(`/contract/${trimmed}`);
    },
    [address, router]
  );

  const isLarge = size === "large";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <div
          className={`
            relative flex items-center
            bg-obsidian-900/50 border border-obsidian-700
            rounded-xl overflow-hidden
            transition-all duration-200
            focus-within:border-ether-500/50 focus-within:ring-2 focus-within:ring-ether-500/20
            ${isLarge ? "h-16" : "h-12"}
          `}
        >
          <div className={`pl-4 ${isLarge ? "pr-3" : "pr-2"}`}>
            <Search
              className={`text-obsidian-500 ${isLarge ? "w-6 h-6" : "w-5 h-5"}`}
            />
          </div>

          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError(null);
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`
              flex-1 bg-transparent border-none outline-none
              text-obsidian-100 placeholder:text-obsidian-400 placeholder:font-sans
              font-mono
              ${isLarge ? "text-lg" : "text-base"}
            `}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              flex items-center justify-center gap-2
              bg-ether-600 hover:bg-ether-500
              text-white font-medium
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLarge ? "h-12 px-6 mr-2 rounded-lg" : "h-9 px-4 mr-1.5 rounded-md"}
            `}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className={isLarge ? "text-base" : "text-sm"}>Search</span>
                <ArrowRight className={isLarge ? "w-5 h-5" : "w-4 h-4"} />
              </>
            )}
          </motion.button>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 right-0 mt-2 flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </div>

      {/* Helper text */}
      {isLarge && (
        <p className="mt-4 text-obsidian-500 text-sm text-center">
          Enter a contract address to explore its history, bytecode analysis, and similar contracts.
        </p>
      )}
    </form>
  );
}
