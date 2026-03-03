# Social Feed Example — Refactoring Notes

> Status: **Mostly complete**
> Last updated: March 2026

---

## Purpose

The `social-feed` example is the primary showcase for **variable-size items** — the scenario where item dimensions are unknown until the browser lays them out. It demonstrates two orthogonal concerns:

1. **Source** — where the data comes from (Reddit, RSS, or generated mock)
2. **Mode** — how vlist handles unknown sizes (A: pre-measure, B: auto-size)

Any combination works: you can pre-measure live Reddit posts, or auto-size 5 000 generated cards. This makes it the most pedagogically dense example in the suite — it teaches both the data-fetching pattern and the measurement strategy simultaneously.

---

## Architecture

### Two Independent Axes

```
Source axis                     Mode axis
──────────────────────────      ─────────────────────────────────────
Reddit   /api/feed?source=      A · Pre-measure (default)
  └─ subreddit picker             └─ measureSizes() at init
  └─ infinite scroll               hidden DOM measurer + image slots
RSS      /api/feed?source=rss      item.height: (i) => getActiveItems()[i].size
  └─ feed URL picker            B · Auto-size
Generated (mock, 5 000 posts)     └─ item.estimatedHeight: N
  └─ deterministic generator         ResizeObserver measures on render
                                     scroll corrected per-batch
```

Both axes are fully independent. Switching source resets data and rebuilds the list. Switching mode rebuilds the list with the same data, re-measuring if switching to A.

### Data Flow

```
User picks source
      │
      ▼
createList()
      │
      ├─ source = "reddit" ──▶ loadInitialPages()  ──▶ 3× GET /api/feed?source=reddit
      │                              │                    (1.5s delay between pages)
      │                              ▼
      │                        feedState.posts.push(...)
      │                        measureSizes(newPosts)    ← Mode A only
      │                        list.setItems(feedState.posts)
      │                              │
      │                        preloadIfNeeded()         ← on range:change
      │                              │
      │                        loadNextFeedPage()        ← when near boundary
      │
      ├─ source = "rss"    ──▶ loadRssItems()     ──▶ GET /api/feed?source=rss
      │                              │
      │                              ▼
      │                        rssState.posts = data.posts + sentinel
      │                        measureSizes(rssState.posts) ← Mode A only
      │                        list.setItems(rssState.posts)
      │
      └─ source = "generated" ──▶ generatedPosts (pre-built, 5 000 items)
                                   list built directly
```

### Server-Side Feed API

The browser never calls Reddit or RSS feeds directly — all external requests are proxied through the Bun server at `GET /api/feed`. This avoids CORS issues, allows server-side caching in the future, and lets us normalise all sources to a shared `FeedPost` shape.

```
src/api/feed/
├── types.ts      FeedPost, FeedSource, FeedParams, FeedResponse interfaces
├── index.ts      Source registry — SOURCES map, fetchFeed() entry point
├── reddit.ts     Reddit adapter  — fetches r/{sub}/hot.json, normalises
└── rss.ts        RSS adapter     — fetches any feed URL, parses XML, normalises
```

#### FeedPost shape

Every source produces the same shape, consumed by the single `renderPost()` template:

```js
{
  id:       string          // stable unique ID
  user:     string          // display name / author
  initials: string          // 2-letter avatar fallback
  color:    string          // deterministic hex from name
  title:    string | null   // Reddit/RSS have titles; social posts don't
  text:     string          // body text, HTML-stripped, max 500 chars
  hasImage: boolean
  image:    { url, alt, aspect } | null
  tags:     string[]        // flair / categories, up to 3
  time:     string          // "3h ago", "2d ago"
  likes:    number          // upvotes / 0 for RSS
  comments: number          // comment count / 0 for RSS
  source:   "reddit" | "rss" | "generated"
  url:      string | null   // original post URL
}
```

### Template Strategy

A single `renderPost()` function handles all three sources. It accepts an optional `{ measure }` flag for the pre-measurement pass.

- **Title** — rendered above the image when present (Reddit, RSS)
- **Image** — gradient placeholder for generated, real `<img>` for live sources, empty slot for measurement
- **Body** — text below the image, with markdown links converted to HTML
- **Tags** — only rendered when non-empty (RSS categories, Reddit flair)
- **Likes/comments** — hidden when source is live and value is 0 (RSS has none)
- **Action** — "↗ Open" link for live sources, "↗ Share" button for generated
- **End sentinel** — `renderEndOfFeed()` for the `_endOfFeed` marker item

Source is conveyed visually by a small coloured dot on the username:
- Reddit → `#ff4500` (Reddit orange)
- RSS → `#ee802f` (feed orange)

