# Table Layout

> Data table with resizable columns, sortable headers, and cell-based rendering — powered by vlist's core virtualization.

## Overview

The `withTable` feature transforms a virtual list into a full data table. Instead of building a table from scratch, it **leverages all of vlist's core functionalities** — virtualization, element pooling, size caching, scroll compression, and the builder composition model — and layers column-aware rendering on top.

Rows are the unit of virtualization, exactly like a plain list. The table feature adds:

- A **sticky header** row with column labels and resize handles
- **Cell-based rendering** — each row contains N absolutely positioned cells
- **Column layout** — widths, offsets, min/max constraints, flex distribution
- **Resize interaction** — drag column borders to resize
- **Sort events** — click sortable headers, consumer re-orders data

Because the table is built on vlist's core, you get everything else for free: `withSelection` for row selection, `withScrollbar` for custom scrollbars, `withAsync` for lazy data loading, `withScale` for million-row datasets, and `withSnapshots` for scroll position save/restore.

### Architecture

```
┌─────────────────────────────────────────────┐
│  vlist core                                 │
│  ┌──────────────────────────────────────┐   │
│  │ Virtualization engine                │   │
│  │ (size cache, range calc, overscan)   │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ Element pooling & change tracking    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ Scroll controller & compression      │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  withTable (this feature)                   │
│  ┌──────────────┐ ┌──────────────────────┐  │
│  │ TableLayout  │ │ TableHeader          │  │
│  │ (col widths, │ │ (sticky, resize,     │  │
│  │  offsets,    │ │  sort indicators,    │  │
│  │  resize)     │ │  scroll sync)        │  │
│  └──────────────┘ └──────────────────────┘  │
│  ┌──────────────────────────────────────┐   │
│  │ TableRenderer                        │   │
│  │ (cell-based rows, column positioning,│   │
│  │  pooling, change tracking)           │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Composable features (all work unchanged)   │
│  withSelection · withScrollbar · withAsync  │
│  withScale · withSnapshots                  │
└─────────────────────────────────────────────┘
```

### What vlist Core Provides (used by withTable)

| Core capability | How withTable uses it |
|---|---|
| **Row virtualization** | Only visible rows exist in the DOM — table rows are items |
| **Size cache** | Fixed or variable row heights, prefix-sum offset lookups |
| **Element pooling** | Row elements are recycled, not created/destroyed on scroll |
| **Change tracking** | Cells are only re-rendered when item data or state changes |
| **Scroll controller** | Smooth scrolling, velocity tracking, idle detection |
| **Scroll compression** | Million-row tables via `withScale` — no changes needed |
| **Resize observer** | Column widths for flex columns recalculate on container resize |
| **Event emitter** | Table adds `column:resize`, `column:sort`, `column:click` events |
| **Builder composition** | `withSelection`, `withScrollbar`, etc. compose unchanged |

### Key Features

- ✅ **Column Definitions** — Declarative column config with key, label, width, min/max, alignment
- ✅ **Cell Templates** — Per-column render functions, or automatic `item[key]` text
- ✅ **Resizable Columns** — Drag header borders with min/max constraints
- ✅ **Sortable Headers** — Click to cycle asc → desc → none (consumer sorts data)
- ✅ **Sticky Header** — Fixed above viewport, horizontally synced with body scroll
- ✅ **Flex Columns** — Columns without explicit width share remaining space equally
- ✅ **Horizontal Scroll** — When total column width exceeds container
- ✅ **Variable Row Heights** — Fixed number, function per index, or estimated (auto-measure)
- ✅ **Full ARIA** — `role="grid"`, `role="row"`, `role="gridcell"`, `aria-colindex`, `aria-sort`
- ✅ **Composable** — Works with selection, scrollbar, async, scale, snapshots

## Quick Start

```js
import { vlist, withTable, withSelection } from '@floor/vlist'

const table = vlist({
  container: '#my-table',
  item: { height: 40, template: () => '' },
  items: users,
})
.use(withTable({
  columns: [
    { key: 'name',       label: 'Name',       width: 220, sortable: true },
    { key: 'email',      label: 'Email',      width: 280, sortable: true },
    { key: 'department', label: 'Department',  width: 140, sortable: true },
    { key: 'role',       label: 'Role',        width: 180 },
  ],
  rowHeight: 40,
  headerHeight: 44,
}))
.use(withSelection({ mode: 'single' }))
.build()
```

