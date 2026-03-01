# Masonry Layout

Transform your virtual list into a Pinterest-style masonry layout with the `withMasonry` feature.

## Overview

The `withMasonry` feature converts a linear virtual list into a masonry/Pinterest-style layout where items flow into the shortest column (or row in horizontal mode). Unlike grid layouts with aligned rows, masonry creates an organic, packed appearance with no wasted space.

### What It Does

- **Shortest-Lane Placement** — Items automatically flow into the shortest column/row
- **Variable Heights** — Each item can have a different size, creating organic layouts
- **Scroll-Based Virtualization** — Only visible items are rendered based on scroll position
- **Auto-Responsive** — Column/row width adjusts automatically on container resize
- **Gap Support** — Configurable spacing between items (horizontal and vertical)
- **Memory Efficient** — Virtualization keeps DOM nodes minimal

### Key Features

- ✅ **Builder-Based** — Composable via `vlist().use(withMasonry())` API
- ✅ **Orientation-Agnostic** — Vertical (default) and horizontal masonry layouts
- ✅ **Dynamic Sizing** — Variable item heights/widths for packed layouts
- ✅ **Cached Placements** — O(1) position lookups after initial O(n) calculation
- ✅ **Selection Support** — Works with `withSelection` for selectable items
- ✅ **Scrollbar Support** — Works with `withScrollbar` for custom scrollbars

### Key Differences from Grid

| Aspect | Grid | Masonry |
|--------|------|---------|
| **Layout** | Row-based alignment | Shortest-lane flow |
| **Virtualization** | By rows (O(1)) | By scroll position |
| **Positioning** | Row/col calculations | Cached x/y coordinates |
| **Item placement** | Sequential in rows | Dynamic to shortest lane |
| **Visual** | Aligned rows | Organic, packed |

## Quick Start

```js
import { vlist, withMasonry } from '@floor/vlist'

const gallery = vlist({
  container: '#gallery',
  item: {
    height: (index) => photos[index].height, // Variable heights
    template: (item) => `
      <div class="card">
        <img src="${item.url}" alt="${item.title}" loading="lazy" />
        <h3>${item.title}</h3>
      </div>
    `,
  },
  items: photos,
})
.use(withMasonry({ columns: 4, gap: 8 }))
.build()
```

### HTML Structure

```html
<div id="gallery" style="height: 600px;"></div>
```

### Result

The masonry feature will:
1. Calculate column width: `(containerWidth - (columns - 1) * gap) / columns`
2. Track the height of each column
3. For each item, find the shortest column and place the item there
4. Cache all item positions (x, y coordinates)
5. Render only items visible in the viewport
6. Add data attribute: `data-lane` to each item (column index)
7. Add `.vlist--masonry` class to the container

## Configuration

### Masonry Feature Config

```ts
interface MasonryFeatureConfig {
  /** Number of cross-axis divisions (columns in vertical, rows in horizontal) */
  columns: number

  /** Gap between items in pixels (default: 0) */
  gap?: number
}
```

**Example:**

```js
const gallery = vlist({
  container: '#gallery',
  item: {
    height: (index) => calculateHeight(items[index]),
    template: renderItem,
  },
  items: photos,
})
.use(withMasonry({ columns: 4, gap: 8 }))
.build()
```

### Item Height Requirements

Masonry **requires** item heights to be deterministic (calculable before rendering).

When the height is a function, it receives two parameters — the item **index** and a **context** object:

- `columnWidth` — Current column width in pixels (precomputed, updates on resize)
- `containerSize` — Current container size in pixels (cross-axis dimension)
- `columns` — Number of columns
- `gap` — Gap between items in pixels

> **Responsive by default:** When you use a height function with `columnWidth`, item heights automatically recalculate on container resize — no manual intervention needed.

#### ✅ Good — Deterministic Heights

```js
// Aspect ratio from data — responsive to resize
item: {
  height: (index, { columnWidth }) => Math.round(columnWidth * photos[index].aspectRatio),
  template: renderPhoto,
}

// Fixed pixel heights from data
item: {
  height: (index) => photos[index].height,
  template: renderPhoto,
}

// Fixed categories
item: {
  height: (index) => items[index].type === 'large' ? 400 : 200,
  template: renderItem,
}
```

#### ❌ Bad — Non-Deterministic Heights

