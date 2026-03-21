"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronDown, ChevronUp, Code2 } from "lucide-react";
import { copyToClipboard, formatBytes } from "@/lib/utils";
import { DecompiledCodeViewer } from "./DecompiledCodeViewer";
import type { BytecodeAnalysis } from "@/types";

interface BytecodeViewerProps {
  bytecode: string | null;
  analysis: BytecodeAnalysis | null;
  decompiledCode?: string | null;
  decompilationSuccess?: boolean;
  sourceCode?: string | null;
  abi?: string | null;
}

export function BytecodeViewer({
  bytecode,
  analysis,
  decompiledCode,
  decompilationSuccess = false,
  sourceCode,
  abi,
}: BytecodeViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "source" | "abi" | "decompiled" | "bytecode" | "analysis" | "patterns"
  >(
    sourceCode
      ? "source"
      : decompilationSuccess
      ? "decompiled"
      : "analysis"
  );

  const prettyAbi = useMemo(() => {
    if (!abi) return null;
    try {
      const parsed = JSON.parse(abi);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return abi;
    }
  }, [abi]);

  const handleCopy = async () => {
    if (!bytecode) return;
    const success = await copyToClipboard(bytecode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-obsidian-800 overflow-hidden">
      {/* Tabs */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 border-b border-obsidian-800 bg-obsidian-900/50">
        <div className="flex items-center overflow-x-auto no-scrollbar whitespace-nowrap">
          {sourceCode && (
            <TabButton active={activeTab === "source"} onClick={() => setActiveTab("source")}>
              Source
            </TabButton>
          )}
          {abi && (
            <TabButton active={activeTab === "abi"} onClick={() => setActiveTab("abi")}>
              ABI
            </TabButton>
          )}
          <TabButton
            active={activeTab === "decompiled"}
            onClick={() => setActiveTab("decompiled")}
            icon={<Code2 className="w-3.5 h-3.5" />}
            badge={decompilationSuccess ? undefined : "!"}
          >
            Decompiled
          </TabButton>
          <TabButton active={activeTab === "analysis"} onClick={() => setActiveTab("analysis")}>
            Analysis
          </TabButton>
          <TabButton active={activeTab === "bytecode"} onClick={() => setActiveTab("bytecode")}>
            Bytecode
          </TabButton>
          <TabButton active={activeTab === "patterns"} onClick={() => setActiveTab("patterns")}>
            Patterns
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "source" && (
          <SourceCodeView
            sourceCode={sourceCode || null}
            expanded={expanded}
            onToggleExpand={() => setExpanded(!expanded)}
          />
        )}

        {activeTab === "abi" && (
          <TextBlobView
            title="Contract ABI"
            content={prettyAbi}
            expanded={expanded}
            onToggleExpand={() => setExpanded(!expanded)}
          />
        )}

        {activeTab === "decompiled" && (
          <DecompiledCodeViewer
            decompiledCode={decompiledCode || null}
            decompilationSuccess={decompilationSuccess}
            bytecode={bytecode}
          />
        )}

        {activeTab === "analysis" && analysis && (
          <AnalysisView analysis={analysis} />
        )}

        {activeTab === "analysis" && !analysis && (
          <div className="text-center py-8 text-obsidian-500">
            <p>No bytecode analysis available for this contract.</p>
          </div>
        )}

        {activeTab === "bytecode" && (
          <BytecodeView
            bytecode={bytecode}
            expanded={expanded}
            onToggleExpand={() => setExpanded(!expanded)}
            onCopy={handleCopy}
            copied={copied}
          />
        )}

        {activeTab === "patterns" && (
          <PatternsView analysis={analysis} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon,
  badge,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-none whitespace-nowrap flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative
        ${active ? "text-obsidian-100" : "text-obsidian-500 hover:text-obsidian-300"}
      `}
    >
      {icon}
      {children}
      {badge && (
        <span className="px-1 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">
          {badge}
        </span>
      )}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-ether-500"
        />
      )}
    </button>
  );
}

/**
 * Parse Etherscan Standard JSON Input format and extract individual Solidity files.
 * Returns null if the source is not in that format (plain Solidity string).
 */
function parseStandardJson(source: string): Record<string, string> | null {
  // Etherscan wraps Standard JSON in double braces: {{ ... }}
  const trimmed = source.trim();
  const unwrapped = trimmed.startsWith("{{") ? trimmed.slice(1, -1).trim() : trimmed;
  try {
    const parsed = JSON.parse(unwrapped);
    if (parsed?.sources && typeof parsed.sources === "object") {
      const files: Record<string, string> = {};
      for (const [path, val] of Object.entries(parsed.sources as Record<string, { content?: string }>)) {
        if (val?.content) files[path] = val.content;
      }
      return Object.keys(files).length > 0 ? files : null;
    }
  } catch {
    // Not JSON — plain Solidity
  }
  return null;
}

function SourceCodeView({
  sourceCode,
  expanded,
  onToggleExpand,
}: {
  sourceCode: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const files = useMemo(() => (sourceCode ? parseStandardJson(sourceCode) : null), [sourceCode]);
  const fileNames = files ? Object.keys(files) : [];
  const defaultFile = fileNames.find((f) => !f.startsWith("@")) || fileNames[fileNames.length - 1] || null;

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedFile = activeFile && fileNames.includes(activeFile) ? activeFile : defaultFile;
  const content = selectedFile && files ? files[selectedFile] : null;

  const handleCopy = async () => {
    const toCopy = content || sourceCode;
    if (!toCopy) return;
    const ok = await copyToClipboard(toCopy);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (!sourceCode) {
    return (
      <div className="text-center py-8 text-obsidian-500">
        <p>No source code available for this contract.</p>
      </div>
    );
  }

  // Multi-file Standard JSON
  if (files && fileNames.length > 0) {
    return (
      <div className="space-y-3">
        {/* File tabs */}
        <div className="flex flex-wrap gap-1.5">
          {fileNames.map((name) => {
            const short = name.split("/").pop() || name;
            const isActive = name === selectedFile;
            return (
              <button
                key={name}
                onClick={() => setActiveFile(name)}
                title={name}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors truncate max-w-[200px] ${
                  isActive
                    ? "bg-ether-600/30 text-ether-300 border border-ether-600/40"
                    : "bg-obsidian-800 text-obsidian-400 border border-obsidian-700 hover:text-obsidian-200"
                }`}
              >
                {short}
              </button>
            );
          })}
        </div>
        {selectedFile && (
          <div className="text-xs text-obsidian-600 font-mono">{selectedFile}</div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-obsidian-400">
            Verified Source Code
            <span className="ml-2 text-xs text-obsidian-600">
              ({fileNames.length} {fileNames.length === 1 ? "file" : "files"})
            </span>
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-sm text-obsidian-300 transition-colors"
          >
            {copied ? <><Check className="w-4 h-4 text-green-400" />Copied</> : <><Copy className="w-4 h-4" />Copy</>}
          </button>
        </div>
        <pre className="text-xs font-mono bg-obsidian-950/50 rounded-lg p-4 overflow-x-auto text-obsidian-300 leading-relaxed whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto">
          {content || ""}
        </pre>
      </div>
    );
  }

  // Plain Solidity string fallback
  return (
    <TextBlobView
      title="Verified Source Code"
      content={sourceCode}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
    />
  );
}

