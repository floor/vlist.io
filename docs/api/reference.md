# VList API Reference

> Complete reference for VList v0.8 — the tiny, blazing-fast virtual list.

---


## Installation

```sh
npm install @floor/vlist
```

```ts
import { vlist } from '@floor/vlist'
import '@floor/vlist/styles'
```

---

## Quick Start

```ts
import { vlist } from '@floor/vlist'

const list = vlist({
  container: '#my-list',
  items: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` })),
  item: {
    height: 48,
    template: (item) => `<div>${item.name}</div>`
  }
}).build()

list.scrollToIndex(5000)
list.on('item:click', ({ item }) => console.log(item))
```

---

## Factory Function

### `vlist(config)`

Creates a `VListBuilder` — a chainable object that lets you compose feature features before finalizing the list.

```ts
function vlist<T extends VListItem>(config: BuilderConfig<T>): VListBuilder<T>
```

**Returns** a `VListBuilder` with `.use()` and `.build()`.

| Method | Description |
|--------|-------------|
| `.use(feature)` | Register a feature feature. Chainable. |
| `.build()` | Materialize the list — creates DOM, initializes all features, returns the instance API. |

**Example with features:**

```ts
import { vlist, withSelection, withScrollbar, withSnapshots } from '@floor/vlist'

const list = vlist({
  container: '#app',
  items: data,
  item: { height: 56, template: renderRow },
})
  .use(withSelection({ mode: 'multiple' }))
  .use(withScrollbar())
  .use(withSnapshots())
  .build()
