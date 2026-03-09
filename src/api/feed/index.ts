// src/api/feed/index.ts
// Feed source registry — maps FeedSourceId to adapter instances.
// Adding a new source means: create the adapter file, import it here, add to SOURCES.
//
// Includes an in-memory cache with TTL to avoid upstream rate-limiting
// (Reddit blocks VPS IPs after too many requests). Cache is keyed on
// source + target + after + limit, so different pages/subreddits are
// cached independently. Default TTL: 5 minutes.

import { redditSource } from "./reddit";
import { rssSource } from "./rss";
import type {
  FeedSourceId,
  FeedSource,
  FeedParams,
  FeedResponse,
} from "./types";

export type { FeedSourceId, FeedSource, FeedParams, FeedResponse };
export type { FeedPost, FeedImage } from "./types";
export { REDDIT_PRESETS } from "./reddit";

// =============================================================================
// Registry
// =============================================================================

const SOURCES: Record<FeedSourceId, FeedSource> = {
  reddit: redditSource,
  rss: rssSource,
};

export const feedSourceIds = Object.keys(SOURCES) as FeedSourceId[];

export const getFeedSource = (id: string): FeedSource | null =>
  SOURCES[id as FeedSourceId] ?? null;

// =============================================================================
// Cache
// =============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 200; // cap to avoid unbounded memory growth

interface CacheEntry {
  response: FeedResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Build a deterministic cache key from request params */
const cacheKey = (params: FeedParams & { source: FeedSourceId }): string =>
  `${params.source}:${params.target}:${params.after ?? ""}:${params.limit}`;

/** Evict expired entries. Called lazily before inserts. */
const evictExpired = (): void => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
};

/** Evict oldest entries if cache exceeds max size */
const evictOldest = (): void => {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  // Map iterates in insertion order — delete the first (oldest) entries
  const excess = cache.size - CACHE_MAX_ENTRIES;
  let deleted = 0;
  for (const key of cache.keys()) {
    if (deleted >= excess) break;
    cache.delete(key);
    deleted++;
  }
};

// =============================================================================
// Fetch — main entry point used by the API router
// =============================================================================

export const fetchFeed = async (
  params: FeedParams & { source: FeedSourceId },
): Promise<FeedResponse> => {
  const source = getFeedSource(params.source);
  if (!source) throw new Error(`Unknown feed source: "${params.source}"`);

  const key = cacheKey(params);
  const now = Date.now();

  // Check cache
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.response;
  }

  // Fetch from upstream
  const response = await source.fetch(params);

  // Store in cache
  evictExpired();
  cache.set(key, { response, expiresAt: now + CACHE_TTL_MS });
  evictOldest();

  return response;
};
