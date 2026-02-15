# Builder Pattern

> **As of v0.5.0, the builder pattern is now the default entry point.** When you `import { createVList } from 'vlist'`, you're using the builder internally with automatic plugin application. This document explains the manual builder API for maximum control.

> Composable virtual list — pick only the features you need, pay only for what you ship.

## Overview

The builder is an alternative entry point that lets you compose a virtual list from independent feature plugins. Instead of importing the full 55 KB bundle or settling for the minimal 8 KB core, you pick exactly the capabilities you need and ship nothing else.

```typescript
import { vlist } from 'vlist/builder'
import { withSelection } from 'vlist/selection'
import { withScrollbar } from 'vlist/scroll'

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
})
.use(withSelection({ mode: 'multi' }))
.use(withScrollbar())
.build()
```

### Why

| Entry point | Minified | Gzipped | Trade-off |
|-------------|----------|---------|-----------|
| `vlist/core` | 8.0 KB | 3.3 KB | Standalone, limited API |
| **`vlist/builder`** | **14.8 KB + plugins** | **5.6 KB + plugins** | **Composable, pay-per-feature** |
| `vlist` | 54.5 KB | 17.9 KB | Everything, zero configuration |

The builder exists because bundle size matters. A contact list doesn't need grid layout. A photo gallery doesn't need selection. A chat UI doesn't need sticky headers. The builder lets each use case ship exactly the code it requires.

### Design Principles

1. **Performance is not conditional.** The hot path — scroll, range calculation, DOM recycling, element positioning — is always the same code. Plugins never add overhead to the rendering pipeline.

2. **Plugins compose features, not performance.** Each plugin adds capabilities *around* the core pipeline: event handlers, public methods, UI chrome, data strategies. The scroll-to-render loop runs identically whether you have zero plugins or all of them.

3. **No hooks on the hot path.** There is no dispatch loop, no event bus, no indirection layer between the scroll event and the DOM update. The builder core contains the full high-performance pipeline, hardcoded.

## Architecture

### What the builder core always includes

The builder core (14.8 KB min / 5.6 KB gzip) is a **self-contained file** with zero module imports. Everything is inlined — height cache, emitter, DOM structure, element pool, renderer, range calculations, scroll handling. This avoids module boundary overhead and keeps the bundle tight.

```
Builder Core (single file, always included):
├── Height cache          fixed or variable heights, prefix sums, binary search O(log n)
├── Event emitter         type-safe pub/sub (scroll, click, range:change, resize)
├── DOM structure         create root → viewport → content → items container
├── Element pool          DOM element recycling, acquire/release
├── Render pipeline       visible range → overscan → render items → position elements
├── Scroll handling       native scroll events, idle detection, direction tracking
├── Range calculation     simple height-cache math (no compression dependency)
├── Resize observer       responsive container tracking
├── ARIA accessibility    role=listbox, aria-setsize, aria-posinset, live region
├── Data store            in-memory array with ID→index map, setItems/append/prepend/update/remove
├── Scroll methods        scrollToIndex, scrollToItem, smooth animation, cancelScroll
├── Plugin context        extension points for handlers, methods, component replacement
├── Reverse mode          start-at-bottom, auto-scroll on append, scroll-preserve on prepend
└── Lifecycle             destroy with full cleanup
```

This is not a stripped-down core — it's the full rendering engine. Every list built with the builder scrolls at 60fps, recycles DOM nodes, handles resize, and provides data manipulation methods out of the box. The approach mirrors `vlist/core` (8 KB, also self-contained) but adds the plugin extension system on top.

### What plugins add

Plugins add capabilities that sit *outside* the render pipeline:

```
Plugins (opt-in):
├── withSelection()       click handler, keyboard nav, selection state, select/deselect methods
├── withScrollbar()       custom scrollbar DOM, thumb drag, track click, auto-hide, hover zone
├── withData()            async adapter, sparse storage, placeholders, load-more, reload
├── withCompression()     1M+ item support, scroll-space compression, virtual height mapping
├── withGrid()            2D grid renderer, column layout, gap calculation
├── withGroups()          grouped lists, sticky headers, header templates
└── withSnapshots()       scroll save/restore for SPA navigation
```

### Data flow

The scroll-to-render pipeline is identical regardless of plugins:

```
Native scroll event fires (passive listener)
    ↓
Read scroll position (scrollTop or window.scrollY)
    ↓
Calculate visible range (height cache binary search)
    ↓
Apply overscan to get render range
    ↓
Render if range changed:
    ├── Remove items outside new range (pool.release)
    ├── Create new items in range (pool.acquire, template, position)
    └── Batch-append via DocumentFragment
    ↓
Emit 'scroll' event
    ↓
Plugin post-scroll callbacks (if any registered):
    ├── withScrollbar  → update thumb position
    ├── withData       → check load-more threshold, ensure sparse range
    └── withCompression → update compression context
    ↓
Idle timer (CSS class toggle after 150ms)
```

The first six steps are always the same inlined code path. Plugins only participate via the `afterScroll` callback array — and only if they registered one.

### Plugin lifecycle

Each plugin goes through three phases:

