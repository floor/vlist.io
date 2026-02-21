# Grid Layout

> 2D photo galleries, card grids, and virtualized grid layouts with dynamic aspect ratios

Grid layout transforms a flat list of items into a virtualized 2D grid with configurable columns and gaps. It's perfect for photo galleries, product catalogs, card layouts, and any interface that displays items in a grid.

## Overview

### What It Does

Grid layout virtualizes **rows**, not individual items. With 1,000 items in a 4-column grid:
- **250 virtual rows** (1000 ÷ 4)
- Only **~15 rows** rendered at once
- **~60 DOM nodes** instead of 1,000
- **94% memory savings**

### Key Features

- ✅ **Virtualized rows** — Only visible rows are rendered
- ✅ **Dynamic columns** — Change columns on the fly without recreation
- ✅ **Aspect ratio maintenance** — Height auto-adjusts when columns change
- ✅ **Gap control** — Configurable spacing between items
- ✅ **Responsive** — Recalculates on container resize
- ✅ **Efficient updates** — No instance recreation needed
- ✅ **Zero dependencies** — Pure TypeScript/JavaScript



## Quick Start

```typescript
import { vlist, withGrid, withScrollbar } from 'vlist';

const gallery = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: 200,
    template: (item) => `
      <div class="card">
        <img src="${item.url}" alt="${item.title}" />
        <span class="title">${item.title}</span>
      </div>
    `,
  },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** 11.7 KB gzipped

### HTML Structure

```html
<div id="gallery"></div>
```

### Result

```html
<div id="gallery" class="vlist vlist--grid" role="listbox">
  <div class="vlist-viewport">
    <div class="vlist-content" style="height: 50000px">
      <div class="vlist-items">
        <!-- Only visible items rendered -->
        <div class="vlist-item" data-row="0" data-col="0" style="...">
          <img src="photo1.jpg" />
        </div>
        <div class="vlist-item" data-row="0" data-col="1" style="...">
          <img src="photo2.jpg" />
        </div>
        <!-- ... more visible items ... -->
      </div>
    </div>
  </div>
</div>
```

## Dynamic Aspect Ratio

One of the most powerful features is **dynamic height calculation based on column width**. When you change the number of columns, the column width changes, and the height should adjust proportionally to maintain aspect ratios.

### Grid Context

The `item.height` function can receive an optional second parameter with grid context:

```typescript
interface GridHeightContext {
  containerWidth: number;  // Current container width (px)
  columns: number;         // Number of columns
  gap: number;             // Gap between items (px)
  columnWidth: number;     // Calculated width per column (px)
}

type HeightFunction = (
  index: number,
  context?: GridHeightContext
) => number;
```

### Example: 4:3 Aspect Ratio

```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    // Height = 75% of column width (4:3 ratio)
    height: (index, context) => {
      if (context) {
        return context.columnWidth * 0.75;
      }
      return 200; // fallback for non-grid
    },
    template: (item) => `
      <img 
        src="${item.url}" 
        alt="${item.title}"
        style="width: 100%; height: 100%; object-fit: cover"
      />
    `,
  },
  items: photos,
});

// When columns change, height automatically recalculates!
gallery.updateGrid({ columns: 2 });
// Column width doubles, height doubles too → aspect ratio maintained
```

### Common Aspect Ratios

```typescript
// Square (1:1)
height: (index, context) => context ? context.columnWidth : 200

// 4:3 (standard photo)
height: (index, context) => context ? context.columnWidth * 0.75 : 200

// 16:9 (widescreen)
height: (index, context) => context ? context.columnWidth * 0.5625 : 200

// 3:2 (35mm film)
height: (index, context) => context ? context.columnWidth * 0.667 : 200

// Golden ratio (1.618:1)
height: (index, context) => context ? context.columnWidth * 0.618 : 200
```

### Variable Heights Based on Content

You can also calculate height based on both grid context AND item data:

```typescript
height: (index, context) => {
  if (!context) return 200;
  
  const item = items[index];
  
  // Portrait photos get more height
  if (item.orientation === 'portrait') {
    return context.columnWidth * 1.5;
  }
  
  // Landscape photos
  if (item.orientation === 'landscape') {
    return context.columnWidth * 0.6;
  }
  
  // Square
  return context.columnWidth;
}
```

### How It Works

1. **On initialization**: Height function called with grid context
2. **On column change**: Grid state updated, height cache rebuilt
3. **On resize**: Container width updated, grid recalculates
4. **Height function always uses current state** — No stale closures!

The grid state is **mutable** and always reflects the current configuration:

```typescript
// Internal implementation (simplified)
const gridState = {
  containerWidth: dom.viewport.clientWidth,
  columns: 4,
  gap: 8,
};

