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

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `number` | required | Number of columns (>= 1) |
| `gap` | `number` | `0` | Space between items (px) |
| `size` | `(index, context: MasonryContext) => number` | — | Responsive item height function. Context: `{ columnWidth, columns, gap, containerWidth }` |

### Methods

| Method | Description |
|--------|-------------|
| `getMasonryLayout()` | Returns masonry layout instance |
| `updateMasonry(config)` | Update columns and/or gap |

### CSS Classes

- `.vlist--masonry` on root

### Notes

- Each item placed in the shortest column
- Recalculates layout on data changes
- Keyboard nav: arrows navigate between lanes
- Conflicts with: grid, table