```
1. REGISTRATION    .use(withSelection({ mode: 'multi' }))
                   Plugin config is stored. No code runs yet.

2. SETUP           .build()
                   Plugins run in priority order. Each receives the
                   BuilderContext and wires itself in: registers event
                   handlers, adds public methods, modifies DOM if needed.

3. TEARDOWN        list.destroy()
                   Each plugin's cleanup runs: remove event listeners,
                   remove DOM elements, release state.
```

## API Reference

### `vlist(config)`

Create a builder instance. Accepts the same base configuration as `createVList`, minus plugin-specific options (selection, scroll.scrollbar, adapter, groups, grid).

```typescript
import { vlist } from 'vlist/builder'

const builder = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item) => {
      const el = document.createElement('div')
      el.textContent = item.name
      return el
    }
  },
  items: data,
})
```

**Returns:** `VListBuilder<T>` — a chainable builder instance.

#### Base Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLElement \| string` | — | **Required.** Container element or CSS selector |
| `item` | `ItemConfig<T>` | — | **Required.** Item height and template |
| `items` | `T[]` | `[]` | Static items array |
| `overscan` | `number` | `3` | Extra items to render outside viewport |
| `classPrefix` | `string` | `'vlist'` | CSS class prefix |
| `ariaLabel` | `string` | — | Accessible label for the listbox |
| `direction` | `'vertical' \| 'horizontal'` | `'vertical'` | Scroll direction |
| `reverse` | `boolean` | `false` | Reverse mode for chat UIs |
| `scroll.wheel` | `boolean` | `true` | Enable mouse wheel scrolling |
| `scroll.wrap` | `boolean` | `false` | Wrap around at boundaries |
| `scroll.idleTimeout` | `number` | `150` | Scroll idle detection timeout (ms) |
| `scroll.element` | `Window` | — | External scroll element for window scrolling |

### `.use(plugin)`

Register a feature plugin. Chainable.

```typescript
builder
  .use(withSelection({ mode: 'multi' }))
  .use(withScrollbar({ autoHide: true }))
```

**Returns:** `VListBuilder<T>` — the same builder with the plugin registered.

Plugins are stored in registration order but executed in priority order during `.build()`. If the same plugin is registered twice, the second registration replaces the first.

### `.build()`

Materialize the virtual list. Creates the DOM, initializes all registered plugins, and returns the public API.

```typescript
const list = builder.build()
```

**Returns:** `VList<T>` — the virtual list instance with methods from all installed plugins.

This method can only be called once per builder instance. After `.build()`, the builder is consumed and cannot be reused.

## Plugins

### `withSelection(config?)`

Adds item selection with click and keyboard support.

**Size:** 5.9 KB min / 2.2 KB gzip
**Import:** `import { withSelection } from 'vlist/selection'`

```typescript
const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple', initial: ['id-1'] }))
  .build()

list.select('id-2', 'id-3')
list.deselect('id-1')
list.toggleSelect('id-4')
list.selectAll()
list.clearSelection()
const ids = list.getSelected()           // ['id-2', 'id-3', 'id-4', ...]
const items = list.getSelectedItems()    // [{ id: 'id-2', ... }, ...]
```

#### Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | `'none' \| 'single' \| 'multiple'` | `'single'` | Selection mode |
| `initial` | `Array<string \| number>` | `[]` | Pre-selected item IDs |

#### What it wires

- **Click handler** on the items container — toggles selection on item click
- **Keyboard handler** on the root element — ArrowUp/Down for focus, Space/Enter for toggle, Home/End for jump
- **ARIA attributes** — `aria-selected` on items, `aria-activedescendant` on root
- **Live region** — announces selection changes to screen readers
- **Render integration** — passes selection state to the render pipeline for CSS classes (`.vlist-item--selected`, `.vlist-item--focused`)

#### Added methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `select` | `(...ids: Array<string \| number>) => void` | Select items by ID |
| `deselect` | `(...ids: Array<string \| number>) => void` | Deselect items by ID |
| `toggleSelect` | `(id: string \| number) => void` | Toggle selection |
| `selectAll` | `() => void` | Select all (multiple mode only) |
| `clearSelection` | `() => void` | Clear all selections |
| `getSelected` | `() => Array<string \| number>` | Get selected IDs |
| `getSelectedItems` | `() => T[]` | Get selected items |

#### Added events

| Event | Payload | Description |
|-------|---------|-------------|
| `item:click` | `{ item, index, event }` | Item was clicked |
| `selection:change` | `{ selected, items }` | Selection changed |

### `withScrollbar(config?)`

Replaces the native browser scrollbar with a custom, cross-browser consistent scrollbar.

**Size:** 8.6 KB min / 3.0 KB gzip
**Import:** `import { withScrollbar } from 'vlist/scroll'`

```typescript
const list = vlist({ ... })
  .use(withScrollbar({
    autoHide: true,
    autoHideDelay: 1000,
    showOnHover: true,
    hoverZoneWidth: 16,
  }))
  .build()
```

#### Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoHide` | `boolean` | `true` | Auto-hide after idle |
| `autoHideDelay` | `number` | `1000` | Delay before hiding (ms) |
| `minThumbSize` | `number` | `30` | Minimum thumb size (px) |
| `showOnHover` | `boolean` | `true` | Show on scrollbar edge hover |
| `hoverZoneWidth` | `number` | `16` | Invisible hover zone width (px) |
| `showOnViewportEnter` | `boolean` | `true` | Show when mouse enters viewport |

#### What it wires

- **DOM elements** — track, thumb, and optional hover zone appended to viewport
- **CSS class** — `.vlist-viewport--custom-scrollbar` hides native scrollbar
- **Drag handlers** — mousedown on thumb, mousemove/mouseup on document
- **Track click** — click on track to jump to position
- **Hover handlers** — mouseenter/leave on track, hover zone, and viewport
- **Scroll sync** — updates thumb position on every scroll frame (single assignment, no overhead)
- **Resize sync** — updates thumb size when container or content height changes

#### What it does NOT wire

No methods are added to the public API. The scrollbar is entirely automatic — it appears, tracks, and hides based on user interaction.

### `withData(config?)`

Adds async data loading with sparse storage, placeholders, and infinite scroll.

**Size:** 12.2 KB min / 4.8 KB gzip
**Import:** `import { withData } from 'vlist/data'`

