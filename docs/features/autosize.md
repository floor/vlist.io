---
created: 2026-04-12
updated: 2026-04-30
status: draft
---

# AutoSize Feature

> Automatic item measurement via ResizeObserver for content with unpredictable sizes.

## Overview

The `withAutoSize()` feature enables **Mode B sizing** — items are rendered at an estimated size, then measured by a `ResizeObserver` to determine their actual size. The measured size is cached and used for all subsequent renders. Scroll position is automatically corrected to prevent visual jumps.

**Import:**
```typescript
import { vlist, withAutoSize } from 'vlist';
```

**Bundle cost:** +0.7 KB gzipped

## Quick Start

```typescript
import { vlist, withAutoSize } from 'vlist';

const feed = vlist({
  container: '#feed',
  items: posts,
  item: {
    estimatedHeight: 120,
    template: (post) => `
      <article class="post">
        <h2>${post.title}</h2>
        <p>${post.body}</p>
        ${post.image ? `<img src="${post.image}" />` : ''}
      </article>
    `,
  },
})
  .use(withAutoSize())
  .build();
```

Items render at 120px initially, then snap to their real height once measured.

## Configuration

**No configuration needed:**

```typescript
withAutoSize()  // Reads estimatedHeight/estimatedWidth from the item config
```

The feature automatically:
- Replaces the size cache with a `MeasuredSizeCache`
- Observes new items via `ResizeObserver`
- Caches measured sizes (one measurement per item, then pinned)
- Corrects scroll position when above-viewport items change size
- Defers content size updates during active scrolling (scrollbar stability)

## Mode A vs Mode B

vlist offers two strategies for handling variable-height items. Understanding the trade-offs helps you pick the right one.

### At a Glance

| | **Mode A — Pre-measure** | **Mode B — AutoSize** |
|---|---|---|
| **Config** | `height: (i) => px` | `estimatedHeight: px` + `.use(withAutoSize())` |
| **Init cost** | Renders every item into a hidden element | Near-instant (no upfront DOM work) |
| **Scrollbar accuracy** | Pixel-perfect from the start | Approximate until items are visited |
| **Jump-to-index** | Exact — all offsets are known | Adapts on the fly as items are measured |
| **Best for** | Few unique sizes, cacheable measurements | Large datasets, dynamic / user-generated content |

### Mode A — Known Size Function

You provide a `height(index)` function that returns the exact pixel height for every item. vlist builds a prefix-sum array at init and never needs to measure anything at runtime.

```typescript
// Pre-measure once (e.g. at page load or from a cache)
const sizes = items.map(measureInHiddenDOM);

const list = vlist({
  container: '#app',
  items,
  item: {
    height: (i) => sizes[i],
    template: renderItem,
  },
}).build();
```

> **⚠️ Scrollbar width caveat — cross-platform pre-measurement**
>
> The vlist viewport has `overflow: auto`, so on platforms with **classic (non-overlay) scrollbars** — Windows and most Linux desktops — the scrollbar consumes ~17 px of horizontal space inside the viewport. If your hidden measurer doesn't account for this, items are measured at a **wider** width than they actually render at, text wraps differently, and measured heights end up **shorter** than reality.
>
> Subtract the scrollbar width from the measurer's width:
>
> ```typescript
> function getScrollbarWidth(): number {
>   const el = document.createElement('div');
>   el.style.cssText =
>     'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll';
>   document.body.appendChild(el);
>   const w = el.offsetWidth - el.clientWidth;
>   el.remove();
>   return w;
> }
>
> // Use when building your hidden measurer:
> const scrollbarW = getScrollbarWidth();          // 0 on macOS, ~17 on Windows
> const innerWidth = container.offsetWidth - scrollbarW - padding * 2;
> ```
>
> On macOS with overlay scrollbars this returns **0**, so the subtraction is a no-op. On Windows it returns the real scrollbar width and your measurements will match the rendered layout.

**When to choose Mode A:**

- All items share one or a few fixed sizes (`height: 48`)
- Size is derivable from the data model (`height: (i) => data[i].expanded ? 200 : 48`)
- You can cache measurements across sessions (localStorage, server)
- You need a pixel-perfect scrollbar and instant scroll-to-index on first load

### Mode B — AutoSize (`withAutoSize()`)

You provide an `estimatedHeight` and let a `ResizeObserver` measure each item as it enters the viewport. Measured sizes are cached and reused — each item is observed exactly once.

```typescript
const list = vlist({
  container: '#app',
  items,
  item: {
    estimatedHeight: 120,
    template: renderItem,
  },
})
  .use(withAutoSize())
  .build();
```

