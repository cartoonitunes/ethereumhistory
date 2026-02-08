"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Plug, ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";

const BASE_URL = "https://www.ethereumhistory.com";
const MCP_URL = `${BASE_URL}/mcp`;
const MANIFEST_URL = `${BASE_URL}/api/agent/manifest`;

export default function McpSetupPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 gradient-radial opacity-40" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-obsidian-400 hover:text-ether-400 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-ether-500/10 flex items-center justify-center text-ether-400">
                <Plug className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  <span className="gradient-text">MCP</span> Setup
                </h1>
                <p className="text-obsidian-400 mt-1">
                  Connect AI agents and MCP clients to Ethereum History
                </p>
              </div>
            </div>

            <p className="text-obsidian-300 leading-relaxed mb-10">
              Ethereum History exposes a read-only, factual API for historical Ethereum mainnet contracts. Use the manifest URL below to register it as an MCP server or skill in Cursor, Claude, or other agents.
            </p>

            {/* MCP Server URL */}
            <section id="mcp-server" className="scroll-mt-24 mb-14">
              <h2 className="text-xl font-bold text-obsidian-100 mb-4 pb-2 border-b border-obsidian-800">
                MCP Server URL
              </h2>
              <p className="text-obsidian-300 mb-4">
                Ethereum History implements the <strong className="text-obsidian-200">Model Context Protocol (MCP)</strong> natively. Add this URL to Claude Desktop, Cursor, or any MCP-compatible client to give your AI agent direct access to Ethereum history tools.
              </p>
              <div className="relative group rounded-lg border border-obsidian-800 bg-obsidian-950 overflow-hidden">
                <pre className="p-4 pr-12 overflow-x-auto text-sm text-ether-300 font-mono leading-relaxed break-all">
                  {MCP_URL}
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(MCP_URL, "mcp-url-copy")}
                  className="absolute top-2 right-2 p-2 rounded-md bg-obsidian-800/80 text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-700 transition-colors"
                  aria-label="Copy MCP URL"
                >
                  {copiedId === "mcp-url-copy" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-obsidian-800 bg-obsidian-900/30 p-4">
                <h4 className="text-obsidian-200 font-semibold mb-2">Available Tools</h4>
                <ul className="space-y-2 text-obsidian-400 text-sm">
                  <li className="flex items-start gap-2"><span className="text-ether-400 mt-0.5">&#9679;</span><span><strong className="text-obsidian-200">get_contract</strong> — Full contract details (bytecode, decompiled code, history, links)</span></li>
                  <li className="flex items-start gap-2"><span className="text-ether-400 mt-0.5">&#9679;</span><span><strong className="text-obsidian-200">search_contracts</strong> — Search by name, token, code, address</span></li>
                  <li className="flex items-start gap-2"><span className="text-ether-400 mt-0.5">&#9679;</span><span><strong className="text-obsidian-200">browse_contracts</strong> — Browse with filters (era, type, year)</span></li>
                  <li className="flex items-start gap-2"><span className="text-ether-400 mt-0.5">&#9679;</span><span><strong className="text-obsidian-200">get_contract_of_the_day</strong> — Today&apos;s featured historical contract</span></li>
                  <li className="flex items-start gap-2"><span className="text-ether-400 mt-0.5">&#9679;</span><span><strong className="text-obsidian-200">get_documentation_progress</strong> — Stats and community metrics</span></li>
                </ul>
              </div>
              <div className="mt-4 rounded-lg border border-obsidian-800 bg-obsidian-900/30 p-4">
                <h4 className="text-obsidian-200 font-semibold mb-2">Claude Desktop Config</h4>
                <p className="text-obsidian-400 text-sm mb-2">Add this to your <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">claude_desktop_config.json</code>:</p>
                <div className="relative group rounded-lg border border-obsidian-800 bg-obsidian-950 overflow-hidden">
                  <pre className="p-4 pr-12 overflow-x-auto text-sm text-obsidian-200 font-mono leading-relaxed">
{`{
  "mcpServers": {
    "ethereum-history": {
      "url": "${MCP_URL}"
    }
  }
}`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`{\n  "mcpServers": {\n    "ethereum-history": {\n      "url": "${MCP_URL}"\n    }\n  }\n}`, "claude-config-copy")}
                    className="absolute top-2 right-2 p-2 rounded-md bg-obsidian-800/80 text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-700 transition-colors"
                    aria-label="Copy Claude config"
                  >
                    {copiedId === "claude-config-copy" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Manifest URL */}
            <section id="manifest-url" className="scroll-mt-24 mb-14">
              <h2 className="text-xl font-bold text-obsidian-100 mb-4 pb-2 border-b border-obsidian-800">
                Manifest URL
              </h2>
              <p className="text-obsidian-300 mb-4">
                Point your MCP client or agent at this URL. The manifest describes capabilities and endpoints (contract facts, discovery, temporal queries).
              </p>
              <div className="relative group rounded-lg border border-obsidian-800 bg-obsidian-950 overflow-hidden">
                <pre className="p-4 pr-12 overflow-x-auto text-sm text-ether-300 font-mono leading-relaxed break-all">
                  {MANIFEST_URL}
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(MANIFEST_URL, "manifest-url-copy")}
                  className="absolute top-2 right-2 p-2 rounded-md bg-obsidian-800/80 text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-700 transition-colors"
                  aria-label="Copy manifest URL"
                >
                  {copiedId === "manifest-url-copy" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </section>

            {/* Capabilities */}
            <section id="capabilities" className="scroll-mt-24 mb-14">
              <h2 className="text-xl font-bold text-obsidian-100 mb-4 pb-2 border-b border-obsidian-800">
                Capabilities
              </h2>
              <ul className="space-y-3 text-obsidian-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-ether-500 shrink-0" />
                  <span><strong className="text-obsidian-200">contract_facts</strong> — Full data for one contract (bytecode, decompiled code, history, links, metadata) via <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">GET /api/agent/contracts/{`{address}`}</code></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-ether-500 shrink-0" />
                  <span><strong className="text-obsidian-200">discovery</strong> — List contracts with filters (era_id, featured, undocumented_only, limit, offset) via <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">GET /api/agent/contracts</code></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-ether-500 shrink-0" />
                  <span><strong className="text-obsidian-200">temporal_queries</strong> — Contracts by deployment time range (from_timestamp, to_timestamp, ISO 8601) on the same discovery endpoint</span>
                </li>
              </ul>
            </section>

            {/* Cursor / Claude MCP */}
            <section id="cursor-mcp" className="scroll-mt-24 mb-14">
              <h2 className="text-xl font-bold text-obsidian-100 mb-4 pb-2 border-b border-obsidian-800">
                Cursor / Claude MCP
              </h2>
              <p className="text-obsidian-300 mb-4">
                If your environment supports MCP (Model Context Protocol), add a server that fetches the manifest and exposes the Ethereum History endpoints. Configuration format depends on your client; typically you provide the manifest URL or a wrapper server URL.
              </p>
              <p className="text-obsidian-400 text-sm mb-4">
                Example: In Cursor MCP settings, you might add a custom server that uses <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">{MANIFEST_URL}</code> as the source of truth for available tools (contract lookup, discovery, temporal queries).
              </p>
              <div className="rounded-lg border border-obsidian-800 bg-obsidian-900/30 p-4">
                <h4 className="text-obsidian-200 font-semibold mb-2">Quick test</h4>
                <p className="text-obsidian-400 text-sm mb-2">
                  Fetch the manifest to verify connectivity:
                </p>
                <div className="relative group rounded-lg border border-obsidian-800 bg-obsidian-950 overflow-hidden">
                  <pre className="p-4 pr-12 overflow-x-auto text-sm text-obsidian-200 font-mono leading-relaxed">
{`curl "${MANIFEST_URL}"`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`curl "${MANIFEST_URL}"`, "curl-copy")}
                    className="absolute top-2 right-2 p-2 rounded-md bg-obsidian-800/80 text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-700 transition-colors"
                    aria-label="Copy curl"
                  >
                    {copiedId === "curl-copy" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* REST API */}
            <section id="rest-api" className="scroll-mt-24 mb-14">
              <h2 className="text-xl font-bold text-obsidian-100 mb-4 pb-2 border-b border-obsidian-800">
                REST API (no MCP)
              </h2>
              <p className="text-obsidian-300 mb-4">
                You can call the same endpoints directly over HTTP. No API key required. All methods are GET. See the full reference in the API docs.
              </p>
              <ul className="text-obsidian-400 text-sm space-y-2">
                <li>• <strong className="text-obsidian-300">Contract by address:</strong> <code className="text-ether-300">{BASE_URL}/api/agent/contracts/0x...</code></li>
                <li>• <strong className="text-obsidian-300">Discovery:</strong> <code className="text-ether-300">{BASE_URL}/api/agent/contracts?era_id=homestead&limit=10</code></li>
                <li>• <strong className="text-obsidian-300">Temporal:</strong> <code className="text-ether-300">{BASE_URL}/api/agent/contracts?from_timestamp=2015-07-30T00:00:00Z&to_timestamp=2016-12-31T23:59:59Z</code></li>
              </ul>
            </section>

            {/* Terms */}
            <section id="terms" className="scroll-mt-24 mb-14">
              <h2 className="text-xl font-bold text-obsidian-100 mb-4 pb-2 border-b border-obsidian-800">
                Terms
              </h2>
              <p className="text-obsidian-300">
                Read-only. No opinions or editorial stance. Data as documented on EthereumHistory.com. Ethereum History is a factual, non-opinionated historical data provider. Use the data for research, agents, and preservation; do not misuse or overload the public API.
              </p>
            </section>

            <div className="mt-16 pt-8 border-t border-obsidian-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/api-docs"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm font-medium transition-colors"
              >
                API Docs
              </Link>
              <Link
                href="/"
                className="text-sm text-obsidian-400 hover:text-ether-400 transition-colors"
              >
                Back to home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