```typescript
const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item, _index, state) => {
      if (state.placeholder) return renderSkeleton()
      return renderUser(item)
    }
  },
  // No items — data comes from the adapter
})
.use(withData({
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/users?offset=${offset}&limit=${limit}`)
      const data = await res.json()
      return { items: data.users, total: data.total, hasMore: data.hasMore }
    }
  }
}))
.build()
```

#### Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `adapter` | `VListAdapter<T>` | — | **Required.** Async data source |
| `loading.cancelThreshold` | `number` | `25` | Skip loading above this velocity (px/ms) |
| `loading.preloadThreshold` | `number` | `2` | Start preloading above this velocity (px/ms) |
| `loading.preloadAhead` | `number` | `50` | Items to preload in scroll direction |

#### What it wires

- **Replaces data manager** — swaps the simple in-memory store with sparse storage (chunked, LRU eviction)
- **Scroll boundary detection** — triggers `loadMore()` near the bottom (or top in reverse mode)
- **Velocity-aware loading** — skips data fetching during fast scrolling, loads on idle
- **Placeholder generation** — creates skeleton items for unloaded ranges
- **Request deduplication** — prevents duplicate fetches for the same range
- **Idle handler** — loads any pending ranges when scrolling stops

#### Added methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `reload` | `() => Promise<void>` | Clear and re-fetch data |

#### Added events

| Event | Payload | Description |
|-------|---------|-------------|
| `load:start` | `{ offset, limit }` | Data loading started |
| `load:end` | `{ items, total }` | Data loading completed |
| `error` | `{ error, context }` | Loading error occurred |

### `withCompression()`

Enables support for lists with 1M+ items by compressing the scroll space when the total height exceeds the browser's ~16.7M pixel limit.

**Size:** 6.8 KB min / 2.6 KB gzip
**Import:** `import { withCompression } from 'vlist/compression'`

```typescript
const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: millionItems,
})
.use(withCompression())
.build()
```

No configuration needed — compression activates automatically when the total height exceeds the browser limit, and deactivates when items are removed below the threshold.

#### What it wires

- **Scroll mode switch** — transitions from native (`overflow: auto`) to compressed (`overflow: hidden`) scrolling when needed
- **Scroll position mapping** — maps compressed scroll positions to item indices via ratio: `scrollRatio = scrollTop / virtualHeight`
- **Item positioning** — positions items relative to viewport instead of content, maintaining full item heights
- **Custom scrollbar fallback** — forces custom scrollbar in compressed mode (native scrollbar can't represent the compressed space)
- **Near-bottom interpolation** — smooth blending near the end of the list so the last items are always reachable
- **Cached compression state** — recalculates only when total item count changes

#### How it interacts with other plugins

| Plugin | Interaction |
|--------|-------------|
| `withScrollbar` | If scrollbar mode is 'native', compression forces a switch to custom scrollbar |
| `withData` | Compression recalculates when async data changes the total item count |
| `withGrid` | Compression operates on row count, not item count |
| `withSnapshots` | Snapshots store compressed-aware index/offset for correct restore |

### `withGrid(config)`

Switches from list layout to a 2D grid with configurable columns and gap.

**Size:** 7.2 KB min / 3.1 KB gzip
**Import:** `import { withGrid } from 'vlist/grid'`

```typescript
const gallery = vlist({
  container: '#gallery',
  item: {
    // Dynamic height based on column width for aspect ratio
    height: (index, context) => {
      if (context) {
        return context.columnWidth * 0.75; // 4:3 aspect ratio
      }
      return 200; // fallback
    },
    template: (item) => {
      const img = document.createElement('img')
      img.src = item.thumbnail
      return img
    }
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build()

// Update grid configuration (height recalculates automatically)
gallery.updateGrid({ columns: 2 });
```

#### Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `columns` | `number` | — | **Required.** Number of columns (≥ 1) |
| `gap` | `number` | `0` | Gap between items in pixels |

#### Dynamic Height with Grid Context

The `item.height` function receives an optional second parameter with grid context, allowing dynamic aspect ratio calculations:

```typescript
interface GridHeightContext {
  containerWidth: number;  // Current container width
  columns: number;         // Number of columns
  gap: number;             // Gap between items
  columnWidth: number;     // Calculated width per column
}

// Height function signature
height?: number | ((index: number, context?: GridHeightContext) => number)
```

**Example - Maintain 4:3 aspect ratio:**

```typescript
const gallery = vlist({
  container: '#gallery',
  item: {
    height: (index, context) => {
      if (context) {
        // Height = 75% of column width (4:3 ratio)
        return context.columnWidth * 0.75;
      }
      return 200; // fallback for non-grid
    },
    template: renderPhoto,
  },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.build();

// When columns change, height automatically recalculates
gallery.updateGrid({ columns: 2 }); // Photos get wider AND taller proportionally
```

**Example - Square items:**

```typescript
height: (index, context) => context ? context.columnWidth : 200
```

**Example - 16:9 aspect ratio:**

```typescript
height: (index, context) => context ? context.columnWidth * 0.5625 : 200
```

#### What it wires

- **Replaces renderer** — swaps the list renderer with a grid renderer that positions items in a 2D grid
- **Redefines virtual total** — the virtualizer sees rows, not items. A 1000-item grid with 4 columns has 250 virtual rows
- **Column width calculation** — `(containerWidth - (columns - 1) × gap) / columns`, recalculated on resize
- **Item positioning** — each item gets `translateX` (column offset) and `translateY` (row offset)
- **CSS class** — adds `.vlist--grid` to the root element
- **Grid context injection** — if `item.height` is a function, it receives grid context for dynamic calculations
- **Mutable layout** — grid configuration can be updated via `updateGrid()` without recreating the instance

#### Added methods

- **`updateGrid(config)`** — Update grid configuration dynamically
  ```typescript
  gallery.updateGrid({ columns: 3, gap: 16 });
  ```
  - Updates columns and/or gap
  - Recalculates layout efficiently (no instance recreation)
  - If height is a function with context, automatically recalculates aspect ratio
  - Preserves scroll position and selection

#### Restrictions

- Cannot be combined with `withGroups` (grid has no concept of group boundaries)
- Cannot be combined with `direction: 'horizontal'` (grid is inherently 2D)
- Cannot be combined with `reverse: true` (reverse grid is not supported)

### `withGroups(config)` 

Adds grouped lists with sticky section headers.

**Size:** 9.2 KB min / 3.6 KB gzip
**Import:** `import { withGroups } from 'vlist/groups'`

```typescript
const contacts = vlist({
  container: '#contacts',
  item: { height: 56, template: renderContact },
  items: sortedContacts,
})
.use(withGroups({
  getGroupForIndex: (index) => sortedContacts[index].lastName[0],
  headerHeight: 32,
  headerTemplate: (key) => {
    const el = document.createElement('div')
    el.className = 'section-header'
    el.textContent = key
    return el
  },
  sticky: true,
}))
.build()
```

#### Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `getGroupForIndex` | `(index: number) => string` | — | **Required.** Returns group key for item at index |
| `headerHeight` | `number` | — | **Required.** Height of group headers in pixels |
| `headerTemplate` | `(key: string, groupIndex: number) => HTMLElement \| string` | — | **Required.** Render function for headers |
| `sticky` | `boolean` | `true` | Enable sticky headers (iOS Contacts style) |

#### What it wires

- **Transforms item list** — inserts header items at group boundaries. A 100-item list with 5 groups becomes a 105-item layout list
- **Replaces height function** — headers use `headerHeight`, data items use the configured `item.height`
- **Unified template** — dispatches to `headerTemplate` for headers, user template for items
- **Sticky header DOM** — creates a positioned header element that updates as you scroll through groups
- **Index mapping** — translates between data indices (what the user sees) and layout indices (what the virtualizer sees)
- **CSS class** — adds `.vlist--grouped` to the root element

#### Restrictions

- Items must be pre-sorted by group (headers are inserted where the group key changes)
- Cannot be combined with `withGrid`
- Cannot be combined with `direction: 'horizontal'`
- Cannot be combined with `reverse: true`

### `withSnapshots()` 

Adds scroll save/restore for SPA navigation and tab switching.

**Size:** 1.1 KB min / 0.6 KB gzip
**Import:** `import { withSnapshots } from 'vlist/snapshots'`

```typescript
const list = vlist({ ... })
  .use(withSnapshots())
  .build()

// Save before navigating away
const snapshot = list.getScrollSnapshot()
sessionStorage.setItem('list-scroll', JSON.stringify(snapshot))

// Restore when coming back
const saved = JSON.parse(sessionStorage.getItem('list-scroll'))
if (saved) list.restoreScroll(saved)
```

#### Added methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getScrollSnapshot` | `() => ScrollSnapshot` | Capture current scroll position (item index + sub-pixel offset) |
| `restoreScroll` | `(snapshot: ScrollSnapshot) => void` | Restore scroll position from snapshot |

#### How it works

Snapshots capture the first visible item index and the pixel offset within that item — not raw `scrollTop`. This means:

- Snapshots survive list recreation (navigate away and back)
- Snapshots work correctly with compression (1M+ items)
- Snapshots include selection state if selection is installed

```typescript
interface ScrollSnapshot {
  index: number          // First visible item index
  offsetInItem: number   // Pixels scrolled into that item
  selectedIds?: Array<string | number>  // Optional selection state
}
```

## Plugin Interactions

Plugins are designed to compose independently. However, some combinations have special behavior:

### Compatibility Matrix

| | Selection | Scrollbar | Data | Compression | Grid | Groups | Snapshots |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Selection** | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Scrollbar** | ✅ | — | ✅ | ✅¹ | ✅ | ✅ | ✅ |
| **Data** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **Compression** | ✅ | ✅¹ | ✅ | — | ✅² | ✅ | ✅³ |
| **Grid** | ✅ | ✅ | ✅ | ✅² | — | ❌ | ✅⁴ |
| **Groups** | ✅ | ✅ | ✅ | ✅ | ❌ | — | ✅⁵ |
| **Snapshots** | ✅ | ✅ | ✅ | ✅³ | ✅⁴ | ✅⁵ | — |

**Notes:**
1. Compression forces custom scrollbar when scrollbar mode would otherwise be 'native'
2. Compression operates on row count in grid mode, not item count
3. Snapshots use compressed-aware index mapping for correct save/restore
4. Snapshots use flat item index, grid maps to row/column internally
5. Snapshots use data index, groups map to layout index internally

### Invalid combinations

The builder validates plugin combinations at `.build()` time and throws descriptive errors:

```typescript
// ❌ Throws: "withGrid and withGroups cannot be combined"
vlist({ ... })
  .use(withGrid({ columns: 3 }))
  .use(withGroups({ ... }))
  .build()

// ❌ Throws: "withGrid cannot be used with direction: 'horizontal'"
vlist({ direction: 'horizontal', ... })
  .use(withGrid({ columns: 3 }))
  .build()
```

## Plugin Execution Order

Plugins register at different priorities to ensure correct wiring order:

| Priority | Plugin | Reason |
|----------|--------|--------|
| 10 | `withGrid` | Replaces the renderer — must run before anything that renders |
| 10 | `withGroups` | Transforms item list and height function — must run before rendering |
| 20 | `withData` | Replaces data manager — must run before scroll handler setup |
| 20 | `withCompression` | Modifies scroll controller — must run before scroll handler |
| 30 | `withScrollbar` | Creates scrollbar DOM — needs final scroll controller |
| 50 | `withSelection` | Hooks into click/keydown — needs renderer and DOM ready |
| 50 | `withSnapshots` | Registers methods — needs all other plugins initialized |

Users don't need to think about order — `.use()` calls can be in any sequence:

```typescript
// These produce identical results:
vlist(config).use(withSelection()).use(withGrid({ columns: 3 })).build()
vlist(config).use(withGrid({ columns: 3 })).use(withSelection()).build()
```

## BuilderContext

The `BuilderContext` is the internal interface that plugins receive during setup. This section is relevant for understanding the architecture and for writing custom plugins.

### Interface

```typescript
interface BuilderContext<T extends VListItem = VListItem> {
  // ── Core components (always present) ──────────────────────────
  readonly dom: DOMStructure
  readonly heightCache: HeightCache
  readonly emitter: Emitter<VListEvents<T>>
  readonly pool: ElementPool
  readonly config: BuilderConfig

  // ── Mutable components (replaceable by plugins) ───────────────
  renderer: Renderer<T>
  dataManager: DataManager<T>
  scrollController: ScrollController

  // ── State ─────────────────────────────────────────────────────
  state: {
    viewportState: ViewportState
    lastRenderRange: Range
    isInitialized: boolean
    isDestroyed: boolean
  }

  // ── Post-scroll actions ───────────────────────────────────────
  // Plugins register lightweight callbacks that run after each
  // scroll-triggered render. These are NOT on the hot path —
  // they run after DOM updates are complete.
  afterScroll: Array<(scrollTop: number, direction: string) => void>

  // ── Event handler slots ───────────────────────────────────────
  // Plugins register handlers for user interaction events.
  // These are attached as DOM event listeners during .build().
  clickHandlers: Array<(event: MouseEvent) => void>
  keydownHandlers: Array<(event: KeyboardEvent) => void>
  resizeHandlers: Array<(width: number, height: number) => void>
  destroyHandlers: Array<() => void>

  // ── Public method registration ────────────────────────────────
  methods: Map<string, Function>

  // ── Component replacement ─────────────────────────────────────
  replaceRenderer(renderer: Renderer<T>): void
  replaceDataManager(dataManager: DataManager<T>): void
  replaceScrollController(scrollController: ScrollController): void

  // ── Helpers ───────────────────────────────────────────────────
  getItemsForRange(range: Range): T[]
  getAllLoadedItems(): T[]
  getVirtualTotal(): number
  renderIfNeeded(): void
  forceRender(): void
}
```

### Key design decisions

**`afterScroll` array, not a hook system.** Post-scroll actions are a flat array of callbacks. No priority, no ordering, no middleware. Each callback receives `(scrollTop, direction)` and does its work. Simple, fast, predictable.

**`clickHandlers` / `keydownHandlers` arrays, not event delegation.** Each handler receives the raw DOM event. Handlers are responsible for their own element targeting (checking `data-index`, etc.). This avoids a shared event routing layer.

**`replaceRenderer` / `replaceDataManager` / `replaceScrollController`.** These are explicit replacement methods, not generic "set any component" functions. Only plugins that fundamentally change a component's behavior should use them (grid replaces renderer, data replaces data manager). Most plugins just add handlers and methods.

**`methods` Map.** Plugins register public methods by name. The builder collects them and exposes them on the returned object. If two plugins register the same method name, the later one wins (this is validated — collisions throw an error unless one plugin explicitly declares it overrides another).

## Bundle Size Reference

Measured sizes from `bun run build` (minified, gzipped):

| Component | Minified | Gzipped | What it adds |
|-----------|----------|---------|--------------|
| Builder core | 14.8 KB | 5.6 KB | Self-contained render pipeline, data store, scroll, plugin system |
| `withSelection` | 5.9 KB | 2.2 KB | Click/keyboard handlers, selection state, ARIA |
| `withScrollbar` | 8.6 KB | 3.0 KB | Custom scrollbar DOM, drag, track click, hover zone |
| `withData` | 12.2 KB | 4.8 KB | Sparse storage, placeholders, adapter, velocity-aware loading |
| `withCompression` | 6.8 KB | 2.6 KB | Scroll space compression, virtual height mapping |
| `withGrid` | 7.2 KB | 3.1 KB | Grid renderer, column layout, gap calculation |
| `withGroups` | 9.2 KB | 3.6 KB | Group layout, sticky headers, header templates |
| `withSnapshots` | 1.1 KB | 0.6 KB | Scroll save/restore |

For reference:

| Entry point | Minified | Gzipped |
|-------------|----------|---------|
| `vlist/core` | 8.0 KB | 3.3 KB |
| `vlist/builder` | 14.8 KB | 5.6 KB |
| `vlist` (full) | 54.5 KB | 17.9 KB |

The builder core is self-contained (zero module imports, everything inlined) which keeps it close to `vlist/core` despite adding the full plugin extension system.

## Common Configurations

### Simple list (core only)

```typescript
import { vlist } from 'vlist/builder'

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
}).build()

// 14.8 KB — virtual scrolling, data methods, scroll methods, plugin system
```

### Selectable list

```typescript
import { vlist } from 'vlist/builder'
import { withSelection } from 'vlist/selection'
import { withScrollbar } from 'vlist/scroll'

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
})
.use(withSelection({ mode: 'multiple' }))
.use(withScrollbar())
.build()

// ~19 KB — adds selection + custom scrollbar
```

### Infinite scroll

```typescript
import { vlist } from 'vlist/builder'
import { withData } from 'vlist/data'
import { withScrollbar } from 'vlist/scroll'

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
})
.use(withData({
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/items?offset=${offset}&limit=${limit}`)
      const data = await res.json()
      return { items: data.items, total: data.total, hasMore: data.hasMore }
    }
  }
}))
.use(withScrollbar())
.build()

