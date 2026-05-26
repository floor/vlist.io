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

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `number` | required | Number of columns (>= 1) |
| `gap` | `number` | `0` | Space between cells (px) |

### Methods

| Method | Description |
|--------|-------------|
| `getGridLayout()` | Returns grid layout instance |
| `updateGrid(config)` | Update columns and/or gap dynamically |

### CSS Classes

- `.vlist--grid` on root
- `.vlist-grid-item` on items

### Notes

- Keyboard nav: arrows move in 2D (left/right between columns, up/down between rows)
- Conflicts with: masonry, table
