# Grid Layout

Transform your virtual list into a responsive 2D grid with the `withGrid` feature.

## Overview

The `withGrid` feature converts a linear virtual list into a 2D grid layout with configurable columns and gaps. The virtualizer operates on **rows** (not individual items), rendering only what's visible in the viewport.

### What It Does

- **2D Grid Layout** — Arranges items in a responsive grid with configurable columns
- **Row-Based Virtualization** — Only visible rows are rendered, not all items
- **Auto-Responsive** — Column width adjusts automatically on container resize
- **Gap Support** — Configurable spacing between items (horizontal and vertical)
- **Memory Efficient** — Same virtualization benefits as list mode

### Key Features

- ✅ **Builder-Based** — Composable via `vlist().use(withGrid())` API
- ✅ **Responsive Columns** — Width recalculated on container resize
- ✅ **Row Virtualization** — Only visible rows exist in the DOM
- ✅ **Fixed or Dynamic Heights** — Support for both fixed and computed item heights
- ✅ **Both Orientations** — Vertical (default) and horizontal grid layouts
- ✅ **Groups Support** — Works with `withGroups` for categorized grids
- ✅ **Selection Support** — Works with `withSelection` for selectable grids
- ✅ **Scrollbar Support** — Works with `withScrollbar` for custom scrollbars

## Quick Start