// ~25 KB — adds async data loading + custom scrollbar
```

### Photo gallery

```typescript
import { vlist } from 'vlist/builder'
import { withGrid } from 'vlist/grid'
import { withScrollbar } from 'vlist/scroll'

const gallery = vlist({
  container: '#gallery',
  item: { height: 200, template: renderPhoto },
  items: photos,
})
.use(withGrid({ columns: 4, gap: 8 }))
.use(withScrollbar())
.build()

// ~21 KB — adds grid layout + custom scrollbar
```

### Chat UI

```typescript
import { vlist } from 'vlist/builder'
import { withData } from 'vlist/data'

const chat = vlist({
  container: '#messages',
  reverse: true,
  item: { height: (i) => messages[i]?.height ?? 60, template: renderMessage },
  items: recentMessages,
})
.use(withData({
  adapter: {
    read: async ({ offset, limit }) => {
      const older = await fetchOlderMessages(offset, limit)
      return { items: older, total: totalMessages, hasMore: offset + limit < totalMessages }
    }
  }
}))
.build()

// ~20 KB — adds async data loading for older messages
```

### Contacts with sticky headers

```typescript
import { vlist } from 'vlist/builder'
import { withGroups } from 'vlist/groups'
import { withSelection } from 'vlist/selection'
import { withScrollbar } from 'vlist/scroll'

