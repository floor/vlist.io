// src/server/cache.ts
// Centralized Cache-Control headers for origin and Cloudflare edge caching.
//
// Cloudflare respects `s-maxage` for edge TTL independently of `max-age`
// (browser TTL). This lets us cache aggressively at the edge while keeping
// browsers revalidating on every navigation — so a cache purge on deploy
// instantly serves fresh content.
//
// Header semantics:
//   s-maxage=N   → Cloudflare edge caches for N seconds
//   max-age=0    → browser always revalidates with the edge (or origin)
//   public       → response is cacheable by shared caches (CDN)
//   immutable    → content never changes (hashed filenames, fonts)
//   stale-while-revalidate → serve stale while fetching fresh in background

// =============================================================================
// Cache-Control values
// =============================================================================

/**
 * Immutable assets — build output with content hashes, fonts, favicon.
 * Browser and edge both cache for 1 year. Never revalidated.
 */
export const CACHE_IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Static assets without content hashes — CSS in /styles/, benchmark dist, etc.
 * These only change on deploy, but filenames don't include hashes so we can't
 * use `immutable`. Browser caches for 7 days; edge caches for 7 days.
 * On deploy, Cloudflare cache is purged so edge serves fresh immediately.
 * The 7-day browser TTL is a tradeoff: repeat visitors get fast loads,
 * and content updates propagate within a week at worst.
 */
export const CACHE_STATIC = "public, max-age=604800, s-maxage=604800";

/**
 * Server-rendered HTML pages (docs, tutorials, examples, benchmarks, homepage).
 * Edge caches for 1 hour; browser always revalidates.
 * On deploy, we purge the Cloudflare cache so users get fresh content immediately.
 * Between deploys, the edge serves cached responses globally — no origin hit.
 */
export const CACHE_PAGE =
  "public, s-maxage=3600, max-age=0, stale-while-revalidate=60";

/**
 * Sitemap and robots.txt — changes only on deploy.
 * Edge caches for 1 hour; browser caches for 1 hour.
 */
export const CACHE_META = "public, s-maxage=3600, max-age=3600";

/**
 * API JSON responses — deterministic data that doesn't change at runtime,
 * but we keep edge TTL short to avoid stale data if endpoints evolve.
 * Edge caches for 5 minutes; browser does not cache.
 */
export const CACHE_API = "public, s-maxage=300, max-age=0";

/**
 * API docs HTML page — static file read at startup.
 * Same policy as server-rendered pages.
 */
export const CACHE_API_DOCS = CACHE_PAGE;

/**
 * Development / no-cache — browser revalidates every time, edge does not cache.
 * Used for raw source files, CSS in dev, etc.
 */
export const CACHE_NOCACHE = "no-cache";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a standard header object for server-rendered HTML pages.
 * Shorthand used by all renderers to avoid repeating the same two headers.
 */
export function htmlHeaders(): HeadersInit {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": CACHE_PAGE,
  };
}

/**
 * Build a standard header object for JSON API responses with CORS.
 */
export function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": CACHE_API,
  };
}
