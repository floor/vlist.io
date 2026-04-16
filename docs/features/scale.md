# Scale Feature (Large Datasets)

> Handle 1M+ items with automatic scroll compression that works around browser height limits.

## Overview

Browsers have a maximum element height limit of approximately **16.7 million pixels**. When a virtual list's total height (`totalItems × itemHeight`) exceeds this limit, we need **compression** to make scrolling work.

### The Problem

```
1,000,000 items × 48px = 48,000,000 pixels
Browser limit ≈ 16,700,000 pixels
Result: Scrollbar breaks, can't reach end of list
```

### The Solution

The `withScale()` feature automatically detects when compression is needed and switches from native scrolling to **manual wheel-based scrolling**:

1. **Native mode** (`overflow: auto`): Standard browser scrolling for smaller lists
2. **Compressed mode** (`overflow: hidden`): Manual wheel event handling for large lists

## Installation

```typescript
import { vlist, withScale, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  items: generateItems(2_000_000),
  item: { height: 48, template: (item) => `<div>${item.id}</div>` },
})
  .use(withScale())                      // Auto-activates above browser limit
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle cost:** +2.2 KB gzipped

## How Compression Works

### Key Concepts

| Term | Description |
|------|-------------|
| `actualSize` | True size if all items rendered: `totalItems × itemSize` |
| `virtualSize` | Capped size used for scroll bounds: `min(actualSize, 16M)` |
| `compressionRatio` | `virtualSize / actualSize` (1 = no compression, <1 = compressed) |
| `compressedItemSize` | `virtualSize / totalItems` — scroll-space per item |
| `compressionSlack` | Extra scroll range added so the linear formula reaches every item |

### Scroll Position Mapping

In compressed mode, scroll position maps to item index via a **purely linear** formula:

```javascript
// Scroll position → Item index
const scrollRatio = scrollPosition / virtualSize;
const itemIndex = Math.floor(scrollRatio * totalItems);

// Item index → Scroll position
const compressedItemSize = virtualSize / totalItems;
const scrollPos = itemIndex * compressedItemSize;
```

This mapping is **bijective** — every index maps to a unique scroll position and vice versa. There are no special cases or non-linear zones.

### Item Positioning

Items are positioned **relative to the viewport** (not the content element):

```javascript
// Map scroll position to an actual-pixel offset
const scrollRatio = scrollPosition / virtualSize;
const actualScrollOffset = scrollRatio * actualSize;

// Position item relative to that offset
const position = sizeCache.getOffset(index) - actualScrollOffset;
```

This formula ensures:
- Items at the current scroll position appear at viewport top (position ≈ 0)
- Items use their full `itemSize` (no visual compression)
- Consecutive items are exactly `itemSize` pixels apart
- **No discontinuities** — the formula is continuous across the entire scroll range

### Compression Slack

Without correction, the maximum scroll position (`virtualSize − containerSize`) maps to an index ~37 items from the end for typical configurations, leaving the tail of the list unreachable. This happens because each compressed item occupies `compressedItemSize` virtual pixels but displays at its full `itemSize` — the viewport "covers" more compressed items than it can actually display.

**Compression slack** extends the content div's virtual height by a small amount so the linear formula can address every item:

```javascript
// effectiveSize = viewport area available for items (excludes CSS padding)
const effectiveSize = containerSize - mainAxisPadding;

// Slack = the extra virtual pixels needed to reach the last item
const slack = effectiveSize * (1 - compressionRatio) + mainAxisPadding;