const wrappedHeight = (index) => {
  const columnWidth = 
    (gridState.containerWidth - (gridState.columns - 1) * gridState.gap) 
    / gridState.columns;
  
  const context = { ...gridState, columnWidth };
  return userHeightFn(index, context);
};

// When updateGrid is called:
gridState.columns = 2;  // Updates the referenced object
sizeCache.rebuild();  // Recalculates all sizes
```

## Configuration

### Grid Config

```typescript
interface GridConfig {
  /** Number of columns (required, >= 1) */
  columns: number;
  
  /** Gap between items in pixels (default: 0) */
  gap?: number;
}
```

```typescript
import { vlist, withGrid, withScrollbar } from 'vlist';

const gallery = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: 200,
    template: (item) => `
      <div class="card">
        <img src="${item.url}" />
        <span>${item.title}</span>
      </div>
    `,
  },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** 11.7 KB gzipped

### Item Configuration

```typescript
interface ItemConfig {
  /** 
   * Row height in pixels
   * - number: Fixed height for all rows
   * - function: Dynamic height with optional grid context
   */
  height: number | ((index: number, context?: GridHeightContext) => number);
  
  /** Template function to render each item */
  template: (item: T, index: number, state: ItemState) => string | HTMLElement;
}
```

## API Reference

### Methods

#### `updateGrid(config)`

Update grid configuration dynamically without recreating the instance.

**Available with:** `vlist().use(withGrid()).build()`

**Signature:**
```typescript
updateGrid(config: Partial<GridConfig>): void
```

**Parameters:**
```typescript
interface GridConfig {
  columns?: number;  // Update number of columns
  gap?: number;      // Update gap between items
}
```

**Example:**
```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    height: (index, context) => context ? context.columnWidth * 0.75 : 200,
    template: renderPhoto,
  },
  items: photos,
});

// Update columns only
gallery.updateGrid({ columns: 2 });

// Update gap only
gallery.updateGrid({ gap: 16 });

// Update both
gallery.updateGrid({ columns: 3, gap: 12 });
```

**What happens:**
1. ✅ Grid layout updated internally
2. ✅ Row count recalculated (items ÷ new columns)
3. ✅ Height function called with new context (if dynamic)
4. ✅ Height cache rebuilt with new heights
5. ✅ Visible items re-rendered with new positions
6. ✅ Scroll position preserved
7. ✅ Selection preserved
8. ✅ No flicker or recreation overhead

**Performance:**
- First call: ~5-10ms (recalculation)
- Cached: ~1-2ms
- **No instance recreation needed!**

### All Standard Methods

Grid instances have all standard vlist methods:

```typescript
// Data methods
gallery.setItems(newPhotos);
gallery.appendItems(morePhotos);
gallery.updateItem('photo-123', { title: 'Updated' });

// Scroll methods
gallery.scrollToIndex(50, 'center');
gallery.scrollToItem('photo-123');

// Events
gallery.on('item:click', ({ item, index }) => {
  console.log('Clicked photo:', item.title);
});

// Lifecycle
gallery.destroy();
```

### Grid-Specific Properties

When using grid layout, items have additional data attributes:

```html
<div class="vlist-item" 
     data-index="7"
     data-id="photo-8"
     data-row="1"
     data-col="3">
  <!-- Item content -->
</div>
```

## Performance

### Memory Savings

**Example: 1,000 photos in 4-column grid**

```
Without virtualization:
  1,000 DOM nodes × ~2 KB each = ~2 MB

With grid virtualization:
  250 rows total
  ~15 rows visible
  60 DOM nodes × ~2 KB each = ~120 KB
  
Savings: 94%
```

### Rendering Performance

| Items | Columns | Rows | Rendered | Savings | FPS |
|-------|---------|------|----------|---------|-----|
| 100 | 4 | 25 | ~12 nodes | 88% | 60 |
| 1,000 | 4 | 250 | ~60 nodes | 94% | 60 |
| 10,000 | 4 | 2,500 | ~60 nodes | 99.4% | 60 |
| 100,000 | 6 | 16,667 | ~72 nodes | 99.93% | 60 |