const contacts = vlist({
  container: '#contacts',
  item: { height: 56, template: renderContact },
  items: sortedContacts,
})
.use(withGroups({
  getGroupForIndex: (i) => sortedContacts[i].lastName[0],
  headerHeight: 32,
  headerTemplate: (letter) => {
    const el = document.createElement('div')
    el.className = 'letter-header'
    el.textContent = letter
    return el
  },
}))
.use(withSelection({ mode: 'single' }))
.use(withScrollbar())
.build()

// ~23 KB — adds groups, selection, custom scrollbar
```

### Million-item dataset

```typescript
import { vlist } from 'vlist/builder'
import { withData } from 'vlist/data'
import { withCompression } from 'vlist/compression'
import { withScrollbar } from 'vlist/scroll'
import { withSelection } from 'vlist/selection'
import { withSnapshots } from 'vlist/snapshots'

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
})
.use(withData({ adapter: myAdapter }))
.use(withCompression())
.use(withScrollbar())
.use(withSelection({ mode: 'multiple' }))
.use(withSnapshots())
.build()

// ~31 KB — async data + compression + scrollbar + selection + snapshots
```

## Entry Point Comparison

### Default Entry Point (Recommended)

As of v0.5.0, the default `createVList()` uses the builder internally:

```typescript
import { createVList } from 'vlist';

