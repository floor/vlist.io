# Social Feed Example — Refactoring Notes

> Status: **In progress**
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
Reddit   /api/feed?source=      A · Pre-measure
  └─ subreddit picker             └─ measureSizes() at init
RSS      /api/feed?source=rss        hidden DOM measurer
  └─ feed URL picker               item.height: (i) => items[i].size
Generated (mock, 5 000 posts)   B · Auto-size
  └─ deterministic generator      └─ item.estimatedHeight: N
                                     ResizeObserver measures on render
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
      ├─ source = "reddit" ──▶ loadNextFeedPage() ──▶ GET /api/feed?source=reddit
      │                              │
      │                              ▼
      │                        feedState.posts.push(...)
      │                        list.setItems(feedState.posts)
      │
      ├─ source = "rss"    ──▶ loadRssItems()     ──▶ GET /api/feed?source=rss
      │                              │
      │                              ▼
      │                        rssState.posts = data.posts
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

A single `renderPost()` function handles all three sources:

- **Title** — rendered above the image when present (Reddit, RSS)
- **Image** — gradient placeholder for generated, real `<img>` for live sources
- **Body** — text below the image
- **Tags** — only rendered when non-empty (RSS categories, Reddit flair)
- **Likes/comments** — hidden when source is live and value is 0 (RSS has none)
- **Action** — "↗ Open" link for live sources, "↗ Share" button for generated

Source is conveyed visually by a small coloured dot on the username:
- Reddit → `#ff4500` (Reddit orange)
- RSS → `#ee802f` (feed orange)

---

## Mode A — Pre-measure

```js
// measureSizes() inserts each item's HTML into a hidden off-screen element
// sized to match the container width, reads offsetHeight, and stores it.
// A content key (title + text + image aspect) deduplicates measurements —
// only unique content shapes are measured, not all 5 000 items.

item: {
  height: (index) => items[index]?.size ?? ESTIMATED_SIZE,
  template: renderPost,
}
```

**Trade-off:** init cost (all unique shapes measured before first render) in exchange for zero scroll correction needed later. For generated data with ~40 unique shapes this is ~40 DOM measurements. For live feeds with fully unique content, this can mean N measurements.

**When live feed + Mode A:** `measureSizes()` is called again after each page load (`loadNextFeedPage` / `loadRssItems`) so newly appended items get their sizes before `list.setItems()` is called.

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

## Current Issues

### 1. Image Sizing and Positioning (CSS — main open issue)

**Problem:** Real images from RSS and Reddit feeds vary wildly in aspect ratio and source resolution. The current CSS uses a fixed `max-height: 240px` with `object-fit: cover`, but this causes several visible problems:

- **Images overflow their container** — the `max-height` is applied to both `.post__image--real` and its `img` child, but because the container is `display: block` with `height: auto`, it doesn't actually constrain the rendered image height before the browser performs layout. The `max-height` on the `<img>` is respected, but the container's `height: auto` means vlist measures the container — not the constrained image — leading to incorrect size caching in Mode B.

- **`object-fit: cover` clips important content** — news images frequently have the subject matter in the centre or bottom. `object-position: center top` helps for portraits (faces at the top) but is wrong for landscape/map/diagram images.

- **Resolution mismatch** — some feeds (BBC) serve 240px thumbnails. We upgrade them server-side (BBC: `/standard/240/` → `/standard/800/`, Ars Technica: strip crop dimensions), but this is done per-domain and is fragile.

- **No intrinsic aspect ratio** — because we don't know the image's natural dimensions at render time, we can't set `aspect-ratio` or reserve space. This means Mode B measures the item *before* the image loads and gets the wrong height. When the image loads and expands, the item's cached size is stale.

**Current workaround:**
```css
.post__image--real {
    height: auto;
    max-height: 240px;
    overflow: hidden;
    border-radius: 10px;
}

.post__image--real img {
    width: 100%;
    height: auto;
    max-height: 240px;
    object-fit: cover;
    object-position: center top;
}
```