Scroll remains smooth at 60 FPS regardless of total item count!

### Update Performance

Updating grid configuration is **~100x faster** than recreation:

```
Destroy + Recreate:  ~50-100ms
updateGrid():        ~1-2ms (cached)
                     ~5-10ms (first call)
```

### Compression Support

Grid layout works with compression for massive datasets:

```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 6, gap: 4 },
  item: {
    height: 200,
    template: renderPhoto,
  },
  items: millionPhotos,  // 1,000,000 items
});

// 166,667 rows × 200px = 33M pixels
// Exceeds browser limit (16.7M)
// → Compression automatically applied
```

## Examples

### Photo Gallery with Responsive Columns

```typescript
import { vlist } from 'vlist';

const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: {
    columns: 4,
    gap: 8,
  },
  item: {
    height: (index, context) => {
      if (context) {
        return context.columnWidth * 0.75; // 4:3 aspect ratio
      }
      return 200;
    },
    template: (item) => `
      <div class="photo-card">
        <img 
          src="${item.thumbnail}" 
          alt="${item.title}"
          loading="lazy"
          style="width: 100%; height: 100%; object-fit: cover"
        />
        <div class="photo-overlay">
          <h3>${item.title}</h3>
          <p>${item.category}</p>
        </div>
      </div>
    `,
  },
  items: photos,
});

// Responsive columns based on window width
const updateColumns = () => {
  const width = window.innerWidth;
  if (width < 640) {
    gallery.updateGrid({ columns: 2 });
  } else if (width < 1024) {
    gallery.updateGrid({ columns: 3 });
  } else if (width < 1440) {
    gallery.updateGrid({ columns: 4 });
  } else {
    gallery.updateGrid({ columns: 6 });
  }
};

window.addEventListener('resize', updateColumns);
updateColumns();
```

### Product Catalog

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
}

const catalog = vlist<Product>({
  container: '#products',
  layout: 'grid',
  grid: { columns: 3, gap: 16 },
  item: {
    height: (index, context) => {
      // Taller cards for better product display
      return context ? context.columnWidth * 1.2 : 240;
    },
    template: (product) => `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}" />
        <h3>${product.name}</h3>
        <div class="product-meta">
          <span class="price">$${product.price}</span>
          <span class="rating">${'★'.repeat(product.rating)}</span>
        </div>
        <button>Add to Cart</button>
      </article>
    `,
  },
  items: products,
  selection: { mode: 'single' },
});

// Handle product clicks
catalog.on('item:click', ({ item }) => {
  console.log('Selected product:', item.name);
  showProductDetails(item);
});
```

### Pinterest-Style Masonry Effect

While true masonry (variable heights) requires different handling, you can create a masonry-like effect with alternating row heights:

```typescript
const masonry = vlist({
  container: '#masonry',
  layout: 'grid',
  grid: { columns: 4, gap: 12 },
  item: {
    height: (index, context) => {
      if (!context) return 200;
      
      // Alternate between tall and short based on position
      const row = Math.floor(index / context.columns);
      const col = index % context.columns;
      
      // Checkerboard pattern
      const isTall = (row + col) % 2 === 0;
      return context.columnWidth * (isTall ? 1.2 : 0.8);
    },
    template: renderPin,
  },
  items: pins,
});
```

### Icon Grid with Fixed Square Items

```typescript
const icons = vlist({
  container: '#icon-grid',
  layout: 'grid',
  grid: { columns: 8, gap: 4 },
  item: {
    height: (index, context) => {
      // Perfect squares
      return context ? context.columnWidth : 64;
    },
    template: (item) => `
      <div class="icon-cell">
        <i class="${item.icon}"></i>
        <span>${item.name}</span>
      </div>
    `,
  },
  items: iconList,
});
```

### Gallery with Selectable Items

```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    height: (index, context) => context ? context.columnWidth * 0.75 : 200,
    template: (item, index, state) => {
      const selected = state.selected ? 'selected' : '';
      return `
        <div class="photo ${selected}">
          <img src="${item.url}" alt="${item.title}" />
          ${state.selected ? '<div class="checkmark">✓</div>' : ''}
        </div>
      `;
    },
  },
  items: photos,
  selection: { mode: 'multiple' },
});