```js
// Dynamic content that requires measuring
item: {
  estimatedHeight: 200, // This uses auto-measurement, won't work with masonry!
  template: renderDynamicContent,
}

// Heights dependent on render
item: {
  height: 200, // Fixed height but content varies - will cause layout issues
  template: (item) => `<div>${item.longText}</div>`, // Text might overflow
}
```

**Why?** Masonry pre-calculates all item positions before rendering. It needs to know each item's size upfront to determine which column is shortest.

## Orientation Support

Masonry works in both vertical and horizontal orientations:

### Vertical Masonry (Default)

```js
const gallery = vlist({
  container: '#gallery',
  orientation: 'vertical', // Default
  item: {
    // columnWidth adapts on resize — aspect ratios preserved
    height: (index, { columnWidth }) => Math.round(columnWidth * photos[index].aspectRatio),
    template: renderPhoto,
  },
  items: photos,
})
.use(withMasonry({ columns: 4, gap: 8 }))
.build()
```

**Layout:**
```
┌─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │
│     ├─────┤     ├─────┤
├─────┤  5  │     │  7  │
│  6  │     ├─────┤     │
│     ├─────┤  8  ├─────┤
│     │  9  │     │ 10  │
└─────┴─────┴─────┴─────┘
   ↓ Scroll down
```

- **4 vertical columns** of independent heights
- Items flow into shortest column
- Scrolls vertically (↓)
- The context's `columnWidth` is the width of each column

### Horizontal Masonry

```js
const timeline = vlist({
  container: '#timeline',
  orientation: 'horizontal',
  item: {
    // width function receives the same context — columnWidth is now each row's height
    width: (index, { columnWidth }) => Math.round(columnWidth * events[index].aspectRatio),
    height: 200, // Fixed cross-axis size
    template: renderEvent,
  },
  items: events,
})
.use(withMasonry({ columns: 3, gap: 12 }))
.build()
```

**Layout:**
```
┌────┬────────┬──┐
│ 1  │   4    │ 7│ ← Row 0
├────┼────┬───┼──┤
│ 2  │ 5  │ 6 │ 8│ ← Row 1
├────┼────┴───┼──┤
│ 3  │   9    │10│ ← Row 2
└────┴────────┴──┘
  → Scroll right
```

- **3 horizontal rows** of independent widths
- Items flow into shortest row
- Scrolls horizontally (→)
- In horizontal mode, `columns` controls the number of **rows**, and `columnWidth` in the context is each row's height

> The context object works identically in both orientations — `columnWidth` always refers to the cross-axis cell size, adapting automatically on resize.

**Note:** In horizontal mode, you must specify both `height` and `width` in the item config.

## Examples

### Pinterest-Style Photo Gallery

```js
import { vlist, withMasonry } from '@floor/vlist'

const photos = [
  { id: 1, url: 'photo1.jpg', aspectRatio: 0.75, title: 'Sunset' },
  { id: 2, url: 'photo2.jpg', aspectRatio: 1.5, title: 'Mountain' },
  { id: 3, url: 'photo3.jpg', aspectRatio: 0.66, title: 'Ocean' },
  // ... more photos with varying aspect ratios
]

const gallery = vlist({
  container: '#gallery',
  item: {
    // Height derived from columnWidth — adapts on resize
    height: (index, { columnWidth }) => Math.round(columnWidth * photos[index].aspectRatio),
    template: (item) => `
      <div class="photo-card">
        <img 
          src="${item.url}" 
          alt="${item.title}"
          loading="lazy"
        />
        <div class="photo-overlay">
          <h3>${item.title}</h3>
        </div>
      </div>
    `,
  },
  items: photos,
})
.use(withMasonry({ columns: 4, gap: 12 }))
.build()
```

### Responsive Columns

```js
const gallery = vlist({
  container: '#gallery',
  item: {
    height: (index, { columnWidth }) => Math.round(columnWidth * photos[index].aspectRatio),
    template: renderPhoto,
  },
  items: photos,
})
.use(withMasonry({ columns: getResponsiveColumns(), gap: 8 }))
.build()

function getResponsiveColumns() {
  const width = window.innerWidth
  if (width < 640) return 2
  if (width < 1024) return 3
  if (width < 1536) return 4
  return 5
}

// Update column count on resize
window.addEventListener('resize', () => {
  gallery.updateMasonry({ columns: getResponsiveColumns() })
})
```

> **Note:** Item heights using `columnWidth` adapt automatically on container resize. You only need to update columns manually if you want breakpoint-based column counts.

