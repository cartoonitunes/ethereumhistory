/**
 * In-memory rate limiting for API routes.
 *
 * Uses a sliding window counter stored in memory. No external
 * dependencies — works on Vercel free tier. The tradeoff is that
 * rate limits are per-function-instance, not globally distributed,
 * but this still prevents abuse from individual clients.
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of limitStore.entries()) {
    if (entry.resetAt < now) {
      limitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
};

/**
 * Check rate limit for a request.
 * Returns { allowed, remaining, resetAt }.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const entry = limitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    limitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowSeconds * 1000,
    };
  }

  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed: entry.count <= config.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Get a rate limit identifier from a request.
 * Uses IP address (via x-forwarded-for) or falls back to a generic key.
 */
function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware for API route handlers.
 *
 * Usage:
 *   export const GET = withRateLimit(async (req) => {
 *     return NextResponse.json({ data: ... });
 *   });
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: RateLimitConfig = DEFAULT_CONFIG
) {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    const identifier = getIdentifier(request);
    const { allowed, remaining, resetAt } = checkRateLimit(identifier, config);

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(resetAt / 1000).toString(),
            "Retry-After": retryAfter.toString(),
          },
        }
      );
    }

    const response = await handler(request, context);

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set(
      "X-RateLimit-Reset",
      Math.ceil(resetAt / 1000).toString()
    );

    return response;
  };
}
