# Scale Feature (Large Datasets)

> Handle 1M+ items with automatic scroll scaling that works around browser height limits.

## Overview

Browsers have a maximum element height limit of approximately **16.7 million pixels**. When a virtual list's total height (`totalItems × itemHeight`) exceeds this limit, we need **scaling** to make scrolling work.

### The Problem

```
1,000,000 items × 48px = 48,000,000 pixels
Browser limit ≈ 16,700,000 pixels
Result: Scrollbar breaks, can't reach end of list
```

### The Solution

The `withScale()` feature automatically detects when scaling is needed and switches from native scrolling to **manual wheel-based scrolling**:

1. **Native mode** (`overflow: auto`): Standard browser scrolling for smaller lists
2. **Scaled mode** (`overflow: hidden`): Manual wheel event handling for large lists

## Installation

```typescript
import { vlist, withScale, withScrollbar } from '@floor/vlist';

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

## How Scaling Works

### Key Concepts

| Term | Description |
|------|-------------|
| `actualSize` | True size if all items rendered: `totalItems × itemSize` |
| `virtualSize` | Capped size used for scroll bounds: `min(actualSize, 16M)` |
| `compressionRatio` | `virtualSize / actualSize` (1 = no scaling, <1 = scaled) |
| `virtualScrollIndex` | The item index at the current scroll position |

### Scroll Position Mapping

In scaled mode, scroll position maps to item index via ratio:

```javascript
// Scroll position → Item index
const scrollRatio = scrollPosition / virtualSize;
const itemIndex = Math.floor(scrollRatio * totalItems);

// Item index → Scroll position
const ratio = itemIndex / totalItems;
const scrollPos = ratio * virtualSize;
```

### Item Positioning

Items are positioned **relative to the viewport** (not content):

```javascript
const scrollRatio = scrollPosition / virtualSize;
const virtualScrollIndex = scrollRatio * totalItems;
const position = (itemIndex - virtualScrollIndex) * itemSize;
```

This formula ensures:
- Items at the current scroll position appear at viewport top (position ≈ 0)
- Items use their full `itemSize` (no visual scaling)
- Consecutive items are exactly `itemSize` pixels apart

### Near-Bottom Interpolation

Special handling ensures the last items are reachable:

```javascript
const maxScroll = virtualSize - containerSize;
const distanceFromBottom = maxScroll - scrollPosition;

if (distanceFromBottom <= containerSize) {
  // Special case: at exact max scroll, position from bottom up
  if (scrollPosition >= maxScroll - 1) {
    const totalSizeFromBottom = totalSize - itemOffset;
    return containerSize - totalSizeFromBottom;
  }
  
  // Otherwise: interpolate between scaled position and actual bottom
  const interpolation = 1 - (distanceFromBottom / containerSize);
  // Blend positions to smoothly reach the last items
}
```

**Exact Bottom Positioning:** When scrolled to the absolute bottom (`scrollPosition >= maxScroll - 1`), items are positioned from the bottom up to ensure pixel-perfect alignment with zero gap.

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
│  Scaled Mode (large lists)                          │
│  - overflow: hidden                                 │
│  - Intercept wheel events                           │
│  - Track virtual scrollPosition                     │
│  - Position items relative to viewport              │
├─────────────────────────────────────────────────────┤
│  Window Mode (document scrolling)                   │
│  - overflow: visible (list sits in page flow)       │
│  - Listen to window 'scroll' event                  │
│  - Scaling is purely mathematical                   │
│  - No wheel interception or overflow changes        │
└─────────────────────────────────────────────────────┘
```

> **Window mode + scaling:** When using `withPage()` and the list exceeds browser height limits, scaling activates but works differently — the content div height is set to the virtual height, and the browser scrolls natively. There is no `overflow: hidden` or wheel interception. The scaling ratio-based position mapping is purely mathematical.

### Mode Switching

Scaling activates automatically when needed:

```javascript
// Automatic detection
const scaleState = getScaleState(totalItems, itemHeight);

if (scaleState.isCompressed && !scrollController.isCompressed()) {
  scrollController.enableCompression(scaleState);
} else if (!scaleState.isCompressed && scrollController.isCompressed()) {
  scrollController.disableCompression();
}
```

### Rendering Flow

```
Wheel Event
    ↓
Update scrollPosition (virtual)
    ↓
Calculate visible range from scroll ratio
    ↓
Position items relative to viewport
    ↓
Items appear at correct positions
```

## API

### No Configuration Required

`withScale()` has no configuration options — it automatically detects when scaling is needed and activates transparently.

```typescript
import { vlist, withScale } from '@floor/vlist';

const list = vlist({
  container: '#app',
  items: millionItems,
  item: { height: 32, template: renderRow },
})
  .use(withScale())
  .build();
```

