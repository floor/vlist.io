# Low-Level Exports

> For advanced use cases — building custom features, writing framework adapters, or integrating directly with the rendering pipeline.
>
> For the core API (config, properties, methods), see [Reference](./reference.md).

---

## Rendering

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
} from '@floor/vlist'
```

| Export | Description |
|--------|-------------|
| `createSizeCache(config, total)` | Size cache for prefix-sum O(log n) lookups. Works for both fixed and variable sizes. |
| `createMeasuredSizeCache(estimated, total)` | Size cache with auto-measurement tracking (Mode B). |
| `simpleVisibleRange(scrollPos, size, sc, total, out)` | Computes the visible item range for a given scroll position. |
| `calculateRenderRange(visible, overscan, total)` | Expands a visible range by overscan items in each direction. |
| `calculateTotalSize(sc, total)` | Computes the total content size. |
| `calculateActualSize(sc, total)` | Computes the actual content size (before any scaling). |
| `calculateItemOffset(sc, index)` | Returns the pixel offset of the item at `index`. |
| `calculateScrollToIndex(index, sc, viewportSize, total, align)` | Computes the scroll position to bring an item into view. |
| `clampScrollPosition(pos, total, viewportSize, sc)` | Clamps a scroll position within valid bounds. |
| `rangesEqual(a, b)` | Returns `true` if two ranges are identical. |
| `isInRange(index, range)` | Returns `true` if an index falls within a range. |
| `getRangeCount(range)` | Returns the number of items in a range. |
| `diffRanges(prev, next)` | Returns items that entered and left the viewport between two ranges. |

---

## Scale

Utilities for handling 1M+ items with scroll space compression.

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
} from '@floor/vlist'
```

`MAX_VIRTUAL_SIZE` is 16,000,000 px — the safe limit below the browser's maximum element size. The compression ratio is computed from the actual total size reported by the `SizeCache` — fixed, variable, and measured sizes all compress correctly.

> `MAX_VIRTUAL_HEIGHT` is still exported as a deprecated alias.

---

## Selection

Pure functions for managing selection state. Useful when building custom selection UIs outside of `withSelection`.

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
} from '@floor/vlist'
```

---

## Groups

Layout utilities for grouped lists with headers.

```ts
import {
  createGroupLayout,
  buildLayoutItems,
  createGroupedSizeFn,
  createStickyHeader,
  isGroupHeader,
} from '@floor/vlist'
```

---

## Grid

Layout and rendering utilities for 2D grid layouts.

```ts
import {
  createGridLayout,
  createGridRenderer,
} from '@floor/vlist'
```

---

## Masonry

Layout and rendering utilities for Pinterest-style masonry layouts.

```ts
import {
  createMasonryLayout,
  createMasonryRenderer,
} from '@floor/vlist'
```

---

## Async

Data management utilities for sparse storage, placeholders, and range calculations.

```ts
import {
  createAsyncManager,
  createSparseStorage,
  createPlaceholderManager,
  isPlaceholderItem,
  filterPlaceholders,
  mergeRanges,
  calculateMissingRanges,
} from '@floor/vlist'
```

---

## Event Emitter

Standalone type-safe event emitter — the same one used internally by vlist.

```ts
import { createEmitter } from '@floor/vlist'

const emitter = createEmitter<VListEvents>()
emitter.on('item:click', handler)
emitter.emit('item:click', { item, index, event })
emitter.off('item:click', handler)
emitter.once('item:click', handler)
emitter.clear()
emitter.listenerCount('item:click')
```

---

## Scrollbar / Scroll Controller

Low-level scroll controller and custom scrollbar components.

```ts
import {
  createScrollController,
  createScrollbar,
  rafThrottle,
} from '@floor/vlist'
```

---

## Feature Authoring

Create your own features by implementing the `VListFeature` interface:

```ts
import type { VListFeature, BuilderContext } from '@floor/vlist'

function withMyFeature(): VListFeature {
  return {
    name: 'my-feature',
    priority: 60,    // lower runs first, default is 50

    setup(ctx: BuilderContext) {
      // Register a click handler
      ctx.clickHandlers.push((event) => {
        const el = (event.target as HTMLElement).closest('[data-index]')
        if (!el) return
        const index = Number((el as HTMLElement).dataset.index)
        console.log('clicked index', index)
      })

      // Register a post-scroll callback
      ctx.afterScroll.push((scrollPosition, direction) => {
        console.log('scrolled to', scrollPosition)
      })

      // Expose a public method on the instance
      ctx.methods.set('myMethod', (arg: string) => {
        console.log('myMethod called with', arg)
      })

      // Register cleanup
      ctx.destroyHandlers.push(() => {
        // teardown resources
      })
    },

    destroy() {
      // called when the list is destroyed
    },
  }
}
```

### BuilderContext hooks

| Hook | Type | Description |
|------|------|-------------|
| `clickHandlers` | `Array<(event: MouseEvent) => void>` | Called on item click events. |
| `keydownHandlers` | `Array<(event: KeyboardEvent) => void>` | Called on keydown events on the root element. |
| `resizeHandlers` | `Array<(width, height) => void>` | Called when the container is resized. |
| `contentSizeHandlers` | `Array<() => void>` | Called when total content size changes. |
| `afterScroll` | `Array<(scrollPosition, direction) => void>` | Called after each scroll-triggered render. |
| `destroyHandlers` | `Array<() => void>` | Called during destroy for cleanup. |
| `methods` | `Map<string, Function>` | Register public methods exposed on the instance. |

### BuilderContext utilities

| Method | Description |
|--------|-------------|
| `renderIfNeeded()` | Trigger a render if the visible range changed. |
| `forceRender()` | Force a complete re-render. |
| `getItemsForRange(range)` | Get items for a given index range. |
| `getAllLoadedItems()` | Get all currently loaded items. |
| `getVirtualTotal()` | Get the current virtual total (may differ from items.length for groups/grid). |
| `getCachedCompression()` | Get the cached compression state. |
| `getContainerWidth()` | Get current container width from ResizeObserver. |
| `replaceTemplate(template)` | Replace the item template function. |
| `replaceRenderer(renderer)` | Replace the renderer (used by grid/masonry). |
| `replaceDataManager(manager)` | Replace the data manager (used by withAsync). |
| `replaceScrollController(ctrl)` | Replace the scroll controller. |

---

*For the core API, see [Reference](./reference.md). For feature documentation, see [Features](../features/overview.md).*