```js
import { vlist, withGrid } from '@floor/vlist'

const gallery = vlist({
  container: '#gallery',
  item: {
    height: 200,
    template: (item) => `
      <div class="card">
        <img src="${item.url}" alt="${item.title}" />
        <h3>${item.title}</h3>
      </div>
    `,
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

### HTML Structure

```html
<div id="gallery" style="height: 600px;"></div>
```

### Result

The grid feature will:
1. Calculate column width: `(containerWidth - (columns - 1) * gap) / columns`
2. Transform the flat items array into rows
3. Render only visible rows in the viewport
4. Position items using CSS transforms (translateX for columns, translateY for rows)
5. Add data attributes: `data-row` and `data-col` to each item
6. Add `.vlist--grid` class to the container

## Configuration

### Grid Feature Config

```ts
interface GridFeatureConfig {
  /** Number of columns (required, >= 1) */
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
    height: 200,
    template: renderItem,
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

### Item Height Options

Grid supports both **fixed** and **dynamic** item heights:

#### Fixed Height

```js
item: {
  height: 200, // Fixed 200px height
  template: renderItem,
}
```

#### Dynamic Height (Function)

For aspect ratios or content-based heights:

```js
item: {
  height: ({ containerWidth, columns, gap }) => {
    // Calculate column width
    const colWidth = (containerWidth - (columns - 1) * gap) / columns
    
    // Return height for 4:3 aspect ratio
    return Math.round(colWidth * 0.75)
  },
  template: renderItem,
}
```

The height function receives a context object with:
- `containerWidth` — Current container width in pixels
- `columns` — Number of columns
- `gap` — Gap between items
- `row` — Row index (0-based)
- `column` — Column index (0-based)
- `totalRows` — Total number of rows
- `totalColumns` — Current number of columns

## Dynamic Aspect Ratios

Use a height function to maintain aspect ratios across different column configurations:

### Example: 4:3 Landscape Aspect Ratio

```js
const gallery = vlist({
  container: '#gallery',
  item: {
    height: ({ containerWidth, columns, gap }) => {
      const colWidth = (containerWidth - (columns - 1) * gap) / columns
      return Math.round(colWidth * 0.75) // 4:3 aspect ratio
    },
    template: (item) => `
      <div class="card">
        <img src="${item.url}" alt="${item.title}" loading="lazy" />
        <div class="card__overlay">
          <h3>${item.title}</h3>
        </div>
      </div>
    `,
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

### Common Aspect Ratios

```js
// Square (1:1)
height: ({ containerWidth, columns, gap }) => {
  const colWidth = (containerWidth - (columns - 1) * gap) / columns
  return Math.round(colWidth)
}

// 16:9 Widescreen
height: ({ containerWidth, columns, gap }) => {
  const colWidth = (containerWidth - (columns - 1) * gap) / columns
  return Math.round(colWidth * (9 / 16))
}

// 4:3 Landscape
height: ({ containerWidth, columns, gap }) => {
  const colWidth = (containerWidth - (columns - 1) * gap) / columns
  return Math.round(colWidth * 0.75)
}

// 3:4 Portrait
height: ({ containerWidth, columns, gap }) => {
  const colWidth = (containerWidth - (columns - 1) * gap) / columns
  return Math.round(colWidth * (4 / 3))
}
```

## Orientation Support

Grid layouts work in both vertical and horizontal orientations:

### Vertical Grid (Default)

```js
const gallery = vlist({
  container: '#gallery',
  orientation: 'vertical', // Default
  item: {
    height: 200,
    template: renderItem,
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

Scrolls **vertically**, columns arranged **horizontally**.

### Horizontal Grid

```js
const gallery = vlist({
  container: '#gallery',
  orientation: 'horizontal',
  item: {
    height: 200, // This becomes the cross-axis size (vertical extent)
    width: 300,  // Required for horizontal orientation
    template: renderItem,
  },
  items: photos,
})
.use(withGrid({ columns: 3, gap: 8 }))
.build()
```

Scrolls **horizontally**, columns arranged **vertically**.

**Note:** In horizontal mode, you must specify both `height` and `width` in the item config.

## API Reference

### withGrid(config)

Creates a grid feature for the builder.

**Parameters:**
- `config.columns` (number, required) — Number of columns (>= 1)
- `config.gap` (number, optional) — Gap between items in pixels (default: 0)

**Returns:** `VListFeature` — A feature that can be passed to `.use()`

**Example:**

```js
import { vlist, withGrid } from '@floor/vlist'

const list = vlist({
  container: '#app',
  item: { height: 200, template: renderItem },
  items: data,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

### Built List API

The grid feature doesn't add new methods to the built list — all standard vlist methods work as expected:

```js
const list = vlist(config)
  .use(withGrid({ columns: 4, gap: 8 }))
  .build()

// Standard methods work with row indices
list.scrollToIndex(10, 'center') // Scrolls to row containing item 10
list.getViewportState()          // Returns viewport state
list.destroy()                   // Cleanup
```

### Data Attributes

Grid items receive additional data attributes:

```html
<div class="vlist-item" data-row="2" data-col="1">
  <!-- Your content -->
</div>
```

- `data-row` — Row index (0-based)
- `data-col` — Column index (0-based)

Use these for CSS styling or JavaScript logic.

## Performance

### Memory Savings

With a 4-column grid of 1000 items:
- **Without virtualization:** 1000 DOM nodes
- **With grid virtualization:** ~40 DOM nodes (10 visible rows × 4 columns)
- **Savings:** ~96% fewer DOM nodes

### Rendering Performance

Grid layouts render rows, not individual items:
- **List mode:** Updates individual item positions
- **Grid mode:** Updates row positions, items positioned within rows
- **Result:** Fewer style recalculations on scroll

### Update Performance

Changing columns or gap recreates the grid layout but reuses existing DOM nodes where possible.

## Examples

### Photo Gallery with Responsive Columns

```js
import { vlist, withGrid } from '@floor/vlist'

const gallery = vlist({
  container: '#gallery',
  item: {
    height: ({ containerWidth, columns, gap }) => {
      const colWidth = (containerWidth - (columns - 1) * gap) / columns
      return Math.round(colWidth * 0.75) // 4:3 aspect ratio
    },
    template: (item) => `
      <div class="card">
        <img 
          src="https://picsum.photos/id/${item.id}/300/225" 
          alt="${item.title}"
          loading="lazy"
        />
        <div class="card__overlay">
          <span class="card__title">${item.title}</span>
          <span class="card__category">${item.category}</span>
        </div>
      </div>
    `,
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()

// Update columns on resize
function updateColumns() {
  const width = window.innerWidth
  let columns = 4
  
  if (width < 640) columns = 2
  else if (width < 1024) columns = 3
  else if (width < 1536) columns = 4
  else columns = 5
  
  // Recreate with new columns
  gallery.destroy()
  // Create new instance with updated columns
}

window.addEventListener('resize', updateColumns)
```

### Product Catalog with Selection

```js
import { vlist, withGrid, withSelection } from '@floor/vlist'

const catalog = vlist({
  container: '#catalog',
  item: {
    height: ({ containerWidth, columns, gap }) => {
      const colWidth = (containerWidth - (columns - 1) * gap) / columns
      return Math.round(colWidth * 1.3) // Taller for product info
    },
    template: (item) => `
      <div class="product">
        <img src="${item.image}" alt="${item.name}" />
        <h3>${item.name}</h3>
        <p class="price">$${item.price}</p>
      </div>
    `,
  },
  items: products,
})
.use(withGrid({ columns: 3, gap: 16 }))
.use(withSelection({ mode: 'multiple' }))
.build()

// Listen for selection changes
catalog.on('selection:change', ({ selectedIndices }) => {
  console.log('Selected products:', selectedIndices)
})
```

### Pinterest-Style Masonry Effect

```js
const masonry = vlist({
  container: '#masonry',
  item: {
    height: ({ row, column }) => {
      // Vary height based on position
      const seed = row * 10 + column
      const isSquare = seed % 3 === 0
      const isTall = seed % 5 === 0
      
      const baseHeight = 200
      if (isTall) return baseHeight * 1.8
      if (isSquare) return baseHeight * 0.8
      return baseHeight
    },
    template: (item) => `
      <div class="masonry-card">
        <img src="${item.url}" alt="${item.title}" />
      </div>
    `,
  },
  items: images,
})
.use(withGrid({ columns: 4, gap: 12 }))
.build()
```

### Icon Grid with Fixed Square Items

```js
const icons = vlist({
  container: '#icons',
  item: {
    height: ({ containerWidth, columns, gap }) => {
      // Square items
      const colWidth = (containerWidth - (columns - 1) * gap) / columns
      return Math.round(colWidth)
    },
    template: (item) => `
      <div class="icon">
        <svg viewBox="0 0 24 24">
          <path d="${item.iconPath}" />
        </svg>
        <span>${item.name}</span>
      </div>
    `,
  },
  items: icons,
})
.use(withGrid({ columns: 8, gap: 4 }))
.build()
```

### Infinite Scroll Grid

```js
import { vlist, withGrid, withAsync } from '@floor/vlist'

const gallery = vlist({
  container: '#gallery',
  item: {
    height: 200,
    template: renderItem,
  },
})
.use(withGrid({ columns: 4, gap: 8 }))
.use(withAsync({
  adapter: {
    read: async ({ offset, limit }) => {
      const response = await fetch(
        `/api/photos?offset=${offset}&limit=${limit}`
      )
      const data = await response.json()
      
      return {
        items: data.photos,
        total: data.total,
        hasMore: data.hasMore,
      }
    },
  },
}))
.build()
```

## Combining with Other Features

Grid works seamlessly with other vlist features:

### Grid + Selection

```js
import { vlist, withGrid, withSelection } from '@floor/vlist'

const list = vlist(config)
  .use(withGrid({ columns: 4, gap: 8 }))
  .use(withSelection({ mode: 'multiple' }))
  .build()
```

### Grid + Groups

```js
import { vlist, withGrid, withGroups } from '@floor/vlist'

const list = vlist(config)
  .use(withGrid({ columns: 4, gap: 8 }))
  .use(withGroups({
    getGroupForIndex: (index) => items[index].category,
    headerHeight: 40,
    headerTemplate: (group) => `<h2>${group}</h2>`,
    sticky: true,
  }))
  .build()
```

### Grid + Scrollbar

```js
import { vlist, withGrid, withScrollbar } from '@floor/vlist'

const list = vlist(config)
  .use(withGrid({ columns: 4, gap: 8 }))
  .use(withScrollbar({ autoHide: true }))
  .build()
```

### Grid + Adapter (Async Data)

```js
import { vlist, withGrid, withAsync } from '@floor/vlist'

const list = vlist(config)
  .use(withGrid({ columns: 4, gap: 8 }))
  .use(withAsync({ adapter: { read: fetchData } }))
  .build()
```

## Styling

### Default CSS Classes

Grid adds a modifier class to the container:

```css
.vlist--grid {
  /* Applied when grid feature is active */
}

.vlist-item {
  /* Each grid item */
  position: absolute;
  box-sizing: border-box;
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
.vlist--grid .vlist-item {
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.vlist--grid .vlist-item:hover {
  transform: scale(1.05);
  z-index: 10;
}

.vlist--grid .vlist-item--selected {
  outline: 3px solid #3b82f6;
  outline-offset: -3px;
}

.vlist--grid .vlist-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Responsive grid styles */
@media (max-width: 768px) {
  .vlist--grid .vlist-item {
    border-radius: 4px;
  }
}
```

### Custom Class Prefix

```js
const gallery = vlist({
  container: '#gallery',
  classPrefix: 'my-grid', // Custom prefix
  item: {
    height: 200,
    template: renderItem,
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

Now use `.my-grid--grid` and `.my-grid-item` in your CSS.

## Best Practices

### 1. Use Dynamic Height for Aspect Ratios

**✅ Good** — Maintains aspect ratio across column changes:

```js
height: ({ containerWidth, columns, gap }) => {
  const colWidth = (containerWidth - (columns - 1) * gap) / columns
  return Math.round(colWidth * 0.75) // 4:3
}
```

**❌ Bad** — Breaks aspect ratio when columns change:

```js
height: 200 // Fixed height
```

### 2. Consider Container Padding

Container padding affects column width calculations:

```css
#gallery {
  padding: 16px;
  box-sizing: border-box; /* Important! */
}
```

The grid automatically accounts for this if you use `box-sizing: border-box`.

### 3. Use `loading="lazy"` for Images

Improve performance with lazy loading:

```js
template: (item) => `
  <img src="${item.url}" loading="lazy" decoding="async" />
`
```

### 4. Set Appropriate Gaps

Choose gaps based on your design:

```js
// Compact grid
.use(withGrid({ columns: 6, gap: 4 }))

// Standard spacing
.use(withGrid({ columns: 4, gap: 8 }))

// Spacious layout
.use(withGrid({ columns: 3, gap: 16 }))
```

### 5. Optimize Template Complexity

Keep item templates simple for better performance:

```js
// ✅ Good — Simple, semantic markup
template: (item) => `
  <div class="card">
    <img src="${item.url}" alt="${item.title}" />
    <h3>${item.title}</h3>
  </div>
`

// ❌ Bad — Overly complex, many nested elements
template: (item) => `
  <div class="card">
    <div class="card__wrapper">
      <div class="card__inner">
        <div class="card__image-container">
          <div class="card__image-wrapper">
            <img src="${item.url}" />
          </div>
        </div>
      </div>
    </div>
  </div>
`
```

## Troubleshooting

### Grid not rendering

**Check:**
- Container has explicit height: `<div id="gallery" style="height: 600px;">`
- Items array is not empty
- `columns` is a positive integer >= 1

### Items overlap or have wrong spacing

**Check:**
- Container uses `box-sizing: border-box` if it has padding
- Gap value is correct (not too large)
- Template elements don't have margins that interfere with layout

### Aspect ratio breaks when columns change

**Solution:** Use a dynamic height function instead of fixed height:

```js
height: ({ containerWidth, columns, gap }) => {
  const colWidth = (containerWidth - (columns - 1) * gap) / columns
  return Math.round(colWidth * desiredAspectRatio)
}
```

### Images not loading

**Check:**
- Image URLs are correct
- CORS is configured if loading from different domain
- Use `loading="lazy"` for better performance

### Performance issues with large grids

**Solutions:**
- Reduce overscan value: `overscan: 1`
- Simplify item templates
- Use `loading="lazy"` on images
- Consider pagination or infinite scroll with adapter

## Migration from Old API

### From Monolithic API

**Old (monolithic):**

```js
import { createVList } from 'vlist'

const list = createVList({
  container: '#app',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: { height: 200, template: renderItem },
  items: data,
})
```

**New (builder):**

```js
import { vlist, withGrid } from '@floor/vlist'

const list = vlist({
  container: '#app',
  item: { height: 200, template: renderItem },
  items: data,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

### Key Differences

1. **Import path changed:** Everything from `'@floor/vlist'`
2. **No `layout` prop:** Use `.use(withGrid())` instead
3. **No `grid` object:** Pass config directly to `withGrid()`
4. **Composable:** Chain multiple `.use()` calls for features
5. **Tree-shakeable:** Only bundle what you use

## Related Documentation

- [API Reference](../api/reference.md) — Complete API — config, methods, events
- [Selection Feature](./selection.md) — Select grid items
- [Sections Feature](./sections.md) — Categorized grids with sticky headers
- [Scrollbar Feature](./scrollbar.md) — Custom scrollbars
- [Async Feature](./async.md) — Lazy data loading

## Live Examples

- [Photo Album](/examples/photo-album) — Responsive photo gallery with withGrid + withScrollbar (4 frameworks)
- [File Browser](/examples/file-browser) — Finder-like file browser with grid/list views