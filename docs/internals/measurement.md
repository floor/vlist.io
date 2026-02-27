# Auto-Size Measurement (Mode B)

> How vlist measures item sizes after render, caches the results, and corrects scroll position — without visual jumps.

## The Problem

Mode A requires sizes upfront: `item.height: 48` or `item.height: (i) => sizes[i]`. This covers most use cases — contact lists, data tables, file browsers — where size is known from the data.

But some content can't be measured before render: variable-length user text, images with unknown aspect ratios, mixed-media feeds. The consumer doesn't know how tall each item will be until the browser lays it out.

Mode B solves this:

```typescript
item: {
  estimatedHeight: 120,
  template: renderPost,
}
```

vlist renders items using the estimate for initial layout, measures actual DOM size via `ResizeObserver`, caches the real size, and corrects scroll position so the user sees no jump.

## Architecture Overview

Mode B extends — not replaces — the existing `SizeCache` abstraction. The key insight is that **a measured item becomes a known item**. Once measured, it behaves identically to Mode A. The new work is:

1. **MeasuredSizeCache** — A new `SizeCache` implementation that tracks measured vs estimated items
2. **ResizeObserver wiring** — Observe rendered items, record measurements on callback
3. **Scroll correction** — Adjust `scrollTop` when above-viewport items change size
4. **Content size deferral** — Defer content height updates during scrolling for scrollbar stability
5. **Stick-to-bottom** — Keep the viewport at the bottom when content grows from measurements

```
┌──────────────────────────────────────────────────────────────────┐
│                         Config Layer                             │
│  item.estimatedHeight: 120   →   measurementEnabled = true       │
│  item.height: 48             →   measurementEnabled = false       │
├──────────────────────────────────────────────────────────────────┤
│                      MeasuredSizeCache                           │
│  Wraps variable SizeCache with measurement tracking              │
│  Unmeasured items → estimatedSize (120)                          │
│  Measured items   → real DOM size (varies)                       │
│  Prefix sums rebuilt after each measurement batch                │
├──────────────────────────────────────────────────────────────────┤
│                     ResizeObserver Wiring                         │
│  Observe newly rendered items (unconstrained height)             │
│  On callback → record size, unobserve, constrain element         │
│  Rebuild prefix sums, apply scroll correction                    │
├──────────────────────────────────────────────────────────────────┤
│                      Scroll Correction                           │
│  Direction C: apply immediately per-batch (even during scroll)   │
│  Content size: defer during scrolling, flush on idle             │
│  Stick-to-bottom: snap to end if user was at bottom              │
└──────────────────────────────────────────────────────────────────┘
```

## MeasuredSizeCache

### Interface

```typescript
interface MeasuredSizeCache extends SizeCache {
  /** Record actual measured size for an item */
  setMeasuredSize(index: number, size: number): void;

  /** Check if an item has been measured */
  isMeasured(index: number): boolean;

  /** Get the estimated size (used for unmeasured items) */
  getEstimatedSize(): number;

  /** Number of items that have been measured */
  measuredCount(): number;
}
```

### How It Works

Internally, `MeasuredSizeCache` maintains:

- A `Map<number, number>` of measured sizes, keyed by item index
- A fallback estimated size for unmeasured items
- An inner variable `SizeCache` (prefix-sum array) that it rebuilds when measurements change

The size function fed into the inner cache is:

```typescript
const sizeFn = (index: number): number => {
  const measured = measuredSizes.get(index);
  return measured !== undefined ? measured : estimatedSize;
};
```

This means all existing viewport, compression, and range calculations work unchanged — they only see a `SizeCache` with variable sizes. The `MeasuredSizeCache` is a drop-in replacement.

### Three SizeCache Implementations

| Implementation | Config | Complexity | Source |
|----------------|--------|------------|--------|
| **Fixed** | `height: 48` | O(1) everything | `sizes.ts` |
| **Variable** | `height: (i) => fn(i)` | O(1) offset, O(log n) search | `sizes.ts` |
| **Measured** | `estimatedHeight: 120` | Same as Variable + Map lookup | `measured.ts` |

The factory in `builder/core.ts` picks the right one:

```typescript
if (explicitSize != null) {
  // Mode A: known sizes
  sizeCache = createSizeCache(explicitSize, initialTotal);
} else if (estimatedSize != null) {
  // Mode B: estimated + measured
  sizeCache = createMeasuredSizeCache(estimatedSize, initialTotal);
  measurementEnabled = true;
}
```

