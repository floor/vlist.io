---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Exports

> Low-level utilities for custom plugins, framework adapters, or direct rendering pipeline integration.
>
> For the core API (config, methods, events), see [API Reference](./api.md). For a plugin authoring guide, see [Plugin Authoring tutorial](/tutorials/plugin-authoring).

## Import Paths

```ts
// Public API — stable
import { createVList, grid, selection, scrollbar } from "vlist";

// Internals — advanced, use at your own risk
import { createSizeCache, calculateScrollToIndex } from "vlist/internals";
```

The public entry exports `createVList`, all 14 plugin factories, `createStats`, and types. Low-level utilities live under `vlist/internals` to keep IDE autocomplete clean.

## Public API

```ts
import {
  // Factory
  createVList,

  // Plugins
  a11y, autosize, data, grid, groups, masonry,
  page, scale, scrollbar, selection, snapshots,
  sortable, table, transition,

  // Utilities
  createStats,
} from "vlist";
```

### Types (public)

```ts
import type {
  // Core
  VList, VListItem, VListEvents, VListPlugin, PluginContext,
  CreateVListConfig, ResolvedConfig, CompiledHooks,
  DOMStructure, ElementPool,

  // Items
  ItemConfig, ItemTemplate, ItemState,

  // Scroll
  ScrollConfig, ScrollToOptions, ScrollSnapshot,
  ScrollbarOptions, ScrollbarConfig, ScrollbarPadding,

  // Selection
  SelectionMode, SelectionConfig, SelectionState,

  // Data
  VListAdapter, AdapterParams, AdapterResponse,

  // Layout
  GridConfig, GridSizeContext, GridHeightContext,
  MasonryConfig, GroupsConfig, GroupHeaderConfig,

  // Viewport
  Range, ViewportState,

  // Events
  EventHandler, Unsubscribe,
} from "vlist";
```

---

## Internals

### Rendering

Size cache, visible range calculation, and rendering utilities.

```ts
import {
  createSizeCache,
  createMeasuredSizeCache,
  simpleVisibleRange,
  calculateRenderRange,
  calculateTotalSize,
  calculateActualSize,
  calculateItemOffset,
  calculateScrollToIndex,
  clampScrollPosition,
  rangesEqual,
  isInRange,
  getRangeCount,
  diffRanges,
} from "vlist/internals";
```

| Export | Description |
|--------|-------------|
| `createSizeCache(config, total)` | Size cache with prefix-sum O(log n) lookups. Fixed and variable sizes. |
| `createMeasuredSizeCache(estimated, total)` | Size cache with auto-measurement tracking (Mode B). |
| `simpleVisibleRange(scrollPos, size, sc, total, out)` | Computes visible item range for a scroll position. |
| `calculateRenderRange(visible, overscan, total)` | Expands visible range by overscan in each direction. |
| `calculateTotalSize(sc, total)` | Total content size from size cache. |
| `calculateActualSize(sc, total)` | Actual content size before compression. |
| `calculateItemOffset(sc, index)` | Pixel offset of item at index. |
| `calculateScrollToIndex(index, sc, viewportSize, total, align)` | Scroll position to bring an item into view. |
| `clampScrollPosition(pos, total, viewportSize, sc)` | Clamp scroll position within valid bounds. |
| `rangesEqual(a, b)` | True if two ranges are identical. |
| `isInRange(index, range)` | True if index falls within a range. |
| `getRangeCount(range)` | Number of items in a range. |
| `diffRanges(prev, next)` | Items that entered/left the viewport between two ranges. |

### Scale

Utilities for 1M+ items with scroll space compression.

```ts
import {
  MAX_VIRTUAL_SIZE,
  getScaleState,
  getScale,
  needsScaling,
  getMaxItemsWithoutScaling,
  getScaleInfo,
  calculateScaledVisibleRange,
  calculateScaledRenderRange,
  calculateScaledItemPosition,
  calculateScaledScrollToIndex,
  calculateIndexFromScrollPosition,
} from "vlist/internals";
```

`MAX_VIRTUAL_SIZE` is 16,000,000 px — the safe limit below browsers' maximum element size.

### Selection

Pure functions for managing selection state outside of the `selection()` plugin.

```ts
import {
  createSelectionState,
  selectItems,
  deselectItems,
  toggleSelection,
  selectAll,
  clearSelection,
  isSelected,
  getSelectedIds,
  getSelectedItems,
} from "vlist/internals";
```

### Groups

Layout utilities for grouped lists with headers.

```ts
import {
  createGroupLayout,
  buildLayoutItems,
  createGroupedSizeFn,
  createStickyHeader,
  isGroupHeader,
} from "vlist/internals";
```

### Grid

Layout and rendering for 2D grid layouts.

```ts
import {
  createGridLayout,
  createGridRenderer,
} from "vlist/internals";
```

### Masonry

Layout and rendering for Pinterest-style masonry layouts.

```ts
import {
  createMasonryLayout,
  createMasonryRenderer,
} from "vlist/internals";
```

### Table

Layout, header, and rendering for data tables.

```ts
import {
  createTableLayout,
  createTableHeader,
  createTableRenderer,
} from "vlist/internals";
```

### Async

Data management for sparse storage, placeholders, and range calculations.

```ts
import {
  createAsyncManager,
  createSparseStorage,
  createPlaceholderManager,
  isPlaceholderItem,
  filterPlaceholders,
  mergeRanges,
  calculateMissingRanges,
} from "vlist/internals";
```

### Event Emitter

Standalone type-safe event emitter — the same one used internally by vlist.

```ts
import { createEmitter } from "vlist/internals";

const emitter = createEmitter<VListEvents>();
emitter.on("item:click", handler);
emitter.emit("item:click", { item, index, event });
emitter.off("item:click", handler);
emitter.clear();
```

### Scrollbar / Scroll Controller

Low-level scroll controller and custom scrollbar components.

```ts
import {
  createScrollController,
  createScrollbar,
  rafThrottle,
} from "vlist/internals";
```

### Stats

Scroll statistics tracker — velocity, progress, visible item count. Exported from the **public API**, not internals.

```ts
import { createStats } from "vlist";
import type { Stats, StatsConfig, StatsState } from "vlist";
```