function TextBlobView({
  title,
  content,
  expanded,
  onToggleExpand,
}: {
  title: string;
  content: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const display = useMemo(() => {
    if (!content) return null;
    if (expanded) return content;
    const limit = 6000;
    return content.length > limit ? content.slice(0, limit) : content;
  }, [content, expanded]);

  const isTruncated = !!content && !expanded && content.length > 6000;

  const handleCopy = async () => {
    if (!content) return;
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!content) {
    return (
      <div className="text-center py-8 text-obsidian-500">
        <p>No {title.toLowerCase()} available for this contract.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-obsidian-400">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-sm text-obsidian-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="code-block">
        <pre className="text-xs text-obsidian-300 whitespace-pre p-4 overflow-x-auto">
          {display}
          {isTruncated ? "\n... (truncated)" : ""}
        </pre>
      </div>

      {content.length > 6000 && (
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-sm text-ether-400 hover:text-ether-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show all
            </>
          )}
        </button>
      )}
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: BytecodeAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Opcodes"
          value={analysis.opcodeCount.toLocaleString()}
          subtext={`${analysis.uniqueOpcodeCount} unique`}
        />
        <MetricCard
          label="Jumps"
          value={analysis.jumpCount.toString()}
          subtext={`${analysis.jumpdestCount} destinations`}
        />
        <MetricCard
          label="Storage Ops"
          value={analysis.storageOpsCount.toString()}
          subtext="SLOAD + SSTORE"
        />
        <MetricCard
          label="External Calls"
          value={analysis.callOpsCount.toString()}
          subtext="CALL, DELEGATECALL, etc."
        />
      </div>

      {/* Branch density */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-obsidian-400">Branch Density</span>
          <span className="text-sm font-mono text-obsidian-300">
            {(analysis.branchDensity * 100).toFixed(2)}%
          </span>
        </div>
        <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-ether-500 rounded-full"
            style={{ width: `${Math.min(analysis.branchDensity * 100 * 10, 100)}%` }}
          />
        </div>
        <p className="text-xs text-obsidian-500 mt-1">
          Ratio of conditional jumps to total opcodes
        </p>
      </div>

      {/* Loop detection */}
      {analysis.hasLoops && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm font-medium">
              Loops Detected
            </span>
            <span className="text-xs text-obsidian-400 heuristic-badge">
              (heuristic)
            </span>
          </div>
          <p className="text-sm text-obsidian-400 mt-1">
            Approximately {analysis.loopCount} loop pattern(s) detected based on backward jump analysis.
          </p>
        </div>
      )}

      {/* Signatures */}
      <div className="pt-4 border-t border-obsidian-800">
        <h4 className="text-sm font-medium text-obsidian-300 mb-3">Fingerprint Hashes</h4>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-obsidian-500 w-24">Trigram:</span>
            <code className="text-obsidian-400">{analysis.trigramHash}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-obsidian-500 w-24">Control Flow:</span>
            <code className="text-obsidian-400">{analysis.controlFlowSignature}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-obsidian-500 w-24">Shape:</span>
            <code className="text-obsidian-400">{analysis.shapeSignature}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-obsidian-900/50 border border-obsidian-800">
      <div className="text-xs text-obsidian-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-obsidian-100">{value}</div>
      <div className="text-xs text-obsidian-500">{subtext}</div>
    </div>
  );
}