### Product Catalog with Variable Heights

```js
const products = [
  { id: 1, name: 'Widget', price: 9.99, image: 'widget.jpg', hasDetails: true },
  { id: 2, name: 'Gadget', price: 19.99, image: 'gadget.jpg', hasDetails: false },
  // ...
]

const catalog = vlist({
  container: '#catalog',
  item: {
    height: (index, { columnWidth }) => {
      const product = products[index]
      // Taller cards for products with details, responsive to column width
      return product.hasDetails
        ? Math.round(columnWidth * 1.4)
        : Math.round(columnWidth)
    },
    template: (item) => `
      <div class="product-card">
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
        <h3>${item.name}</h3>
        <p class="price">$${item.price}</p>
      </div>
    `,
  },
  items: products,
})
.use(withMasonry({ columns: 3, gap: 16 }))
.build()
```

### Masonry with Selection

```js
import { vlist, withMasonry, withSelection } from '@floor/vlist'

const gallery = vlist({
  container: '#gallery',
  item: {
    height: (index) => photos[index].height,
    template: (item, index, state) => `
      <div class="card ${state.selected ? 'selected' : ''}">
        <img src="${item.url}" alt="${item.title}" />
        ${state.selected ? '<div class="checkmark">✓</div>' : ''}
      </div>
    `,
  },
  items: photos,
})
.use(withMasonry({ columns: 4, gap: 8 }))
.use(withSelection({ mode: 'multiple' }))
.build()

// Listen for selection changes
gallery.on('selection:change', ({ selectedIndices }) => {
  console.log(`Selected ${selectedIndices.length} photos`)
})
```

### Content Feed with Mixed Media

```js
const feedItems = [
  { id: 1, type: 'text', content: '...', height: 150 },
  { id: 2, type: 'image', url: '...', height: 300 },
  { id: 3, type: 'video', url: '...', height: 400 },
  // ...
]

const feed = vlist({
  container: '#feed',
  item: {
    height: (index) => feedItems[index].height,
    template: (item) => {
      if (item.type === 'text') {
        return `<div class="text-post">${item.content}</div>`
      }
      if (item.type === 'image') {
        return `<img src="${item.url}" loading="lazy" />`
      }
      if (item.type === 'video') {
        return `<video src="${item.url}" controls></video>`
      }
    },
  },
  items: feedItems,
})
.use(withMasonry({ columns: 3, gap: 16 }))
.build()
```

## API Reference

### withMasonry(config)

Creates a masonry feature for the builder.

**Parameters:**
- `config.columns` (number, required) — Number of cross-axis divisions (>= 1)
- `config.gap` (number, optional) — Gap between items in pixels (default: 0)

**Returns:** `VListFeature` — A feature that can be passed to `.use()`

**Example:**

```js
import { vlist, withMasonry } from '@floor/vlist'

const list = vlist({
  container: '#app',
  item: {
    height: (index) => items[index].height,
    template: renderItem,
  },
  items: data,
})
.use(withMasonry({ columns: 4, gap: 8 }))
.build()
```

### Built List API

The masonry feature doesn't add new methods — all standard vlist methods work as expected:

```js
const list = vlist(config)
  .use(withMasonry({ columns: 4, gap: 8 }))
  .build()

// Standard methods work
list.scrollToIndex(10, 'center') // Scrolls to item 10
list.getViewportState()          // Returns viewport state
list.destroy()                   // Cleanup
```

### Data Attributes

Masonry items receive a data attribute:

```html
<div class="vlist-item" data-lane="2">
  <!-- Your content -->
</div>
```

- `data-lane` — Cross-axis division index (column in vertical, row in horizontal, 0-based)

Use this for CSS styling or JavaScript logic.

## Performance

### Algorithm Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| **Layout calculation** | O(n) | One-time cost per data change, n = total items |
| **Position lookup** | O(1) | Cached placements array |
| **Visibility check** | O(k × log(n/k)) | Per-lane binary search, k = columns |
| **Total size** | O(1) | Cached during layout calculation |
| **Scroll frame (steady)** | O(1) | Early exit when position unchanged |

**Example with 10,000 items, 4 columns:**
- Layout calculation: ~10-20ms (one-time cost)
- Visibility query: ~44 comparisons (vs 10,000 linear scan)
- Steady-state scroll frame: 0 work (early exit)
- Rendering: Only visible items (~20-40 DOM nodes)