### HTML Structure

```html
<div id="my-table" style="height: 600px;"></div>
```

### Result

The table feature will:
1. Create a sticky header row with column labels
2. Render resize handles at column borders
3. Replace the list renderer with a cell-based table renderer
4. Position cells absolutely using column offsets and widths
5. Sync header scroll with viewport scroll (horizontal)
6. Add `.vlist--table` class to the root and `role="grid"` for accessibility

### DOM Structure

```
.vlist.vlist--table [role="grid"]
├── .vlist-table-header [role="row"]           ← sticky, above viewport
│   ├── .vlist-table-header-scroll             ← scrolls in sync with body
│   │   ├── .vlist-table-header-cell [role="columnheader"]
│   │   │   ├── .vlist-table-header-content    ← label text
│   │   │   ├── .vlist-table-header-sort       ← ▲/▼ indicator
│   │   │   └── .vlist-table-header-resize     ← drag handle
│   │   ├── .vlist-table-header-cell
│   │   └── ...
├── .vlist-viewport                            ← scrollable area
│   └── .vlist-content                         ← total height spacer
│       └── .vlist-items                       ← positioned rows
│           ├── .vlist-item.vlist-table-row [role="row"]
│           │   ├── .vlist-table-cell [role="gridcell"]
│           │   ├── .vlist-table-cell
│           │   └── ...
│           ├── .vlist-item.vlist-table-row
│           └── ...
```

## Configuration

### TableConfig

```ts
interface TableConfig<T extends VListItem = VListItem> {
  /** Column definitions (required, at least one) */
  columns: TableColumn<T>[]

  /** Row height — fixed number or function per index */
  rowHeight: number | ((index: number) => number)

  /** Estimated row height for auto-measurement (Mode B) */
  estimatedRowHeight?: number

  /** Header height in pixels (default: rowHeight or 40) */
  headerHeight?: number

  /** Enable column resizing globally (default: true) */
  resizable?: boolean

  /** Default minimum column width (default: 50) */
  minColumnWidth?: number

  /** Default maximum column width (default: Infinity) */
  maxColumnWidth?: number

  /** Show vertical borders between columns (default: false) */
  columnBorders?: boolean

  /** Show horizontal borders between rows (default: true) */
  rowBorders?: boolean

  /** Initial sort state (visual indicator only) */
  sort?: { key: string; direction: 'asc' | 'desc' }
}
```

### TableColumn

```ts
interface TableColumn<T extends VListItem = VListItem> {
  /** Unique column key (maps to item property by default) */
  key: string

  /** Header label — string or DOM element */
  label: string | HTMLElement

  /** Initial width in pixels (omit for flex distribution) */
  width?: number

  /** Minimum width in pixels (default: 50) */
  minWidth?: number

  /** Maximum width in pixels (default: Infinity) */
  maxWidth?: number

  /** Allow resizing (default: inherits from config.resizable) */
  resizable?: boolean

  /** Cell template — renders cell content */
  cell?: (item: T, column: TableColumn<T>, rowIndex: number) => string | HTMLElement

  /** Header template — custom header cell render */
  header?: (column: TableColumn<T>) => string | HTMLElement

  /** Text alignment (default: 'left') */
  align?: 'left' | 'center' | 'right'

  /** Enable sort indicator on click (default: false) */
  sortable?: boolean
}
```

### Column Width Resolution

Columns are resolved in this order:

1. Columns with explicit `width` get their requested size (clamped to min/max)
2. Remaining container width is distributed equally among columns without `width`
3. If all columns have explicit widths and total < container, no stretching occurs
4. If total column width > container, horizontal scrolling is enabled

```js
// Fixed widths — total 600px, scrolls if container < 600px
columns: [
  { key: 'name',  label: 'Name',  width: 200 },
  { key: 'email', label: 'Email', width: 300 },
  { key: 'role',  label: 'Role',  width: 100 },
]

// Mix of fixed and flex — email takes remaining space
columns: [
  { key: 'name',  label: 'Name',  width: 200 },
  { key: 'email', label: 'Email' },                  // flex
  { key: 'role',  label: 'Role',  width: 100 },
]

// All flex — each gets containerWidth / 3
columns: [
  { key: 'name',  label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role',  label: 'Role' },
]
```