---

## Mode A — Pre-measure (Default)

```js
// measureSizes() inserts each item's HTML into a hidden off-screen element
// sized to match the container width, reads offsetHeight, and stores it.
// A content key (title + text + image aspect) deduplicates measurements —
// only unique content shapes are measured, not all 5 000 items.
//
// The { measure: true } flag renders image slots (empty div with aspect-ratio)
// instead of real <img> tags — so measurement is instant, no image loading.

item: {
  height: (index) => getActiveItems()[index]?.size ?? ESTIMATED_SIZE,
  template: renderPost,
}
```

**Image slot trick:** During measurement, `renderPost(item, { measure: true })` calls `renderImageSlot()` which produces an empty `<div class="post__image--real"></div>`. The CSS `aspect-ratio: 16/9` on that class reserves the exact same space as the real image container — no image loading needed, instant measurement.

**Height closure:** The `height` callback references `getActiveItems()` dynamically (not a captured `items` snapshot) so it correctly reads `.size` values set by later `measureSizes()` calls (e.g. when RSS data arrives async).

**When live feed + Mode A:** `measureSizes()` is called on only the **new** posts before `list.setItems()`, so existing posts keep their cached sizes.

## Mode B — Auto-size

```js
item: {
  estimatedHeight: isLive ? 160 : ESTIMATED_SIZE,
  template: renderPost,
}
```

vlist renders each item at the estimated size, observes it with `ResizeObserver`, records the real size, and applies a scroll correction so the viewport doesn't jump. See `docs/internals/measurement.md` for the full architecture.

The estimated size is slightly higher for live feeds (160px) vs generated (120px) because live posts tend to have titles, real images, and longer text.

---

## Infinite Scroll (Reddit)