### Exported Utilities

For advanced use cases, you can import scaling utilities directly:

```typescript
import {
  MAX_VIRTUAL_SIZE,
  needsScaling,
  getMaxItemsWithoutScaling,
  getScaleInfo,
  getScaleState,
} from '@floor/vlist';

// Check if scaling needed
const needsScale = needsScaling(totalItems, itemHeight);

// Get max items without scaling for given height
const maxItems = getMaxItemsWithoutScaling(48); // → 333,333 items

// Get human-readable info
const info = getScaleInfo(totalItems, itemHeight);
// → "Scaled to 33.3% (1000000 items × 48px = 48.0M px → 16.0M px virtual)"

// Get full scale state
const state = getScaleState(totalItems, itemSize);
// → { isCompressed: true, actualSize: 48000000, virtualSize: 16000000, ratio: 0.333 }
```

## Constants

```typescript
// Maximum virtual size (browser safe limit)
const MAX_VIRTUAL_SIZE = 16_000_000; // 16M pixels

// Max items by size (without scaling)
// 48px → 333,333 items
// 40px → 400,000 items
// 32px → 500,000 items
// 24px → 666,666 items
```

## Custom Scrollbar

Scaled mode uses `overflow: hidden`, which hides the native scrollbar. Use `withScrollbar()` to add a custom scrollbar:

```typescript
import { vlist, withScale, withScrollbar } from '@floor/vlist';

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

See [Scrollbar Feature](./scrollbar.md) for full documentation.

## Examples

### Basic Usage (Million Items)

```typescript
import { vlist, withScale, getScaleInfo } from '@floor/vlist';

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

### With Grid Layout

```typescript
import { vlist, withScale, withGrid, withScrollbar } from '@floor/vlist';

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
import { vlist, withScale, withSections, withScrollbar } from '@floor/vlist';

const contacts = generateContacts(2_000_000);

const list = vlist({
  container: '#contacts',
  items: contacts,
  item: {
    height: 56,
    template: (contact) => `<div>${contact.name}</div>`,
  },
})
  .use(withSections({
    getGroupForIndex: (i) => contacts[i].lastName[0].toUpperCase(),
    headerHeight: 36,
    headerTemplate: (letter) => `<div>${letter}</div>`,
    sticky: true,
  }))
  .use(withScale())
  .use(withScrollbar())
  .build();
```

## ViewportState

When scaling is active, the viewport state reflects the scaled state:

```typescript
list.on('scroll', ({ scrollPosition }) => {
  console.log(list.getViewportState());
});
```

// Returns:
```typescript
{
  scrollPosition: 5000000,   // Current scroll position
  containerSize: 600,        // Viewport size
  totalSize: 16000000,       // Virtual size (capped)
  actualSize: 48000000,      // True size (uncapped)
  isCompressed: true,        // Scaling active
  compressionRatio: 0.333,   // Scale factor
  visibleRange: { start: 104166, end: 104178 },
  renderRange: { start: 104163, end: 104181 }
}
```

## Performance

Scaling has minimal performance impact:

- **Calculation overhead:** < 1ms per scroll frame
- **Memory overhead:** ~2-3 KB state
- **Render performance:** Identical to non-scaled mode
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
| `withGrid()` | ✅ Yes | Scales grid rows automatically |
| `withSections()` | ✅ Yes | Scales grouped layout |
| `withAsync()` | ✅ Yes | Scales async-loaded data |
| `withSelection()` | ✅ Yes | No impact on selection |
| `withScrollbar()` | ✅ Recommended | Custom scrollbar for scaled mode |
| `withPage()` | ✅ Yes | Mathematical scaling only |
| `withSnapshots()` | ✅ Yes | No impact on snapshots |

## Known Limitations

1. **Window mode visual quirk:** In window mode with scaling active, rapid scrolling may show a slight jump when switching between scaled and exact positioning near the bottom. This is a visual artifact of the mathematical mapping and doesn't affect functionality.

2. **Wheel event override:** Scaled mode intercepts wheel events, which means custom wheel handling in parent elements may not work as expected.

3. **Native scrollbar hidden:** Scaled mode hides the native scrollbar. Always use `withScrollbar()` when scaling is active.

## Related

- [Scrollbar Feature](./scrollbar.md) - Custom scrollbar (required for scaled mode)
- [Grid Feature](./grid.md) - 2D grid layout with scaling support
- [Sections Feature](./sections.md) - Grouped lists with scaling support
- [Page Feature](./page.md) - Window scrolling with mathematical scaling

## Live Examples

- [Large List](/examples/data/large-list) — 100K–5M items with withScale (4 frameworks)

---

**Bundle cost:** +2.2 KB gzipped  
**Status:** Stable  
**Since:** v1.0.0
