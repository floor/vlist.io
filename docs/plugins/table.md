---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Table

Virtualized data table with columns, sorting, and resizable columns.

```ts
import { createVList, table } from "vlist";

const list = createVList({
  container: "#app",
  items: users,
}, [table({
  columns: [
    { key: "name", label: "Name", width: 200 },
    { key: "email", label: "Email", width: 300 },
    { key: "role", label: "Role", width: 120 },
  ],
  rowHeight: 40,
  headerHeight: 48,
})]);

list.on("column:sort", ({ key, index, direction }) => {
  // Re-sort data and call list.setItems(sorted)
});
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `TableColumn[]` | required | Column definitions |
| `rowHeight` | `number \| (index) => number` | — | Row height (one of `rowHeight` or `estimatedRowHeight` required) |
| `estimatedRowHeight` | `number` | — | Fallback row height (one of `rowHeight` or `estimatedRowHeight` required) |
| `headerHeight` | `number` | `40` | Header row height |
| `resizable` | `boolean` | `true` | Allow column resize |
| `minColumnWidth` | `number` | `50` | Minimum column width |
| `maxColumnWidth` | `number` | `Infinity` | Maximum column width |
| `rowBorders` | `boolean` | `true` | Show row borders |
| `columnBorders` | `boolean` | `false` | Show column borders |
| `sort` | `{ key, direction }` | — | Initial sort state |

## Methods

| Method | Description |
|--------|-------------|
| `updateColumns(columns)` | Replace column definitions |
| `resizeColumn(keyOrIndex, width)` | Resize a column |
| `getColumnWidths()` | Get current widths: `{ [key]: width }` |
| `setSort(key, direction?)` | Set sort state |
| `getSort()` | Get current sort: `{ key, direction }` |

## Events

| Event | Payload |
|-------|---------|
| `column:resize` | `{ key, index, previousWidth, width }` |
| `column:sort` | `{ key, index, direction: "asc" \| "desc" \| null }` |

## CSS Classes

- `.vlist--table` on root
- `.vlist--table-row-borders` if rowBorders enabled
- `.vlist--table-col-borders` if columnBorders enabled

## Notes

- Sorting is visual only — the plugin emits `column:sort`, you re-sort data and call `setItems()`
- Sticky header row
- Conflicts with: grid, masonry