Reddit's API is **cursor-based only** — you can't request an arbitrary offset. Each page returns an `after` cursor needed to fetch the next page. This means random-access patterns (like `withAsync`'s `read(offset, limit)`) don't work.

### Strategy

1. **Initial burst:** On first load, fetch 3 pages sequentially (75 posts) with 1.5s delay between requests to avoid Reddit rate-limiting (~10 req/min for unauthenticated clients)
2. **Preload-ahead:** On every `range:change` event, check if `range.end` is within `PRELOAD_THRESHOLD` (15) items of the loaded count. If so, trigger `loadNextFeedPage()`
3. **Rate limiting:** Minimum 2s between scroll-triggered requests (skipped during initial burst)
4. **End of feed:** When Reddit returns `nextCursor === null`, set `feedState.endOfFeed = true` and append a sentinel item
5. **Single in-flight guard:** `feedState.loading` prevents concurrent requests

### Constants

```js
const PRELOAD_THRESHOLD = 15;    // trigger when within N items of boundary
const INITIAL_PAGES = 3;         // pages fetched on init (75 posts)
const INITIAL_PAGE_DELAY = 1500; // ms between init requests
const MIN_FETCH_INTERVAL = 2000; // ms between scroll-triggered requests
```

### RSS — Finite Feeds

RSS feeds are fetched once and are inherently finite (typically 10–50 items). An end-of-feed sentinel is appended automatically. No pagination or preloading needed.

---

## End-of-Feed Indicator

Both Reddit and RSS append a sentinel item when the feed is exhausted:

```js
{ id: "__end__", _endOfFeed: true, count: N, tags: [], size: 0 }
```

`renderPost()` detects `_endOfFeed` and renders a horizontal divider:

```
── End of feed · 34 items ──
```

This communicates clearly that the list has ended intentionally, not broken.

---

## Preferences Persistence

User choices are persisted in `localStorage` under the key `vlist-social-feed`:

- `source` — "reddit" | "rss" | "generated"
- `mode` — "a" | "b"
- `subreddit` — e.g. "worldnews"
- `rssFeed` — e.g. "https://www.theverge.com/rss/index.xml"

On init, saved preferences are restored into both JS state and UI controls (toggle buttons, select dropdowns, badge, footer, feed name heading).

---

## Layout

The container uses a flex column layout bounded to viewport height:

```
.container.social-feed  →  height: 100dvh, flex column
  header                →  flex: none
  .split-layout         →  flex: 1, min-height: 0
    .layout-feed        →  flex column, height: 100%
      #feed-name        →  flex: none (heading)
      #list-container   →  flex: 1, height: 0, overflow: hidden
    .split-panel        →  fixed width sidebar
  .example-footer       →  flex: none
```

The `height: 0` + `flex: 1` trick on `#list-container` forces it to take only available space without growing to content height. `overflow: hidden` prevents vlist's internal content from expanding the container.

---

## Resolved Issues

### ~~1. Image Sizing and Positioning~~ ✅ Fixed

**Solution:** Option A — fixed `aspect-ratio: 16/9` container.

```css
.post__image--real {
    aspect-ratio: 16 / 9;
    background: var(--vlist-placeholder-bg, rgba(127, 127, 127, 0.12));
    display: block;
    overflow: hidden;
    border-radius: 10px;
}

.post__image--real img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
}
```

This gives vlist a stable, predictable size to measure. The `--vlist-placeholder-bg` provides a visible skeleton background before the image loads.

For measurement, `renderImageSlot()` produces the same container without the `<img>` — `aspect-ratio` reserves the space instantly.

### ~~2. Markdown Links in Body Text~~ ✅ Fixed

Reddit's `selftext` field contains markdown. `markdownToHtml()` converts:
- `[text](url)` → clickable `<a>` tags
- Bare `https://...` URLs → clickable links

### ~~3. Mode A + Live Feed Measurement Order~~ ✅ Fixed

`measureSizes()` is now called **before** `list.setItems()` so heights are available when vlist renders. Only new posts are measured (not the full array).

### ~~4. Height Closure Bug~~ ✅ Fixed

The `height` callback now references `getActiveItems()` dynamically instead of a captured `items` snapshot. This fixes RSS and subreddit-switch scenarios where the items array is replaced after list creation.

---

## Remaining Issues

### 1. RSS Author Fallback

Some feeds (Ars Technica) emit empty `<dc:creator>` tags with only whitespace. The current adapter already chains `||` fallbacks with a final `|| "Unknown"`, but edge cases may still produce empty authors if `feedTitle` itself is empty.

**Status:** Partially fixed in `rss.ts` — the `authorRaw.trim() || feedTitle || "Unknown"` chain handles most cases. Monitor for remaining issues.

### 2. RSS Image Aspect Ratio

All images use a fixed 16:9 container. Some feeds provide `width`/`height` attributes in `<media:thumbnail>` (e.g. BBC: `width="240" height="135"`) that could be extracted in the adapter and used for dynamic `aspect-ratio`.

**Priority:** Low — 16:9 works well for news content. Consider as enhancement.

### 3. Mode B Consistency

Mode B (auto-size with `ResizeObserver`) can show layout inconsistencies after scrolling because:
- Lazy images load after initial measurement
- `ResizeObserver` corrects sizes but scroll position may jump

Mode A is now the default, which avoids these issues entirely. Mode B remains available for demonstration purposes.

---

## Skeleton Placeholders

Post card elements have skeleton styles scoped under `.vlist-item--placeholder`:

- **Avatar** — solid `--vlist-placeholder-bg` circle
- **Username / time** — skeleton bars at 60% / 30% width
- **Title** — skeleton bar at 85% width
- **Body** — skeleton block, 2.4em tall
- **Image** — `--vlist-placeholder-bg` fill, `<img>` hidden
- **Tags** — small skeleton pills
- **Actions** — small skeleton blocks

All use `var(--vlist-placeholder-bg)` which adapts to light/dark theme automatically.

---

## Files

| File | Role |
|------|------|
| `examples/social-feed/script.js` | Main logic — state, rendering, infinite scroll, preferences |
| `examples/social-feed/content.html` | HTML structure — panel, controls, feed name, footer |
| `examples/social-feed/styles.css` | Post card styles, image aspect-ratio, layout, skeletons |
| `src/api/feed/types.ts` | Shared `FeedPost`, `FeedSource`, `FeedResponse` types |
| `src/api/feed/index.ts` | Source registry — `SOURCES` map, `fetchFeed()` |
| `src/api/feed/reddit.ts` | Reddit adapter — public JSON API, normaliser |
| `src/api/feed/rss.ts` | RSS/Atom adapter — XML parser, normaliser, image upgrader |
| `src/api/router.ts` | `GET /api/feed` and `GET /api/feed/presets` routes |

---

## Next Steps

1. **RSS image aspect ratio** — extract `width`/`height` from `<media:thumbnail>` in the adapter, embed as `data-aspect` on the image container, use dynamic `aspect-ratio` in CSS
2. **RSS refresh button** — re-fetch and diff against existing posts by `id`
3. **Monitor Reddit rate limits** — current 1.5s delay between init pages + 2s scroll throttle seems safe, but may need adjustment
4. **Mode B image loading** — consider `loading="eager"` for live feeds (small N), so `ResizeObserver` catches size changes naturally
5. **Feed name in generated source** — currently shows "Generated · 5,000 posts", could add more context