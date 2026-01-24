"use client";

import { useState, useMemo } from "react";
import { Copy, Check, Search, ChevronDown, ChevronUp, Code, AlertCircle } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface DecompiledCodeViewerProps {
  decompiledCode: string | null;
  decompilationSuccess: boolean;
  bytecode?: string | null;
}

interface ParsedFunction {
  name: string;
  signature: string;
  body: string;
  isPayable: boolean;
  lineStart: number;
}

function parseDecompiledCode(code: string): {
  storage: string[];
  functions: ParsedFunction[];
  header: string;
} {
  const lines = code.split("\n");
  const storage: string[] = [];
  const functions: ParsedFunction[] = [];
  let header = "";

  let currentFunction: Partial<ParsedFunction> | null = null;
  let functionLines: string[] = [];
  let inStorage = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect header (comments at the start)
    if (i < 5 && trimmed.startsWith("#")) {
      header += line + "\n";
      continue;
    }

    // Detect storage section
    if (trimmed.startsWith("def storage:") || trimmed === "def storage:") {
      inStorage = true;
      continue;
    }

    // Storage variables
    if (inStorage && trimmed && !trimmed.startsWith("def ") && !trimmed.startsWith("#")) {
      storage.push(trimmed);
      continue;
    }

    // New function definition
    if (trimmed.startsWith("def ")) {
      // Save previous function if exists
      if (currentFunction && currentFunction.name) {
        functions.push({
          name: currentFunction.name,
          signature: currentFunction.signature || "",
          body: functionLines.join("\n"),
          isPayable: currentFunction.isPayable || false,
          lineStart: currentFunction.lineStart || 0,
        });
      }

      inStorage = false;
      const isPayable = trimmed.includes("payable");

      // Extract function name and signature
      const match = trimmed.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
      if (match) {
        currentFunction = {
          name: match[1],
          signature: `${match[1]}(${match[2]})`,
          isPayable,
          lineStart: i,
        };
        functionLines = [line];
      }
      continue;
    }

    // Continue building current function
    if (currentFunction) {
      functionLines.push(line);
    }
  }

  // Don't forget the last function
  if (currentFunction && currentFunction.name) {
    functions.push({
      name: currentFunction.name,
      signature: currentFunction.signature || "",
      body: functionLines.join("\n"),
      isPayable: currentFunction.isPayable || false,
      lineStart: currentFunction.lineStart || 0,
    });
  }

  return { storage, functions, header };
}

