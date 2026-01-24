"use client";

import { useMemo, useState } from "react";
import { Search, Code } from "lucide-react";
import { AddressSearch } from "./AddressSearch";
import { BytecodeSearch } from "./BytecodeSearch";

type SearchMode = "address" | "decompiled";

interface UnifiedSearchProps {
  defaultMode?: SearchMode;
}

export function UnifiedSearch({ defaultMode = "address" }: UnifiedSearchProps) {
  const [mode, setMode] = useState<SearchMode>(defaultMode);

  const options = useMemo(
    () =>
      [
        { id: "address" as const, label: "Contract Address", icon: <Search className="w-4 h-4" /> },
        { id: "decompiled" as const, label: "Decompiled Code", icon: <Code className="w-4 h-4" /> },
      ] as const,
    []
  );

  return (
    <div className="w-full max-w-3xl">
      {/* Mode selector */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-xl border border-obsidian-800 bg-obsidian-900/40 p-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                mode === opt.id
                  ? "bg-ether-500/20 text-ether-300 border border-ether-500/30"
                  : "text-obsidian-400 hover:text-obsidian-200"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search body */}
      <div className="flex justify-center">
        {mode === "address" ? (
          <AddressSearch size="large" autoFocus />
        ) : (
          <div className="w-full p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/50">
            <BytecodeSearch variant="embedded" autoFocus />
          </div>
        )}
      </div>
    </div>
  );
}

