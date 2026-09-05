/**
 * Cache headers for authenticated responses.
 *
 * WHY THIS EXISTS
 * ---------------
 * `export const dynamic = "force-dynamic"` controls how Next renders a route.
 * It does not control what the response tells caches to do, and the platform
 * default for these routes turned out to be:
 *
 *     cache-control: public, max-age=0, must-revalidate
 *     vary: rsc, next-router-state-tree, ...        (no Cookie)
 *
 * For a per-user response that is wrong twice over. `public` invites shared
 * caches to store it, and a Vary list without `Cookie` means the stored copy is
 * keyed without any notion of whose data it is. Two symptoms follow:
 *
 *   1. A signed-in user is served a stale body. On /api/historian/me that reads
 *      as being logged out; on /api/wallets it reads as a scan that "did not
 *      save", because the refetch after scanning returns the pre-scan list.
 *   2. One user's response is eligible to be served to another.
 *
 * Both show up on mobile first, because carrier and CDN intermediaries sit in
 * far more mobile network paths than desktop ones.
 *
 * Anything that reads or writes per-user state, or hands out a one-time value
 * such as a signing nonce, should send these.
 */
export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Vary: "Cookie",
} as const;
