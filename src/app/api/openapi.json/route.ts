/**
 * OpenAPI Specification Endpoint
 *
 * GET /api/openapi.json
 * Returns the OpenAPI 3.1 specification for the Ethereum History public API.
 * This enables AI agents, tooling, and developers to discover and consume
 * the API programmatically.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-static";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Ethereum History API",
    version: "1.0.0",
    description:
      "A historical archive and analysis API for early Ethereum smart contracts (2015–2017). " +
      "Provides contract metadata, bytecode analysis, similarity search, documentation progress, " +
      "and community-contributed historical context.",
    contact: {
      name: "Ethereum History",
      url: "https://www.ethereumhistory.com",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "https://www.ethereumhistory.com",
      description: "Production",
    },
  ],
  paths: {
    "/api/contract/{address}": {
      get: {
        operationId: "getContract",
        summary: "Get contract details",
        description:
          "Returns full contract page data including metadata, bytecode analysis, " +
          "similar contracts, detected patterns, and function signatures.",
        tags: ["Contracts"],
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            description: "Ethereum contract address (checksummed or lowercase)",
          },
        ],
        responses: {
          "200": {
            description: "Contract data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContractResponse" },
              },
            },
          },
          "400": { description: "Invalid address format" },
          "404": { description: "Contract not found" },
        },
      },
    },
    "/api/contract/{address}/edits": {
      get: {
        operationId: "getContractEdits",
        summary: "Get contract edit history",
        description:
          "Returns the edit history for a contract, showing which historians made changes and when.",
        tags: ["Contracts"],
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            description: "Ethereum contract address",
          },
        ],
        responses: {
          "200": {
            description: "Edit history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/EditEntry" },
                    },
                    error: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/browse": {
      get: {
        operationId: "browseContracts",
        summary: "Browse documented contracts",
        description:
          "Returns paginated, filterable lists of documented (or undocumented) contracts. " +
          "Supports filtering by era, contract type, code search, and year.",
        tags: ["Browse"],
        parameters: [
          {
            name: "era",
            in: "query",
            schema: {
              type: "string",
              enum: ["olympic", "frontier", "homestead", "dao-fork", "tangerine-whistle", "spurious-dragon"],
            },
            description: "Filter by Ethereum era",
          },
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["token", "multisig", "crowdsale", "exchange", "wallet", "registry", "dao", "game", "unknown"],
            },
            description: "Filter by contract type",
          },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Search in decompiled/source code",
          },
          {
            name: "year",
            in: "query",
            schema: { type: "integer", minimum: 2015, maximum: 2017 },
            description: "Filter by deployment year",
          },
          {
            name: "undocumented",
            in: "query",
            schema: { type: "string", enum: ["0", "1"] },
            description: "Set to 1 to return undocumented contracts instead",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 24 },
            description: "Results per page",
          },
        ],
        responses: {
          "200": {
            description: "Paginated contract list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BrowseResponse" },
              },
            },
          },
        },
      },
    },
    "/api/search/unified": {
      get: {
        operationId: "searchContracts",
        summary: "Search across all contracts",
        description:
          "Unified search across decompiled code, verified source, ABI, contract name, " +
          "token name/symbol, and address. Rate limited to 60 requests/minute.",
        tags: ["Search"],
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1 },
            description: "Search query",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number (20 results per page)",
          },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchResponse" },
              },
            },
          },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/api/search/bytecode": {
      get: {
        operationId: "searchBytecode",
        summary: "Search by bytecode similarity",
        description:
          "Find contracts with similar bytecode using Jaccard similarity, n-gram analysis, and cosine similarity.",
        tags: ["Search"],
        parameters: [
          {
            name: "address",
            in: "query",
            required: true,
            schema: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            description: "Reference contract address to find similar bytecode",
          },
        ],
        responses: {
          "200": { description: "Similar contracts by bytecode" },
        },
      },
    },
    "/api/featured": {
      get: {
        operationId: "getFeatured",
        summary: "Get featured contracts",
        description:
          "Returns featured historical contracts, recent edits, and era data for the homepage. Cached for 5 minutes.",
        tags: ["Featured"],
        responses: {
          "200": {
            description: "Featured content",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FeaturedResponse" },
              },
            },
          },
        },
      },
    },
    "/api/contract-of-the-day": {
      get: {
        operationId: "getContractOfTheDay",
        summary: "Get today's featured contract",
        description:
          "Returns a deterministic 'contract of the day' based on the current date. " +
          "Same contract for everyone on the same day. Rotates daily.",
        tags: ["Featured"],
        responses: {
          "200": {
            description: "Contract of the day",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContractOfTheDayResponse" },
              },
            },
          },
        },
      },
    },
    "/api/activity": {
      get: {
        operationId: "getActivity",
        summary: "Get recent edit activity",
        description: "Returns the most recent contract edits across the platform.",
        tags: ["Community"],
        responses: {
          "200": { description: "Recent activity feed" },
        },
      },
    },
    "/api/stats/progress": {
      get: {
        operationId: "getProgress",
        summary: "Get documentation progress",
        description:
          "Returns total and documented contract counts overall, per era, and per year. " +
          "Also returns community stats (historian count, total edits).",
        tags: ["Stats"],
        responses: {
          "200": {
            description: "Documentation progress statistics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProgressResponse" },
              },
            },
          },
        },
      },
    },
    "/api/editors/top": {
      get: {
        operationId: "getTopEditors",
        summary: "Get top contributing historians",
        description: "Returns the most active historians ranked by number of contract edits.",
        tags: ["Community"],
        responses: {
          "200": { description: "Top editors leaderboard" },
        },
      },
    },
    "/api/this-week": {
      get: {
        operationId: "getThisWeek",
        summary: "Get this week in Ethereum history",
        description:
          "Returns contracts deployed during this calendar week in Ethereum's early years (2015–2017).",
        tags: ["Featured"],
        responses: {
          "200": { description: "This week in history" },
        },
      },
    },
    "/api/people": {
      get: {
        operationId: "listPeople",
        summary: "List all people",
        description: "Returns all people associated with early Ethereum contracts.",
        tags: ["People"],
        responses: {
          "200": { description: "List of people" },
        },
      },
    },
    "/api/people/{slug}": {
      get: {
        operationId: "getPerson",
        summary: "Get person details",
        description: "Returns details about a person and their associated contracts.",
        tags: ["People"],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Person slug (URL-friendly name)",
          },
        ],
        responses: {
          "200": { description: "Person details" },
          "404": { description: "Person not found" },
        },
      },
    },
    "/api/suggestions": {
      post: {
        operationId: "submitSuggestion",
        summary: "Submit an edit suggestion",
        description:
          "Allows anyone to suggest edits to contract documentation. " +
          "Suggestions are reviewed by historians before being applied.",
        tags: ["Community"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["contractAddress", "field", "suggestedValue"],
                properties: {
                  contractAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
                  field: { type: "string" },
                  suggestedValue: { type: "string" },
                  reason: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Suggestion submitted" },
          "400": { description: "Invalid input" },
        },
      },
    },
    "/api/browse/types": {
      get: {
        operationId: "getContractTypes",
        summary: "Get contract type counts",
        description: "Returns counts of contracts grouped by heuristic type classification.",
        tags: ["Browse"],
        responses: {
          "200": { description: "Contract type counts" },
        },
      },
    },
    // Agent-friendly routes
    "/api/agent/contracts": {
      get: {
        operationId: "agentListContracts",
        summary: "Agent-friendly contract listing",
        description:
          "Returns contracts in a format optimized for AI agent consumption. " +
          "Part of the machine-readable API surface.",
        tags: ["Agent"],
        responses: {
          "200": { description: "Agent-friendly contract list" },
        },
      },
    },
    "/api/agent/contracts/{address}": {
      get: {
        operationId: "agentGetContract",
        summary: "Agent-friendly contract details",
        description:
          "Returns detailed contract information optimized for AI agent consumption.",
        tags: ["Agent"],
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            description: "Ethereum contract address",
          },
        ],
        responses: {
          "200": { description: "Agent-friendly contract details" },
          "404": { description: "Contract not found" },
        },
      },
    },
    "/api/agent/manifest": {
      get: {
        operationId: "agentManifest",
        summary: "Agent manifest",
        description:
          "Returns the agent manifest describing available capabilities for AI integrations.",
        tags: ["Agent"],
        responses: {
          "200": { description: "Agent manifest" },
        },
      },
    },
  },
  components: {
    schemas: {
      ContractResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            nullable: true,
            properties: {
              contract: {
                type: "object",
                properties: {
                  address: { type: "string" },
                  etherscanContractName: { type: "string", nullable: true },
                  tokenName: { type: "string", nullable: true },
                  tokenSymbol: { type: "string", nullable: true },
                  shortDescription: { type: "string", nullable: true },
                  description: { type: "string", nullable: true },
                  eraId: { type: "string", nullable: true },
                  deploymentTimestamp: { type: "string", nullable: true },
                  historicalSignificance: { type: "string", nullable: true },
                  deployerAddress: { type: "string", nullable: true },
                },
              },
              similarContracts: {
                type: "array",
                items: { type: "object" },
              },
              patterns: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
          error: { type: "string", nullable: true },
        },
      },
      EditEntry: {
        type: "object",
        properties: {
          historianName: { type: "string" },
          historianAvatarUrl: { type: "string", nullable: true },
          fieldsChanged: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          editedAt: { type: "string", format: "date-time" },
        },
      },
      BrowseResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              contracts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    address: { type: "string" },
                    name: { type: "string" },
                    shortDescription: { type: "string", nullable: true },
                    eraId: { type: "string", nullable: true },
                    deploymentDate: { type: "string", nullable: true },
                    contractType: { type: "string", nullable: true },
                    tokenName: { type: "string", nullable: true },
                    tokenSymbol: { type: "string", nullable: true },
                  },
                },
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
          meta: {
            type: "object",
            properties: {
              timestamp: { type: "string", format: "date-time" },
              cached: { type: "boolean" },
            },
          },
        },
      },
      SearchResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            nullable: true,
            properties: {
              results: {
                type: "array",
                items: { type: "object" },
              },
              hasMore: { type: "boolean" },
              total: { type: "integer" },
            },
          },
          error: { type: "string", nullable: true },
        },
      },
      FeaturedResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            nullable: true,
            properties: {
              featuredContracts: {
                type: "array",
                items: { type: "object" },
              },
              recentContracts: {
                type: "array",
                items: { type: "object" },
              },
              eras: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
          error: { type: "string", nullable: true },
        },
      },
      ContractOfTheDayResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            nullable: true,
            properties: {
              address: { type: "string" },
              name: { type: "string" },
              shortDescription: { type: "string", nullable: true },
              description: { type: "string", nullable: true },
              eraId: { type: "string", nullable: true },
              deploymentDate: { type: "string", nullable: true },
              historicalSignificance: { type: "string", nullable: true },
              totalDocumented: { type: "integer" },
            },
          },
          error: { type: "string", nullable: true },
        },
      },
      ProgressResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            nullable: true,
            properties: {
              overall: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  documented: { type: "integer" },
                  percentage: { type: "number" },
                },
              },
              byEra: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    eraId: { type: "string" },
                    total: { type: "integer" },
                    documented: { type: "integer" },
                  },
                },
              },
              byYear: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    year: { type: "integer" },
                    total: { type: "integer" },
                    documented: { type: "integer" },
                  },
                },
              },
              community: {
                type: "object",
                properties: {
                  historianCount: { type: "integer" },
                  totalEdits: { type: "integer" },
                },
              },
            },
          },
          error: { type: "string", nullable: true },
        },
      },
    },
  },
  tags: [
    { name: "Contracts", description: "Contract data and metadata" },
    { name: "Browse", description: "Paginated browsing with filters" },
    { name: "Search", description: "Full-text and bytecode search" },
    { name: "Featured", description: "Curated and highlighted content" },
    { name: "People", description: "People associated with early Ethereum" },
    { name: "Community", description: "Edit suggestions, activity, and leaderboards" },
    { name: "Stats", description: "Documentation progress and metrics" },
    { name: "Agent", description: "AI agent-optimized endpoints" },
  ],
};

export function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