export function DecompiledCodeViewer({
  decompiledCode,
  decompilationSuccess,
  bytecode,
}: DecompiledCodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());
  const [showAllCode, setShowAllCode] = useState(false);

  const handleCopy = async () => {
    if (!decompiledCode) return;
    const success = await copyToClipboard(decompiledCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFunction = (name: string) => {
    setExpandedFunctions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (parsed) {
      setExpandedFunctions(new Set(parsed.functions.map((f) => f.name)));
    }
  };

  const collapseAll = () => {
    setExpandedFunctions(new Set());
  };

  // Parse the decompiled code
  const parsed = useMemo(() => {
    if (!decompiledCode || !decompilationSuccess) return null;
    return parseDecompiledCode(decompiledCode);
  }, [decompiledCode, decompilationSuccess]);

  // Filter functions by search query
  const filteredFunctions = useMemo(() => {
    if (!parsed) return [];
    if (!searchQuery.trim()) return parsed.functions;

    const query = searchQuery.toLowerCase();
    return parsed.functions.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.signature.toLowerCase().includes(query) ||
        f.body.toLowerCase().includes(query)
    );
  }, [parsed, searchQuery]);

  // No decompiled code available
  if (!decompiledCode) {
    return (
      <div className="rounded-xl border border-obsidian-800 p-8 text-center">
        <Code className="w-12 h-12 mx-auto mb-4 text-obsidian-600" />
        <h3 className="text-lg font-medium mb-2 text-obsidian-400">No Decompiled Code</h3>
        <p className="text-sm text-obsidian-500 max-w-md mx-auto">
          This contract's bytecode could not be decompiled. This may be because
          the bytecode is too short, uses an unsupported pattern, or is intentionally obfuscated.
        </p>
        {bytecode && (
          <p className="text-xs text-obsidian-600 mt-4">
            Bytecode length: {Math.floor(bytecode.length / 2)} bytes
          </p>
        )}
      </div>
    );
  }

  // Decompilation failed but we have some output
  if (!decompilationSuccess) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-400 mb-1">Partial Decompilation</h3>
            <p className="text-sm text-obsidian-400">
              The decompiler was unable to fully analyze this contract.
              The output below may be incomplete or contain errors.
            </p>
          </div>
        </div>
        <pre className="text-xs text-obsidian-400 font-mono bg-obsidian-900/50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
          {decompiledCode}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-obsidian-400">
            {parsed?.functions.length || 0} functions detected
          </span>
          {parsed && parsed.storage.length > 0 && (
            <span className="text-sm text-obsidian-500">
              | {parsed.storage.length} storage variables
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-500" />
            <input
              type="text"
              placeholder="Search functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm bg-obsidian-800 border border-obsidian-700 rounded-lg text-obsidian-200 placeholder:text-obsidian-500 focus:outline-none focus:border-ether-500/50 w-48"
            />
          </div>

          {/* Actions */}
          <button
            onClick={expandAll}
            className="px-2 py-1.5 text-xs text-obsidian-400 hover:text-obsidian-200 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1.5 text-xs text-obsidian-400 hover:text-obsidian-200 transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-obsidian-800 hover:bg-obsidian-700 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-obsidian-400" />
                <span className="text-obsidian-300">Copy All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Storage Variables */}
      {parsed && parsed.storage.length > 0 && (
        <div className="rounded-lg border border-obsidian-800 bg-obsidian-900/30 overflow-hidden">
          <div className="px-4 py-2 bg-obsidian-800/50 border-b border-obsidian-800">
            <span className="text-sm font-medium text-obsidian-300">Storage Variables</span>
          </div>
          <div className="p-4">
            <div className="space-y-1 font-mono text-xs">
              {parsed.storage.map((variable, i) => (
                <div key={i} className="text-obsidian-400">
                  <HighlightedCode code={variable} searchQuery={searchQuery} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Functions List */}
      <div className="space-y-2">
        {filteredFunctions.map((func) => (
          <FunctionBlock
            key={func.name}
            func={func}
            isExpanded={expandedFunctions.has(func.name)}
            onToggle={() => toggleFunction(func.name)}
            searchQuery={searchQuery}
          />
        ))}

        {searchQuery && filteredFunctions.length === 0 && (
          <div className="text-center py-8 text-obsidian-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No functions matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Show raw decompiled code toggle */}
      <div className="pt-4 border-t border-obsidian-800">
        <button
          onClick={() => setShowAllCode(!showAllCode)}
          className="flex items-center gap-2 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors"
        >
          {showAllCode ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {showAllCode ? "Hide" : "Show"} raw decompiled output
        </button>

        {showAllCode && (
          <pre className="mt-4 p-4 bg-obsidian-900/50 rounded-lg text-xs font-mono text-obsidian-400 overflow-x-auto whitespace-pre-wrap border border-obsidian-800">
            {decompiledCode}
          </pre>
        )}
      </div>
    </div>
  );
}

function FunctionBlock({
  func,
  isExpanded,
  onToggle,
  searchQuery,
}: {
  func: ParsedFunction;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}) {
  return (
    <div className="rounded-lg border border-obsidian-800 bg-obsidian-900/30 overflow-hidden">
      {/* Function header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-obsidian-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-ether-400">
            <HighlightedCode code={func.name} searchQuery={searchQuery} />
          </span>
          {func.isPayable && (
            <span className="px-1.5 py-0.5 text-xs bg-green-500/10 text-green-400 rounded">
              payable
            </span>
          )}
          {func.name === "_fallback" && (
            <span className="px-1.5 py-0.5 text-xs bg-obsidian-700 text-obsidian-400 rounded">
              default
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-obsidian-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-obsidian-500" />
        )}
      </button>

      {/* Function body - expandable */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-obsidian-800">
          <pre className="mt-3 text-xs font-mono text-obsidian-300 overflow-x-auto whitespace-pre-wrap">
            <HighlightedCode code={func.body} searchQuery={searchQuery} />
          </pre>
        </div>
      )}
    </div>
  );
}

function HighlightedCode({ code, searchQuery }: { code: string; searchQuery: string }) {
  if (!searchQuery.trim()) {
    return <>{code}</>;
  }

  const query = searchQuery.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const lowerCode = code.toLowerCase();
  let searchIndex = lowerCode.indexOf(query);

  while (searchIndex !== -1) {
    // Add text before match
    if (searchIndex > lastIndex) {
      parts.push(code.slice(lastIndex, searchIndex));
    }

    // Add highlighted match
    parts.push(
      <span key={searchIndex} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
        {code.slice(searchIndex, searchIndex + query.length)}
      </span>
    );

    lastIndex = searchIndex + query.length;
    searchIndex = lowerCode.indexOf(query, lastIndex);
  }

  // Add remaining text
  if (lastIndex < code.length) {
    parts.push(code.slice(lastIndex));
  }

  return <>{parts}</>;
}