const list = createVList({
  container: '#app',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    height: (index, context) => context.columnWidth * 0.75,
    template: renderItem,
  },
  selection: { mode: 'multiple' },
  items,
});

// Plugins auto-applied based on config:
// - withGrid (layout: 'grid')
// - withSelection (selection config)
// - withCompression (always)
// - withScrollbar (default)
// - withSnapshots (always)

// Update methods from plugins
list.updateGrid({ columns: 2 });
list.selectAll();
```

**Bundle:** ~27 KB (gzip)

### Manual Builder (Maximum Control)

For explicit control over which plugins to include:

```typescript
import { vlist } from 'vlist/builder';
import { withGrid } from 'vlist/grid';
import { withSelection } from 'vlist/selection';

const list = vlist({
  container: '#app',
  item: {
    height: (index, context) => context.columnWidth * 0.75,
    template: renderItem,
  },
  items,
})
  .use(withGrid({ columns: 4, gap: 8 }))
  .use(withSelection({ mode: 'multiple' }))
  .build();
```

**Bundle:** ~27 KB (gzip) - Same size, explicit control

## Migration from v0.4.x

If you're currently using the full `createVList` and want to switch to the builder for smaller bundles:

### No Breaking Changes

**Good news:** Your existing code continues to work! The default `createVList()` now uses the builder internally:

```typescript
// This still works (now 53% smaller!)
import { createVList } from 'vlist';