// Content height = virtualSize + slack
// New maxScroll = virtualSize + slack - containerSize
```

At the new `maxScroll`, the linear formula maps precisely to the last screenful of items, with the final item's bottom edge flush with the viewport's bottom edge. The slack is always less than `containerSize` (~465px for a typical 598px viewport with ratio 0.222), well within the browser's height limit.

**Why not near-bottom interpolation?** An earlier design used a non-linear "interpolation zone" near the bottom of the scroll range to blend between the linear position and the actual bottom. This was removed because it made the scroll↔index mapping non-invertible — `scrollToFocus` couldn't compute the correct scroll position for a target index, causing the focused item to drift off-screen during keyboard navigation (End → repeated PageUp). The compression slack approach keeps the mapping purely linear and bijective.

### CSS Padding Awareness

When the list has CSS padding configured (`padding` option), the compression slack formula accounts for it:

- `effectiveSize = containerSize - paddingTop - paddingBottom` (vertical) or `- paddingLeft - paddingRight` (horizontal)
- The slack is computed on the effective size, then the padding is added back
- This ensures the last item's bottom aligns with the viewport bottom, leaving room for the CSS end-padding

## Architecture

### Scroll Controller

The scroll controller handles all three modes:

```
┌─────────────────────────────────────────────────────┐
│                  ScrollController                    │
├─────────────────────────────────────────────────────┤
│  Native Mode (small lists)                          │
│  - overflow: auto                                   │
│  - Browser handles scrolling                        │
│  - Listen to 'scroll' event                         │
├─────────────────────────────────────────────────────┤
│  Compressed Mode (large lists)                      │
│  - overflow: hidden                                 │
│  - Intercept wheel events                           │
│  - Track virtual scrollPosition                     │
│  - Position items relative to viewport              │
│  - Content height = virtualSize + compressionSlack  │
├─────────────────────────────────────────────────────┤
│  Window Mode (document scrolling)                   │
│  - overflow: visible (list sits in page flow)       │
│  - Listen to window 'scroll' event                  │
│  - Compression is purely mathematical               │
│  - No wheel interception or overflow changes        │
└─────────────────────────────────────────────────────┘
```

> **Window mode + compression:** When using `withPage()` and the list exceeds browser height limits, compression activates but works differently — the content div height is set to the virtual height, and the browser scrolls natively. There is no `overflow: hidden` or wheel interception. The compression ratio-based position mapping is purely mathematical.

### Mode Switching

Compression activates automatically when needed:

```javascript
// Automatic detection
const compressionState = getCompressionState(totalItems, sizeCache);

if (compressionState.isCompressed && !scrollController.isCompressed()) {
  scrollController.enableCompression(compressionState);
  // Compute compression slack for the linear formula
  const slack = compressionSlack(virtualSize, containerSize, ratio, mainAxisPad);
  updateContentSize(virtualSize + slack);
} else if (!compressionState.isCompressed && scrollController.isCompressed()) {
  scrollController.disableCompression();
}
```

### Rendering Flow

```
Wheel / Touch / Keyboard Event
    ↓
Update virtualScrollPosition (lerp-smoothed for wheel)
    ↓
Calculate visible range:  scrollRatio × totalItems
    ↓
Position items:  sizeCache.getOffset(i) − scrollRatio × actualSize
    ↓
Items appear at correct positions (full height, no visual compression)
```

### Content Size Notification

When compression changes the effective content size (via compression slack), the scale feature fires `contentSizeHandlers` to notify other features. This is critical for `withScrollbar`, which caches `totalSize` for its thumb calculations:

```
updateCompressionMode()
    ↓
Compute compression slack
    ↓
updateContentSize(virtualSize + slack)
    ↓
Update viewportState.totalSize (includes slack)
    ↓
Fire contentSizeHandlers → withScrollbar.updateBounds()
```

Both the default `updateCompressionMode` (no-op + notify) and the enhanced version (withScale) fire `contentSizeHandlers`, ensuring consistent notification regardless of whether compression is active.

## API

### Configuration

`withScale()` accepts an optional configuration object:

```typescript
interface ScaleConfig {
  /**
   * Force compressed scroll mode even when the total size is below the
   * browser's ~16.7M pixel limit.
   *
   * When true, the feature always activates compressed scrolling
   * (custom wheel/touch handling, lerp-based smooth scroll, custom
   * scrollbar fallback) regardless of the list size.
   *
   * Useful for:
   * - Testing — verify compression behaviour with a small item set
   * - Consistent UX — use the same smooth scroll physics for all lists
   * - Pre-emptive — avoid the mode switch when items are added at runtime
   *
   * @default false
   */
  force?: boolean;
}
```

#### Auto Mode (Default)

Compression activates automatically when the total height exceeds the browser limit:

```typescript
import { vlist, withScale } from 'vlist';

const list = vlist({
  container: '#app',
  items: millionItems,
  item: { height: 32, template: renderRow },
})
  .use(withScale())
  .build();
```

#### Force Mode

Force compressed scrolling on all lists for consistent scroll physics:

```typescript
const list = vlist({
  container: '#app',
  items: smallDataset,    // even with few items
  item: { height: 48, template: renderRow },
})
  .use(withScale({ force: true }))
  .build();
```

In force mode with a small dataset, the compression ratio is 1 (no actual compression), but the scroll pipeline switches to virtual mode: `overflow: hidden`, custom wheel/touch handling with lerp-based smooth scrolling, and a custom scrollbar. Items are positioned viewport-relative (`offset - scrollPosition`) instead of using native scroll offset.

### Exported Utilities

For advanced use cases, you can import compression utilities directly:

```typescript
import {
  MAX_VIRTUAL_SIZE,
  needsScaling,
  getMaxItemsWithoutScaling,
  getScaleInfo,
  getScaleState,
} from 'vlist';

// Check if compression needed
const needsScale = needsScaling(totalItems, itemHeight);

