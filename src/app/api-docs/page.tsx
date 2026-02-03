"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/Header";
import { BookOpen, ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";

const BASE_URL = "https://ethereumhistory.com";

export default function ApiDocsPage() {
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
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  <span className="gradient-text">API</span> Documentation
                </h1>
                <p className="text-obsidian-400 mt-1">
                  Ethereum History — read-only historical contract data for agents and developers
                </p>
              </div>
            </div>

            <p className="text-obsidian-300 leading-relaxed mb-10">
              All endpoints are <strong>GET only</strong>. No authentication required. Responses use JSON with <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">snake_case</code> keys.
            </p>

            {/* Base URL */}
            <Section title="Base URL" id="base-url">
              <CodeBlock
                code={BASE_URL}
                id="base-url"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            </Section>

            {/* Manifest */}
            <Section title="Manifest" id="manifest">
              <p className="text-obsidian-300 mb-4">
                Machine-readable skill manifest: capabilities, endpoints, and terms. Use this to register Ethereum History as a skill or MCP server.
              </p>
              <Endpoint method="GET" path="/api/agent/manifest" />
              <p className="text-obsidian-400 text-sm mt-2 mb-4">No query parameters.</p>
              <h4 className="text-obsidian-200 font-semibold mb-2">Response (200)</h4>
              <CodeBlock
                code={`{
  "name": "Ethereum History",
  "id": "ethereumhistory",
  "description": "Historical contract data and documentation...",
  "version": "1.0",
  "base_url": "${BASE_URL}",
  "capabilities": ["contract_facts", "discovery", "temporal_queries"],
  "endpoints": [
    {
      "capability": "contract_facts",
      "method": "GET",
      "path": "/api/agent/contracts/{address}",
      "description": "Factual contract data for one address..."
    },
    ...
  ],
  "terms": "Read-only. No opinions or editorial stance..."
}`}
                id="manifest-res"
                copiedId={copiedId}
                onCopy={copyToClipboard}
                language="json"
              />
            </Section>

            {/* Contract facts */}
            <Section title="Contract facts (one address)" id="contract-facts">
              <p className="text-obsidian-300 mb-4">
                Full factual data for a single contract: address, era, deployer, deployment block/timestamp, <strong>runtime_bytecode</strong>, <strong>decompiled_code</strong> (when available), short_description, historical_summary, historical_significance, historical_context, token metadata, heuristics, links, metadata.
              </p>
              <Endpoint method="GET" path="/api/agent/contracts/{address}" />
              <p className="text-obsidian-400 text-sm mt-2 mb-2">
                <strong>Path:</strong> <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">address</code> — Ethereum address (0x + 40 hex chars). Required.
              </p>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Example request</h4>
              <CodeBlock
                code={`GET ${BASE_URL}/api/agent/contracts/0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb`}
                id="contract-facts-req"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Response (200)</h4>
              <CodeBlock
                code={`{
  "data": {
    "address": "0x...",
    "era_id": "homestead",
    "era": {
      "id": "homestead",
      "name": "Homestead",
      "start_block": 1150000,
      "end_block": 1920000,
      "start_date": "2016-03-14",
      "end_date": "2016-09-22"
    },
    "deployer_address": "0x...",
    "deployment_tx_hash": "0x...",
    "deployment_block": 1234567,
    "deployment_timestamp": "2016-08-01T12:00:00Z",
    "runtime_bytecode": "0x60806040...",
    "decompiled_code": "// Decompiled source...",
    "decompilation_success": true,
    "code_size_bytes": 1234,
    "gas_used": 500000,
    "gas_price": "20000000000",
    "heuristics": {
      "contract_type": "token",
      "confidence": 0.9,
      "is_proxy": false,
      "has_selfdestruct": false,
      "is_erc20_like": true
    },
    "ens_name": null,
    "deployer_ens_name": null,
    "etherscan_contract_name": "MyToken",
    "etherscan_verified": true,
    "token_name": "Example Token",
    "token_symbol": "EXT",
    "token_decimals": 18,
    "short_description": "Early ERC-20 style token...",
    "historical_summary": "...",
    "historical_significance": "...",
    "historical_context": "...",
    "verification_status": "verified",
    "links": [{ "id": 1, "title": "...", "url": "...", "source": null, "note": null, "created_at": "..." }],
    "metadata": [{ "key": "...", "value": "...", "json_value": null, "source_url": null, "created_at": "..." }]
  },
  "meta": { "timestamp": "2025-02-03T12:00:00.000Z", "cached": false }
}`}
                id="contract-facts-res"
                copiedId={copiedId}
                onCopy={copyToClipboard}
                language="json"
              />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Errors</h4>
              <ul className="text-obsidian-400 text-sm space-y-1 list-disc list-inside">
                <li><strong>400</strong> — Invalid address format. Body: <code className="text-ether-300">{"{ \"error\": \"Invalid Ethereum address format...\" }"}</code></li>
                <li><strong>404</strong> — Contract not found. Body: <code className="text-ether-300">{"{ \"error\": \"Contract not found in our historical archive.\" }"}</code></li>
                <li><strong>500</strong> — Server error.</li>
              </ul>
            </Section>

            {/* Discovery */}
            <Section title="Discovery (list contracts)" id="discovery">
              <p className="text-obsidian-300 mb-4">
                List contracts with optional filters. Returns minimal fields for discovery; fetch full facts via the contract-by-address endpoint when needed.
              </p>
              <Endpoint method="GET" path="/api/agent/contracts" />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Query parameters (all optional)</h4>
              <div className="overflow-x-auto rounded-lg border border-obsidian-800 bg-obsidian-900/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-obsidian-800">
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Param</th>
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-obsidian-300">
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">era_id</td><td>string</td><td>frontier, homestead, dao, tangerine, spurious</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">featured</td><td>string</td><td>true or 1 = featured only</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">undocumented_only</td><td>string</td><td>true or 1 = no short_description yet</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">limit</td><td>number</td><td>1–200, default 50</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">offset</td><td>number</td><td>Pagination offset, default 0</td></tr>
                  </tbody>
                </table>
              </div>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Example request</h4>
              <CodeBlock
                code={`GET ${BASE_URL}/api/agent/contracts?era_id=homestead&featured=true&limit=10`}
                id="discovery-req"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Response (200)</h4>
              <CodeBlock
                code={`{
  "data": [
    {
      "address": "0x...",
      "era_id": "homestead",
      "deployer_address": "0x...",
      "deployment_timestamp": "2016-08-01T12:00:00Z",
      "has_short_description": true,
      "decompilation_success": true,
      "etherscan_contract_name": "MyToken",
      "token_name": "Example Token",
      "token_symbol": "EXT"
    }
  ],
  "meta": {
    "timestamp": "2025-02-03T12:00:00.000Z",
    "cached": false,
    "limit": 10,
    "offset": 0,
    "count": 10
  }
}`}
                id="discovery-res"
                copiedId={copiedId}
                onCopy={copyToClipboard}
                language="json"
              />
            </Section>

            {/* Temporal queries */}
            <Section title="Temporal queries (by time range)" id="temporal">
              <p className="text-obsidian-300 mb-4">
                Same endpoint as discovery. Add <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">from_timestamp</code> and/or <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">to_timestamp</code> (ISO 8601) to filter by deployment time.
              </p>
              <Endpoint method="GET" path="/api/agent/contracts" />
              <p className="text-obsidian-400 text-sm mt-2 mb-2">
                <strong>Query params:</strong> from_timestamp, to_timestamp (ISO 8601), plus era_id, limit, offset.
              </p>
              <CodeBlock
                code={`GET ${BASE_URL}/api/agent/contracts?from_timestamp=2015-07-30T00:00:00Z&to_timestamp=2016-12-31T23:59:59Z&limit=50`}
                id="temporal-req"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            </Section>

            {/* Search APIs */}
            <Section title="Search APIs" id="search">
              <p className="text-obsidian-300 mb-4">
                Additional endpoints for address lookup, unified search, and bytecode search. Same JSON response style; useful for building UIs or custom integrations.
              </p>

              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Address search</h4>
              <Endpoint method="GET" path="/api/search?q={address}" />
              <p className="text-obsidian-400 text-sm mb-4">Returns basic info for one address. <code className="text-ether-300">q</code> = full Ethereum address (0x + 40 hex).</p>

              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Unified search</h4>
              <Endpoint method="GET" path="/api/search/unified?q={query}&page={number}" />
              <p className="text-obsidian-400 text-sm mb-4">Searches across decompiled code, verified source, ABI, contract name, token name/symbol, address. Pagination: 20 per page; <code className="text-ether-300">page</code> default 1.</p>

              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Bytecode search</h4>
              <Endpoint method="GET" path="/api/search/bytecode?q={query}&type={decompiled|bytecode|all}&limit={number}" />
              <p className="text-obsidian-400 text-sm">Searches decompiled code and/or bytecode. <code className="text-ether-300">type</code> default <code className="text-ether-300">all</code>; <code className="text-ether-300">limit</code> max 100.</p>
            </Section>

            {/* Featured */}
            <Section title="Featured contracts" id="featured">
              <p className="text-obsidian-300 mb-4">
                Homepage-style featured contracts, recent contracts, and eras. Useful for dashboards or discovery.
              </p>
              <Endpoint method="GET" path="/api/featured" />
              <CodeBlock
                code={`{
  "data": {
    "featuredContracts": [...],
    "recentContracts": [...],
    "eras": [...]
  },
  "meta": { "timestamp": "...", "cached": false }
}`}
                id="featured-res"
                copiedId={copiedId}
                onCopy={copyToClipboard}
                language="json"
              />
            </Section>

            {/* Usage notes */}
            <Section title="Usage notes" id="usage">
              <ul className="text-obsidian-300 space-y-2 list-disc list-inside">
                <li><strong>Read-only.</strong> No opinions or editorial stance. Data as documented on EthereumHistory.com.</li>
                <li><strong>Factual only.</strong> What something is and is not. No hype or persuasion.</li>
                <li>When history (short_description, etc.) is not yet documented, contract facts still include runtime_bytecode and decompiled_code when available.</li>
                <li>For the full machine-readable manifest, call <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">GET {BASE_URL}/api/agent/manifest</code>.</li>
              </ul>
            </Section>

            <div className="mt-16 pt-8 border-t border-obsidian-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/mcp-setup"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm font-medium transition-colors"
              >
                MCP Setup
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

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-14">
      <h2 className="text-xl font-bold text-obsidian-100 mb-4 pb-2 border-b border-obsidian-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
      <span className="px-2 py-1 rounded bg-ether-500/20 text-ether-400 font-semibold">
        {method}
      </span>
      <span className="text-obsidian-300 break-all">{path}</span>
    </div>
  );
}

function CodeBlock({
  code,
  id,
  copiedId,
  onCopy,
  language = "text",
}: {
  code: string;
  id: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  language?: string;
}) {
  const isCopied = copiedId === id;
  return (
    <div className="relative group rounded-lg border border-obsidian-800 bg-obsidian-950 overflow-hidden">
      <pre className="p-4 overflow-x-auto text-sm text-obsidian-200 font-mono leading-relaxed whitespace-pre">
        {code}
      </pre>
      <button
        type="button"
        onClick={() => onCopy(code, id)}
        className="absolute top-2 right-2 p-2 rounded-md bg-obsidian-800/80 text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-700 transition-colors"
        aria-label="Copy"
      >
        {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