// Select multiple photos
gallery.on('item:click', ({ item, index }) => {
  gallery.toggleSelect(item.id);
});

// Get selected for batch operations
const selectedPhotos = gallery.getSelectedItems();
console.log('Selected:', selectedPhotos.length, 'photos');
```

### Infinite Scroll Grid

```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    height: (index, context) => context ? context.columnWidth * 0.75 : 200,
    template: renderPhoto,
  },
  adapter: {
    read: async ({ offset, limit }) => {
      const response = await fetch(
        `/api/photos?offset=${offset}&limit=${limit}`
      );
      const data = await response.json();
      return {
        items: data.photos,
        total: data.total,
        hasMore: offset + limit < data.total,
      };
    },
  },
});

// Loading events
gallery.on('load:start', () => {
  showLoadingSpinner();
});

gallery.on('load:end', ({ items }) => {
  hideLoadingSpinner();
  console.log('Loaded', items.length, 'more photos');
});
```

## Configuration Reference

### GridConfig

```typescript
interface GridConfig {
  /**
   * Number of columns in the grid.
   * Must be a positive integer ≥ 1.
   * 
   * Item width is automatically calculated:
   * (containerWidth - (columns - 1) × gap) / columns
   */
  columns: number;
  
  /**
   * Gap between items in pixels (default: 0).
   * Applied both horizontally and vertically.
   * 
   * Gaps are subtracted from available width when calculating column width.
   */
  gap?: number;
}
```

### Item Height Options

```typescript
// Option 1: Fixed height (simplest)
item: {
  height: 200,
  template: renderItem,
}

// Option 2: Variable height by index
item: {
  height: (index) => {
    return items[index].featured ? 400 : 200;
  },
  template: renderItem,
}

// Option 3: Dynamic height with grid context (recommended for grids)
item: {
  height: (index, context) => {
    if (context) {
      return context.columnWidth * 0.75; // 4:3 aspect ratio
    }
    return 200; // fallback
  },
  template: renderItem,
}

// Option 4: Combined - context + item data
item: {
  height: (index, context) => {
    if (!context) return 200;
    
    const aspectRatio = items[index].aspectRatio || 0.75;
    return context.columnWidth * aspectRatio;
  },
  template: renderItem,
}
```

## Best Practices

### 1. Always Use Dynamic Height for Aspect Ratios

**❌ Don't:** Use fixed height with responsive columns
```typescript
// Bad: height stays 200px even when columns change
item: {
  height: 200,  // Fixed - aspect ratio breaks!
  template: renderPhoto,
}
```

**✅ Do:** Use grid context for dynamic aspect ratio
```typescript
// Good: height adjusts when columns change
item: {
  height: (index, context) => {
    return context ? context.columnWidth * 0.75 : 200;
  },
  template: renderPhoto,
}
```

### 2. Use `updateGrid()` Instead of Recreation

**❌ Don't:** Destroy and recreate
```typescript
// Bad: expensive, loses state
gallery.destroy();
gallery = vlist({ /* new config */ });
```

**✅ Do:** Update in place
```typescript
// Good: fast, preserves state
gallery.updateGrid({ columns: 3 });
```

### 3. Set Appropriate Gaps for Visual Hierarchy

```typescript
// Tight grid (minimal gaps)
grid: { columns: 6, gap: 4 }

// Standard grid (comfortable spacing)
grid: { columns: 4, gap: 8 }

// Loose grid (generous whitespace)
grid: { columns: 3, gap: 16 }

// No gaps (edge-to-edge tiles)
grid: { columns: 5, gap: 0 }
```

### 4. Consider Container Padding

The grid calculates based on container width. Account for padding:

```css
#gallery {
  padding: 16px;  /* Grid calculates based on inner width */
}
```

Or adjust in your height function:

```typescript
height: (index, context) => {
  if (context) {
    // Account for container padding (32px total)
    const effectiveWidth = context.containerWidth - 32;
    const colWidth = (effectiveWidth - (context.columns - 1) * context.gap) / context.columns;
    return colWidth * 0.75;
  }
  return 200;
}
```

### 5. Use `loading="lazy"` for Images

```typescript
template: (item) => `
  <img 
    src="${item.url}" 
    loading="lazy"        <!-- Browser handles lazy loading -->
    decoding="async"      <!-- Non-blocking decode -->
    alt="${item.title}"
  />
`
```

### 6. Optimize Template Complexity

```typescript
// ✅ Good: Simple, fast template
template: (item) => `
  <img src="${item.url}" alt="${item.title}" />
`

