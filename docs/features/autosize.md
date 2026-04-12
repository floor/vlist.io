# AutoSize Feature

> Automatic item measurement via ResizeObserver for content with unpredictable sizes.

## Overview

The `withAutoSize()` feature enables **Mode B sizing** — items are rendered at an estimated size, then measured by a `ResizeObserver` to determine their actual size. The measured size is cached and used for all subsequent renders. Scroll position is automatically corrected to prevent visual jumps.

**Import:**
```typescript
import { vlist, withAutoSize } from '@floor/vlist';
```

**Bundle cost:** +0.7 KB gzipped

## Quick Start

```typescript
import { vlist, withAutoSize } from '@floor/vlist';

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

## When to Use

### Use `withAutoSize()` when:

- Item size depends on rendered content (variable-length text, images with unknown aspect ratios)
- You can't compute the exact size from data alone
- You were previously pre-measuring items in a hidden DOM element

### Use Mode A instead when:

- All items have the same size (`height: 48`)
- Size is derivable from data (`height: (i) => data[i].expanded ? 200 : 48`)
- You need pixel-perfect initial layout (no reflow from measurement)

## Use Cases

### Social Feed

```typescript
import { vlist, withAutoSize } from '@floor/vlist';

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
import { vlist, withAutoSize } from '@floor/vlist';

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
import { vlist, withAutoSize } from '@floor/vlist';

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

During active scrolling, content size updates are deferred to prevent the scrollbar thumb from shifting under the user's finger. Deferred updates are flushed on scroll idle.

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
| `withTable()` | Table rows have uniform height |

## Sizing Precedence

If both `height` and `estimatedHeight` are set, **`height` wins** (Mode A). The estimate is silently ignored. This means switching from auto-size to known-size is a single config change — remove `withAutoSize()` and replace `estimatedHeight` with `height`.

## Choosing the Right Estimate

The estimate affects initial layout quality:

- **Too small** — items jump larger after measurement, causing visible reflow below
- **Too large** — items shrink after measurement, wasting initial space
- **Close to average** — minimal visual disruption during measurement

**Tip:** Profile your content to find the median item height, then use that as the estimate.

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

The feature doesn't add any new methods. All standard VList methods work:

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

## See Also

- [Measurement Internals](../internals/measurement.md) — Full architecture: MeasuredSizeCache, ResizeObserver wiring, scroll correction
- [Types — ItemConfig](../api/types.md#itemconfig) — `estimatedHeight`, `estimatedWidth` configuration
- [API Reference — Sizing Modes](../api/reference.md#sizing-modes) — Mode A vs Mode B comparison
- [Variable Sizes Example](/examples/variable-sizes/) — Interactive demo with Mode A / Mode B toggle
- [Social Feed Example](/examples/social-feed/) — Live feed with auto-measured posts
