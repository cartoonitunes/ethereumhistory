/**
 * MCP Server Endpoint — Streamable HTTP Transport
 *
 * POST /mcp — handles JSON-RPC messages (tool calls, initialize, etc.)
 * GET  /mcp — SSE stream for server-to-client notifications
 * DELETE /mcp — close session
 *
 * This implements the Model Context Protocol (MCP) so AI agents like
 * Claude, ChatGPT, Cursor, etc. can natively call Ethereum History tools.
 *
 * Stateless mode (serverless-compatible): each request creates a fresh
 * transport + server pair. This works on Vercel/serverless because MCP
 * tools are simple request-response — no persistent sessions needed.
 */

import { NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp-server";

export const dynamic = "force-dynamic";

async function handleMcpRequest(req: Request): Promise<Response> {
  // Create a stateless transport (no session — serverless compatible)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
    enableJsonResponse: true, // Return JSON responses instead of SSE for simple req/res
  });

  // Create the MCP server with all our tools
  const server = createMcpServer();

  // Connect the server to the transport
  await server.connect(transport);

  // Handle the request through the transport
  const response = await transport.handleRequest(req);

  return response;
}

export async function POST(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
}

export async function GET(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
}

export async function DELETE(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
}