const list = createVList({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
  selection: { mode: 'multiple' },
  scroll: {
    scrollbar: { autoHide: true },
  },
});
```

### Optional: Use Manual Builder

For explicit control, you can use the builder API directly:

```typescript
import { vlist } from 'vlist/builder';
import { withSelection } from 'vlist/selection';
import { withScrollbar } from 'vlist/scroll';

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
})
  .use(withSelection({ mode: 'multiple' }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

### What changes

| Aspect | `createVList` | Builder |
|--------|---------------|---------|
| Import | Single import | Multiple imports |
| Config | Everything in one object | Base config + plugin configs |
| Methods | All always available | Only from installed plugins |
| Bundle size | Always ~54 KB | Pay per feature |
| Type safety | All methods typed | Methods typed per plugin |

### What doesn't change

| Aspect | Behavior |
|--------|----------|
| DOM structure | Identical — same root/viewport/content/items hierarchy |
| CSS classes | Identical — same class names, same styling |
| Events | Identical — same event names, same payloads |
| Performance | Identical — same render pipeline, same scroll handling |
| Accessibility | Identical — same ARIA attributes, same keyboard behavior |
| Method signatures | Identical — `setItems`, `scrollToIndex`, etc. work the same |

## When to Use Manual Builder vs. Default

### Use Default `createVList()` (Recommended)

**Best for most cases:**
- Quick prototyping
- Standard use cases (grids, infinite scroll, selection)
- When you want automatic plugin management
- When bundle size isn't critical (still 53% smaller than legacy!)

```typescript
import { createVList } from 'vlist';

const list = createVList({
  container: '#app',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: { height: 200, template: renderItem },
  items,
});
```

### Use Manual Builder `vlist/builder`

**Best for:**
- Maximum bundle size control
- Custom plugin development
- Unusual feature combinations
- When you need explicit control over plugin order

```typescript
import { vlist } from 'vlist/builder';
import { withGrid } from 'vlist/grid';

const list = vlist({ /* ... */ })
  .use(withGrid({ columns: 4, gap: 8 }))
  .build();
```

### Decision guide

```
Do you need virtual scrolling only, no extras?
  → Use vlist/core (8 KB min / 3.3 KB gzip)

Do you need features but want optimal bundle size?
  → Use vlist/builder + plugins (14.8 KB min + only the plugins you use)

Do you want convenience with automatic optimization?
  → Use vlist (default - 27 KB gzip, auto-applies needed plugins)
```

The default `createVList` is now recommended for most use cases as it provides the convenience of automatic plugin application with 53% smaller bundles than v0.4.0.

## TypeScript

### Return type inference

The builder infers the return type based on installed plugins:

```typescript
// Base: always has data methods, scroll methods, events, lifecycle
const base = vlist({ ... }).build()
base.setItems([...])       // ✅
base.scrollToIndex(0)      // ✅
base.on('scroll', handler) // ✅
base.destroy()             // ✅
base.select('id')          // ❌ TypeScript error — no selection plugin

// With selection: adds selection methods
const withSel = vlist({ ... }).use(withSelection()).build()
withSel.select('id')       // ✅
withSel.getSelected()      // ✅

// With snapshots: adds snapshot methods
const withSnap = vlist({ ... }).use(withSnapshots()).build()
withSnap.getScrollSnapshot()  // ✅
withSnap.restoreScroll(snap)  // ✅
```

### Generic items

```typescript
interface User {
  id: number
  name: string
  email: string
}

const list = vlist<User>({
  container: '#app',
  item: {
    height: 48,
    template: (user) => {
      // user is typed as User
      const el = document.createElement('div')
      el.textContent = user.name
      return el
    }
  },
  items: users,
})
.use(withSelection({ mode: 'single' }))
.build()

const selected: User[] = list.getSelectedItems()  // typed as User[]
```

### Plugin type

For plugin authors, the plugin interface:

```typescript
interface VListPlugin<T extends VListItem = VListItem> {
  /** Unique plugin name (used for deduplication and error messages) */
  readonly name: string

  /** Execution priority — lower runs first (default: 50) */
  readonly priority?: number

  /** Setup function — receives BuilderContext, wires handlers and methods */
  setup(ctx: BuilderContext<T>): void

  /** Cleanup function — called on destroy */
  destroy?(): void

  /** Methods this plugin adds to the public API */
  readonly methods?: readonly string[]

  /** Plugins this plugin conflicts with (cannot be combined) */
  readonly conflicts?: readonly string[]
}
```

## Architecture Evolution

```
┌─────────────────────────────────────────────────────────────────┐
│                        npm package                               │
│                                                                  │
│  vlist/core          8.0 KB   Standalone lightweight list        │
│  vlist/builder      14.8 KB   Composable builder core            │
│  vlist              54.5 KB   Full bundle (everything)           │
│                                                                  │
│  vlist/selection     5.9 KB   Plugin: selection                  │
│  vlist/scroll        8.6 KB   Plugin: custom scrollbar           │
│  vlist/data         12.2 KB   Plugin: async data adapter         │
│  vlist/compression   6.8 KB   Plugin: 1M+ items                  │
│  vlist/grid          7.2 KB   Plugin: 2D grid layout             │
│  vlist/groups        9.2 KB   Plugin: sticky headers             │
│  vlist/snapshots     1.1 KB   Plugin: scroll save/restore        │
│                                                                  │
│  vlist/react         0.7 KB   Framework adapter                  │
│  vlist/vue           0.5 KB   Framework adapter                  │
│  vlist/svelte        0.3 KB   Framework adapter                  │
│                                                                  │
│  vlist/styles               CSS (core)                           │
│  vlist/styles/extras        CSS (extras)                         │
└─────────────────────────────────────────────────────────────────┘
```

- **`vlist/core`** and **`vlist/builder`** both use a self-contained architecture (everything inlined, zero module imports). They don't share code at runtime — each is independently optimized for its use case.
- **`vlist`** (full bundle) continues to work exactly as before — no breaking changes.
- **Framework adapters** work with all three entry points.
- **Plugin sub-modules** can also be imported standalone for advanced manual composition, independent of the builder.

## vlist.dev Sandbox Examples

The [vlist.dev/sandbox](/sandbox) includes interactive builder examples:

| Example | What it demonstrates |
|---------|---------------------|
| [builder/basic](/sandbox/builder/basic) | Minimal builder — one plugin, zero boilerplate (19.3 KB / 7.0 KB gzip) |
| [builder/controls](/sandbox/builder/controls) | Selection, navigation, scroll events — full API exploration |
| [builder/large-list](/sandbox/builder/large-list) | 1–5M items with withCompression + withScrollbar |
| [builder/photo-album](/sandbox/builder/photo-album) | Grid gallery with withGrid + withScrollbar |
| [builder/chat](/sandbox/builder/chat) | Reverse-mode chat UI with withScrollbar |

Framework adapter examples also use the builder pattern internally:

| Example | Framework | Bundle size (gzip) |
|---------|-----------|-------------------|
| [react/basic](/sandbox/react/basic) | React 19 | 133 KB |
| [vue/basic](/sandbox/vue/basic) | Vue 3 | 226 KB |
| [svelte/basic](/sandbox/svelte/basic) | Svelte (action) | 17 KB |

## Related Documentation

- **[Main Documentation](./vlist.md)** — Configuration, API reference, examples
- **[Render Module](./render.md)** — DOM rendering, height cache, element pool
- **[Scroll Module](./scroll.md)** — Scroll controller, custom scrollbar
- **[Selection Module](./selection.md)** — Selection state management
- **[Data Module](./data.md)** — Sparse storage, async adapter, placeholders
- **[Compression Guide](./compression.md)** — 1M+ items, virtual height mapping
- **[Styles Guide](./styles.md)** — CSS tokens, customization
- **[Accessibility](./accessibility.md)** — ARIA, keyboard, screen readers