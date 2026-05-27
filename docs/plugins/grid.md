---
created: 2026-02-14
updated: 2026-05-27
status: published
---

# Grid

Converts a vertical list into a 2D grid layout.

```ts
import { createVList, grid } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 120, template: renderCard },
  items: data,
}, [grid({ columns: 3, gap: 8 })]);
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `number` | required | Number of columns (>= 1) |
| `gap` | `number` | `0` | Space between cells (px) |

## Aspect Ratios

Use the `columnWidth` context to create responsive aspect ratios that adapt when the container resizes:

```ts
const list = createVList({
  container: "#app",
  item: {
    height: (_index, { columnWidth }) => Math.round(columnWidth * 0.75), // 4:3
    template: renderCard,
  },
  items: photos,
}, [grid({ columns: 3, gap: 8 })]);
```

Common ratios: `* 1` (square), `* 0.75` (4:3), `* (9/16)` (16:9), `* (4/3)` (3:4 portrait).

Static `height: 120` values break aspect ratios on resize — always use the function form for responsive grids.

## Responsive Columns

Update the column count dynamically based on viewport width:

```ts
const updateColumns = () => {
  const w = window.innerWidth;
  const cols = w < 480 ? 2 : w < 768 ? 3 : w < 1200 ? 4 : 5;
  list.updateGrid({ columns: cols });
};

window.addEventListener("resize", updateColumns);
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getGridLayout()` | `GridLayout` | Grid layout instance (see below) |
| `updateGrid(config)` | `void` | Update columns and/or gap dynamically |

**`GridLayout`** properties and methods:

| Member | Type | Description |
|--------|------|-------------|
| `columns` | `number` | Current column count |
| `gap` | `number` | Current gap |
| `getRow(index)` | `number` | Row for item index |
| `getCol(index)` | `number` | Column for item index |
| `getTotalRows(total)` | `number` | Total row count |
| `getColumnWidth(containerWidth)` | `number` | Computed column width |

## CSS Classes

- `.vlist--grid` on root
- `.vlist-grid-item` on items

## Notes

- Keyboard nav: arrows move in 2D (left/right between columns, up/down between rows)
- Conflicts with: masonry, table

## Examples

- [Photo Album](/examples/photo-album) — responsive gallery with grid and masonry toggle
- [File Browser](/examples/file-browser) — Finder-like grid and table views
