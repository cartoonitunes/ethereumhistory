/**
 * In-memory cache with TTL for serverless environments.
 *
 * This is a simple Map-based cache that lives for the lifetime of the
 * serverless function instance. In Vercel, function instances can be
 * reused across requests, so this provides meaningful caching without
 * any external services (no Redis, no cost).
 *
 * For hot data like eras, featured contracts, and stats, this eliminates
 * redundant DB queries within the same function invocation window.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get a value from cache, or compute and store it if missing/expired.
 *
 * @param key - Cache key
 * @param ttlMs - Time-to-live in milliseconds
 * @param compute - Async function to compute the value on cache miss
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await compute();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  store.clear();
}

// Common TTL constants
export const CACHE_TTL = {
  /** 1 minute — for frequently changing data */
  SHORT: 60 * 1000,
  /** 5 minutes — for moderately changing data */
  MEDIUM: 5 * 60 * 1000,
  /** 1 hour — for slow-changing data (eras, stats) */
  LONG: 60 * 60 * 1000,
  /** 24 hours — for essentially static data */
  DAY: 24 * 60 * 60 * 1000,
} as const;
