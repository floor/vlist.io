# Low-Level Exports

> For advanced use cases — building custom features, writing framework adapters, or integrating directly with the rendering pipeline.
>
> For the core API (config, properties, methods), see [Reference](./reference.md).

---

## Import Path

All low-level exports live under `vlist/internals` — a separate entry
point from the public API. This keeps IDE autocomplete clean and makes the
boundary between stable API and implementation details explicit.

```ts
// Public API — stable
import { vlist, withGrid, withSelection, withAutoSize } from 'vlist'

// Internals — advanced, use at your own risk
import { createSizeCache, calculateScrollToIndex } from 'vlist/internals'
```

> **Migration from ≤ 1.3.x:** These symbols were previously exported from
> `vlist` directly. Update your imports to `vlist/internals`.
> The public entry point now only exports `vlist`, the `with*` features,
> and types.

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
} from 'vlist/internals'
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
} from 'vlist/internals'
```

`MAX_VIRTUAL_SIZE` is 16,000,000 px — the safe limit below the browser's maximum element size. The compression ratio is computed from the actual total size reported by the `SizeCache` — fixed, variable, and measured sizes all compress correctly.



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
} from 'vlist/internals'
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
} from 'vlist/internals'
```

---

## Grid

Layout and rendering utilities for 2D grid layouts.

```ts
import {
  createGridLayout,
  createGridRenderer,
} from 'vlist/internals'
```

---

## Masonry

Layout and rendering utilities for Pinterest-style masonry layouts.

```ts
import {
  createMasonryLayout,
  createMasonryRenderer,
} from 'vlist/internals'
```

---

## Table

Layout, header, and rendering utilities for data tables.

```ts
import {
  createTableLayout,
  createTableHeader,
  createTableRenderer,
} from 'vlist/internals'
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
} from 'vlist/internals'
```

---

## Event Emitter

Standalone type-safe event emitter — the same one used internally by vlist.

```ts
import { createEmitter } from 'vlist/internals'

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
} from 'vlist/internals'
```

---

## Stats

Scroll statistics tracker — velocity, progress, visible item count.
Exported from the public API so consumers do not need to reach into internals.

```ts
import { createStats } from 'vlist'
import type { Stats, StatsConfig, StatsState } from 'vlist'
```

---

## Reload Options

Options accepted by `reload()` for snapshot-aware reloading.
Exported from the public API alongside the other configuration types.

```ts
import type { ReloadOptions, ScrollSnapshot } from 'vlist'
```

