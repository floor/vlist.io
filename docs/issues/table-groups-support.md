# Issue: withTable + withGroups Compatibility

> Add group header support to the table feature, enabling sectioned data tables
> with sticky headers — the same way withGrid + withGroups works today.

**Status:** Open
**Priority:** Medium
**Affects:** `vlist/src/features/table/`, `vlist/src/features/groups/`
**Related:** file-browser example (list view cannot use groups), data-table example

---

## Problem

`withTable` and `withGroups` cannot be combined. When both features are used
together, the table renderer silently ignores group header items — it tries to
render them as regular table rows with cells, producing broken output.

This was discovered while enhancing the **file-browser** example: the grid view
supports grouped layouts (by kind, date modified) via `withGrid` + `withGroups`,
but the list view uses `withTable` and has no way to display those same groups.

### Current Feature Compatibility

| Combination | Status | Notes |
|---|---|---|
| `withGrid` + `withGroups` | ✅ Works | Full-width headers, grid-aware layout |
| `withTable` + `withGroups` | ❌ Broken | No integration hooks exist |
| `withTable` + `withSelection` | ✅ Works | Row selection with detail panel |
| `withTable` + `withScrollbar` | ✅ Works | Custom scrollbar |
| `withTable` + `withAsync` | ✅ Works | Lazy loading |
| `withTable` + `withScale` | ✅ Works | Large dataset compression |

---

## Root Cause

### How withGroups integrates with withGrid (working pattern)

`withGroups` (priority 10) checks for internal methods exposed by `withGrid`:

```
// In withGroups setup():
const getGridLayout = ctx.methods.get("_getGridLayout")
const replaceGridRenderer = ctx.methods.get("_replaceGridRenderer")
const updateGridLayoutForGroups = ctx.methods.get("_updateGridLayoutForGroups")

if (getGridLayout && replaceGridRenderer) {
  // Grid-aware path: update grid layout for full-width headers,
  // recreate renderer with unified template
  updateGridLayoutForGroups(isHeaderFn)
  const newRenderer = createGridRenderer(...)
  replaceGridRenderer(newRenderer)
} else {
  // Fallback: simple template replacement (works for basic list)
  ctx.replaceTemplate(unifiedTemplate)
}
```

The grid feature exposes three hooks in its `setup()`:

1. `_getGridLayout` — returns the grid layout instance
2. `_replaceGridRenderer` — swaps the renderer with a new one
3. `_updateGridLayoutForGroups` — tells the grid layout which indices are headers (full-width)

### Why withTable doesn't work

`withTable` uses `ctx.setRenderFns()` to completely replace the core render
loop with its own table-aware render function. This means:

1. **`ctx.replaceTemplate()` is a no-op** — the table renderer uses its own
   cell-based templates (`column.cell`), not the core template function
2. **No integration hooks exist** — `withTable` only exposes `_getTableLayout`,
   but not `_replaceTableRenderer` or `_updateTableLayoutForGroups`
3. **The table renderer doesn't know about group headers** — `renderRow()`
   always creates cells for every column, with no special case for header items
4. **Both features run at priority 10** — ordering is not deterministic, but
   even with correct ordering the hooks are missing

---

## Proposed Solution

Follow the same pattern that `withGrid` uses. The table feature needs to expose
integration hooks, and `withGroups` needs a table-aware code path.

### Step 1: withTable exposes integration hooks

In `vlist/src/features/table/feature.ts`, add three internal methods:

```
// Expose table layout for groups feature
ctx.methods.set("_getTableLayout", () => tableLayout)      // already exists

// Expose method to replace the table renderer (for groups feature)
ctx.methods.set("_replaceTableRenderer", (newRenderer) => {
  tableRenderer = newRenderer
})

// Expose method to tell the table about group header indices
ctx.methods.set("_updateTableForGroups", (isHeaderFn) => {
  tableGroupHeaderFn = isHeaderFn
})
```

### Step 2: Table renderer handles group header items

In `vlist/src/features/table/renderer.ts`, the `renderRow()` function needs a
group header code path:

```
const renderRow = (item, index, isSelected, isFocused) => {
  // Check if this item is a group header
  if (isGroupHeader(item)) {
    return renderGroupHeaderRow(item, index)
  }

  // ... existing cell-based row rendering
}
```

