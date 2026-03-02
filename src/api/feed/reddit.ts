// src/api/feed/reddit.ts
// Reddit feed adapter.
// Fetches posts from any public subreddit via the JSON API (no auth required)
// and normalises them into the shared FeedPost shape.
//
// Reddit API used:
//   GET https://www.reddit.com/r/{subreddit}/{sort}.json?limit=N&after=cursor
//
// No OAuth — public read-only endpoint. Requires a descriptive User-Agent.

import type { FeedSource, FeedParams, FeedResponse, FeedPost, FeedImage } from './types.ts'

// =============================================================================
// Constants
// =============================================================================

const BASE_URL = 'https://www.reddit.com'
const USER_AGENT = 'vlist.dev/1.0 (https://vlist.dev; demo feed reader)'
const DEFAULT_SORT = 'hot'
const MAX_LIMIT = 100

// Curated list of subreddits available in the UI picker
export const REDDIT_PRESETS = [
  { label: 'r/worldnews',        value: 'worldnews' },
  { label: 'r/technology',       value: 'technology' },
  { label: 'r/science',          value: 'science' },
  { label: 'r/music',            value: 'music' },
  { label: 'r/movies',           value: 'movies' },
  { label: 'r/dataisbeautiful',  value: 'dataisbeautiful' },
  { label: 'r/todayilearned',    value: 'todayilearned' },
  { label: 'r/space',            value: 'space' },
  { label: 'r/explainlikeimfive', value: 'explainlikeimfive' },
  { label: 'r/AskScience',       value: 'AskScience' },
] as const

// =============================================================================
// Avatar colour — deterministic from author name
// =============================================================================

// Palette chosen to match the existing vlist.dev design tokens
const AVATAR_COLORS = [
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab',
  '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047',
  '#7cb342', '#fb8c00', '#f4511e', '#6d4c41', '#546e7a',
  '#26a69a', '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0',
]

/**
 * Deterministic colour from an arbitrary string (author name, id…).
 * Uses a simple djb2-style hash — fast, no deps, good distribution.
 */
const colorFromString = (str: string): string => {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
    h = h >>> 0 // keep unsigned 32-bit
  }
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// =============================================================================
// Initials — first letter of each word, up to 2
// =============================================================================

const toInitials = (name: string): string => {
  const parts = name.trim().split(/[\s_\-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// =============================================================================
// Relative time
// =============================================================================

const relativeTime = (utcSeconds: number): string => {
  const diffMs = Date.now() - utcSeconds * 1000
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30)  return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffMonths / 12)}y ago`
}

// =============================================================================
// Image extraction
// =============================================================================

/**
 * Try to extract a preview image from a Reddit post.
 * Reddit serves resized previews at reddit.com/preview/pre/* — we pick a
 * resolution close to 600 px wide so it's not too heavy but still sharp.
 */
const extractImage = (data: RedditPostData): FeedImage | null => {
  // reddit.com hosted image previews
  const previews = data.preview?.images
  if (previews && previews.length > 0) {
    const resolutions: Array<{ url: string; width: number; height: number }> =
      previews[0].resolutions ?? []

    // Pick the first resolution >= 400 px wide, or the largest available
    const chosen =
      resolutions.find((r) => r.width >= 400) ??
      resolutions[resolutions.length - 1] ??
      previews[0].source

    if (chosen?.url) {
      const url = chosen.url.replace(/&amp;/g, '&')
      const ratio = chosen.width > 0 ? chosen.height / chosen.width : 1
      const aspect: FeedImage['aspect'] =
        ratio < 0.6 ? 'wide' : ratio > 1.2 ? 'tall' : 'square'
      return { url, alt: data.title ?? '', aspect }
    }
  }

  // Direct image link (i.redd.it, imgur, etc.)
  const url = data.url ?? ''
  if (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) {
    return { url, alt: data.title ?? '', aspect: 'wide' }
  }

  return null
}

// =============================================================================
// Tags — flair + subreddit
// =============================================================================

const extractTags = (data: RedditPostData): string[] => {
  const tags: string[] = []

  if (data.link_flair_text) {
    tags.push(data.link_flair_text.slice(0, 24)) // trim long flair
  }

  tags.push(`r/${data.subreddit}`)

  return tags.slice(0, 3)
}

// =============================================================================
// Raw Reddit types (only fields we actually use)
// =============================================================================

interface RedditPostData {
  id: string
  name: string           // fullname: "t3_abc123"
  title: string
  selftext: string
  author: string
  subreddit: string
  score: number
  num_comments: number
  created_utc: number
  url: string
  permalink: string
  is_self: boolean
  link_flair_text: string | null
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number }
      resolutions: Array<{ url: string; width: number; height: number }>
    }>
  }
}

interface RedditListing {
  data: {
    after: string | null
    children: Array<{ kind: string; data: RedditPostData }>
    dist: number
  }
}

// =============================================================================
// Normaliser — RedditPostData → FeedPost
// =============================================================================

const normalise = (data: RedditPostData): FeedPost => {
  const image = extractImage(data)

  // Body text: use selftext for text posts, title for link posts
  // Keep it reasonable — very long selftexts are trimmed at 500 chars so the
  // card stays readable; the "open" link lets users read the full post.
  const rawText = data.is_self && data.selftext
    ? data.selftext.trim()
    : ''
  const text = rawText.length > 500
    ? rawText.slice(0, 497) + '…'
    : rawText

  return {
    id:       data.name,          // stable fullname ("t3_abc123")
    user:     data.author,
    initials: toInitials(data.author),
    color:    colorFromString(data.author),
    title:    data.title || null,
    text,
    hasImage: image !== null,
    image,
    tags:     extractTags(data),
    time:     relativeTime(data.created_utc),
    likes:    Math.max(0, data.score),
    comments: Math.max(0, data.num_comments),
    source:   'reddit',
    url:      `https://www.reddit.com${data.permalink}`,
  }
}

// =============================================================================
// Fetch
// =============================================================================

const fetchReddit = async (params: FeedParams): Promise<FeedResponse> => {
  const subreddit = (params.target || 'worldnews').replace(/^r\//i, '')
  const limit     = Math.min(Math.max(1, params.limit), MAX_LIMIT)
  const after     = params.after ?? ''

  const url = new URL(`${BASE_URL}/r/${subreddit}/${DEFAULT_SORT}.json`)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('raw_json', '1') // avoid HTML-encoded ampersands
  if (after) url.searchParams.set('after', after)

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept':     'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Reddit API error ${res.status}: ${text.slice(0, 120)}`)
  }

  const listing = (await res.json()) as RedditListing

  const posts = listing.data.children
    .filter((c) => c.kind === 't3')   // posts only, skip stickied ads etc.
    .map((c) => normalise(c.data))

  return {
    posts,
    nextCursor: listing.data.after ?? null,
    total:      null,  // Reddit doesn't expose a reliable total count
    source:     'reddit',
    target:     subreddit,
  }
}

// =============================================================================
// Adapter export
// =============================================================================

export const redditSource: FeedSource = {
  id: 'reddit',
  fetch: fetchReddit,
}