```

---

## Configuration

### `BuilderConfig`

The main configuration object passed to `vlist()`.

```ts
interface BuilderConfig<T extends VListItem = VListItem> {
  container:    HTMLElement | string
  item:         ItemConfig<T>
  items?:       T[]
  overscan?:    number
  orientation?: 'vertical' | 'horizontal'
  reverse?:     boolean
  classPrefix?: string
  ariaLabel?:   string
  scroll?:      ScrollConfig
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLElement \| string` | — | **Required.** The container element or a CSS selector string. |
| `item` | `ItemConfig` | — | **Required.** Item sizing and template configuration. |
| `items` | `T[]` | `[]` | Static items array. Omit when using `withAsync`. |
| `overscan` | `number` | `3` | Number of extra items rendered outside the viewport in each direction. Higher values reduce blank flashes during fast scrolling at the cost of more DOM nodes. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Scroll axis. Use `'horizontal'` for carousels or timelines. Cannot be combined with `groups`, `grid`, or `reverse`. |
| `reverse` | `boolean` | `false` | Reverse mode for chat UIs. List starts scrolled to the bottom; `appendItems()` auto-scrolls if already at bottom; `prependItems()` preserves scroll position. Cannot be combined with `groups` or `grid`. |
| `classPrefix` | `string` | `'vlist'` | CSS class prefix applied to all internal elements. Override when integrating multiple lists or avoiding conflicts. |
| `ariaLabel` | `string` | — | Sets `aria-label` on the root listbox element. |
| `scroll` | `ScrollConfig` | — | Fine-grained scroll behavior options. |

---

### `ItemConfig`

Controls how items are sized and rendered.

```ts
interface ItemConfig<T extends VListItem = VListItem> {
  height?:   number | ((index: number, context?: GridHeightContext) => number)
  width?:    number | ((index: number) => number)
  template:  ItemTemplate<T>
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `height` | `number \| (index, context?) => number` | — | Item height in pixels. Required for vertical lists. A plain number enables the fast path (zero per-item overhead). A function enables variable heights using a prefix-sum cache for O(log n) lookups. In grid mode, receives `GridHeightContext` as a second argument. |
| `width` | `number \| (index) => number` | — | Item width in pixels. Required for horizontal lists (`orientation: 'horizontal'`). Ignored in vertical mode. |
| `template` | `ItemTemplate<T>` | — | **Required.** Render function called for each visible item. May return an HTML string or a live `HTMLElement`. |

**Fixed height (fastest):**

```ts
item: {
  height: 48,
  template: (item) => `<div class="row">${item.name}</div>`
}
```

**Variable height:**

```ts
item: {
  height: (index) => data[index].expanded ? 120 : 48,
  template: (item, index, state) => `<div class="${state.selected ? 'selected' : ''}">${item.name}</div>`
}
```

**Grid aspect-ratio height:**

```ts
item: {
  height: (index, ctx) => ctx ? ctx.columnWidth * 0.75 : 200, // 4:3
  template: (item) => `<img src="${item.src}" />`
}
```

---

### `ItemTemplate`

```ts
type ItemTemplate<T = VListItem> = (
  item:   T,
  index:  number,
  state:  ItemState,
) => string | HTMLElement
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `T` | The data item for this row. |
| `index` | `number` | The item's position in the full list. |
| `state` | `ItemState` | Rendering state flags. |

```ts
interface ItemState {
  selected: boolean  // true when this item is in the selection set
  focused:  boolean  // true when this item has keyboard focus
}
```

---

### `ScrollConfig`

```ts
interface ScrollConfig {
  wheel?:       boolean
  wrap?:        boolean
  idleTimeout?: number
  element?:     Window
  scrollbar?:   'native' | 'none' | ScrollbarOptions
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `wheel` | `boolean` | `true` | Whether mouse-wheel scrolling is enabled. Set to `false` for wizard-style navigation. |
| `wrap` | `boolean` | `false` | Circular scrolling — `scrollToIndex` past the last item wraps to the beginning, and vice versa. Useful for carousels. |
| `idleTimeout` | `number` | `150` | Milliseconds after the last scroll event before the list is considered idle. Used by async loading and velocity tracking. |
| `element` | `Window` | — | Use the browser window as the scroll container (document-level scrolling). Assign `window`. |
| `scrollbar` | `'native' \| 'none' \| ScrollbarOptions` | custom | Scrollbar mode. Omit for the default custom scrollbar. `'native'` shows the browser's native bar. `'none'` hides all scrollbars. A `ScrollbarOptions` object fine-tunes the custom scrollbar. |

---

### `ScrollbarOptions`

Fine-tuning options for the custom scrollbar. Pass as `scroll.scrollbar`.

```ts
interface ScrollbarOptions {
  autoHide?:           boolean
  autoHideDelay?:      number
  minThumbSize?:       number
  showOnHover?:        boolean
  hoverZoneWidth?:     number
  showOnViewportEnter?: boolean
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoHide` | `boolean` | `true` | Hide the scrollbar thumb after the list goes idle. |
| `autoHideDelay` | `number` | `1000` | Milliseconds of idle time before the thumb fades out. |
| `minThumbSize` | `number` | `30` | Minimum thumb height in pixels. Prevents the thumb from becoming too small to grab. |
| `showOnHover` | `boolean` | `true` | Reveal the scrollbar when the cursor moves near the scrollbar edge. |
| `hoverZoneWidth` | `number` | `16` | Width in pixels of the invisible hover detection zone along the scrollbar edge. |
| `showOnViewportEnter` | `boolean` | `true` | Show the scrollbar whenever the cursor enters the list viewport. |

---

### `GridConfig`

Required when using `withGrid()` or `layout: 'grid'`.

```ts
interface GridConfig {
  columns: number
  gap?:    number
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `columns` | `number` | — | **Required.** Number of columns. Item width is calculated automatically as `(containerWidth - gaps) / columns`. Must be a positive integer. |
| `gap` | `number` | `0` | Gap between items in pixels, applied both horizontally and vertically. |

---

### `GridHeightContext`

Passed as the second argument to `item.height` when in grid mode.

```ts
interface GridHeightContext {
  containerWidth: number  // current container width in px
  columns:        number  // number of columns
  gap:            number  // gap between items in px
  columnWidth:    number  // calculated column width in px
}
```

---

### `GroupsConfig`

Passed to `withSections()` to enable sticky grouped headers.

```ts
interface GroupsConfig {
  getGroupForIndex:  (index: number) => string
  headerHeight:      number | ((group: string, groupIndex: number) => number)
  headerTemplate:    (group: string, groupIndex: number) => string | HTMLElement
  sticky?:           boolean
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `getGroupForIndex` | `(index) => string` | — | **Required.** Returns the group key for a given data index. Called in order — a new header is inserted whenever the return value changes. Items **must be pre-sorted** by group. |
| `headerHeight` | `number \| (group, groupIndex) => number` | — | **Required.** Height of group headers in pixels. Use a function for variable-height headers. |
| `headerTemplate` | `(group, groupIndex) => string \| HTMLElement` | — | **Required.** Renders a group header element. Receives the group key and its 0-based index. |
| `sticky` | `boolean` | `true` | When `true`, the active section header sticks to the top of the viewport and is pushed away by the next header. |

---

### `SelectionConfig`

Passed to `withSelection()`.

```ts
interface SelectionConfig {
  mode?:    SelectionMode  // 'none' | 'single' | 'multiple'
  initial?: Array<string | number>
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | `'none' \| 'single' \| 'multiple'` | `'none'` | Selection mode. `'single'` allows at most one selected item. `'multiple'` enables Shift+Click range selection and Ctrl/Cmd+Click toggling. |
| `initial` | `Array<string \| number>` | `[]` | Item IDs to select on initialization. |

---

### `LoadingConfig`

Passed to `withAsync()` to tune velocity-aware data loading.

```ts
interface LoadingConfig {
  cancelThreshold?:  number
  preloadThreshold?: number
  preloadAhead?:     number
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `cancelThreshold` | `number` | `25` | Scroll velocity (px/ms) above which data loading is skipped entirely and deferred until the list goes idle. Prevents wasted API calls when the user is scrolling fast. |
| `preloadThreshold` | `number` | `2` | Scroll velocity (px/ms) above which extra items are prefetched in the scroll direction (between this value and `cancelThreshold`). |
| `preloadAhead` | `number` | `50` | Number of extra items to prefetch when velocity is in the preload range. |

---

## Instance API

The object returned by `.build()`.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `element` | `HTMLElement` | The root DOM element created by VList. Append it to the page yourself if not using a selector. |
| `items` | `readonly T[]` | The current items array (read-only snapshot). |
| `total` | `number` | Total number of items currently loaded. |

---

### Data Methods

#### `setItems(items)`

Replace the entire dataset. Triggers a full re-render.

```ts
setItems(items: T[]): void
```

```ts
list.setItems(newData)
```

---

#### `appendItems(items)`

Add items to the end of the list. In reverse mode, auto-scrolls to the bottom if the user was already there.

```ts
appendItems(items: T[]): void
```

```ts
list.appendItems([{ id: 101, name: 'New item' }])
```

---

#### `prependItems(items)`

Add items to the beginning of the list. In reverse mode, preserves the current scroll position so older content loads silently above.

```ts
prependItems(items: T[]): void
```

---

#### `updateItem(id, updates)`

Patch a single item by ID. Only the provided fields are merged; the item's position in the list is unchanged.

```ts
updateItem(id: string | number, updates: Partial<T>): void
```

```ts
list.updateItem(42, { name: 'Renamed item', unread: false })
```

---

#### `removeItem(id)`

Remove a single item by ID.

```ts
removeItem(id: string | number): void
```

---

#### `reload()`

Clear all loaded data and re-fetch from the beginning. When used with `withAsync`, triggers a fresh adapter call. Returns a promise that resolves when the initial page is loaded.

```ts
reload(): Promise<void>
```

---

#### `update(config)`

Dynamically update configuration without recreating the instance. Useful for changing column count, item height, or overscan at runtime.

```ts
update(config: Partial<VListUpdateConfig>): void
```

```ts
interface VListUpdateConfig {
  grid?:          { columns?: number; gap?: number }
  itemHeight?:    number | ((index: number) => number)
  selectionMode?: SelectionMode
  overscan?:      number
}
```

```ts
// Switch to 3 columns on mobile
list.update({ grid: { columns: 3 } })

// Increase overscan when animations are involved
list.update({ overscan: 8 })
```

---

### Scroll Methods

#### `scrollToIndex(index, options?)`

Scroll so that the item at `index` is visible.

```ts
scrollToIndex(
  index: number,
  alignOrOptions?: 'start' | 'center' | 'end' | ScrollToOptions
): void
```

```ts
interface ScrollToOptions {
  align?:    'start' | 'center' | 'end'  // default: 'start'
  behavior?: 'auto' | 'smooth'           // default: 'auto' (instant)
  duration?: number                       // default: 300 (ms, smooth only)
}
```

```ts
list.scrollToIndex(500)
list.scrollToIndex(500, 'center')
list.scrollToIndex(500, { align: 'center', behavior: 'smooth', duration: 400 })
```

When `scroll.wrap` is `true`, negative indices or indices past the last item wrap around.

---

#### `scrollToItem(id, options?)`

Scroll to the item with the given ID. Equivalent to finding the index and calling `scrollToIndex`.

```ts
scrollToItem(
  id: string | number,
  alignOrOptions?: 'start' | 'center' | 'end' | ScrollToOptions
): void
```

> **Note:** `scrollToItem` is available on the full `VList` interface. On the builder's `BuiltVList`, use `scrollToIndex` with a manually looked-up index.

---

#### `cancelScroll()`

Immediately stop any in-progress smooth scroll animation.

```ts
cancelScroll(): void
```

---

#### `getScrollPosition()`

Returns the current scroll offset in pixels.

```ts
getScrollPosition(): number
```

---

### Scroll Snapshot Methods

> Requires `withSnapshots()` feature.

#### `getScrollSnapshot()`

Capture the current scroll state — useful for saving position before navigating away and restoring it on return.

```ts
getScrollSnapshot(): ScrollSnapshot
```

```ts
interface ScrollSnapshot {
  index:        number                    // first visible item index
  offsetInItem: number                    // pixel offset within that item
  selectedIds?: Array<string | number>    // selected IDs (convenience)
}
```

#### `restoreScroll(snapshot)`

Restore scroll position (and optionally selection) from a previously captured snapshot.

```ts
restoreScroll(snapshot: ScrollSnapshot): void
```

```ts
// Save before navigate
const snap = list.getScrollSnapshot()
sessionStorage.setItem('snap', JSON.stringify(snap))

// Restore on return
const snap = JSON.parse(sessionStorage.getItem('snap'))
list.restoreScroll(snap)
```

---

### Selection Methods

> Requires `withSelection()` feature.

#### `select(...ids)`

Select one or more items by ID.

```ts
select(...ids: Array<string | number>): void
```

```ts
list.select(1, 2, 3)
```

---

#### `deselect(...ids)`

Deselect one or more items by ID.

```ts
deselect(...ids: Array<string | number>): void
```

---

#### `toggleSelect(id)`

Toggle the selection state of a single item.

```ts
toggleSelect(id: string | number): void
```

---

#### `selectAll()`

Select all currently loaded items.

```ts
selectAll(): void
```

---

#### `clearSelection()`

Deselect all items.

```ts
clearSelection(): void
```

---

#### `getSelected()`

Returns an array of selected item IDs.

```ts
getSelected(): Array<string | number>
```

---

#### `getSelectedItems()`

Returns an array of the full selected item objects.

```ts
getSelectedItems(): T[]
```

---

### Events

Subscribe with `.on()` and unsubscribe with the returned function or `.off()`.

```ts
on<K extends keyof VListEvents>(event: K, handler: (payload: VListEvents[K]) => void): Unsubscribe
off<K extends keyof VListEvents>(event: K, handler: Function): void
```

```ts
// Subscribe
const unsub = list.on('item:click', ({ item, index, event }) => {
  console.log('clicked', item)
})

// Unsubscribe via returned function
unsub()

// Or via .off()
const handler = ({ item }) => console.log(item)
list.on('item:click', handler)
list.off('item:click', handler)
```

#### Event Reference

| Event | Payload | Description |
|-------|---------|-------------|
| `item:click` | `{ item: T, index: number, event: MouseEvent }` | An item was clicked. |
| `item:dblclick` | `{ item: T, index: number, event: MouseEvent }` | An item was double-clicked. |
| `selection:change` | `{ selected: Array<string \| number>, items: T[] }` | The selection set changed. Requires `withSelection`. |
| `scroll` | `{ scrollPosition: number, direction: 'up' \| 'down' }` | Fired on every scroll tick. |
| `velocity:change` | `{ velocity: number, reliable: boolean }` | Scroll velocity updated. `reliable` is `false` for the first measurement. |
| `range:change` | `{ range: Range }` | The visible item range changed (a new row became visible or left the viewport). |
| `load:start` | `{ offset: number, limit: number }` | Async data fetch started. Requires `withAsync`. |
| `load:end` | `{ items: T[], total?: number }` | Async data fetch completed. Requires `withAsync`. |
| `error` | `{ error: Error, context: string }` | An error occurred (e.g. adapter rejection). |
| `resize` | `{ height: number, width: number }` | The container was resized. |

---

### Lifecycle

#### `destroy()`

Tear down the list — removes DOM event listeners, disconnects observers, cancels pending requests, and nulls all internal references. Always call this when removing the list from the page.

```ts
destroy(): void
```

```ts
// React example
useEffect(() => {
  const list = vlist({ ... }).build()
  return () => list.destroy()
}, [])
```

---

## Feature System

Features are registered with `.use()` before `.build()`. Each feature has a unique name and an optional priority (lower = runs first, default 50). Features extend the instance with new methods and wire into the scroll/render pipeline.

```ts
vlist(config).use(featureA).use(featureB).build()
```

---

### `withSelection(config?)`

Enables item selection with keyboard navigation.

```ts
import { withSelection } from '@floor/vlist'

const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .build()

list.select(1, 2, 3)
list.on('selection:change', ({ selected }) => console.log(selected))
```

**Config:** `SelectionConfig` — see [SelectionConfig](#selectionconfig).

**Added methods:** `select`, `deselect`, `toggleSelect`, `selectAll`, `clearSelection`, `getSelected`, `getSelectedItems`.

**Keyboard shortcuts (when `mode` is `'multiple'`):**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move focus |
| `Space` | Toggle focused item |
| `Shift+↑` / `Shift+↓` | Extend selection |
| `Ctrl/Cmd+A` | Select all |
| `Escape` | Clear selection |

---

### `withAsync(adapter, config?)`

Enables infinite scroll with async data loading. Items are fetched on demand as the user scrolls.

```ts
import { withAsync } from '@floor/vlist'

const list = vlist({
  container: '#list',
  item: { height: 56, template: renderRow },
})
  .use(withAsync({
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/items?offset=${offset}&limit=${limit}`)
      const data = await res.json()
      return { items: data.items, total: data.total }
    }
  }))
  .build()
```

**Adapter interface:**

```ts
interface VListAdapter<T extends VListItem> {
  read: (params: AdapterParams) => Promise<AdapterResponse<T>>
}

interface AdapterParams {
  offset: number
  limit:  number
  cursor: string | undefined
}

interface AdapterResponse<T> {
  items:   T[]
  total?:  number    // known total (enables virtual scrollbar sizing)
  cursor?: string    // next cursor for cursor-based pagination
  hasMore?: boolean  // whether more pages exist
}
```

**Config:** `LoadingConfig` — see [LoadingConfig](#loadingconfig).

**Loading behavior:**

- Items not yet loaded are shown as placeholder elements while fetching.
- When scrolling faster than `cancelThreshold` (default 25 px/ms), fetches are skipped until the user slows down or stops.
- When velocity is between `preloadThreshold` and `cancelThreshold`, extra items are prefetched ahead of the scroll direction.

---

### `withScrollbar(options?)`

Attaches the custom scrollbar. Without this feature, VList has no visible scrollbar unless you use `scroll.scrollbar: 'native'`.

```ts
import { withScrollbar } from '@floor/vlist'

const list = vlist({ ... })
  .use(withScrollbar({
    autoHide: true,
    autoHideDelay: 800,
    showOnHover: true,
  }))
  .build()
```

**Config:** `ScrollbarOptions` — see [ScrollbarOptions](#scrollbaroptions).

> **Tip:** The custom scrollbar automatically switches to a virtual mode when `withScale` is active (compressed mode for 1M+ items), so the thumb represents the logical position rather than the DOM scroll offset.

---

### `withSections(config)`

Groups items under sticky headers — iOS Contacts–style.

```ts
import { withSections } from '@floor/vlist'

const list = vlist({
  container: '#contacts',
  items: sortedContacts,
  item: { height: 56, template: renderContact },
})
  .use(withSections({
    getGroupForIndex: (i) => sortedContacts[i].name[0].toUpperCase(),
    headerHeight: 32,
    headerTemplate: (group) => `<div class="section-header">${group}</div>`,
    sticky: true,
  }))
  .build()
```

**Config:** `GroupsConfig` — see [GroupsConfig](#groupsconfig).

> **Important:** Items must be pre-sorted by group. `getGroupForIndex` is called in ascending index order and a new header is emitted whenever the return value changes.

> Cannot be combined with `reverse` or `grid` layout.

---

### `withGrid(config?)`

Switches the list to a virtualized 2D grid layout. Virtualization operates on rows — each row holds `columns` items side by side.

```ts
import { withGrid } from '@floor/vlist'

const list = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: (_, ctx) => ctx ? ctx.columnWidth * 0.75 : 200,
    template: (photo) => `<img src="${photo.thumb}" alt="${photo.title}" />`,
  },
})
  .use(withGrid({ columns: 4, gap: 8 }))
  .build()

