// src/api/feed/types.ts
// Shared types for the feed API.
// FeedPost is the normalised shape all sources must produce.
// FeedSource is the interface every adapter must implement.

// =============================================================================
// Normalised post — source-agnostic shape consumed by the example
// =============================================================================

export interface FeedImage {
  url: string
  alt: string
  /** Aspect hint for the renderer — drives placeholder height fallback */
  aspect: 'wide' | 'tall' | 'square'
}

export interface FeedPost {
  /** Unique stable ID within the source (string to accommodate Reddit t3_, etc.) */
  id: string
  /** Display name of the author */
  user: string
  /** Two-letter initials for the avatar fallback */
  initials: string
  /** Hex colour for the avatar background */
  color: string
  /** Plain-text body — HTML stripped, markdown left as-is */
  text: string
  /** Optional post title (Reddit has one, Twitter/Mastodon don't) */
  title: string | null
  hasImage: boolean
  image: FeedImage | null
  /** Up to 3 tags / flair labels */
  tags: string[]
  /** Human-readable relative time string, e.g. "3h ago", "2d ago" */
  time: string
  /** Upvotes / likes / favourites */
  likes: number
  /** Comment / reply count */
  comments: number
  /** Source identifier — lets the renderer optionally badge the post */
  source: FeedSourceId
  /** Original post URL for "open" actions */
  url: string | null
}

// =============================================================================
// Source registry
// =============================================================================

export type FeedSourceId = 'reddit' | 'rss'

// =============================================================================
// Fetch params — union of all possible query params
// =============================================================================

export interface FeedParams {
  /** Maximum number of posts to return */
  limit: number
  /**
   * Reddit: subreddit name (without r/ prefix), e.g. "music"
   * RSS:    feed URL, e.g. "https://feeds.bbci.co.uk/news/rss.xml"
   */
  target: string
  /**
   * Reddit: `after` cursor from a previous response (t3_xxxx)
   * RSS:    not used (feeds don't paginate via cursor)
   */
  after?: string
  /** Simulated latency in ms (0 = none) */
  delay?: number
}

// =============================================================================
// Response envelope
// =============================================================================

export interface FeedResponse {
  posts: FeedPost[]
  /** Cursor to pass as `after` for the next page (null = no more pages) */
  nextCursor: string | null
  /** Total available (estimated) — null when unknown */
  total: number | null
  source: FeedSourceId
  /** The subreddit / feed URL that was queried */
  target: string
}

// =============================================================================
// Adapter interface
// =============================================================================

export interface FeedSource {
  readonly id: FeedSourceId
  fetch(params: FeedParams): Promise<FeedResponse>
}