**When to choose Mode B:**

- Item height depends on rendered content (variable-length text, images with unknown aspect ratios, embedded media)
- You can't compute the exact size from data alone
- You have thousands of items and can't afford the init cost of pre-measuring all of them
- Content is dynamic or user-generated and sizes vary widely
- You were previously pre-measuring items in a hidden DOM element and want to remove that step

### Switching Between Modes

Changing from Mode B to Mode A is a single config swap — replace `estimatedHeight` with `height` and remove `withAutoSize()`:

```diff
  item: {
-   estimatedHeight: 120,
+   height: (i) => sizes[i],
    template: renderItem,
  },
- .use(withAutoSize())
```

## Use Cases

### Social Feed

```typescript
import { vlist, withAutoSize } from 'vlist';

const feed = vlist({
  container: '#feed',
  items: posts,
  item: {
    estimatedHeight: 160,
    template: (post) => `
      <article class="post">
        <div class="post__header">
          <img class="avatar" src="${post.avatar}" />
          <span>${post.user}</span>
        </div>
        <p>${post.text}</p>
        ${post.image ? `<img src="${post.image}" loading="lazy" />` : ''}
        <div class="post__actions">
          <button>Like (${post.likes})</button>
          <button>Comment (${post.comments})</button>
        </div>
      </article>
    `,
  },
})
  .use(withAutoSize())
  .build();
```

### Chat Messages

```typescript
import { vlist, withAutoSize } from 'vlist';

const chat = vlist({
  container: '#chat',
  items: messages,
  reverse: true,
  item: {
    estimatedHeight: 60,
    template: (msg) => `
      <div class="message message--${msg.sender === 'me' ? 'sent' : 'received'}">
        <p>${msg.text}</p>
        <time>${msg.time}</time>
      </div>
    `,
  },
})
  .use(withAutoSize())
  .build();
```

### Comments Thread

```typescript
import { vlist, withAutoSize } from 'vlist';

const thread = vlist({
  container: '#comments',
  items: comments,
  item: {
    estimatedHeight: 100,
    gap: 8,
    template: (comment) => `
      <div class="comment" style="margin-left: ${comment.depth * 24}px">
        <strong>${comment.author}</strong>
        <p>${comment.text}</p>
      </div>
    `,
  },
})
  .use(withAutoSize())
  .build();
```

## How It Works

### Lifecycle

1. **Initial render** — items are positioned using `estimatedHeight` as their size
2. **Observe** — newly rendered items are observed by a `ResizeObserver`
3. **Measure** — the observer fires with the actual `borderBoxSize`
4. **Cache** — the measured size replaces the estimate in the `MeasuredSizeCache`
5. **Correct** — scroll position is adjusted so visible items don't shift
6. **Pin** — measured items use their cached size forever (no further observation)

### Scroll Correction

When an above-viewport item is measured and its size differs from the estimate, vlist adjusts the scroll position by the delta. This happens immediately per-batch in the `ResizeObserver` callback, masked by the user's own scroll motion.

### Content Size Deferral

During active scrolling, content size updates are **deferred** to prevent the scrollbar thumb from jumping under the user's finger. Deferred updates are flushed when scrolling becomes idle.

There is one exception: when the render range includes the **last item**, content size is always updated immediately. This ensures `scrollToIndex(last, 'end')` and keyboard End reach the true bottom without the browser clamping the scroll position to a stale content height.

### Bottom-Snapping

When scrolling to the bottom (via `scrollToIndex`, the End key, or the scrollbar), vlist ensures the last item is fully visible:

- **Dynamic animation target** — smooth scroll animations recalculate their target each frame from the current size cache, so the destination adapts as measurements arrive mid-scroll.
- **Snap on measurement** — when items near the end are measured and the scroll position was already at the DOM's max scroll, vlist forces a layout reflow and snaps to the new bottom immediately.
- **Drift-tolerant flush** — if the smooth scroll animation's target became stale (early measurement batches grew the content before the animation started), the idle flush detects that the render range includes the last item and the scroll position is within the size-drift distance of the old max scroll, then snaps to the correct bottom.

## Compatibility

### Compatible With

| Feature | Notes |
|---------|-------|
| `withAsync()` | Lazy-loaded items are measured as they appear |
| `withSelection()` | Selection state works with measured items |
| `withScale()` | Compression works with measured sizes |
| `withScrollbar()` | Custom scrollbar tracks measured content size |
| `withPage()` | Page-level scrolling with measured items |
| `withSnapshots()` | Scroll save/restore with measured positions |
| `withGroups()` | Group headers + measured data items |
| `reverse: true` | Chat-style reverse lists with measured messages |
| `gap` | Gap is baked into measured sizes automatically |