A group header row should:

- Span the **full table width** (single cell spanning all columns)
- Use the `headerTemplate` from the groups config (not cell templates)
- Have a distinct CSS class: `vlist-table-group-header`
- Not be selectable (skip selection state)
- Respect the group's `headerHeight` (different from `rowHeight`)

#### DOM structure for a group header row:

```
.vlist-item.vlist-table-row.vlist-table-group-header
  └── .vlist-table-group-header-content (full width, no column cells)
```

vs a normal data row:

```
.vlist-item.vlist-table-row
  ├── .vlist-table-cell [col 0]
  ├── .vlist-table-cell [col 1]
  └── .vlist-table-cell [col 2]
```

### Step 3: withGroups detects table feature

In `vlist/src/features/groups/feature.ts`, add a table-aware path alongside
the existing grid-aware path:

```
const getGridLayout = ctx.methods.get("_getGridLayout")
const replaceGridRenderer = ctx.methods.get("_replaceGridRenderer")
const getTableLayout = ctx.methods.get("_getTableLayout")
const replaceTableRenderer = ctx.methods.get("_replaceTableRenderer")
const updateTableForGroups = ctx.methods.get("_updateTableForGroups")

if (getGridLayout && replaceGridRenderer) {
  // Grid path (existing)
  ...
} else if (getTableLayout && replaceTableRenderer) {
  // Table path (new)
  updateTableForGroups(isHeaderFn)
  const newRenderer = createTableRenderer(...)  // with group-aware renderRow
  replaceTableRenderer(newRenderer)
} else {
  // Basic list fallback (existing)
  ctx.replaceTemplate(unifiedTemplate)
}
```

### Step 4: Size cache integration

Group headers typically have a different height than data rows. The size
function needs to return `headerHeight` for group header indices and
`rowHeight` for data row indices. This is already handled by
`createGroupedSizeFn()` in the groups feature — it just needs to work
correctly with the table's size cache.

The table feature currently calls `ctx.setSizeConfig(rowHeight)` in its
setup. When groups are active, this must be overridden by the grouped size
function. Since both features run at priority 10, ordering matters:

**Option A:** `withTable` runs first (priority 10), `withGroups` runs second
(priority 10, registered after). Groups overrides the size config.

**Option B:** Add an explicit priority. Give `withGroups` a slightly later
priority (e.g., 15) so it always runs after layout features.

Option B is safer and matches the current grid+groups behavior where groups
transforms items and sizes after the grid has set up its layout.

### Step 5: CSS for table group headers

Add to `vlist/src/styles/vlist-table.css`:

```
/* Group header row — spans full table width */
.vlist-table-group-header {
  display: flex;
  align-items: center;
  background-color: var(--vlist-bg, #ffffff);
}

.vlist-table-group-header-content {
  flex: 1;
  min-width: 0;
}

/* Sticky group header (positioned by JS, like grid groups) */
.vlist--table.vlist--grouped .vlist-sticky-header {
  z-index: 6; /* above table header (z-index: 5) */
}

/* Row borders — group headers get a top border instead */
.vlist--table-row-borders .vlist-table-group-header {
  border-bottom: none;
  border-top: 1px solid var(--vlist-border, #e5e7eb);
}
```

---

## Sticky Header Interaction

When `withTable` is active, there are **two** sticky elements:

1. **Table column header** — always visible at the top (z-index 5)
2. **Group sticky header** — appears below the table header as you scroll

The group sticky header must be positioned **below** the table column header,
not overlapping it. This means:

- Group sticky header `top` = `headerHeight` (not 0)
- z-index: table header (5) > group sticky header (4), OR group sticky header
  positioned inside the viewport with `top: headerHeight`

The existing sticky header implementation (`createStickyHeader`) positions the
element at `top: 0` of the vlist root. For tables, it needs to account for the
table header height offset.

### Proposed approach

Pass `tableHeaderHeight` to `createStickyHeader` when a table is active:

```
stickyHeader = createStickyHeader(
  dom.root,
  groupLayout,
  ctx.sizeCache,
  groupsConfig,
  classPrefix,
  resolvedConfig.horizontal,
  tableHeaderHeight,  // new optional param, default 0
)
```

