/**
 * Upstream JSON-RPC failures that are the provider's fault, not ours.
 *
 * Rate limits, 5xx responses and timeouts are transient: the contract is fine,
 * we just couldn't reach the chain right now. Callers use this to serve partial
 * data (or a 503 with Retry-After) instead of surfacing a 500.
 */
export class RpcUnavailableError extends Error {
  readonly status: number | null;
  readonly retryAfterSeconds: number;

  constructor(
    message: string,
    opts?: { status?: number | null; retryAfterSeconds?: number; cause?: unknown }
  ) {
    super(message, { cause: opts?.cause });
    this.name = "RpcUnavailableError";
    this.status = opts?.status ?? null;
    this.retryAfterSeconds = opts?.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
  }
}

export const DEFAULT_RETRY_AFTER_SECONDS = 30;

export function isRpcUnavailable(error: unknown): error is RpcUnavailableError {
  return error instanceof RpcUnavailableError;
}

/** `Retry-After` is either delta-seconds or an HTTP-date; accept both, clamp the result. */
export function parseRetryAfterHeader(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return clampRetryAfter(seconds);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return clampRetryAfter(Math.ceil((date - Date.now()) / 1000));
}

export function clampRetryAfter(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_RETRY_AFTER_SECONDS;
  return Math.min(300, Math.max(1, Math.ceil(seconds)));
}

/**
 * JSON-RPC providers disagree on how they report throttling. Alchemy and Infura
 * use HTTP 429, but several return a 200 with an error object instead — code
 * -32005 ("limit exceeded") or a message that says so in prose.
 */
const RATE_LIMIT_CODES = new Set([-32005, -32097, 429]);
const RATE_LIMIT_PATTERNS =
  /rate limit|ratelimit|too many requests|limit exceeded|exceeded .*(quota|capacity|compute units)|throughput|throttl/i;

export function isRateLimitRpcError(err: { code?: number; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code != null && RATE_LIMIT_CODES.has(err.code)) return true;
  return err.message != null && RATE_LIMIT_PATTERNS.test(err.message);
}
