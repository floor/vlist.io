# Builder Context

> The internal interface that features receive during setup — provides access to core components, mutable state, and registration points.

---

## Overview

The `BuilderContext` is the central coordination point for all vlist internals. It is created during `vlist(config).build()` and passed to each feature's `setup()` function. Features use it to:

- Access core components (DOM, sizeCache, emitter, config)
- Register event handlers (click, keydown, resize, scroll)
- Register public methods (exposed on the returned `VList` instance)
- Replace mutable components (renderer, dataManager, scrollController)
- Read and write mutable state (viewport, compression, lifecycle flags)

## Module Structure

```
src/builder/
├── core.ts     # Builder implementation — creates BuilderContext, runs features, materializes the list
├── types.ts    # BuilderContext interface, BuilderConfig, VList, VListFeature
├── data.ts     # SimpleDataManager (default data store)
├── dom.ts      # DOM structure creation
├── pool.ts     # Element pool for DOM recycling
└── velocity.ts # Velocity tracker for scroll momentum
```

---

## Creation Flow

```
vlist(config)
    ↓
.use(feature)           — registers features (no side effects yet)
    ↓
.build()                — materializes everything:
    ↓
  1. Resolve config     — apply defaults, compute derived flags
  2. Create DOM         — root, viewport, content, items elements
  3. Create SizeCache   — fixed or variable, from item.height/width
  4. Create Emitter     — type-safe event bus
  5. Create Renderer    — DOM rendering with pool and compression support
  6. Create DataManager — simple in-memory item store
  7. Create ScrollController — scroll position management
  8. Assemble BuilderContext — wire everything together
  9. Sort features by priority (lower runs first)
 10. Run feature.setup(ctx) for each feature
 11. Attach DOM event listeners from handler slots
 12. Initial render
 13. Return VList public API
```

---

## BuilderContext Interface