### Row Height Options

Like all vlist features, the table supports three height modes:

#### Mode A — Fixed Height

```js
withTable({
  columns: [...],
  rowHeight: 40,
})
```

#### Mode A — Variable Height (Function)

```js
withTable({
  columns: [...],
  rowHeight: (index) => items[index].isExpanded ? 80 : 40,
})
```

#### Mode B — Estimated Height (Auto-Measure)

```js
withTable({
  columns: [...],
  estimatedRowHeight: 48,   // measure actual height after render
})
```

## Cell Templates

### Default (Auto)

When no `cell` function is provided, the table renders `String(item[column.key])`:

```js
columns: [
  { key: 'name',  label: 'Name'  },   // → item.name as text
  { key: 'email', label: 'Email' },   // → item.email as text
]
```

### Custom Cell Templates

Use the `cell` function for rich content:

```js
columns: [
  {
    key: 'name',
    label: 'Name',
    width: 220,
    cell: (item) => `
      <div class="name-cell">
        <div class="avatar" style="background:${item.color}">${item.initials}</div>
        <span>${item.firstName} ${item.lastName}</span>
      </div>
    `,
  },
  {
    key: 'status',
    label: 'Status',
    width: 100,
    align: 'center',
    cell: (item) => {
      const active = item.active
      const cls = active ? 'badge--active' : 'badge--inactive'
      return `<span class="badge ${cls}">${active ? 'Active' : 'Inactive'}</span>`
    },
  },
  {
    key: 'actions',
    label: '',
    width: 60,
    resizable: false,
    cell: (item) => `<button onclick="edit(${item.id})">✏️</button>`,
  },
]
```

### Custom Header Templates

```js
columns: [
  {
    key: 'name',
    label: 'Name',
    header: (col) => `
      <div class="custom-header">
        <span class="icon">👤</span>
        <span>${col.label}</span>
      </div>
    `,
  },
]
```

## Sorting

The table feature **does not sort data**. It provides visual indicators and emits events — the consumer is responsible for re-ordering items.

### Setup

Mark columns as sortable:

```js
columns: [
  { key: 'name',  label: 'Name',  sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role',  label: 'Role' },                  // not sortable
]
```

### Handling Sort Events

```js
const table = vlist({ ... })
  .use(withTable({ columns, rowHeight: 40 }))
  .build()

let sortKey = null
let sortDir = 'asc'

table.on('column:sort', ({ key, direction }) => {
  if (direction === null) {
    // Sort cleared — restore original order
    table.setItems(originalItems)
    table.setSort(null)
  } else {
    sortKey = key
    sortDir = direction
    const sorted = [...originalItems].sort((a, b) => {
      const cmp = String(a[key]).localeCompare(String(b[key]))
      return direction === 'desc' ? -cmp : cmp
    })
    table.setItems(sorted)
    table.setSort(key, direction)
  }
})
```

### Sort Cycle

Clicking a sortable header cycles through:

```
(none) → ascending (▲) → descending (▼) → (none) → ...
```

### Programmatic Sort

```js
// Set sort indicator (visual only — does NOT reorder data)
table.setSort('name', 'asc')

// Clear sort indicator
table.setSort(null)

// Read current sort state
const { key, direction } = table.getSort()
```

## Column Resizing

### Drag to Resize

Hover over a column border in the header to reveal the resize handle. Click and drag to resize. The handle enforces `minWidth` and `maxWidth` constraints.

During drag:
- The root element gets `.vlist--col-resizing` (sets `cursor: col-resize` globally)
- The active handle gets a colored border
- All rendered rows update their cell widths in real time

### Resize Events

```js
table.on('column:resize', ({ key, index, previousWidth, width }) => {
  console.log(`Column "${key}" resized: ${previousWidth}px → ${width}px`)
})
```

### Programmatic Resize

```js
// Resize by column key
table.resizeColumn('email', 350)

// Resize by column index
table.resizeColumn(1, 350)

// Get current widths
const widths = table.getColumnWidths()
// → { name: 220, email: 350, role: 140 }
```

### Non-Resizable Columns