// Change columns at runtime
list.update({ grid: { columns: 2 } })
```

**Config:** `GridConfig` — see [GridConfig](#gridconfig).

- Item width is computed automatically: `(containerWidth - gaps) / columns`.
- The `item.height` function receives `GridHeightContext` as the second argument.
- Responds to container resize via `ResizeObserver` — column widths are recalculated automatically.

> Cannot be combined with `groups` or `reverse`.

---

### `withScale()`

Enables scaling mode for lists with 1M+ items. Without this feature, VList caps at the browser's maximum `scrollHeight` (~33M px on most browsers), which limits lists to roughly 700K fixed-height items.

With `withScale`, the scroll space is scaled so virtually any item count is representable. The scrollbar and all scroll methods work correctly in scaled mode.

```ts
import { withScale } from '@floor/vlist'

const list = vlist({
  container: '#huge-list',
  items: millionItems,
  item: { height: 32, template: renderRow },
})
  .use(withScale())
  .use(withScrollbar())  // scrollbar is scale-aware
  .build()
```

**No configuration required.** Scaling activates automatically when the total height exceeds the browser limit and is transparent to all other features.

---

### `withPage(config?)`

Button/programmatic-only navigation — disables wheel scrolling and exposes page navigation methods. Useful for wizard UIs, slide shows, or any scenario where scrolling is controlled entirely by your own UI.

```ts
import { withPage } from '@floor/vlist'