// ❌ Bad: Complex DOM creation on every render
template: (item) => {
  const div = document.createElement('div');
  const img = document.createElement('img');
  const overlay = document.createElement('div');
  const title = document.createElement('h3');
  // ... lots of DOM manipulation
  return div;
}

// ✅ Better: String template with CSS for styling
template: (item) => `
  <div class="card">
    <img src="${item.url}" />
    <div class="overlay">
      <h3>${item.title}</h3>
    </div>
  </div>
`
```

## Styling

### Default CSS Classes

```css
.vlist--grid {
  /* Applied to root element in grid mode */
}

.vlist-item {
  /* Each grid item */
  position: absolute;
  /* Positioned with translate(x, y) */
}

.vlist-item[data-row="0"] {
  /* First row items */
}

.vlist-item[data-col="0"] {
  /* First column items */
}
```

### Example Styles

```css
/* Photo gallery */
.vlist--grid .vlist-item {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.vlist--grid .vlist-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.vlist--grid .vlist-item--selected {
  outline: 3px solid #2196f3;
  outline-offset: 2px;
}

/* Image within card */
.vlist--grid .vlist-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Responsive gaps (optional - use updateGrid instead for true responsiveness) */
@media (max-width: 768px) {
  .vlist--grid .vlist-item {
    /* Smaller shadows on mobile */
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
}
```

### Custom Class Prefix

```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  classPrefix: 'gallery',  // Changes .vlist to .gallery
  item: {
    height: 200,
    template: renderItem,
  },
  items,
});

// Results in:
// .gallery
// .gallery--grid
// .gallery-item
```

## Restrictions

Grid layout has certain constraints:

### Cannot Combine With

❌ **Reverse Mode** — Reverse grid not supported
```typescript
// Invalid combination
vlist({
  layout: 'grid',
  reverse: true,  // ❌ Error!
});
```

### Can Combine With

✅ **Horizontal Orientation** — Grid works in both vertical and horizontal orientations (NEW!)
✅ **Groups** — Grouped grids with full-width section headers
✅ **Selection** — Single or multiple selection
✅ **Compression** — For grids with millions of items
✅ **Scrollbar** — Custom scrollbar styling
✅ **Snapshots** — Scroll position save/restore
✅ **Adapter** — Infinite scroll grid
✅ **Window Scrolling** — Full-page grid layouts

### Horizontal Grid Layouts

✅ **NEW: Grid layouts now work with horizontal orientation!**

In horizontal mode, the grid axes are swapped:
- **Rows extend horizontally** (main scroll axis)
- **Columns stack vertically** (cross-axis)
- Items are positioned using swapped X/Y coordinates

```typescript
const gallery = vlist({
  container: '#gallery',
  orientation: 'horizontal',  // ✅ Now supported!
  item: {
    width: 200,   // Required for horizontal
    height: 150,  // Column height (cross-axis)
    template: (item) => `<img src="${item.url}" />`,
  },
  items: photos,
})
  .use(withGrid({ columns: 3, gap: 8 }))  // 3 vertical columns
  .build();
```

**How it works:**
- 3 columns stack vertically in the viewport
- Rows extend horizontally and virtualize as you scroll right
- Each "row" contains 3 items (one per column)
- Scroll horizontally to see more rows

**Visual representation:**
```
Vertical Grid (orientation: 'vertical'):
┌────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │ ← Row 0
├────┼────┼────┼────┤
│ 5  │ 6  │ 7  │ 8  │ ← Row 1
└────┴────┴────┴────┘
   ↓ Scroll down

Horizontal Grid (orientation: 'horizontal'):
┌────┬────┐
│ 1  │ 4  │ ← Column 0
├────┼────┤
│ 2  │ 5  │ ← Column 1
├────┼────┤
│ 3  │ 6  │ ← Column 2
└────┴────┘
  → Scroll right