```js
columns: [
  { key: 'id', label: '#', width: 60, resizable: false },  // locked
  { key: 'name', label: 'Name', width: 200 },              // resizable
]
```

## Runtime Column Updates

Update column definitions without destroying the table:

```js
// Switch to a compact column set
table.updateColumns([
  { key: 'name',  label: 'Name',  width: 200 },
  { key: 'email', label: 'Email' },
])

// Switch to a full column set
table.updateColumns([
  { key: 'id',         label: '#',          width: 60, resizable: false },
  { key: 'name',       label: 'Name',       width: 200 },
  { key: 'email',      label: 'Email',      width: 240 },
  { key: 'company',    label: 'Company',    width: 160 },
  { key: 'department', label: 'Department', width: 130 },
  { key: 'role',       label: 'Role',       width: 170 },
  { key: 'city',       label: 'City',       width: 120 },
  { key: 'phone',      label: 'Phone',      width: 140 },
])
```

## API Reference

### withTable(config)

Feature factory. Returns a `VListFeature` to pass to `.use()`.

```js
import { vlist, withTable } from '@floor/vlist'

const table = vlist({
  container: '#table',
  item: { height: 40, template: () => '' },
  items: data,
})
.use(withTable({
  columns: [...],
  rowHeight: 40,
  headerHeight: 44,
  resizable: true,
  columnBorders: false,
  rowBorders: true,
}))
.build()
```

**Priority:** 10 (runs before other features — replaces the renderer)

**Conflicts with:** `withGrid`, `withMasonry` (only one layout mode at a time)

**Cannot combine with:** `orientation: 'horizontal'`, `reverse: true`

### Instance Methods

When `withTable` is active, the list instance exposes:

| Method | Signature | Description |
|---|---|---|
| `updateColumns` | `(columns: TableColumn[]) => void` | Replace column definitions at runtime |
| `resizeColumn` | `(keyOrIndex: string \| number, width: number) => void` | Resize a column programmatically |
| `getColumnWidths` | `() => Record<string, number>` | Get current column widths as `{ key: px }` |
| `setSort` | `(key: string \| null, direction?: 'asc' \| 'desc') => void` | Set sort indicator (visual only) |
| `getSort` | `() => { key: string \| null, direction: 'asc' \| 'desc' }` | Get current sort state |

### Events

| Event | Payload | Description |
|---|---|---|
| `column:resize` | `{ key, index, previousWidth, width }` | A column was resized |
| `column:sort` | `{ key, index, direction }` | A sortable header was clicked |
| `column:click` | `{ key, index, event }` | Any header cell was clicked |

Plus all standard vlist events (`scroll`, `range:change`, `item:click`, `selection:change`, etc.).

## Combining with Other Features

### Table + Selection

```js
const table = vlist({ ... })
  .use(withTable({ columns, rowHeight: 40 }))
  .use(withSelection({ mode: 'multiple' }))
  .build()

table.on('selection:change', ({ selected, items }) => {
  console.log(`${selected.length} rows selected`)
})
```

### Table + Scrollbar

```js
const table = vlist({ ... })
  .use(withTable({ columns, rowHeight: 40 }))
  .use(withScrollbar({ autoHide: true }))
  .build()
```

### Table + Scale (Large Datasets)

```js
// 1,000,000 rows — scroll compression handles the DOM size limit
const table = vlist({
  container: '#table',
  item: { height: 36, template: () => '' },
  items: millionRows,
})
.use(withTable({ columns, rowHeight: 36 }))
.use(withScale())
.use(withScrollbar())
.build()
```

### Table + Async (Lazy Loading)

```js
const table = vlist({
  container: '#table',
  item: { height: 40, template: () => '' },
  // no items — loaded via adapter
})
.use(withTable({ columns, rowHeight: 40 }))
.use(withAsync({
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/users?offset=${offset}&limit=${limit}`)
      const data = await res.json()
      return { items: data.users, total: data.total, hasMore: data.hasMore }
    },
  },
}))
.use(withSelection({ mode: 'single' }))
.build()
```

### Table + Snapshots

```js
const table = vlist({ ... })
  .use(withTable({ columns, rowHeight: 40 }))
  .use(withSnapshots())
  .build()