// Get max items without compression for given height
const maxItems = getMaxItemsWithoutScaling(48); // → 333,333 items

// Get human-readable info
const info = getScaleInfo(totalItems, itemHeight);
// → "Scaled to 33.3% (1000000 items × 48px = 48.0M px → 16.0M px virtual)"

// Get full compression state
const state = getScaleState(totalItems, itemSize);
// → { isCompressed: true, actualSize: 48000000, virtualSize: 16000000, ratio: 0.333 }
```

## Constants

```typescript
// Maximum virtual size (browser safe limit)
const MAX_VIRTUAL_SIZE = 16_000_000; // 16M pixels

// Max items by size (without compression)
// 48px → 333,333 items
// 40px → 400,000 items
// 32px → 500,000 items
// 24px → 666,666 items
```

## Custom Scrollbar

Compressed mode uses `overflow: hidden`, which hides the native scrollbar. Use `withScrollbar()` to add a custom scrollbar:

```typescript
import { vlist, withScale, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  items: largeDataset,
  item: { height: 48, template: renderItem },
})
  .use(withScale())
  .use(withScrollbar({
    autoHide: true,
    autoHideDelay: 1000,
  }))
  .build();
```

The scrollbar reads `viewportState.totalSize` (which includes compression slack) for its bounds, ensuring the thumb can reach the very bottom of the list.

See [Scrollbar Feature](./scrollbar.md) for full documentation.

## Keyboard Navigation in Compressed Mode

The `scrollToFocus` function handles keyboard navigation (ArrowUp/Down, PageUp/Down, Home/End) in compressed mode using the same linear formula:

### Scroll-to-Focus Algorithm

```javascript
// Item above viewport → align to top edge
if (index <= visibleRange.start) {
  return index * compressedItemSize;
}

// Item below viewport → align to bottom edge (fractional precision)
if (index >= visibleRange.start + fullyVisible) {
  const exactVisible = effectiveSize / itemSize;  // e.g. 8.306
  const wantStart = index + 1 - exactVisible;     // fractional top index
  return wantStart * compressedItemSize;
}

// Item already visible → no scroll
return scrollPosition;
```

**Key design decisions:**
- The "above" check uses `index <= visibleRange.start` (not `visibleRange.end - fullyVisible`) to avoid false positives during arrow-down navigation
- The "below" alignment uses fractional `effectiveSize / itemSize` (not integer `fullyVisible`) so the focused item's bottom edge aligns precisely with the viewport bottom
- All computed positions are valid within `[0, maxScroll]` thanks to compression slack — no clamping needed

### Viewport State Consistency

The `coreRenderIfNeeded` early-return path (when the render range is unchanged but scroll position changed) now always updates `viewportState.scrollPosition` and `viewportState.visibleRange`. This prevents stale state during rapid keyboard navigation where consecutive keypresses may fall within the same overscan buffer.

## Examples

### Basic Usage (Million Items)

```typescript
import { vlist, withScale, getScaleInfo } from 'vlist';

const items = Array.from({ length: 1_000_000 }, (_, i) => ({
  id: i,
  name: `Item ${i + 1}`,
}));

console.log(getScaleInfo(items.length, 48));
// "Scaled to 33.3% (1000000 items × 48px = 48.0M px → 16.0M px virtual)"

const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item) => `<div class="item">${item.name}</div>`,
  },
  items,
})
  .use(withScale())
  .use(withScrollbar())
  .build();

// Scroll to middle
list.scrollToIndex(500_000, 'center');

// Scroll to end
list.scrollToIndex(999_999, 'end');
```

### With Table Layout

```typescript
import { vlist, withScale, withTable, withScrollbar } from 'vlist';

const rows = generateRows(1_000_000);

const table = vlist({
  container: '#table',
  item: { height: 36, template: () => '' },
  items: rows,
})
  .use(withTable({
    columns: [
      { key: 'name',       label: 'Name',       width: 220, sortable: true },
      { key: 'email',      label: 'Email',      width: 280 },
      { key: 'department', label: 'Department',  width: 160 },
    ],
    rowHeight: 36,
  }))
  .use(withScale())
  .use(withScrollbar())
  .build();
```

### With Grid Layout

```typescript
import { vlist, withScale, withGrid, withScrollbar } from 'vlist';

const photos = generatePhotos(5_000_000);

const gallery = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: 200,
    template: (photo) => `<img src="${photo.url}" />`,
  },
})
  .use(withGrid({ columns: 6, gap: 16 }))
  .use(withScale())
  .use(withScrollbar())
  .build();
```

### With Sections

```typescript
import { vlist, withScale, withGroups, withScrollbar } from 'vlist';

const contacts = generateContacts(2_000_000);

