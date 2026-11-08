---
created: 2026-05-27
updated: 2026-11-08
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
| `features` | `TableFeature[]` | `[]` | Optional table features ([see below](#features)) |

<!-- confirm against PR -->

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

## Features

<!-- confirm against PR -->

Starting in 3.6.0, `table({ features: [...] })` enables optional table features.
Import each feature from `vlist` and pass it inside the table configuration. Features
are tree-shaken: only applications that import and enable a feature pay for its code.
A plain `table()` does not include column pinning or reordering.

```ts
import { createVList, table, columnPin, columnReorder } from "vlist";
import "vlist/styles";
import "vlist/styles/table";

const list = createVList({
  container: "#app",
  items: users,
}, [table({
  columns: [
    { key: "name", label: "Name", width: 200 },
    { key: "email", label: "Email", width: 300 },
    { key: "role", label: "Role", width: 120, pin: "right" },
  ],
  rowHeight: 40,
  features: [
    columnPin({ pins: { name: "left" } }),
    columnReorder(),
  ],
})]);
```

Features are set up in array order. When combining these two, put `columnPin()`
before `columnReorder()`. Both belong in `table({ features: [...] })`, rather than
the outer `createVList` plugin array.

### columnPin()

<!-- confirm against PR -->

Keep columns visible at the left or right edge while the other columns scroll
horizontally. Pinning applies to both header cells and body cells.

| Setting | Type | Description |
|---------|------|-------------|
| `columnPin({ pins })` | `pins?: Record<string, "left" \| "right">` | Initial pin sides by column key; entries override or supplement `TableColumn.pin` |
| `TableColumn.pin` | `"left" \| "right"` | Initial side for a column when `columnPin()` is enabled; omit it for an unpinned column |

Columns are arranged as left-pinned, unpinned, then right-pinned. Unpinning restores
that column's original relative position among the unpinned columns.

| Method | Description |
|--------|-------------|
| `setColumnPin(keyOrIndex, pin)` | Pin to `"left"` or `"right"`; pass `null` to unpin. A numeric argument is the current resolved column index (zero-based) |
| `getColumnPins()` | Return the current pinned columns as `Record<string, "left" \| "right">` |

```ts
list.setColumnPin("email", "left");
list.setColumnPin("role", null);
const pins = list.getColumnPins();

list.on("column:pin", ({ key, index, pin, pins, order }) => {
  // Persist the pin map and resolved column key order if needed.
});
```

`column:pin` reports the changed `key`, its resolved `index` after partitioning,
the new `pin` (`"left"`, `"right"`, or `null`), the full `pins` map, and the full
resolved column key `order`.

#### Pinning styles

<!-- confirm against PR -->

The pinning styles are included in `vlist/styles/table`. Class names below use the
default `vlist` prefix; a custom `classPrefix` changes the class names accordingly.

| Class | Applied to |
|-------|------------|
| `.vlist--table-pinned` | Root while columns are pinned |
| `.vlist-table-header-cell--pin-left`, `.vlist-table-header-cell--pin-right` | Pinned header cells |
| `.vlist-table-cell--pin-left`, `.vlist-table-cell--pin-right` | Pinned body cells |
| `.vlist-table-header-cell--pin-left-last`, `.vlist-table-cell--pin-left-last` | Last column of the left-pinned group |
| `.vlist-table-header-cell--pin-right-first`, `.vlist-table-cell--pin-right-first` | First column of the right-pinned group |

The feature maintains `--vlist-table-pin-left` and `--vlist-table-pin-right` on the
root to translate pinned cells as the viewport scrolls. Leave these offsets under
the feature's control. Pinned backgrounds and boundary borders use the existing
`--vlist-bg`, `--vlist-bg-hover`, `--vlist-bg-striped`, `--vlist-bg-selected`,
`--vlist-bg-selected-hover`, and `--vlist-border` theme variables.

### columnReorder()

<!-- confirm against PR -->

Drag a column header to a new position and release it to commit the move. A drop
indicator shows the destination, and dragging near the horizontal edges scrolls
the unpinned columns. Resize handles and interactive controls inside a header
retain their own behavior. A completed drag does not also sort the column.

With a header focused, press **Alt+ArrowLeft** or **Alt+ArrowRight** to move it one
position. Focus follows the moved header, and a live region announces the move.

Prevent a column from being moved directly with `TableColumn.reorderable: false`
or its key in `columnReorder({ disabled: ["name"] })`. These settings apply to
pointer, keyboard, and programmatic moves.

| Method | Description |
|--------|-------------|
| `moveColumn(keyOrFromIndex, toIndex)` | Move a column by key or its current zero-based index to a zero-based destination |
| `getColumnOrder()` | Return all column keys in their current resolved order |

```ts
list.moveColumn("email", 1);
const order = list.getColumnOrder();

list.on("column:reorder", ({ key, fromIndex, toIndex, order }) => {
  // Persist the resulting column order if needed.
});
```

`column:reorder` reports the moved `key`, its previous `fromIndex`, its new
`toIndex`, and the full resolved column key `order`. Indices are zero-based.
Existing header and body cells move in place without re-running cell templates.

When pinning is enabled, a move stays within the column's current left-pinned,
unpinned, or right-pinned group; the destination is clamped to that group. Use
`setColumnPin()` to change a column's pin side.

### Feature sizes

<!-- confirm against PR -->

Bundle sizes for `table() + columnPin()`, `table() + columnReorder()`, and both
features together: **pending CI measurements for 3.6.0**.

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

Native content stops at the browser's element size limit, about 16 million pixels. A table
past it needs nothing extra: with the default `scroll.mode: "auto"` the list hands its
input to synthetic scrolling in place when it grows that large. Rows are positioned
relative to the scroll origin and the header stays aligned. A synthetic list draws its
own scrollbar.

```ts
import { createVList, table } from "vlist";

const list = createVList({
  container: "#app",
  items: millionRows,
}, [table({ columns, rowHeight: 36 })]);
```

`scroll: { mode: "synthetic" }` makes the table synthetic from the start. See
[Scroll modes](/docs/scroll-modes).

## Notes

- Sorting is visual only — the plugin emits `column:sort`, you re-sort data and call `setItems()`
- Sticky header row
- Tables past the browser size limit go synthetic by themselves (`scroll.mode: "auto"`)
- Conflicts with: grid, masonry

## Examples

- [Data Table](/examples/data-table) — resizable columns, sortable headers, and row selection
- [File Browser](/examples/file-browser) — Finder-like table with resizable columns