**What this doesn't solve:**
- The item is measured by vlist before the image loads (it's lazy-loaded). So Mode B caches the height without the image, then the image loads and the card grows — but vlist doesn't know.
- The `max-height` on both elements creates a redundant constraint; if either is removed, layout breaks differently.

**Correct approach to implement:**

Option A — **Fixed aspect ratio container:** Reserve a fixed 16:9 slot regardless of image content.
```css
.post__image--real {
    aspect-ratio: 16 / 9;
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
This gives vlist a stable, predictable size to measure. The trade-off is that very tall or very square images get heavily cropped.

Option B — **Intrinsic dimensions from the adapter:** The RSS/Reddit adapters could extract `width` and `height` attributes from `<media:thumbnail>` (BBC provides these: `width="240" height="135"`), compute the aspect ratio, and embed it as a data attribute on the post. The CSS can then use `aspect-ratio` dynamically.

Option C — **Eager image loading with `decode()` before `setItems`:** Pre-decode images before rendering. Expensive and defeats lazy loading.

Option D — **`ResizeObserver` handles it naturally in Mode B:** If images are NOT lazy-loaded, `ResizeObserver` will catch the size change after image load and correct the scroll. This only works in Mode B and requires removing `loading="lazy"` — acceptable for a small live feed, not for 5 000 generated posts.

**Recommended:** Option A for immediate fix (stable layout), Option B as enhancement (accurate aspect ratios from feed metadata).

---

### 2. RSS Author Fallback

Some feeds (Ars Technica) emit empty `<dc:creator>` tags with only whitespace. The current adapter uses `||` to fall through empty strings to `feedTitle`, but `getTagText()` trims whitespace and returns `""` — which `||` treats as falsy correctly, but the final result (`feedTitle`) can itself be empty if the channel title extraction fails on feeds with no items before the first `<item>` tag.

Current state: affected feeds show `user: ""` and `initials: "?"`.

Fix: always guarantee a non-empty fallback in `normaliseItem`:
```ts
const author = (
  getTagText(xml, "author") ||
  getTagText(xml, "dc:creator") ||
  getTagText(xml, "name") ||
  feedTitle ||
  ""
).trim() || "Unknown";
```

---

### 3. RSS Pagination

RSS feeds are fetched once — no cursor, no "load more". This is correct (RSS doesn't paginate), but the UI currently shows no "Load more" button for RSS (it was removed). If we want to support refreshing the feed, we'd need a "Refresh" button that re-fetches and diffs against the existing posts by `id` (which is the `<guid>` or `<link>`).

---

### 4. Mode A + Live Feed Performance

When Mode A is active and a new page of Reddit posts loads, `measureSizes()` is called on all posts (including previously measured ones). The content-key cache inside `measureSizes()` deduplicates by `title + text + image.aspect`, but live posts are nearly all unique — so this approaches O(N) DOM measurements on each page load.

Fix: pass only the newly appended posts to `measureSizes()`, not the full array.

```js
// Instead of:
measureSizes(feedState.posts, containerEl);

// Do:
const newPosts = data.posts;
measureSizes(newPosts, containerEl);
// newPosts already have .size set; existing posts keep theirs
```

---

## Files

| File | Role |
|------|------|
| `examples/social-feed/script.js` | Main example logic — state, rendering, event wiring |
| `examples/social-feed/content.html` | HTML structure — panel, controls, footer |
| `examples/social-feed/styles.css` | Post card styles, image handling, panel overrides |
| `src/api/feed/types.ts` | Shared `FeedPost`, `FeedSource`, `FeedResponse` types |
| `src/api/feed/index.ts` | Source registry — `SOURCES` map, `fetchFeed()` |
| `src/api/feed/reddit.ts` | Reddit adapter — public JSON API, normaliser |
| `src/api/feed/rss.ts` | RSS/Atom adapter — XML parser, normaliser, image upgrader |
| `src/api/router.ts` | `GET /api/feed` and `GET /api/feed/presets` routes |

---

## Next Steps

1. **Fix image CSS** — implement Option A (fixed aspect-ratio container) as the immediate fix
2. **Fix author fallback** — guarantee non-empty author in `normaliseItem`
3. **Fix Mode A + live feed** — only pass new posts to `measureSizes()`
4. **RSS image aspect ratio** — extract `width`/`height` from `<media:thumbnail>` in the adapter, embed as `data-aspect` on the image container, use in CSS
5. **Consider `loading="eager"` for live feeds** — small N (25–50 posts), images are the main content, Mode B corrects naturally