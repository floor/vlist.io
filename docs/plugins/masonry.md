---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Masonry

Pinterest-style shortest-lane layout.

```ts
import { createVList, masonry } from "vlist";

const list = createVList({
  container: "#app",
  item: {
    height: (index) => imageHeights[index],
    template: renderCard,
  },
  items: photos,
}, [masonry({ columns: 3, gap: 8 })]);
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `number` | required | Number of columns (>= 1) |
| `gap` | `number` | `0` | Space between items (px) |
| `size` | `(index, context: MasonryContext) => number` | — | Responsive item height function. Context: `{ columnWidth, columns, gap, containerWidth }` |

## Heights Must Be Deterministic

Masonry pre-calculates all item positions before rendering. Heights must be known upfront — `estimatedHeight` / `autosize()` cannot be used.

For images, store **aspect ratios** and compute heights from column width:

```ts
const photos = items.map(item => ({
  ...item,
  aspectRatio: item.naturalHeight / item.naturalWidth,
}));

const list = createVList({
  container: "#app",
  item: {
    height: (index, { columnWidth }) => Math.round(columnWidth * photos[index].aspectRatio),
    template: renderCard,
  },
  items: photos,
}, [masonry({ columns: 3, gap: 8 })]);
```

Using `columnWidth` makes heights responsive — they recompute automatically when the container resizes.

## Responsive Columns

```ts
const updateColumns = () => {
  const w = window.innerWidth;
  list.updateMasonry({ columns: w < 600 ? 2 : w < 1000 ? 3 : 4 });
};
window.addEventListener("resize", updateColumns);
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getMasonryLayout()` | `MasonryLayout` | Layout instance (see below) |
| `updateMasonry(config)` | `void` | Update columns and/or gap |

**`MasonryLayout`** properties and methods:

| Member | Type | Description |
|--------|------|-------------|
| `columns` | `number` | Current column count |
| `gap` | `number` | Current gap |
| `containerSize` | `number` | Container main-axis size |
| `calculateLayout(total, getSizeForItem)` | `ItemPlacement[]` | Compute all item positions |
| `getTotalSize(placements)` | `number` | Total content height |
| `getVisibleItems(placements, start, end)` | `ItemPlacement[]` | Items in viewport range |

## CSS Classes

- `.vlist--masonry` on root

## Notes

- Each item is placed in the shortest column
- Layout recalculates on data changes
- Keyboard nav: up/down within a lane, left/right to adjacent lane (by nearest Y position)
- Conflicts with: grid, table
