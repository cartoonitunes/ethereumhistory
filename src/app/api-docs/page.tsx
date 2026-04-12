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
              Most endpoints are read-only <strong>GET</strong> requests. Responses use JSON with <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">snake_case</code> keys. Authenticated requests using an <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">x-api-key</code> header receive higher rate limits. Write endpoints require a historian session cookie.
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
                Full factual data for a single contract: address, era, deployer, deployment block/timestamp, <strong>runtime_bytecode</strong>, <strong>decompiled_code</strong> (when available), short_description, description (canonical narrative; historical_summary mirrors it for API compatibility), historical_significance, historical_context, token metadata, heuristics, links, metadata.
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
    "description": "...",
    "historical_summary": "... (same as description; deprecated, use description)",
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
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">q</td><td>string</td><td>Text search across contract name, token name, symbol, address, and decompiled code</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">era_id</td><td>string</td><td>frontier, homestead, dao, tangerine, spurious, byzantium</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">featured</td><td>string</td><td>true or 1 = featured only</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">undocumented_only</td><td>string</td><td>true or 1 = no short_description yet</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">unverified</td><td>string</td><td>1 = only contracts with no verification method set (prioritize crack candidates)</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">sort</td><td>string</td><td>siblings = sort by sibling count descending (most shared bytecode first, useful for crack prioritization)</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">limit</td><td>number</td><td>1–200, default 50</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">offset</td><td>number</td><td>Pagination offset, default 0</td></tr>
                  </tbody>
                </table>
              </div>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Example requests</h4>
              <CodeBlock
                code={`GET ${BASE_URL}/api/agent/contracts?era_id=homestead&featured=true&limit=10\nGET ${BASE_URL}/api/agent/contracts?q=MyToken&unverified=1&sort=siblings&limit=20`}
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

            {/* Authentication & Rate Limits */}
            <Section title="Authentication & Rate Limits" id="auth">
              <p className="text-obsidian-300 mb-4">
                Read endpoints are publicly accessible. Providing an API key via the <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">x-api-key</code> header unlocks higher rate limits for historian-tier users.
              </p>
              <div className="overflow-x-auto rounded-lg border border-obsidian-800 bg-obsidian-900/30 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-obsidian-800">
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Tier</th>
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Rate limit</th>
                    </tr>
                  </thead>
                  <tbody className="text-obsidian-300">
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4">Anonymous</td><td className="py-2 px-4">20 requests / minute</td></tr>
                    <tr><td className="py-2 px-4">Authenticated (historian tier)</td><td className="py-2 px-4">120 requests / minute</td></tr>
                  </tbody>
                </table>
              </div>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Authentication header</h4>
              <CodeBlock
                code={`x-api-key: eh_your_key_here`}
                id="auth-header"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
              <p className="text-obsidian-400 text-sm mt-3 mb-4">
                Generate API keys from your historian profile page. Keys are prefixed with <code className="text-ether-300">eh_</code>.
              </p>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Rate limit response headers</h4>
              <ul className="text-obsidian-300 text-sm space-y-1 list-disc list-inside mb-4">
                <li><code className="text-ether-300">X-RateLimit-Remaining</code> — requests remaining in the current window</li>
                <li>When the limit is exceeded, the API responds with <strong>429</strong> and a <code className="text-ether-300">Retry-After</code> header indicating seconds until the window resets</li>
              </ul>
            </Section>

            {/* Siblings API */}
            <Section title="Siblings API" id="siblings">
              <p className="text-obsidian-300 mb-4">
                Returns contracts that share the same runtime bytecode hash as the given address. Useful for identifying deployments of the same contract template and prioritizing verification work.
              </p>
              <Endpoint method="GET" path="/api/contracts/{address}/siblings" />
              <p className="text-obsidian-400 text-sm mt-2 mb-4">
                <strong>Query params:</strong> <code className="text-ether-300">offset</code> (default 0). Returns 100 siblings per page.
              </p>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Example request</h4>
              <CodeBlock
                code={`GET ${BASE_URL}/api/contracts/0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb/siblings?offset=0`}
                id="siblings-req"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Response (200)</h4>
              <CodeBlock
                code={`{
  "data": {
    "hash": "0xabc123...",
    "count": 42,
    "groupVerified": true,
    "groupName": "StandardToken",
    "groupContractType": "token",
    "contracts": [
      {
        "address": "0x...",
        "deployment_timestamp": "2016-08-01T12:00:00Z",
        "token_name": "Example Token",
        "token_symbol": "EXT",
        "verification_status": "verified"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-02-03T12:00:00.000Z",
    "offset": 0,
    "count": 42
  }
}`}
                id="siblings-res"
                copiedId={copiedId}
                onCopy={copyToClipboard}
                language="json"
              />
            </Section>

            {/* ABI API */}
            <Section title="ABI API" id="abi">
              <p className="text-obsidian-300 mb-4">
                Returns the machine-readable ABI for a contract. Covers verified contracts and their bytecode siblings.
              </p>
              <p className="text-obsidian-400 text-sm mb-4">
                Ethereum History is the only ABI reference for contracts predating Solidity v0.4.7 (December 2016) — the era that Sourcify and other metadata-based services don&apos;t support. For contracts from this early period, ABIs are derived directly from compiler archaeology and bytecode verification.
              </p>
              <Endpoint method="GET" path="/api/contract/{address}/abi" />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Example request</h4>
              <CodeBlock
                code={`GET ${BASE_URL}/api/contract/0x283f1161c2d4ff33fd5d5d4486fc0675732cea11/abi`}
                id="abi-req"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Response (200)</h4>
              <CodeBlock
                code={`{
  "data": {
    "abi": "[{\\"type\\":\\"function\\",\\"name\\":\\"sendCoin\\",\\"inputs\\":[...],\\"outputs\\":[...]}]",
    "source": "direct",        // "direct" | "sibling"
    "siblingAddress": null     // address of verified sibling if source="sibling"
  },
  "error": null
}

// Returns { "data": null, "error": null } when no ABI is available`}
                id="abi-res"
                copiedId={copiedId}
                onCopy={copyToClipboard}
                language="json"
              />
            </Section>

            {/* Verification Methods */}
            <Section title="Verification Methods" id="verification-methods">
              <p className="text-obsidian-300 mb-4">
                The <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-ether-300 font-mono text-sm">verification_method</code> field describes how a contract&apos;s source was verified. These values appear in contract facts and write payloads.
              </p>
              <div className="overflow-x-auto rounded-lg border border-obsidian-800 bg-obsidian-900/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-obsidian-800">
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Value</th>
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-obsidian-300">
                    <tr className="border-b border-obsidian-800/80">
                      <td className="py-2 px-4 font-mono text-ether-300">exact_bytecode_match</td>
                      <td className="py-2 px-4">Compiled source matches on-chain bytecode byte-for-byte</td>
                    </tr>
                    <tr className="border-b border-obsidian-800/80">
                      <td className="py-2 px-4 font-mono text-ether-300">near_exact_match</td>
                      <td className="py-2 px-4">Source recovered and all logic verified; a minor gap remains (e.g. metadata hash difference)</td>
                    </tr>
                    <tr className="border-b border-obsidian-800/80">
                      <td className="py-2 px-4 font-mono text-ether-300">author_published_source</td>
                      <td className="py-2 px-4">The original developer published the source (GitHub, blog post, etc.)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-mono text-ether-300">etherscan_verified</td>
                      <td className="py-2 px-4">Contract is verified on Etherscan; source pulled from there</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Contract Write API */}
            <Section title="Contract Write API" id="write">
              <p className="text-obsidian-300 mb-4">
                Update contract documentation and verification data. Requires an active historian session cookie. This endpoint powers all historian edits on EthereumHistory.com.
              </p>
              <Endpoint method="POST" path="/api/contract/{address}/history/manage" />
              <p className="text-obsidian-400 text-sm mt-2 mb-4">
                Requires a valid <code className="text-ether-300">historian_session</code> cookie. Historians can log in at <code className="text-ether-300">/historian/login</code>.
              </p>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Request body (JSON)</h4>
              <div className="overflow-x-auto rounded-lg border border-obsidian-800 bg-obsidian-900/30 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-obsidian-800">
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Field</th>
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-obsidian-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-obsidian-300">
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">shortDescription</td><td>string</td><td>One-line summary of the contract</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">description</td><td>string</td><td>Full canonical narrative / historical summary</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">historicalContext</td><td>string</td><td>Surrounding historical context at deployment time</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">historicalSignificance</td><td>string</td><td>Why this contract matters historically</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">verificationMethod</td><td>string</td><td>One of the verification method values above</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">verificationProofUrl</td><td>string</td><td>URL linking to verification proof (GitHub repo, etc.)</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">verificationNotes</td><td>string</td><td>Notes about the verification process</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">compilerCommit</td><td>string</td><td>Git commit hash of the compiler used</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">compilerLanguage</td><td>string</td><td>e.g. solidity, serpent, lll</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">sourceCode</td><td>string</td><td>Full verified source code</td></tr>
                    <tr className="border-b border-obsidian-800/80"><td className="py-2 px-4 font-mono text-ether-300">verificationStatus</td><td>string</td><td>verified, unverified, partial</td></tr>
                    <tr><td className="py-2 px-4 font-mono text-ether-300">contractType</td><td>string</td><td>token, dao, exchange, wallet, registry, etc.</td></tr>
                  </tbody>
                </table>
              </div>
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Example request</h4>
              <CodeBlock
                code={`POST ${BASE_URL}/api/contract/0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb/history/manage
Content-Type: application/json
Cookie: historian_session=...

{
  "shortDescription": "Early ERC-20 style token deployed on Homestead.",
  "verificationMethod": "exact_bytecode_match",
  "verificationProofUrl": "https://github.com/cartoonitunes/proof-0xdbf0",
  "compilerCommit": "67c855c5",
  "compilerLanguage": "solidity",
  "sourceCode": "contract MyToken { ... }",
  "verificationStatus": "verified",
  "contractType": "token"
}`}
                id="write-req"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
              <h4 className="text-obsidian-200 font-semibold mt-4 mb-2">Errors</h4>
              <ul className="text-obsidian-400 text-sm space-y-1 list-disc list-inside">
                <li><strong>401</strong> — Not authenticated. Valid historian session cookie required.</li>
                <li><strong>404</strong> — Contract not found.</li>
                <li><strong>500</strong> — Server error.</li>
              </ul>
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