```

**Use cases:**
- Horizontal photo galleries with multiple rows
- Timeline views with vertical lanes
- Horizontal carousels with stacked content

### Grid with Groups

✅ **Grid layouts support grouped sections with headers!**

Headers automatically:
- Span full width across all columns
- Force new rows (items after header start fresh row)
- Work with sticky headers for iOS Contacts-style UI

```typescript
const fileByType = vlist({
  container: '#browser',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    height: (index, ctx) => ctx.columnWidth * 0.8, // Dynamic aspect ratio
    template: (item) => `<div class="file-card">...</div>`,
  },
  items: sortedFiles,
  groups: {
    getGroupForIndex: (i) => sortedFiles[i].type, // "Folder", "Image", "Document"
    headerHeight: 40,
    headerTemplate: (type) => `<div class="group-header">${type}</div>`,
    sticky: true, // iOS-style sticky headers
  },
});
```

**How it works:**
- Headers inserted into grid flow at group boundaries
- Each header starts a new row (even if previous row not full)
- Items after header resume normal 4-column grid layout
- Sticky headers float at top during scroll
- Performance: O(1) for regular grids, O(n) for grouped grids (acceptable for typical use)

**Example layout:**
```
┌─────────────────────────────────────┐
│ FOLDERS                      7 items│ ← Full-width header
├─────────┬─────────┬─────────┬───────┤
│ api     │ docs    │ src     │ test  │ ← 4-column grid
├─────────┴─────────┴─────────┴───────┤
│ IMAGES                       3 items│ ← New row, full-width header
├─────────┬─────────┬─────────┬───────┤
│ logo.png│ bg.jpg  │ icon.svg│       │ ← 4-column grid continues
└─────────┴─────────┴─────────┴───────┘
```

## Migration Guide

### From Fixed Height to Dynamic Aspect Ratio

**Before (v0.4.x):**
```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    height: 200,  // Fixed, breaks aspect ratio on column change
    template: renderPhoto,
  },
  items: photos,
});

// Changing columns required recreation
gallery.destroy();
gallery = vlist({ /* ... columns: 2 ... */ });
```

**After (v0.5.x):**
```typescript
const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    // Dynamic height maintains aspect ratio
    height: (index, context) => {
      return context ? context.columnWidth * 0.75 : 200;
    },
    template: renderPhoto,
  },
  items: photos,
});

// Update without recreation
gallery.updateGrid({ columns: 2 });  // Height auto-adjusts!
```

### From Monolithic to Builder-Based Default

**No changes needed!** The default `vlist()` now uses the builder internally:

```typescript
// This code is unchanged but now 53% smaller
import { vlist } from 'vlist';

const gallery = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: { height: 200, template: renderPhoto },
  items: photos,
});
```

**Bundle size:**
- v0.4.x: 57 KB gzip
- v0.5.x: 27 KB gzip (53% smaller!)

## Troubleshooting

### Grid not rendering

**Check:**
1. Container element exists: `document.querySelector('#gallery')`
2. Items array has data: `items.length > 0`
3. Grid config is valid: `columns >= 1`
4. Height is properly configured

### Aspect ratio breaks when columns change

**Problem:** Using fixed height instead of dynamic function

**Solution:**
```typescript
// Change from:
height: 200

// To:
height: (index, context) => context ? context.columnWidth * 0.75 : 200
```

### Items overlap or have wrong spacing

**Check:**
1. Gap value is correct
2. Container has no conflicting CSS (padding, border-box, etc.)
3. Template doesn't set conflicting width/height styles

### updateGrid() doesn't work

**Check:**
1. Using default entry point or builder with `withGrid` plugin
2. Grid context available: `layout: 'grid'` was specified

### Images not loading

**Check:**
1. Using `loading="lazy"` for lazy loading
2. Image URLs are correct
3. Images have proper CORS headers (if cross-origin)

### Performance issues with large grids

**Solutions:**
1. Use compression for 100K+ items (auto-applied)
2. Optimize template complexity
3. Use `loading="lazy"` for images
4. Consider pagination/filtering for truly massive datasets

## Grid+Groups Technical Details

When grid and sections plugins are combined, special coordination is required to handle:
- Full-width headers that span all columns
- Headers forcing new rows in the grid flow
- Correct height calculations (row-based vs item-based)

### How Grid+Groups Works

**1. Layout Transformation**

The sections plugin transforms the flat item list by inserting header pseudo-items:

```
Items: [file1, file2, file3, ...]
         ↓ (sections plugin)