### Scroll-Frame Optimizations

The masonry feature is heavily optimized for the scroll hot path — the code that runs on every `scroll` event:

**Zero-allocation steady-state scroll:**
- Pooled visible-items array (reused, not allocated per frame)
- Reusable visibility Set for O(1) element recycling decisions
- Cached `getItem` closure (created once at setup)
- Cached empty Set for no-selection case
- Viewport state mutated in place (no object creation)
- DocumentFragment batching for new DOM insertions (matches core renderer)
- Release grace period — items kept alive for extra render cycles after leaving the visible set, preventing boundary thrashing (hover state loss, CSS transition replays)

**Change tracking in the renderer:**
- Template re-evaluation skipped when item id + selection/focus state unchanged
- Position updates skipped when coordinates unchanged
- `aria-setsize` string conversion cached until total count changes

**Early exit guard:**
- When scroll position and container size are identical to the previous frame, all downstream work is skipped entirely — no binary search, no renderer diffing, no viewport state updates

### Memory Efficiency

With a 4-column masonry of 1,000 items:
- **Without virtualization:** 1,000 DOM nodes
- **With masonry virtualization:** ~40 DOM nodes (visible items only)
- **Savings:** ~96% fewer DOM nodes

Element pooling recycles DOM elements as items leave the viewport, avoiding `createElement` costs during fast scrolling.

### Comparison with Grid

| Metric | Grid | Masonry |
|--------|------|---------|
| **Layout calculation** | O(1) | O(n) |
| **Visibility check** | O(1) row math | O(k × log(n/k)) binary search |
| **Position lookup** | O(1) | O(1) cached |
| **Memory** | Minimal | Minimal + placement cache |
| **Visual alignment** | Perfect rows | Organic flow |
| **Use case** | Uniform content | Variable-height content |

**Recommendation:** Use grid for uniform content (cards, products), use masonry for variable-height content (photos, articles, feeds).

## Styling

### Default CSS Classes

Masonry adds a modifier class to the container:

```css
.vlist--masonry {
  /* Applied when masonry feature is active */
}

.vlist-item {
  /* Each masonry item */
  position: absolute;
  box-sizing: border-box;
}

.vlist-item[data-lane="0"] {
  /* First column/row items */
}
```

### Example Styles

```css
.vlist--masonry .vlist-item {
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.vlist--masonry .vlist-item:hover {
  transform: scale(1.02);
  z-index: 10;
}

.vlist--masonry .vlist-item--selected {
  outline: 3px solid #3b82f6;
  outline-offset: -3px;
}

.vlist--masonry .vlist-item img {
  width: 100%;
  display: block;
}

/* Responsive styles */
@media (max-width: 768px) {
  .vlist--masonry .vlist-item {
    border-radius: 4px;
  }
}
```

### Custom Class Prefix

```js
const gallery = vlist({
  container: '#gallery',
  classPrefix: 'my-masonry', // Custom prefix
  item: {
    height: (index) => photos[index].height,
    template: renderItem,
  },
  items: photos,
})
.use(withMasonry({ columns: 4, gap: 8 }))
.build()
```

Now use `.my-masonry--masonry` and `.my-masonry-item` in your CSS.

## Best Practices

### 1. Use Responsive Heights with Context

**✅ Best** — Aspect ratios from data, responsive to resize:

```js
item: {
  height: (index, { columnWidth }) => Math.round(columnWidth * items[index].aspectRatio),
  template: renderItem,
}
```