See [Types — ReloadOptions](./types.md#reloadoptions) for the full interface.

---

## Feature Authoring

Create your own features by implementing the `VListFeature` interface.
Feature types are part of the public API — only the low-level utilities
they compose come from internals.

```ts
import type { VListFeature, BuilderContext, ReloadOptions } from 'vlist'
import { createEmitter, createSizeCache } from 'vlist/internals'

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

### BuilderContext

The internal interface that features receive during `setup()`. Provides access to core components, mutable state, and registration points for handlers, methods, and cleanup callbacks.

```ts
interface BuilderContext<T extends VListItem = VListItem> {
  // Core components (always present)
  readonly dom:        DOMStructure
  readonly sizeCache:  SizeCache
  readonly emitter:    Emitter<VListEvents<T>>
  readonly config:     ResolvedBuilderConfig
  readonly rawConfig:  BuilderConfig<T>

  // Mutable components (replaceable by features)
  renderer:         Renderer<T>
  dataManager:      SimpleDataManager<T>
  scrollController: ScrollController

  // State
  state: BuilderState

  // Handler registration slots
  afterScroll:          Array<(scrollPosition: number, direction: string) => void>
  clickHandlers:        Array<(event: MouseEvent) => void>
  keydownHandlers:      Array<(event: KeyboardEvent) => void>
  resizeHandlers:       Array<(width: number, height: number) => void>
  contentSizeHandlers:  Array<() => void>
  destroyHandlers:      Array<() => void>

  // Public method registration
  methods: Map<string, Function>

  // Component replacement
  replaceTemplate(template: ItemTemplate<T>): void
  replaceRenderer(renderer: Renderer<T>): void
  replaceDataManager(dataManager: SimpleDataManager<T>): void
  replaceScrollController(scrollController: ScrollController): void

  // Helpers
  getItemsForRange(range: Range): T[]
  getAllLoadedItems(): T[]
  getVirtualTotal(): number
  getCachedCompression(): CompressionState
  getCompressionContext(): CompressionContext
  renderIfNeeded(): void
  forceRender(): void
  invalidateRendered(): void
  getRenderFns(): { renderIfNeeded: () => void; forceRender: () => void }
  getContainerWidth(): number
  setVirtualTotalFn(fn: () => number): void
  rebuildSizeCache(total?: number): void
  setSizeConfig(config: number | ((index: number) => number)): void
  updateContentSize(totalSize: number): void
  updateCompressionMode(): void
  setVisibleRangeFn(fn: VisibleRangeFn): void
  setScrollToPosFn(fn: ScrollToIndexFn): void
  setPositionElementFn(fn: (element: HTMLElement, index: number) => void): void
  setRenderFns(renderIfNeeded: () => void, forceRender: () => void): void
  setScrollFns(getTop: () => number, setTop: (pos: number) => void): void
  setScrollTarget(target: HTMLElement | Window): void
  getScrollTarget(): HTMLElement | Window
  setContainerDimensions(getter: { width: () => number; height: () => number }): void
  disableViewportResize(): void
  disableWheelHandler(): void
}
```

For related type definitions (`BuilderState`, `ResolvedBuilderConfig`, `VListFeature`), see [Types — Builder Types](./types.md#builder-types).

### BuilderContext hooks

| Hook | Type | Description |
|------|------|-------------|
| `clickHandlers` | `Array<(event: MouseEvent) => void>` | Called on item click events. |
| `keydownHandlers` | `Array<(event: KeyboardEvent) => void>` | Called on keydown events on the root element. |
| `resizeHandlers` | `Array<(width, height) => void>` | Called when the container is resized. |
| `contentSizeHandlers` | `Array<() => void>` | Called when total content size changes. |
| `afterScroll` | `Array<(scrollPosition, direction) => void>` | Called after each scroll-triggered render. |
| `afterRenderBatch` | `Array<(items: ReadonlyArray<{ index, element }>) => void>` | Called after a batch of new items is rendered to the DOM. |
| `idleHandlers` | `Array<() => void>` | Called when scrolling becomes idle. |
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
| `adjustScrollPosition(position)` | Adjust scroll position for CSS padding. |
| `invalidateRendered()` | Mark rendered items as stale, forcing re-render on next cycle. |
| `rebuildSizeCache(total?)` | Rebuild the size cache (e.g., after column count changes). |
| `setSizeConfig(config)` | Replace the size configuration (height/width functions). |
| `updateContentSize(totalSize)` | Update the content element's total size. |
| `updateCompressionMode()` | Recalculate whether compression is needed. |
| `setVirtualTotalFn(fn)` | Replace the virtual total calculator (used by withGroups). |
| `setVisibleRangeFn(fn)` | Replace the visible range calculator. |
| `setScrollToPosFn(fn)` | Replace the scroll-to-index position calculator. |
| `setPositionElementFn(fn)` | Replace the element positioning function. |
| `setRenderFns(renderIfNeeded, forceRender)` | Replace the render functions. |
| `setScrollFns(getTop, setTop)` | Replace scroll getter/setter. |
| `setScrollTarget(target)` | Set the scroll target element. |
| `getScrollTarget()` | Get the current scroll target element. |
| `setContainerDimensions(getter)` | Replace the container dimensions getter. |
| `setUpdateItemClassesFn(fn)` | Replace the item-class updater for the renderer. |
| `getStripeIndexFn()` | Get the current stripe-index function. |
| `setStripeIndexFn(fn)` | Replace the stripe-index function (for zebra striping with groups). |
| `getItemToScrollIndexFn()` | Get the item-to-scroll-index mapping. |
| `setItemToScrollIndexFn(fn)` | Replace the item-to-scroll-index mapping (used by withGrid). |
| `disableViewportResize()` | Disable the viewport ResizeObserver. |
| `disableWheelHandler()` | Disable the built-in wheel handler. |

---

*For the core API, see [Reference](./reference.md). For feature documentation, see [Features](../features/overview.md).*