// Save scroll position
const snapshot = table.getScrollSnapshot()
localStorage.setItem('table-scroll', JSON.stringify(snapshot))

// Restore later
const saved = JSON.parse(localStorage.getItem('table-scroll'))
table.restoreScroll(saved)
```

## Performance

### Virtualization

The table inherits vlist's core virtualization — only visible rows exist in the DOM. For a table with 100,000 rows and 10 columns:

- **Without virtualization:** 1,000,000 cell elements
- **With vlist table:** ~150 cell elements (15 visible rows × 10 columns)

### Change Tracking

The table renderer tracks each row's state:
- **Item ID unchanged** — skip template re-evaluation entirely
- **Selection/focus changed** — update CSS classes only (no DOM rebuild)
- **Position changed** — update `transform: translateY()` only
- **Nothing changed** — zero DOM operations

### Element Pooling

Row elements are pooled and reused. When a row scrolls out of view, its DOM element is released to the pool (after a grace period to prevent boundary thrashing). When a new row enters the viewport, it reuses a pooled element instead of `createElement`.

### Cell Width Updates

When columns are resized, only the `left` and `width` CSS properties on existing cells are updated — no re-rendering of cell content.

## Styling

### CSS Classes

| Class | Element | Description |
|---|---|---|
| `.vlist--table` | Root | Added when table feature is active |
| `.vlist--col-resizing` | Root | Added during column drag resize |
| `.vlist-table-header` | Header row | Sticky header container |
| `.vlist-table-header-cell` | Header cell | Individual column header |
| `.vlist-table-header-cell--sortable` | Header cell | Sortable columns get pointer cursor |
| `.vlist-table-header-content` | Header label | Text content wrapper |
| `.vlist-table-header-sort` | Sort indicator | ▲/▼ character |
| `.vlist-table-header-resize` | Resize handle | Drag handle at column border |
| `.vlist-table-row` | Data row | Row element (also has `.vlist-item`) |
| `.vlist-table-cell` | Data cell | Individual cell |
| `.vlist-item--selected` | Data row | Selected row |
| `.vlist-item--focused` | Data row | Keyboard-focused row |

### CSS Custom Properties

The table respects all standard vlist custom properties:

```css
[data-theme-mode="light"] {
  --vlist-bg: #ffffff;
  --vlist-bg-hover: #f9fafb;
  --vlist-bg-selected: #eff6ff;
  --vlist-border: #e5e7eb;
  --vlist-text: #111827;
  --vlist-text-muted: #6b7280;
  --vlist-focus-ring: #3b82f6;
  --vlist-item-padding-x: 0.75rem;
}
```

### Example Styles

```css
/* Header — uppercase labels */
.vlist-table-header {
  text-transform: uppercase;
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
}

/* Cells — smaller font */
.vlist-table-cell {
  font-size: 0.875rem;
}

/* Zebra striping */
.vlist-table-row:nth-child(even) {
  background: var(--vlist-bg-hover);
}

/* Column border variant */
.vlist--table-col-borders .vlist-table-header-cell {
  border-right-color: var(--vlist-border);
}
```

### Custom Class Prefix

```js
const table = vlist({
  container: '#table',
  classPrefix: 'dt',
  item: { height: 40, template: () => '' },
  items: data,
})
.use(withTable({ columns, rowHeight: 40 }))
.build()

// Classes become: .dt--table, .dt-table-header, .dt-table-cell, etc.
```

## Best Practices

### 1. Keep Cell Templates Simple

Cell templates run for every visible row on every scroll frame that introduces new items. Keep them lightweight:

```js
// ✅ Good — minimal DOM
cell: (item) => `<span>${item.name}</span>`