```typescript
interface BuilderContext<T extends VListItem = VListItem> {
  // ── Core components (always present) ──────────────────────────
  readonly dom:       DOMStructure
  readonly sizeCache: SizeCache
  readonly emitter:   Emitter<VListEvents<T>>
  readonly config:    ResolvedBuilderConfig
  readonly rawConfig: BuilderConfig<T>

  // ── Mutable components (replaceable by features) ──────────────
  renderer:         Renderer<T>
  dataManager:      SimpleDataManager<T>
  scrollController: ScrollController

  // ── State ─────────────────────────────────────────────────────
  state: BuilderState

  // ── Handler registration slots ────────────────────────────────
  afterScroll:         Array<(scrollPosition: number, direction: string) => void>
  clickHandlers:       Array<(event: MouseEvent) => void>
  keydownHandlers:     Array<(event: KeyboardEvent) => void>
  resizeHandlers:      Array<(width: number, height: number) => void>
  contentSizeHandlers: Array<() => void>
  destroyHandlers:     Array<() => void>

  // ── Public method registration ────────────────────────────────
  methods: Map<string, Function>

  // ── Component replacement ─────────────────────────────────────
  replaceTemplate(template: ItemTemplate<T>): void
  replaceRenderer(renderer: Renderer<T>): void
  replaceDataManager(dataManager: SimpleDataManager<T>): void
  replaceScrollController(scrollController: ScrollController): void

  // ── Helpers ───────────────────────────────────────────────────
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

  // ── Advanced hooks (used by grid, groups, compression) ────────
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

---

## Core Components

### dom

The DOM structure created during `.build()`. Read-only — features should not replace these elements, but may append children or modify attributes.

```typescript
interface DOMStructure {
  root:     HTMLElement   // Root vlist element (role="listbox")
  viewport: HTMLElement   // Scrollable container
  content:  HTMLElement   // Size-setting element (height/width matches total content)
  items:    HTMLElement   // Container for rendered item elements
}
```

### sizeCache

Axis-neutral size cache for offset/index lookups. Shared by all rendering and scrolling code. Features that change sizes (groups, grid) call `ctx.setSizeConfig()` and `ctx.rebuildSizeCache()` to update it.

### emitter

Type-safe event emitter. Features emit events and subscribe to internal signals through this. See [Events](../api/events.md).

### config

Resolved configuration after defaults are applied:

```typescript
interface ResolvedBuilderConfig {
  readonly overscan:     number
  readonly classPrefix:  string
  readonly reverse:      boolean
  readonly wrap:         boolean
  readonly horizontal:   boolean
  readonly ariaIdPrefix: string
}
```

### rawConfig

The original user-provided `BuilderConfig`, for features that need access to raw values (e.g., the original `item.height` function before groups/grid modify it).

---

## Mutable Components

These can be replaced by features during `setup()`.

### renderer

The DOM renderer. Grid feature replaces this to handle multi-column layout. Use `ctx.replaceRenderer()` for safe replacement.

### dataManager

The data store. `withAsync` replaces this with a sparse data manager that handles adapter-based loading. Use `ctx.replaceDataManager()`.

### scrollController

Manages scroll position get/set. `withScale` replaces scroll functions to handle compressed scroll space. Use `ctx.replaceScrollController()`.

---

## State

```typescript
interface BuilderState {
  viewportState:     ViewportState
  lastRenderRange:   Range
  isInitialized:     boolean
  isDestroyed:       boolean
  cachedCompression: CachedCompression | null
}
```

All operations should check `isDestroyed` before proceeding:

```typescript
setup(ctx) {
  ctx.clickHandlers.push((event) => {
    if (ctx.state.isDestroyed) return
    // ... handle click
  })
}
```

### Compression Caching

Compression state is cached and only recalculated when `totalItems` changes:

```typescript
interface CachedCompression {
  state:      CompressionState
  totalItems: number
}
```

Use `ctx.getCachedCompression()` to get the cached state. It automatically invalidates when the item count changes.

---

## Handler Registration

Features register handlers by pushing into the appropriate array during `setup()`. The builder attaches these as DOM event listeners after all features have been set up.

### afterScroll

Runs after each scroll-triggered render. Not on the hot path — runs after DOM updates are complete.

```typescript
ctx.afterScroll.push((scrollPosition, direction) => {
  // Update scrollbar position, check if more data needed, etc.
})
```

### clickHandlers

DOM click events on the items container.

```typescript
ctx.clickHandlers.push((event) => {
  const target = event.target as HTMLElement
  const itemEl = target.closest('[data-index]')
  if (itemEl) {
    const index = Number(itemEl.dataset.index)
    // ... handle item click
  }
})
```

### keydownHandlers

Keyboard events on the root element.

### resizeHandlers

Called when the container is resized (via `ResizeObserver`).

### contentSizeHandlers

Called when total content size changes (e.g., items added/removed).

### destroyHandlers

Called during `destroy()` for cleanup (remove event listeners, clear timers, etc.).

---

## Public Method Registration

Features register public methods on the `methods` Map. These are exposed on the returned `VList` instance.

```typescript
setup(ctx) {
  ctx.methods.set('getSelected', () => {
    return Array.from(selectedIds)
  })

  ctx.methods.set('select', (...ids) => {
    ids.forEach(id => selectedIds.add(id))
    ctx.forceRender()
  })
}
```

---

## Helpers

### Data Access

| Method | Description |
|--------|-------------|
| `getItemsForRange(range)` | Get items for the given index range. |
| `getAllLoadedItems()` | Get all currently loaded items. |
| `getVirtualTotal()` | Get the virtual total (may differ from data total for grid/groups). |

### Rendering

| Method | Description |
|--------|-------------|
| `renderIfNeeded()` | Trigger a render if the range has changed. |
| `forceRender()` | Force a full re-render regardless of range changes. |
| `invalidateRendered()` | Clear all rendered elements and force re-render from scratch. |
| `getRenderFns()` | Get current render functions (for wrapping by features). |
| `setRenderFns(renderIfNeeded, forceRender)` | Replace the render functions. Used by grid/groups. |

### Compression

| Method | Description |
|--------|-------------|
| `getCachedCompression()` | Get compression state (cached, invalidates on total change). |
| `getCompressionContext()` | Get positioning context for compressed item placement. |
| `updateCompressionMode()` | Recalculate compression after total items change. |

### Size & Layout

| Method | Description |
|--------|-------------|
| `setSizeConfig(config)` | Set a new size function/value. Call before `rebuildSizeCache`. |
| `rebuildSizeCache(total?)` | Rebuild the prefix-sum array after size changes. |
| `updateContentSize(totalSize)` | Update the content element's size on the main axis. |
| `getContainerWidth()` | Get container width (from ResizeObserver, reliable in tests). |
| `setVirtualTotalFn(fn)` | Override what "total" means (e.g., row count for grid). |

### Scroll

| Method | Description |
|--------|-------------|
| `setScrollFns(getTop, setTop)` | Replace scroll position get/set (used by compression). |
| `setScrollTarget(target)` | Set the scroll event target (viewport or window). |
| `getScrollTarget()` | Get the current scroll target. |
| `setVisibleRangeFn(fn)` | Replace visible range calculation (used by compression). |
| `setScrollToPosFn(fn)` | Replace scroll-to-index calculator (used by compression). |
| `setPositionElementFn(fn)` | Replace item positioning (used by compression). |
| `setContainerDimensions(getter)` | Override container dimension getters (used by window mode). |
| `disableViewportResize()` | Stop observing viewport with ResizeObserver (used by window mode). |
| `disableWheelHandler()` | Disable the viewport wheel handler (used by window mode). |

---

## Runtime Flow

```
Scroll event
    ↓
ScrollController updates position
    ↓
Velocity tracker samples position
    ↓
Viewport state updated (visible range, render range)
    ↓
renderIfNeeded() — diff ranges, update DOM
    ↓
afterScroll callbacks run
    ↓
Emitter fires 'scroll', 'velocity:change', 'range:change'
```

```
Click event
    ↓
All clickHandlers run in registration order
    ↓
Feature handler identifies clicked item
    ↓
Emitter fires 'item:click'
```

```
destroy() called
    ↓
state.isDestroyed = true
    ↓
All destroyHandlers run (features clean up)
    ↓
Emitter cleared
    ↓
DOM removed
```

---

## Writing a Feature

A minimal feature that adds a `getVisibleCount()` method:

```typescript
import type { VListFeature, BuilderContext } from '@floor/vlist'

const withVisibleCount = (): VListFeature => ({
  name: 'visibleCount',
  priority: 50,
  methods: ['getVisibleCount'],

  setup(ctx: BuilderContext) {
    ctx.methods.set('getVisibleCount', () => {
      const { visibleRange } = ctx.state.viewportState
      return visibleRange.end - visibleRange.start + 1
    })
  },
})
```

For complete feature authoring guidance, see [Exports](../api/exports.md).

---

## Related

- [Types](../api/types.md#buildercontext) — Full `BuilderContext` type definition
- [Exports](../api/exports.md) — Feature authoring guide and low-level utilities
- [Rendering](./rendering.md) — DOM rendering, SizeCache, viewport calculations
- [Events](../api/events.md) — Event types emitted through the emitter

---

*The BuilderContext is the glue that holds all vlist components together — features compose behavior by registering handlers and methods on it.*