### Not Compatible With

| Feature | Reason |
|---------|--------|
| `withGrid()` | Grid requires deterministic row heights |
| `withMasonry()` | Masonry requires known heights for lane placement |

> **Note:** `withTable()` supports auto-measurement via `estimatedRowHeight` — see [Table docs](./table.md).

## Sizing Precedence

If both `height` and `estimatedHeight` are set, **`height` wins** (Mode A). The estimate is silently ignored. This means switching from auto-size to known-size is a single config change — remove `withAutoSize()` and replace `estimatedHeight` with `height`.

## Choosing the Right Estimate

The estimate affects initial layout quality and scrollbar accuracy:

| Estimate | Effect |
|----------|--------|
| **Too small** | Items jump larger after measurement, causing visible reflow below the viewport |
| **Too large** | Items shrink after measurement, wasting initial space and shifting content up |
| **Close to median** | Minimal visual disruption — positive and negative deltas cancel out |

**Tip:** Render a sample of 50–100 items, collect their heights, and use the **median** as your estimate. The median minimises the total scroll correction because roughly half the items are taller and half are shorter.

```typescript
// One-time profiling (remove after you have a good estimate)
const heights = sampleItems.map(item => measureInDOM(item));
heights.sort((a, b) => a - b);
const median = heights[Math.floor(heights.length / 2)];
console.log('Recommended estimatedHeight:', median);
```

## Performance

### Benefits

- Items are measured in the real DOM layout context (correct width, padding, fonts)
- Each item is measured exactly once — subsequent renders use the cached size
- Scroll correction is applied per-batch, not deferred to idle (no large jumps)
- The `MeasuredSizeCache` uses the same O(1) prefix-sum lookups as Mode A

### Considerations

- First render of each item triggers a `ResizeObserver` callback
- Prefix sums are rebuilt when new measurements arrive
- Content size updates are deferred during scrolling (minor visual delay)

### Bundle Impact

`withAutoSize()` is tree-shakeable. It adds **~0.7 KB gzipped** to your bundle only when imported. Lists using Mode A (`height: number | function`) pay zero cost.

## API

The feature doesn't add any new methods. All standard vlist methods work:

```typescript
const list = vlist({ ... })
  .use(withAutoSize())
  .build();

list.scrollToIndex(50);
list.setItems(newPosts);
list.appendItems(morePosts);
```

## Troubleshooting

### Items all have the same height (estimated, not measured)

**Problem:** Forgot to add `.use(withAutoSize())`.

**Solution:** Add the feature to the builder chain:
```typescript
vlist({ ... }).use(withAutoSize()).build();
```

In development mode, vlist logs a warning:
> `[vlist] estimatedHeight/estimatedWidth requires .use(withAutoSize())`

### Items jump on first scroll

**Problem:** The estimate is far from actual sizes.

**Solution:** Use a closer estimate. Profile your content to find the median height.

### Scrollbar jumps during fast scrolling

**Problem:** Content size updates during scroll cause the scrollbar to shift.

**Solution:** This is handled automatically — content size updates are deferred during active scrolling and flushed on idle. If still noticeable, the items may have very large size variance.

### Mode A items are shorter than expected on Windows / Linux

**Problem:** Pre-measured heights are correct on macOS but too short on Windows or Linux. Items overflow their allocated space, clipping borders, border-radius, or bottom content.

**Cause:** The hidden measurer element doesn't account for the classic scrollbar width. The vlist viewport uses `overflow: auto`, so on platforms with non-overlay scrollbars the content area is ~17 px narrower than `container.offsetWidth`. Text wraps at a different point, making items taller than what was measured.

**Solution:** Subtract the scrollbar width from the measurer's width — see the [scrollbar width caveat](#mode-a--known-size-function) in the Mode A section above.

## See Also

- [Measurement Internals](../internals/measurement.md) — Full architecture: MeasuredSizeCache, ResizeObserver wiring, scroll correction
- [Types — ItemConfig](../api/types.md#itemconfig) — `estimatedHeight`, `estimatedWidth` configuration
- [API Reference — ItemConfig](../api/reference.md#itemconfig) — Mode A vs Mode B comparison
- [Variable Sizes Example](/examples/variable-sizes/) — Interactive demo with Mode A / Mode B toggle
- [Social Feed Example](/examples/social-feed/) — Live feed with auto-measured posts