The sticky header element then uses `top: ${tableHeaderHeight}px` instead of
`top: 0`.

---

## Selection Interaction

`withSelection` should skip group header items. When a user clicks a group
header row, it should not trigger selection. The selection feature already
handles this for grid+groups — the `item:click` event carries the item data,
and group headers have `__groupHeader: true`.

For table+groups, the same pattern should work if the table renderer emits
`item:click` with the full item (including group header items). The consumer
filters: `if (!item.__groupHeader) { ... }`.

---

## Expected API (Consumer Perspective)

After implementation, this should work:

```
import { vlist, withTable, withGroups, withSelection } from 'vlist'

const table = vlist({
  container: '#my-table',
  item: { height: 36, template: () => '' },
  items: sortedContacts,
})
.use(withTable({
  columns: [
    { key: 'name', label: 'Name', width: 200, sortable: true },
    { key: 'email', label: 'Email', width: 300 },
    { key: 'department', label: 'Department', width: 150 },
  ],
  rowHeight: 36,
  headerHeight: 36,
  resizable: true,
}))
.use(withGroups({
  getGroupForIndex: (i) => sortedContacts[i].department,
  headerHeight: 32,
  headerTemplate: (dept) => `
    <div class="dept-header">${dept}</div>
  `,
  sticky: true,
}))
.use(withSelection({ mode: 'single' }))
.build()
```

---

## Files to Modify

| File | Change |
|---|---|
| `vlist/src/features/table/feature.ts` | Expose `_replaceTableRenderer` and `_updateTableForGroups` hooks |
| `vlist/src/features/table/renderer.ts` | Add group header row rendering path in `renderRow()` |
| `vlist/src/features/groups/feature.ts` | Add table-aware code path (alongside existing grid path) |
| `vlist/src/features/groups/sticky.ts` | Support `tableHeaderHeight` offset for sticky positioning |
| `vlist/src/styles/vlist-table.css` | Add `.vlist-table-group-header` styles |
| `vlist/src/features/table/types.ts` | (optional) Add group-related type exports |

---

## Testing Plan

### Unit Tests

- [ ] Table renderer renders group header items as full-width rows
- [ ] Table renderer renders data items as normal cell-based rows
- [ ] Group header rows are not selectable
- [ ] Size cache returns correct heights (headerHeight vs rowHeight)
- [ ] Column resize updates data rows but not group header rows
- [ ] Sort events still work (sorting should be data-only, headers recomputed)

### Integration Tests

- [ ] `withTable` + `withGroups` builds without errors
- [ ] `withTable` + `withGroups` + `withSelection` builds without errors
- [ ] Sticky group header appears below table column header
- [ ] Scrolling through groups updates sticky header text
- [ ] `setItems()` rebuilds groups correctly
- [ ] Column resize doesn't break group header layout

### Visual Tests (Examples)

- [ ] file-browser list view with "Kind" grouping — group headers span full table width
- [ ] file-browser list view with "Date Modified" grouping — sticky headers work
- [ ] data-table with department grouping — sort within groups, resize columns

---

## Complexity Estimate

**Medium-High** — The pattern is well-established (grid+groups), but the table
renderer is more complex than the grid renderer due to cell-based layout,
column resizing, and horizontal scroll sync. The sticky header z-index
interaction with the table column header adds an extra layer.

### Rough breakdown

| Task | Effort |
|---|---|
| Table integration hooks | Small |
| Table renderer group header path | Medium |
| Groups feature table-aware path | Medium |
| Sticky header offset for table | Small |
| CSS for table group headers | Small |
| Tests | Medium |
| file-browser example update | Small |

---

## References

- `vlist/src/features/grid/feature.ts` L244-280 — Grid integration hooks (pattern to follow)
- `vlist/src/features/groups/feature.ts` L180-222 — Grid-aware code path in groups
- `vlist/src/features/table/feature.ts` L95-600 — Table feature implementation
- `vlist/src/features/table/renderer.ts` L330-400 — Row rendering logic to extend
- `vlist/src/styles/vlist-table.css` — Table CSS to extend
- `vlist.io/examples/file-browser/` — Primary use case for this feature
- `vlist.io/examples/data-table/` — Secondary use case (departmental grouping)