Layout: [header, file1, header, file2, file3, header, ...]
```

**2. Groups-Aware Grid Layout**

The grid layout algorithm becomes groups-aware:

```typescript
// Regular grid (O(1)):
getRow(index) = Math.floor(index / columns)
getCol(index) = index % columns

// Grouped grid (O(n) - acceptable for typical use):
getRow(index) = loop through items, headers force new rows
getCol(index) = headers at col 0, items flow normally
```

**3. Height Cache Strategy**

- Grid plugin initially sets row-based heights
- Sections plugin rebuilds with item-based heights (headers + items)
- Grid plugin overrides `getTotalSize()` to return sum of column 0 items only

This prevents double-counting items in the same row.

**4. Rendering**

Headers are detected by `data-id` starting with `__group_header`:
- **Width**: Full container width (not column width)
- **Height**: Uses `headerHeight` from groups config (typically 40px)
- **X position**: Always 0 (left edge)
- **Y position**: Cumulative sum of previous rows' heights

Regular items:
- **Width**: Column width
- **Height**: Grid-calculated height (aspect ratio aware)
- **X position**: Column offset based on column index
- **Y position**: Same as headers - cumulative row heights

### Performance Characteristics

**Regular grids (no groups):**
- All calculations: O(1)
- No performance impact from groups support

**Grouped grids:**
- `getRow(index)`: O(n) where n = index
- `getCol(index)`: O(n) where n = index
- `getItemRange(rowStart, rowEnd)`: O(total items)
- Acceptable for typical file browsers (< 1000 items)

**Optimization notes:**
- Fast path used when no groups detected (`isHeaderFn` undefined)
- Groups-aware calculations only run when headers present
- Height cache uses efficient prefix sums
- Rendering uses element pooling

### Example Use Cases

Perfect for:
- **File browsers** grouped by file type
- **Photo galleries** grouped by date/album
- **Product catalogs** grouped by category
- **App launchers** grouped by folder

Not recommended for:
- Lists with 10,000+ items and many groups (performance)
- Highly dynamic groupings that change frequently

## Grid Context Technical Details

### How Context is Injected

When you provide a height function, the grid plugin wraps it:

```typescript
// Your function:
const userHeight = (index, context) => context.columnWidth * 0.75;

// Grid plugin wraps it:
const wrappedHeight = (index) => {
  // Calculate current context
  const innerWidth = containerWidth - 2;  // Account for borders
  const totalGaps = (columns - 1) * gap;
  const columnWidth = (innerWidth - totalGaps) / columns;
  
  const context = {
    containerWidth,
    columns,
    gap,
    columnWidth,
  };
  
  // Call your function
  const height = userHeight(index, context);
  return height + gap;  // Add gap for row spacing
};

// Height cache uses wrapped function
```

### Context Update Flow

When `updateGrid()` is called:

```
1. Validate new columns/gap
   ↓
2. Update internal grid config
   ↓
3. Update grid layout (mutable columns/gap vars)
   ↓
4. Update grid state object (referenced in closure)
   ↓
5. Recalculate total rows (items ÷ new columns)
   ↓
6. Rebuild height cache
   └→ Calls height function with NEW context
   └→ All row heights recalculated
   ↓
7. Update total virtual height
   ↓
8. Clear visible items
   ↓
9. Re-render with new layout
   ↓
✓ Grid updated with maintained aspect ratio!
```

### Performance Characteristics

**Grid creation:**
- Time: ~5-10ms (1,000 items)
- Memory: ~60 DOM nodes rendered

**Grid update (`updateGrid`):**
- Time: ~1-2ms (cached) or ~5-10ms (first call)
- Memory: Same ~60 DOM nodes (recycled from pool)
- No instance recreation overhead

**Scrolling:**
- FPS: Solid 60 FPS
- Memory: Constant (element pool reuse)

## Related Documentation

- [Builder Pattern](/tutorials/builder-pattern) - Manual builder API
- [Selection](./selection.md) - Multi-select for grids
- [Compression](./scale.md) - Handle millions of items
- [Performance](/tutorials/optimization) - Optimization techniques
- [API Reference](/docs/api/reference) - All methods

## Examples

Live interactive examples:
- [Photo Album](/examples/grid/photo-album) - Responsive photo gallery with aspect ratios
- [File Browser](/examples/grid/file-browser) - Grid-based file manager interface

---

**Last Updated:** February 2026
**Version:** 0.5.0+