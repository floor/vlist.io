---
created: 2026-05-27
updated: 2026-06-02
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
| `fillWidth` | `boolean \| "stretch" \| "spacer"` | `"spacer"` | Make rows span the full container width when columns don't ([see below](#filling-the-container-width)) |
| `rowBorders` | `boolean` | `true` | Show row borders |
| `columnBorders` | `boolean` | `false` | Show column borders |
| `sort` | `{ key, direction }` | — | Initial sort state |

## Filling the container width

When the columns are narrower than the container, `fillWidth` controls whether — and how — rows extend to fill the remaining space:

| Value | Behavior |
|-------|----------|
| `"spacer"` (default) | Keep every column's exact width and extend rows with empty trailing space, so column widths stay meaningful while rows reach the container edge (background, row borders, striping included) |
| `"stretch"` (or `true`) | Grow columns proportionally to their current width (respecting `maxWidth`) so the columns themselves fill the width |
| `false` | Opt out — rows are exactly as wide as the sum of the columns, leaving empty space to the right |

Both modes are a no-op once the columns overflow the container — the table scrolls horizontally as usual. The fill is recomputed on container resize and column-preset changes, and `"spacer"` re-absorbs the slack after a manual column resize so rows stay full-width.

```ts
table({
  columns: [
    { key: "city", label: "City", width: 200 },
    { key: "pop", label: "Population", width: 100, align: "right" },
    { key: "continent", label: "Continent", width: 120 },
  ],
  rowHeight: 36,
  fillWidth: "spacer", // keep widths, extend rows to the container edge
});
```

Use `"stretch"` when you want columns to consume all available space, and `"spacer"` when column widths are meaningful (e.g. fixed numeric columns) but you still want full-width rows for consistent backgrounds, row borders, and striping. Try both in the [Data Table example](/examples/data-table) via the **Fill Mode** control.

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

## Large datasets

Combine with [scale](/docs/plugins/scale) for tables with 1M+ rows. Compression is handled automatically — the table switches to compressed range calculation and viewport-relative row positioning when content exceeds the browser limit.

```ts
const list = createVList({
  container: "#app",
  items: millionRows,
}, [table({ columns, rowHeight: 36 }), scale(), scrollbar()]);
```

## Notes

- Sorting is visual only — the plugin emits `column:sort`, you re-sort data and call `setItems()`
- Sticky header row
- Works with scale plugin for 1M+ row tables
- Conflicts with: grid, masonry

## Examples

- [Data Table](/examples/data-table) — resizable columns, sortable headers, and row selection
- [File Browser](/examples/file-browser) — Finder-like table with resizable columns