// ❌ Avoid — complex nested DOM
cell: (item) => `
  <div class="wrapper">
    <div class="inner">
      <div class="icon-container">
        <svg>...</svg>
      </div>
      <div class="text-container">
        <span class="primary">${item.name}</span>
        <span class="secondary">${item.subtitle}</span>
      </div>
    </div>
  </div>
`
```

### 2. Let the Consumer Handle Sorting

The table intentionally does not sort data. This keeps the feature focused and gives you full control:

```js
// ✅ Consumer sorts — full control over sort algorithm, locale, special keys
table.on('column:sort', ({ key, direction }) => {
  const sorted = myCustomSort(data, key, direction)
  table.setItems(sorted)
  table.setSort(key, direction)
})
```

### 3. Use Min/Max Width Constraints

Prevent columns from becoming unusably small or wasting space:

```js
columns: [
  { key: 'name', label: 'Name', width: 200, minWidth: 120, maxWidth: 400 },
  { key: 'id',   label: '#',    width: 60,  minWidth: 50,  maxWidth: 80, resizable: false },
]
```

### 4. Use Flex Columns for Responsive Tables

Omit `width` on one or more columns to let them fill remaining space:

```js
columns: [
  { key: 'name',  label: 'Name',  width: 200 },     // fixed
  { key: 'email', label: 'Email' },                  // flex — takes remaining space
  { key: 'role',  label: 'Role',  width: 120 },      // fixed
]
```

### 5. Persist Column Widths

Save user's resize preferences:

```js
table.on('column:resize', () => {
  const widths = table.getColumnWidths()
  localStorage.setItem('table-widths', JSON.stringify(widths))
})

// Restore on next load
const saved = JSON.parse(localStorage.getItem('table-widths') || '{}')
for (const [key, width] of Object.entries(saved)) {
  table.resizeColumn(key, width)
}
```

### 6. Use Column Presets for Different Views

```js
const PRESETS = {
  compact: [
    { key: 'name',  label: 'Name',  width: 200 },
    { key: 'email', label: 'Email' },
  ],
  full: [
    { key: 'id',         label: '#',          width: 60 },
    { key: 'name',       label: 'Name',       width: 200 },
    { key: 'email',      label: 'Email',      width: 240 },
    { key: 'company',    label: 'Company',    width: 160 },
    { key: 'department', label: 'Department', width: 130 },
    { key: 'role',       label: 'Role',       width: 170 },
    { key: 'phone',      label: 'Phone',      width: 140 },
  ],
}

// Switch presets at runtime
table.updateColumns(PRESETS.full)
```

## Troubleshooting

### Table not rendering

- Ensure you have at least one column in the `columns` array
- Ensure `rowHeight` or `estimatedRowHeight` is provided
- The container must have a height (`height: 600px` or flex layout)

### Columns too narrow or too wide

- Check `minWidth` / `maxWidth` constraints
- If all columns have explicit widths and total < container, no stretching occurs — add a flex column
- If total > container, horizontal scrolling is expected

### Horizontal scroll not working

- The table enables horizontal scroll automatically when total column width > container
- Ensure the container doesn't have `overflow: hidden` set externally

### Header not syncing with body scroll

- The header syncs via `translateX` on the scroll container
- If you override `.vlist-table-header` styles, ensure `overflow: hidden` is preserved

### Sort indicator not showing

- Ensure the column has `sortable: true`
- After handling the `column:sort` event, call `table.setSort(key, direction)` to update the visual
- The table does NOT sort data — you must call `table.setItems(sorted)` yourself

### Resize handle not visible

- Handles appear on hover — they are transparent by default
- Ensure your CSS doesn't set `pointer-events: none` on header cells
- Non-resizable columns (`resizable: false`) don't show handles

### Performance with many columns

- Keep cell templates minimal
- For 20+ columns, ensure horizontal scrolling is working (not all columns squeezed)
- Consider column presets to let users choose which columns to show

## Module Structure

```
src/features/table/
├── index.ts      # Public exports
├── feature.ts    # withTable() feature factory
├── types.ts      # TableConfig, TableColumn, interfaces
├── layout.ts     # Column width resolution, resize, offsets
├── header.ts     # Sticky header row, resize handles, sort indicators
└── renderer.ts   # Cell-based row rendering with pooling
```

## Related Documentation

- [Grid Layout](./grid.md) — 2D grid for cards / images (different use case)
- [Selection](./selection.md) — Row selection with keyboard navigation
- [Scale](./scale.md) — Scroll compression for million-row tables
- [Async](./async.md) — Lazy data loading with placeholders
- [Scrollbar](./scrollbar.md) — Custom scrollbar UI
- [Snapshots](./snapshots.md) — Save/restore scroll position

## Live Examples

→ [Data Table Example](/examples/data-table) — 10K rows with resizable columns, sorting, selection, and column presets