const wizard = vlist({
  container: '#steps',
  items: steps,
  item: { height: 400, template: renderStep },
  scroll: { wheel: false },
})
  .use(withPage())
  .build()

wizard.nextPage()
wizard.prevPage()
wizard.goToPage(3)
```

**Added methods:** `nextPage`, `prevPage`, `goToPage(index)`.

---

### `withSnapshots()`

Adds scroll snapshot methods for saving and restoring scroll position.

```ts
import { withSnapshots } from '@floor/vlist'

const list = vlist({ ... })
  .use(withSnapshots())
  .build()

// Save
const snapshot = list.getScrollSnapshot()

// Restore
list.restoreScroll(snapshot)
```

**Added methods:** `getScrollSnapshot`, `restoreScroll`.

See [Scroll Snapshot Methods](#scroll-snapshot-methods) for full documentation.

---

## Types Reference

### `VListItem`

All items must conform to this base interface — they must have a unique `id`.

```ts
interface VListItem {
  id: string | number
  [key: string]: unknown
}
```

### `Range`

A half-open index range `[start, end)`.

```ts
interface Range {
  start: number
  end:   number
}
```

### `ViewportState`

```ts
interface ViewportState {
  scrollPosition:   number   // current scroll offset in px
  containerSize:    number   // visible viewport size in px
  totalSize:        number   // DOM scroll size (may be capped by scaling)
  actualSize:       number   // true logical size (items × size)
  isCompressed:     boolean  // whether scaling is active
  compressionRatio: number   // 1 = none, <1 = scaled
  visibleRange:     Range    // indices of items currently in view
  renderRange:      Range    // indices actually rendered (includes overscan)
}
```

### `ScrollSnapshot`

```ts
interface ScrollSnapshot {
  index:        number                    // first visible item index
  offsetInItem: number                    // px into that item that the viewport starts
  selectedIds?: Array<string | number>
}
```

### `SelectionMode`

```ts
type SelectionMode = 'none' | 'single' | 'multiple'
```

### `Unsubscribe`

```ts
type Unsubscribe = () => void
```

### `EventHandler`

```ts
type EventHandler<T> = (payload: T) => void
```

---

## Low-Level Exports

These are exported for advanced use cases — building custom features, writing adapters, or integrating with framework wrappers.

### Rendering Utilities

```ts
import {
  createSizeCache,
  simpleVisibleRange,
  calculateRenderRange,
  calculateTotalSize,
  calculateItemOffset,
  calculateScrollToIndex,
  clampScrollPosition,
  rangesEqual,
  diffRanges,
  MAX_VIRTUAL_SIZE,
} from '@floor/vlist'
```

| Export | Description |
|--------|-------------|
| `createSizeCache(config, total)` | Creates a size cache for prefix-sum–based O(log n) size lookups. |
| `simpleVisibleRange(scrollPos, size, sc, total, out)` | Computes the visible item range for a given scroll position. |
| `calculateRenderRange(visible, overscan, total)` | Expands a visible range by overscan items in each direction. |
| `calculateTotalSize(sc, total)` | Computes the total content size. |
| `calculateItemOffset(sc, index)` | Returns the pixel offset of the item at `index`. |
| `calculateScrollToIndex(index, sc, viewportSize, total, align)` | Computes the scroll position to bring an item into view. |
| `clampScrollPosition(pos, total, viewportSize, sc)` | Clamps a scroll position within valid bounds. |
| `rangesEqual(a, b)` | Returns `true` if two ranges are identical. |
| `diffRanges(prev, next)` | Returns items that entered and left the viewport between two ranges. |
| `MAX_VIRTUAL_SIZE` | Browser scroll size limit constant (~33,554,400 px). |

### Scale Utilities

```ts
import {
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

### Selection Utilities

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

### Sections / Groups Utilities

```ts
import {
  createSectionLayout,
  buildLayoutItems,
  createSectionedSizeFn,
  createStickyHeader,
  isSectionHeader,
} from '@floor/vlist'
```

### Async Utilities

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

### Event Emitter

```ts
import { createEmitter } from '@floor/vlist'

const emitter = createEmitter<VListEvents>()
emitter.on('item:click', handler)
emitter.emit('item:click', { item, index, event })
emitter.off('item:click', handler)
```

### Scrollbar / Scroll Controller

```ts
import {
  createScrollController,
  createScrollbar,
  rafThrottle,
} from '@floor/vlist'
```

---

## Feature Authoring

Create your own features by implementing `VListFeature`:

```ts
import type { VListFeature, BuilderContext } from '@floor/vlist'

function withMyFeature(): VListFeature {
  return {
    name: 'my-feature',
    priority: 60,

    setup(ctx: BuilderContext) {
      // Register a click handler
      ctx.clickHandlers.push((event) => {
        const el = event.target.closest('[data-index]')
        if (!el) return
        const index = Number(el.dataset.index)
        console.log('clicked index', index)
      })

      // Register a scroll-phase callback
      ctx.afterScroll.push((scrollPosition, direction) => {
        console.log('scrolled to', scrollPosition)
      })

      // Expose a public method
      ctx.methods.set('myMethod', (arg: string) => {
        console.log('myMethod called with', arg)
      })

      // Register cleanup
      ctx.destroyHandlers.push(() => {
        // teardown
      })
    },
  }
}
```

---

*VList is built and maintained by [Floor IO](https://floor.io). Source available at [github.com/floor/vlist](https://github.com/floor/vlist).*