const list = vlist({
  container: '#contacts',
  items: contacts,
  item: {
    height: 56,
    template: (contact) => `<div>${contact.name}</div>`,
  },
})
  .use(withGroups({
    getGroupForIndex: (i) => contacts[i].lastName[0].toUpperCase(),
    header: {
      height: 36,
      template: (letter) => `<div>${letter}</div>`,
    },
    sticky: true,
  }))
  .use(withScale())
  .use(withScrollbar())
  .build();
```

### With CSS Padding

```typescript
import { vlist, withScale, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  items: largeDataset,
  item: { height: 48, template: renderItem },
  padding: [16, 12],  // 16px top/bottom, 12px left/right
})
  .use(withScale())
  .use(withScrollbar())
  .build();
```

The compression slack automatically accounts for CSS padding — the formula reduces the effective viewport size by the main-axis padding, ensuring the last item is reachable and correctly positioned.

## ViewportState

When compression is active, the viewport state reflects the compressed state:

```typescript
list.on('scroll', ({ scrollPosition }) => {
  console.log(list.getViewportState());
});
```

```typescript
{
  scrollPosition: 5000000,   // Current scroll position (virtual)
  containerSize: 600,        // Viewport size
  totalSize: 16000465,       // Virtual size + compression slack
  actualSize: 48000000,      // True size (uncapped)
  isCompressed: true,        // Compression active
  compressionRatio: 0.333,   // Compression factor
  visibleRange: { start: 104166, end: 104178 },
  renderRange: { start: 104163, end: 104181 }
}
```

> **Note:** `totalSize` includes the compression slack, not just `virtualSize`. This is the effective content height used by the scrollbar and other features.

## Performance

Compression has minimal performance impact:

- **Calculation overhead:** < 1ms per scroll frame
- **Memory overhead:** ~2-3 KB state
- **Render performance:** Identical to non-compressed mode
- **Smooth scrolling:** 60fps with 1M+ items

The feature only activates when needed, so smaller lists have zero overhead.

## Browser Compatibility

The scale feature works in all modern browsers:

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Maximum height limits vary slightly by browser:
- Chrome/Edge: ~33.5M px
- Firefox: ~17.8M px
- Safari: ~16.7M px

The feature uses a conservative 16M px limit for cross-browser compatibility.

## Combining with Other Features

`withScale()` works seamlessly with all other features:

| Feature | Compatible | Notes |
|--------|------------|-------|
| `withGrid()` | ✅ Yes | Compresses grid rows automatically |
| `withTable()` | ✅ Yes | Rows positioned viewport-relative in compressed mode |
| `withGroups()` | ✅ Yes | Compresses grouped layout |
| `withAsync()` | ✅ Yes | Compresses async-loaded data |
| `withSelection()` | ✅ Yes | Keyboard nav uses linear scroll-to-focus formula |
| `withScrollbar()` | ✅ Recommended | Custom scrollbar for compressed mode |
| `withPage()` | ✅ Yes | Mathematical compression only |
| `withSnapshots()` | ✅ Yes | No impact on snapshots |

## Known Limitations

1. **Wheel event override:** Compressed mode intercepts wheel events, which means custom wheel handling in parent elements may not work as expected.

2. **Native scrollbar hidden:** Compressed mode hides the native scrollbar. Always use `withScrollbar()` when compression is active.

3. **Touch inertia approximation:** Touch momentum scrolling on iOS/Android uses a deceleration curve that approximates native behaviour but doesn't perfectly match the platform's physics.

4. **Uniform item size assumption:** The linear compressed-index formula assumes roughly uniform item sizes. This is acceptable because `withScale` is designed for massive lists with fixed row heights. Variable-height items within a small range work fine, but extreme variation (e.g. 20px to 2000px) may cause slight positioning drift.

## See Also

- [Constants — `MAX_VIRTUAL_SIZE`](../api/constants.md#max_virtual_size) — 16M pixel browser limit that triggers compression
- [Types — `CompressionState`](../api/types.md#compressionstate) — `isCompressed`, `actualSize`, `virtualSize`, `ratio`
- [Exports — Scale](../api/exports.md#scale) — `getScaleState`, `needsScaling`, `calculateCompressedVisibleRange`, and other compression utilities
- [Scrollbar](./scrollbar.md) — Custom scrollbar (always use with scale — native scrollbar is hidden in compressed mode)
- [Async](./async.md) — Lazy loading for large datasets that trigger compression
- [Page](./page.md) — Compatible with `withScale` (mathematical compression only)

## Examples

- [Large List](/examples/large-list) — 100K–5M items with scroll compression
- [Velocity Loading](/examples/velocity-loading) — Async loading with scale, scrollbar, and selection combined