**✅ OK** — Fixed pixel heights from data (won't adapt on resize):

```js
item: {
  height: (index) => items[index].height,
  template: renderItem,
}
```

**❌ Bad** — Heights dependent on rendering:

```js
item: {
  estimatedHeight: 200, // Won't work with masonry!
  template: renderDynamicContent,
}
```

### 2. Use Appropriate Column Counts

Choose columns based on your content and viewport:

```js
// Compact - many narrow columns
.use(withMasonry({ columns: 6, gap: 4 }))

// Standard - balanced layout
.use(withMasonry({ columns: 4, gap: 8 }))

// Spacious - fewer wide columns
.use(withMasonry({ columns: 2, gap: 16 }))
```

### 3. Optimize Images

Use lazy loading and proper sizing:

```js
template: (item) => `
  <img 
    src="${item.url}" 
    loading="lazy" 
    decoding="async"
    alt="${item.title}"
  />
`
```

### 4. Consider Container Padding

Container padding affects column width calculations:

```css
#gallery {
  padding: 16px;
  box-sizing: border-box; /* Important! */
}
```

The masonry layout automatically accounts for this if you use `box-sizing: border-box`.

### 5. Handle Data Changes

When items change, the layout is automatically recalculated. All data mutation methods are intercepted:

```js
const gallery = vlist(config)
  .use(withMasonry({ columns: 4, gap: 8 }))
  .build()

// All of these trigger automatic layout recalculation
gallery.setItems(newPhotos)
gallery.appendItems(morePhotos)
gallery.prependItems(newPhotos)
gallery.updateItem(id, { height: 300 })
gallery.removeItem(id)
```

### 6. Store Aspect Ratios, Not Pixel Heights

When possible, store aspect ratios in your data instead of fixed pixel heights. This lets items scale proportionally when the container resizes:

```js
// ✅ Good — scales with column width
const photos = items.map(item => ({
  ...item,
  aspectRatio: item.height / item.width,
}))

height: (index, { columnWidth }) => Math.round(columnWidth * photos[index].aspectRatio)

// ❌ Fragile — breaks aspect ratio on resize
height: (index) => photos[index].pixelHeight
```

## Limitations

### Cannot Combine With

❌ **Reverse Mode** — Masonry doesn't support reverse scrolling

```js
// Invalid combination
vlist({
  reverse: true, // ❌ Error!
  // ...
})
.use(withMasonry({ columns: 4 }))
```

❌ **Sections** — Masonry doesn't currently support grouped layouts

```js
// Not supported (yet)
vlist(config)
  .use(withMasonry({ columns: 4 }))
  .use(withGroups({ ... })) // Won't work correctly
```

### Item Size Requirements

- **Heights must be deterministic** — Calculate before rendering
- **No auto-measurement** — Cannot use `estimatedHeight`
- **No dynamic content sizing** — Avoid relying on CSS to determine height

## Troubleshooting

### Items overlap or have wrong spacing

**Check:**
- Container uses `box-sizing: border-box` if it has padding
- Item heights are correct in your data
- Gap value is not too large for the container size

### Layout looks wrong after resize

Masonry automatically recalculates layout and re-renders on resize. If you're using fixed pixel heights (not `columnWidth`-based), items will keep their original sizes while columns change width — this can look wrong. **Solution:** Use the context's `columnWidth` in your height function:

```js
// Heights adapt automatically on resize
height: (index, { columnWidth }) => Math.round(columnWidth * items[index].aspectRatio)
```

If issues persist after manual DOM changes:

```js
gallery.forceRender()
```

### Performance issues with many items

**Solutions:**
- Reduce overscan value: `overscan: 1`
- Ensure item heights are accurate (prevents re-layouts)
- Use smaller images with lazy loading
- Consider pagination or infinite scroll

> **Note:** The masonry feature uses per-lane binary search for visibility checks (O(k × log(n/k)) instead of O(n)), so performance scales well even with tens of thousands of items.

### Items not rendering

**Check:**
- Container has explicit height: `<div id="gallery" style="height: 600px;">`
- Items array is not empty
- `columns` is a positive integer >= 1
- Height function returns valid numbers

## Migration from Grid

### Key Differences

| Aspect | Grid | Masonry |
|--------|------|---------|
| **Import** | `withGrid` | `withMasonry` |
| **Layout** | Aligned rows | Organic flow |
| **Heights** | Can be uniform | Should vary |
| **Best for** | Cards, products | Photos, articles |

### Example Migration

**Before (Grid):**
```js
vlist(config)
  .use(withGrid({ columns: 4, gap: 8 }))
  .build()
```

**After (Masonry):**
```js
vlist({
  ...config,
  item: {
    height: (index) => items[index].height, // Add variable heights
    template: config.item.template,
  },
})
.use(withMasonry({ columns: 4, gap: 8 }))
.build()
```

## Related Documentation

- [Grid Feature](./grid.md) — 2D grid with aligned rows
- [Selection Feature](./selection.md) — Select masonry items
- [Scrollbar Feature](./scrollbar.md) — Custom scrollbars
- [API Reference](../api/reference.md) — Complete API — config, methods, events

## Live Examples

- [Photo Album](/examples/photo-album) — Grid & masonry layouts with variable heights

---

**Last Updated:** February 2026  
**Version:** v1.1.0