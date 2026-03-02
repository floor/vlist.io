// src/api/feed/index.ts
// Feed source registry — maps FeedSourceId to adapter instances.
// Adding a new source means: create the adapter file, import it here, add to SOURCES.

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
// Fetch — main entry point used by the API router
// =============================================================================

export const fetchFeed = (
  params: FeedParams & { source: FeedSourceId },
): Promise<FeedResponse> => {
  const source = getFeedSource(params.source);
  if (!source) throw new Error(`Unknown feed source: "${params.source}"`);
  return source.fetch(params);
};