### Rebuild Semantics

When `rebuild(newTotal)` is called:

- Measured sizes for indices that still exist are **preserved**
- Measured sizes for indices beyond `newTotal` are **discarded** (list shrank)
- New indices beyond the previous total use the **estimated size** (list grew)
- The inner prefix-sum array is fully recreated

This means measured data survives `appendItems`, `prependItems`, and `setItems` — measurements are only lost when the item at that index no longer exists.

## ResizeObserver Wiring

### Element Lifecycle

When `measurementEnabled` is true, each newly rendered item follows this lifecycle:

```
1. renderItem(index, item)
   → element created from pool
   → height NOT set (empty string) — element is unconstrained
   → template applied, element positioned at estimated offset

2. ResizeObserver.observe(element)
   → WeakMap stores element → index mapping
   → browser queues measurement after layout

3. ResizeObserver callback fires
   → read borderBoxSize from entry
   → record in MeasuredSizeCache
   → unobserve the element
   → set explicit height on element (now constrained)
   → rebuild prefix sums
   → apply scroll correction
   → re-render to reposition items

4. On recycle (element leaves render range)
   → element returned to pool
   → WeakMap entry garbage-collected
   → measured size stays in cache permanently
```

### Why Unconstrained Rendering

Unmeasured items are rendered **without** an explicit height:

```typescript
const shouldConstrainSize =
  !measurementEnabled ||
  (measuredCache && measuredCache.isMeasured(index));

if (shouldConstrainSize) {
  element.style.height = `${sizeCache.getSize(index)}px`;
} else {
  element.style.height = '';  // unconstrained — let content determine size
}
```

This lets the browser lay out the element at its natural content height, which is what `ResizeObserver` then measures. After measurement, the explicit height is set to lock the element at its measured size — preventing further reflows.

### Why Not getBoundingClientRect

`ResizeObserver` was chosen over `getBoundingClientRect()` because:

- **No forced layout** — `ResizeObserver` callbacks fire asynchronously after the browser's own layout pass. No layout thrashing.
- **Batched by the browser** — Multiple observations are delivered in a single callback. Efficient by design.
- **Handles async content** — If an image loads or a font swaps after initial render, `ResizeObserver` catches the size change. `getBoundingClientRect()` would miss it.
- **One measurement per item** — After recording the size, we `unobserve()` the element. No ongoing cost.

## Scroll Correction (Direction C)

This is the hardest part of Mode B. When a measured size differs from the estimate, all items below shift. If the changed item is **above the viewport**, the user would see content jump unless `scrollTop` is corrected.

### The Problem with Deferred Correction

Earlier implementations deferred scroll correction to scroll idle (150ms after the last scroll event). This caused a visible "jump" because:

- Corrections accumulated across many items (potentially hundreds of pixels)
- The entire accumulated delta was applied in one discrete `scrollTop` change
- The user perceived a sudden viewport shift after a period of stability

### Direction C: Immediate Per-Batch Correction

The solution is to apply scroll correction **immediately** in every `ResizeObserver` callback, even during active scrolling:

```
ResizeObserver callback:
  1. For each entry:
     → record measured size
     → if index < firstVisible AND size changed: accumulate delta
     → unobserve element, set explicit height
  2. Rebuild prefix sums
  3. Apply scroll correction immediately (scrollTop += delta)
  4. Defer content size update if scrolling
  5. Reposition items with corrected offsets
```

### Why This Works

Per-batch corrections are invisible during scrolling because:

1. **Each correction is small** — A single `ResizeObserver` batch measures 10–20 items. The delta per batch is small (individual item size differences).
2. **Masked by scroll motion** — The user's own input creates continuous viewport movement that absorbs small `scrollTop` adjustments.
3. **No accumulation** — By applying immediately, there's never a large accumulated delta waiting to be flushed.

### What Is Still Deferred

**Content size updates** (`updateContentSize()`) are deferred during scrolling. Changing the content div's height while the user drags the scrollbar thumb would cause the thumb proportions to shift under their finger — a jarring experience. On scroll idle, `flushMeasurements()` applies the deferred content size update.

```
During scrolling:
  ✅ Scroll correction → applied immediately (small, masked)
  ❌ Content size update → deferred (would destabilize scrollbar)

On scroll idle (150ms after last scroll event):
  ✅ Content size update → flushed
  ✅ Stick-to-bottom check → applied if user was at bottom
```