function BytecodeView({
  bytecode,
  expanded,
  onToggleExpand,
  onCopy,
  copied,
}: {
  bytecode: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  if (!bytecode) {
    return (
      <div className="text-center py-8 text-obsidian-500">
        <p>No bytecode available for this contract.</p>
      </div>
    );
  }

  const displayBytecode = expanded ? bytecode : bytecode.slice(0, 500);
  const isTruncated = bytecode.length > 500;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-obsidian-400">
          {formatBytes(bytecode.length / 2)} ({bytecode.length} hex chars)
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-sm text-obsidian-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Bytecode display */}
      <div className="code-block">
        <pre className="text-xs text-obsidian-400 break-all whitespace-pre-wrap">
          {displayBytecode}
          {isTruncated && !expanded && "..."}
        </pre>
      </div>

      {/* Expand/collapse */}
      {isTruncated && (
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-sm text-ether-400 hover:text-ether-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show all {bytecode.length} characters
            </>
          )}
        </button>
      )}
    </div>
  );
}

function PatternsView({ analysis }: { analysis: BytecodeAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="text-center py-8 text-obsidian-500">
        <p>No pattern analysis available for this contract.</p>
      </div>
    );
  }

  // Common patterns to check for
  const patterns = [
    {
      name: "Owner Check",
      description: "Likely has an owner/admin address check",
      detected: analysis.storageOpsCount > 0 && analysis.jumpCount > 2,
      category: "Access Control",
    },
    {
      name: "External Calls",
      description: "Makes calls to other contracts",
      detected: analysis.callOpsCount > 0,
      category: "Interaction",
    },
    {
      name: "State Modification",
      description: "Modifies persistent storage",
      detected: analysis.storageOpsCount > 0,
      category: "Storage",
    },
    {
      name: "Loop Structures",
      description: "Contains iterative logic",
      detected: analysis.hasLoops,
      category: "Control Flow",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-obsidian-400">
        These patterns are detected heuristically from bytecode structure.
        They indicate likely functionality but cannot be confirmed without source code.
      </p>

      <div className="space-y-3">
        {patterns.map((pattern) => (
          <div
            key={pattern.name}
            className={`
              p-3 rounded-lg border transition-colors
              ${
                pattern.detected
                  ? "bg-ether-500/5 border-ether-500/20"
                  : "bg-obsidian-900/30 border-obsidian-800"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      pattern.detected ? "text-obsidian-200" : "text-obsidian-500"
                    }`}
                  >
                    {pattern.name}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-obsidian-800 text-obsidian-500">
                    {pattern.category}
                  </span>
                </div>
                <p className="text-xs text-obsidian-500 mt-1">{pattern.description}</p>
              </div>
              <span
                className={`text-xs font-medium ${
                  pattern.detected ? "text-ether-400" : "text-obsidian-600"
                }`}
              >
                {pattern.detected ? "Detected" : "Not detected"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-obsidian-500 italic">
        Pattern detection is based on opcode analysis and may produce false positives or negatives.
      </p>
    </div>
  );
}
