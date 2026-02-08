/**
 * Ethereum History MCP Server
 *
 * Exposes historical Ethereum contract data as MCP tools that AI agents
 * (Claude, ChatGPT, Cursor, etc.) can call natively.
 *
 * Tools:
 * - get_contract: Full contract details by address
 * - search_contracts: Search across all contracts by query
 * - browse_contracts: Browse with filters (era, type, year)
 * - get_contract_of_the_day: Today's featured historical contract
 * - get_documentation_progress: Documentation stats and community metrics
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getContract } from "@/lib/db";
import {
  isDatabaseConfigured,
  getDocumentedContractsFromDb,
  getDocumentedContractsCountFromDb,
  getHistoricalLinksForContractFromDb,
  getDb,
  getTopEditorsFromDb,
} from "@/lib/db-client";
import { searchUnifiedContracts } from "@/lib/db";
import * as schema from "@/lib/schema";
import { isNotNull, ne, and, asc, eq, sql } from "drizzle-orm";
import { isValidAddress, formatAddress } from "@/lib/utils";
import { ERAS } from "@/types";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "Ethereum History",
    version: "1.0.0",
  });

  // Tool: Get contract details by address
  server.tool(
    "get_contract",
    "Get detailed information about a historical Ethereum smart contract by its address. Returns metadata, bytecode analysis, decompiled code, deployment info, editorial history, and historical links.",
    {
      address: z
        .string()
        .describe("Ethereum contract address (0x followed by 40 hex characters)"),
    },
    async ({ address }) => {
      if (!isValidAddress(address)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Invalid Ethereum address format. Must be 0x followed by 40 hex characters.",
            },
          ],
          isError: true,
        };
      }

      const contract = await getContract(address.toLowerCase());
      if (!contract) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Contract ${address} not found in our historical archive (2015-2017 era contracts).`,
            },
          ],
          isError: true,
        };
      }

      const links = isDatabaseConfigured()
        ? await getHistoricalLinksForContractFromDb(address.toLowerCase(), 20)
        : [];

      const eraInfo = contract.eraId && ERAS[contract.eraId]
        ? `${ERAS[contract.eraId].name} (${ERAS[contract.eraId].startDate} to ${ERAS[contract.eraId].endDate})`
        : contract.eraId || "Unknown";

      const sections: string[] = [
        `# ${contract.etherscanContractName || contract.tokenName || contract.ensName || formatAddress(contract.address, 12)}`,
        `**Address:** ${contract.address}`,
        `**Era:** ${eraInfo}`,
        `**Deployed:** ${contract.deploymentTimestamp || "Unknown"}`,
        contract.deployerAddress ? `**Deployer:** ${contract.deployerAddress}` : "",
        contract.deploymentBlock ? `**Block:** ${contract.deploymentBlock}` : "",
        "",
      ];

      if (contract.tokenName) {
        sections.push(`## Token Info`);
        sections.push(`- Name: ${contract.tokenName}`);
        if (contract.tokenSymbol) sections.push(`- Symbol: ${contract.tokenSymbol}`);
        if (contract.tokenDecimals) sections.push(`- Decimals: ${contract.tokenDecimals}`);
        sections.push("");
      }

      if (contract.shortDescription) {
        sections.push(`## Description`);
        sections.push(contract.shortDescription);
        sections.push("");
      }

      if (contract.description) {
        sections.push(`## Detailed History`);
        sections.push(contract.description);
        sections.push("");
      }

      if (contract.historicalSignificance) {
        sections.push(`## Historical Significance`);
        sections.push(contract.historicalSignificance);
        sections.push("");
      }

      sections.push(`## Technical Details`);
      sections.push(`- Contract Type: ${contract.heuristics?.contractType || "Unknown"}`);
      sections.push(`- Confidence: ${contract.heuristics?.confidence || "N/A"}`);
      sections.push(`- Code Size: ${contract.codeSizeBytes || "N/A"} bytes`);
      sections.push(`- Is Proxy: ${contract.heuristics?.isProxy ? "Yes" : "No"}`);
      sections.push(`- Has SELFDESTRUCT: ${contract.heuristics?.hasSelfDestruct ? "Yes" : "No"}`);
      sections.push(`- ERC-20 Like: ${contract.heuristics?.isErc20Like ? "Yes" : "No"}`);
      sections.push(`- Etherscan Verified: ${contract.etherscanVerified ? "Yes" : "No"}`);
      sections.push("");

      if (links.length > 0) {
        sections.push(`## Historical Links`);
        links.forEach((l) => {
          sections.push(`- [${l.title || l.url}](${l.url})${l.note ? ` — ${l.note}` : ""}`);
        });
        sections.push("");
      }

      sections.push(`**View on Ethereum History:** https://www.ethereumhistory.com/contract/${contract.address}`);

      return {
        content: [
          {
            type: "text" as const,
            text: sections.filter(Boolean).join("\n"),
          },
        ],
      };
    }
  );

  // Tool: Search contracts
  server.tool(
    "search_contracts",
    "Search across all historical Ethereum contracts. Searches contract names, token names/symbols, decompiled code, verified source code, and ABI. Returns matching contracts with addresses and descriptions.",
    {
      query: z
        .string()
        .min(1)
        .describe("Search query (e.g., 'ERC20', 'TheDAO', 'multisig', 'transfer')"),
      page: z
        .number()
        .int()
        .min(1)
        .default(1)
        .optional()
        .describe("Page number (20 results per page)"),
    },
    async ({ query, page = 1 }) => {
      const results = await searchUnifiedContracts(query, page);

      if (!results || results.results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No contracts found matching "${query}". Try different keywords or check address format.`,
            },
          ],
        };
      }

      const count = results.results.length;
      const lines = [
        `# Search Results for "${query}"`,
        `Found ${count} result${count !== 1 ? "s" : ""} on page ${page}${results.hasMore ? " (more available)" : ""}`,
        "",
      ];

      results.results.forEach((r, i) => {
        const idx = (page - 1) * 20 + i + 1;
        lines.push(`## ${idx}. ${r.title || formatAddress(r.address, 12)}`);
        lines.push(`**Address:** ${r.address}`);
        if (r.subtitle) lines.push(`**Description:** ${r.subtitle}`);
        if (r.eraId) lines.push(`**Era:** ${r.eraId}`);
        if (r.deploymentTimestamp) lines.push(`**Deployed:** ${r.deploymentTimestamp.split("T")[0]}`);
        if (r.matchType) lines.push(`**Match:** ${r.matchType}`);
        lines.push(`**Link:** https://www.ethereumhistory.com/contract/${r.address}`);
        lines.push("");
      });

      if (results.hasMore) {
        lines.push(`_More results available. Use page=${page + 1} to see the next page._`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  // Tool: Browse contracts with filters
  server.tool(
    "browse_contracts",
    "Browse documented historical Ethereum contracts with filters. Filter by era (frontier, homestead, dao-fork, etc.), contract type (token, multisig, crowdsale, dao, etc.), or deployment year (2015-2017).",
    {
      era: z
        .enum(["frontier", "homestead", "dao-fork", "tangerine-whistle", "spurious-dragon"])
        .optional()
        .describe("Filter by Ethereum era"),
      type: z
        .enum(["token", "multisig", "crowdsale", "exchange", "wallet", "registry", "dao", "game", "unknown"])
        .optional()
        .describe("Filter by contract type"),
      year: z
        .number()
        .int()
        .min(2015)
        .max(2017)
        .optional()
        .describe("Filter by deployment year"),
      page: z.number().int().min(1).default(1).optional().describe("Page number"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .optional()
        .describe("Results per page (max 50)"),
    },
    async ({ era, type, year, page = 1, limit = 20 }) => {
      if (!isDatabaseConfigured()) {
        return {
          content: [{ type: "text" as const, text: "Database not available." }],
          isError: true,
        };
      }

      const offset = (page - 1) * limit;
      const filterParams = {
        eraId: era || null,
        contractType: type || null,
        codeQuery: null,
        year: year || null,
        limit,
        offset,
      };

      const [contracts, total] = await Promise.all([
        getDocumentedContractsFromDb(filterParams),
        getDocumentedContractsCountFromDb(filterParams),
      ]);

      const totalPages = Math.ceil(total / limit);
      const filterDesc = [
        era ? `era=${era}` : "",
        type ? `type=${type}` : "",
        year ? `year=${year}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const lines = [
        `# Documented Contracts${filterDesc ? ` (${filterDesc})` : ""}`,
        `Showing ${contracts.length} of ${total} contracts (page ${page}/${totalPages})`,
        "",
      ];

      contracts.forEach((c) => {
        const name = c.etherscanContractName || c.tokenName || formatAddress(c.address, 12);
        lines.push(`- **${name}** (${c.address})`);
        if (c.shortDescription) lines.push(`  ${c.shortDescription}`);
        const tags = [c.eraId, c.heuristics?.contractType, c.deploymentTimestamp?.split("T")[0]]
          .filter(Boolean)
          .join(" · ");
        if (tags) lines.push(`  _${tags}_`);
      });

      if (page < totalPages) {
        lines.push("", `_Use page=${page + 1} to see more results._`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  // Tool: Get contract of the day
  server.tool(
    "get_contract_of_the_day",
    "Get today's featured historical Ethereum contract. A deterministic daily rotation through all documented contracts — same contract for everyone on the same day.",
    {},
    async () => {
      if (!isDatabaseConfigured()) {
        return {
          content: [{ type: "text" as const, text: "Database not available." }],
          isError: true,
        };
      }

      try {
        const db = getDb();
        const documented = await db
          .select({
            address: schema.contracts.address,
            etherscanContractName: schema.contracts.etherscanContractName,
            tokenName: schema.contracts.tokenName,
            shortDescription: schema.contracts.shortDescription,
            eraId: schema.contracts.eraId,
            deploymentTimestamp: schema.contracts.deploymentTimestamp,
            historicalSignificance: schema.contracts.historicalSignificance,
          })
          .from(schema.contracts)
          .where(and(isNotNull(schema.contracts.shortDescription), ne(schema.contracts.shortDescription, "")))
          .orderBy(asc(schema.contracts.deploymentTimestamp));

        if (documented.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No documented contracts available yet." }],
          };
        }

        const today = new Date();
        const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
        const index = daysSinceEpoch % documented.length;
        const c = documented[index];
        const name = c.tokenName || c.etherscanContractName || formatAddress(c.address, 12);

        const lines = [
          `# Contract of the Day: ${name}`,
          `**Address:** ${c.address}`,
          `**Era:** ${c.eraId || "Unknown"}`,
          `**Deployed:** ${c.deploymentTimestamp?.toISOString().split("T")[0] || "Unknown"}`,
          "",
          c.shortDescription || "",
          "",
          c.historicalSignificance ? `**Significance:** ${c.historicalSignificance}` : "",
          "",
          `**View:** https://www.ethereumhistory.com/contract/${c.address}`,
          "",
          `_${documented.length} documented contracts in rotation. New contract every day._`,
        ];

        return {
          content: [{ type: "text" as const, text: lines.filter(Boolean).join("\n") }],
        };
      } catch {
        return {
          content: [{ type: "text" as const, text: "Failed to fetch contract of the day." }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get documentation progress
  server.tool(
    "get_documentation_progress",
    "Get statistics about Ethereum History's documentation progress: total vs. documented contracts, breakdown by era and year, community stats (historian count, total edits).",
    {},
    async () => {
      if (!isDatabaseConfigured()) {
        return {
          content: [{ type: "text" as const, text: "Database not available." }],
          isError: true,
        };
      }

      try {
        const db = getDb();
        const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;

        const [totalResult, documentedResult, historianResult, editsResult] =
          await Promise.all([
            db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contracts),
            db
              .select({ count: sql<number>`COUNT(*)::int` })
              .from(schema.contracts)
              .where(and(isNotNull(schema.contracts.shortDescription), ne(schema.contracts.shortDescription, ""))),
            db
              .select({ count: sql<number>`COUNT(*)::int` })
              .from(schema.historians)
              .where(eq(schema.historians.active, true)),
            db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contractEdits),
          ]);

        const total = totalResult[0]?.count ?? 0;
        const documented = documentedResult[0]?.count ?? 0;
        const historians = historianResult[0]?.count ?? 0;
        const edits = editsResult[0]?.count ?? 0;
        const pct = total > 0 ? Math.round((documented / total) * 100) : 0;

        const topEditors = await getTopEditorsFromDb(5);

        const lines = [
          `# Ethereum History Documentation Progress`,
          "",
          `## Overall`,
          `- **${documented}** of **${total}** contracts documented (**${pct}%**)`,
          `- **${historians}** active historians`,
          `- **${edits}** total edits`,
          "",
          `## Top Contributors`,
          ...topEditors.map(
            (e, i) =>
              `${i + 1}. **${e.name}** — ${e.editCount} edits, ${e.newPagesCount} new pages`
          ),
          "",
          `**Help document more:** https://www.ethereumhistory.com/browse?undocumented=1`,
          `**Become a historian:** https://www.ethereumhistory.com/api/auth/github`,
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch {
        return {
          content: [
            { type: "text" as const, text: "Failed to fetch documentation progress." },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