## Stick-to-Bottom

When the user scrolls to the very bottom (e.g., via scrollbar drag), measured items near the bottom are often larger than the estimate. This increases the total content size. But since content size is deferred during scrolling, the browser clamps `scrollTop` to the old maximum.

When `flushMeasurements()` fires on idle:

1. Check if `scrollTop` is at the current DOM maximum (`scrollHeight - clientHeight`)
2. Update content size (content div grows)
3. If the user was at the bottom, scroll to the **new** maximum

```typescript
const scroll = viewport.scrollTop;
const maxScroll = viewport.scrollHeight - viewport.clientHeight;
const wasAtBottom = maxScroll > 0 && scroll >= maxScroll - 2;

updateContentSize();

if (wasAtBottom) {
  const newMax = Math.max(0, totalSize - containerSize);
  if (newMax > scroll) {
    viewport.scrollTop = newMax;
  }
}
```

The same logic applies in the `ResizeObserver` callback when not scrolling (measurements arrive while idle).

## Config Resolution

The builder detects Mode A vs Mode B from the config:

```typescript
const mainAxisValue = isHorizontal ? config.item.width : config.item.height;
const estimatedSize = isHorizontal ? config.item.estimatedWidth : config.item.estimatedHeight;

// Mode A: explicit sizes (existing behavior)
if (mainAxisValue != null) → createSizeCache(mainAxisValue, total)

// Mode B: estimated + measured
if (estimatedSize != null) → createMeasuredSizeCache(estimatedSize, total)

// Neither → throw error
```

**Precedence:** If both `height` and `estimatedHeight` are set, `height` wins (Mode A). The estimate is silently ignored. This means upgrading from Mode B to Mode A is a single config change.

**Horizontal:** `estimatedWidth` works identically to `estimatedHeight` — the axis-neutral `SizeCache` abstraction handles both. See [Orientation](./orientation.md).

## Integration with Existing Systems

### Compression (1M+ Items)

Compression reads `sizeCache.getTotalSize()` to compute the ratio. As measurements arrive, the total size changes, which changes the compression ratio. This is correct — the compression naturally adapts. The ratio-based scroll mapping reads from `getTotalSize()` on every frame.

### Features

All features (`withScale`, `withSections`, `withGrid`, `withAsync`, `withSelection`, `withSnapshots`, `withScrollbar`) interact with `SizeCache` through the `BuilderContext`. Since `MeasuredSizeCache` implements the same `SizeCache` interface, **no feature code needed changes** for Mode B.

### Reverse Mode

In reverse mode, scroll correction logic inverts: changes **below** the viewport need adjustment instead of above. The `isReverse` flag is already handled by the builder's scroll correction code.

## Performance

| Concern | Impact | Mitigation |
|---------|--------|------------|
| `ResizeObserver` callbacks | Batched by browser, fire after layout | No forced layouts, no thrashing |
| Prefix-sum rebuild | O(n) per batch | ~0.1ms for 10K items, ~1ms for 100K |
| Map lookup per item | O(1) | Negligible |
| Memory (measured sizes) | ~160 KB for 10K items | Acceptable |
| Scroll correction | One `scrollTop` write per batch | Synchronous, no frame skip |

Measurements only happen for **newly rendered items** (typically 10–20 per scroll stop), not on every frame. The `ResizeObserver` is disconnected after first measurement per item — no ongoing cost.

## Source Files

| File | Role |
|------|------|
| `src/rendering/measured.ts` | `MeasuredSizeCache` implementation |
| `src/rendering/sizes.ts` | `SizeCache` interface (unchanged) |
| `src/builder/core.ts` | Config resolution, ResizeObserver wiring, scroll correction |
| `src/types.ts` | `estimatedHeight` / `estimatedWidth` on `ItemConfig` |
| `test/rendering/measured.test.ts` | 57 unit tests for the cache |

## Related Documentation

- [Orientation](./orientation.md) — Axis-neutral SizeCache architecture (Fixed, Variable, and Measured implementations)
- [Rendering](./rendering.md) — DOM rendering, element pooling, viewport calculations
- [Auto-Size Measurement Prompt](../issues/auto-size-measurement.md) — Original implementation prompt with investigation history

---

*Mode B is an extension of Mode A, not a replacement. The SizeCache abstraction ensures all downstream code works unchanged.*