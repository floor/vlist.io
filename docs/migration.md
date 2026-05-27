---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Migration: v1 to v2

The core change in v2 is replacing the builder pattern with a factory function that accepts a plugins array.

## API Changes

**v1:**
```ts
import { vlist, withGrid, withSelection } from "vlist";

const list = vlist({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
})
  .use(withGrid({ columns: 3 }))
  .use(withSelection({ mode: "multiple" }))
  .build();
```

**v2:**
```ts
import { createVList, grid, selection } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [
  grid({ columns: 3 }),
  selection({ mode: "multiple" }),
]);
```

## What Changed

| v1 | v2 | Notes |
|----|----|----|
| `vlist(config)` | `createVList(config, plugins)` | No more builder chain |
| `.use(withGrid(...))` | `grid(...)` in plugins array | Direct plugin functions |
| `.use(withSelection(...))` | `selection(...)` | Same for all plugins |
| `.build()` | removed | Instance created immediately |
| `withX` prefix | bare name | `withGrid` → `grid`, `withAsync` → `async`, etc. |

## Plugin Renames

| v1 | v2 |
|----|----|
| `withGrid()` | `grid()` |
| `withSelection()` | `selection()` |
| `withScrollbar()` | `scrollbar()` |
| `withScale()` | `scale()` |
| `withPage()` | `page()` |
| `withSnapshots()` | `snapshots()` |
| `withTransition()` | `transition()` |
| `withAutoSize()` | `autosize()` |
| `withTable()` | `table()` |
| `withGroups()` | `groups()` |
| `withAsync()` | `data()` |
| `withMasonry()` | `masonry()` |
| `withSortable()` | `sortable()` |

## Bundle Size Improvements

The v2 base bundle is significantly smaller due to internal refactoring and better tree-shaking boundaries.

| | v1 | v2 | Change |
|--|----|----|--------|
| Base | 11.2 KB | {{size:base:gz}} KB | -55% |

All plugin deltas are the same or smaller than in v1.

## Breaking Changes

- `vlist()` removed — use `createVList()`
- Builder chain `.use().build()` removed — pass plugins as the second argument to `createVList()`
- All `withX` plugin functions renamed to bare names (see table above)
- Plugin priorities are set by each plugin — custom plugins can still set `priority` in the `VListPlugin` interface to control execution order

Instance methods, events, and config options are largely unchanged. Framework adapters (React, Vue, Svelte, Solid) will be updated in their respective packages.
