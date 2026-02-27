# Types

> TypeScript type definitions for vlist — items, configuration, state, events, and the public API.

---

## Item Types

### VListItem

Base interface all items must implement. The only constraint is a unique `id` — add any other fields your template needs.

```typescript
interface VListItem {
  id: string | number
  [key: string]: unknown
}
```

**Requirements:**
- `id` must be unique within the list
- Can have any additional properties

```typescript
interface User extends VListItem {
  id: string
  name: string
  email: string
}
```

---

## Configuration Types

### BuilderConfig

Top-level configuration object passed to `vlist()`.

```typescript
interface BuilderConfig<T extends VListItem = VListItem> {
  container:    HTMLElement | string
  item:         ItemConfig<T>
  items?:       T[]
  overscan?:    number
  classPrefix?: string
  ariaLabel?:   string
  orientation?: 'vertical' | 'horizontal'
  reverse?:     boolean
  scroll?:      ScrollConfig
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLElement \| string` | — | **Required.** Container element or CSS selector. |
| `item` | `ItemConfig<T>` | — | **Required.** Item sizing and template. |
| `items` | `T[]` | `[]` | Static items array. Omit when using `withAsync`. |
| `overscan` | `number` | `3` | Extra items rendered outside the viewport in each direction. |
| `classPrefix` | `string` | `'vlist'` | CSS class prefix for all internal elements. |
| `ariaLabel` | `string` | — | Sets `aria-label` on the root listbox element. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Scroll axis. |
| `reverse` | `boolean` | `false` | Bottom-anchored mode — list starts scrolled to the bottom. |
| `scroll` | `ScrollConfig` | — | Fine-grained scroll behavior options. |

### VListConfig

Extended configuration used by framework adapters (React, Vue, Svelte, SolidJS). Inherits all `BuilderConfig` fields and adds convenience fields that adapters translate into `.use(withX())` calls automatically.

```typescript
interface VListConfig<T extends VListItem = VListItem>
  extends Omit<BuilderConfig<T>, 'scroll'> {
  scroll?:    BuilderConfig['scroll'] & { scrollbar?: 'native' | 'none' | ScrollbarOptions }
  layout?:    'list' | 'grid'
  grid?:      GridConfig
  adapter?:   VListAdapter<T>
  loading?:   { cancelThreshold?: number; preloadThreshold?: number; preloadAhead?: number }
  groups?:    GroupsConfig
  selection?: SelectionConfig
  scrollbar?: 'native' | 'none' | ScrollbarOptions
}
```

| Property | Type | Triggers | Description |
|----------|------|----------|-------------|
| `layout` | `'list' \| 'grid'` | — | Layout mode. Set to `'grid'` with `grid` to enable grid layout. |
| `grid` | `GridConfig` | `withGrid()` | Grid columns and gap. Only used when `layout` is `'grid'`. |
| `adapter` | `VListAdapter<T>` | `withAsync()` | Async data source. Omit `items` when using an adapter. |
| `loading` | `object` | — | Loading behavior passed to `withAsync()`. |
| `groups` | `GroupsConfig` | `withSections()` | Section grouping with headers. |
| `selection` | `SelectionConfig` | `withSelection()` | Item selection mode and initial state. |
| `scrollbar` | `'native' \| 'none' \| ScrollbarOptions` | `withScrollbar()` | Top-level scrollbar shorthand. |
| `scroll.scrollbar` | `'native' \| 'none' \| ScrollbarOptions` | `withScrollbar()` | Same as top-level `scrollbar`, nested under `scroll`. |

Each adapter defines its own config type as `Omit<VListConfig<T>, 'container'>` — the full config without `container`, since the adapter handles container binding. See [Framework Adapters](../frameworks.md) for per-framework details.

### ItemConfig

Controls how items are sized and rendered. Supports two sizing strategies — known sizes (Mode A) and auto-measurement (Mode B).

```typescript
interface ItemConfig<T extends VListItem = VListItem> {
  height?:          number | ((index: number, context?: GridSizeContext) => number)
  width?:           number | ((index: number) => number)
  estimatedHeight?: number
  estimatedWidth?:  number
  template:         ItemTemplate<T>
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `height` | `number \| (index, ctx?) => number` | — | Item size in pixels along the main axis. Required for vertical lists. In grid mode, the function receives a `GridSizeContext` as a second argument. |
| `width` | `number \| (index) => number` | — | Item size for horizontal lists (`orientation: 'horizontal'`). Ignored in vertical mode. |
| `estimatedHeight` | `number` | — | Estimated size for auto-measurement (Mode B). Items are rendered at this size, measured via `ResizeObserver`, and the real size is cached. Ignored if `height` is also set. |
| `estimatedWidth` | `number` | — | Horizontal equivalent of `estimatedHeight`. Ignored if `width` is also set. |
| `template` | `ItemTemplate<T>` | — | **Required.** Render function for each visible item. |

**Mode A — Known sizes.** Use when you can derive size from data alone. Zero measurement overhead.

```typescript
// Fixed — all items 48px
item: { height: 48, template: renderRow }

// Variable — derive size from data
item: {
  height: (index) => data[index].type === 'header' ? 64 : 48,
  template: renderRow,
}
```

**Mode B — Auto-measurement.** Use when size depends on rendered content (variable-length text, images with unknown aspect ratios). You provide an estimate; vlist measures actual DOM size, caches the result, and adjusts scroll position.

```typescript
item: {
  estimatedHeight: 120,
  template: (post) => `<article>${post.text}</article>`,
}
```

**Precedence:** If both `height` and `estimatedHeight` are set, `height` wins (Mode A).

### GridSizeContext

Context provided to the size function in grid mode. Passed as the second argument to `ItemConfig.height` when using `withGrid`.

```typescript
interface GridSizeContext {
  containerWidth: number
  columns:        number
  gap:            number
  columnWidth:    number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `containerWidth` | `number` | Current container width in pixels. |
| `columns` | `number` | Number of grid columns. |
| `gap` | `number` | Gap between items in pixels. |
| `columnWidth` | `number` | Calculated column width in pixels. |

```typescript
// Maintain 4:3 aspect ratio in grid
item: {
  height: (index, ctx) => {
    if (ctx) return ctx.columnWidth * 0.75
    return 200 // fallback for non-grid
  },
  template: renderCard,
}
```

### ItemTemplate

Render function called for each visible item. Returns an HTML string or a DOM element.

```typescript
type ItemTemplate<T = VListItem> = (
  item:  T,
  index: number,
  state: ItemState,
) => string | HTMLElement
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `T` | The data item for this row. |
| `index` | `number` | The item's position in the full list. |
| `state` | `ItemState` | Rendering state flags. |

### ItemState

State passed to templates. This object is reused between render calls — read values immediately, do not store the reference.

```typescript
interface ItemState {
  selected: boolean
  focused:  boolean
}
```

### ScrollConfig

Scroll behavior options, passed as the `scroll` property of `BuilderConfig`.

```typescript
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
| `wheel` | `boolean` | `true` | Whether mouse-wheel scrolling is enabled. |
| `wrap` | `boolean` | `false` | Circular scrolling — indices past the last item wrap to the beginning. |
| `idleTimeout` | `number` | `150` | Milliseconds after the last scroll event before idle. Used by async loading and velocity tracking. |
| `element` | `Window` | — | Use the browser window as the scroll container. |
| `scrollbar` | `'native' \| 'none' \| ScrollbarOptions` | custom | Scrollbar mode. Omit for the default custom scrollbar. |

### ScrollbarOptions

Fine-tuning for the custom scrollbar. Pass as `scroll.scrollbar` or to `withScrollbar()`.

```typescript
interface ScrollbarOptions {
  autoHide?:             boolean
  autoHideDelay?:        number
  minThumbSize?:         number
  showOnHover?:          boolean
  hoverZoneWidth?:       number
  showOnViewportEnter?:  boolean
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoHide` | `boolean` | `true` | Hide the thumb after the list goes idle. |
| `autoHideDelay` | `number` | `1000` | Milliseconds of idle time before the thumb fades out. |
| `minThumbSize` | `number` | `30` | Minimum thumb size in pixels. |
| `showOnHover` | `boolean` | `true` | Reveal the scrollbar when the cursor moves near the scrollbar edge. |
| `hoverZoneWidth` | `number` | `16` | Width of the invisible hover detection zone in pixels. |
| `showOnViewportEnter` | `boolean` | `true` | Show scrollbar when the cursor enters the list viewport. |

### ScrollToOptions

Options for `scrollToIndex`.

```typescript
interface ScrollToOptions {
  align?:    'start' | 'center' | 'end'
  behavior?: 'auto' | 'smooth'
  duration?: number
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `align` | `'start' \| 'center' \| 'end'` | `'start'` | Where to position the item in the viewport. |
| `behavior` | `'auto' \| 'smooth'` | `'auto'` | Instant or animated scroll. |
| `duration` | `number` | `300` | Animation duration in ms (smooth only). |

### ScrollSnapshot

Scroll position snapshot for save/restore. Used by `withSnapshots`.

```typescript
interface ScrollSnapshot {
  index:        number
  offsetInItem: number
  total?:       number
  selectedIds?: Array<string | number>
}
```

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | First visible item index. |
| `offsetInItem` | `number` | Pixel offset within the first visible item. |
| `total` | `number` | Total item count at snapshot time (used by restore to set sizeCache). |
| `selectedIds` | `Array<string \| number>` | Selected item IDs (optional convenience). |

---

## Selection Types

### SelectionConfig

Selection configuration, passed to `withSelection()`.

```typescript
interface SelectionConfig {
  mode?:    SelectionMode
  initial?: Array<string | number>
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | `SelectionMode` | `'none'` | Selection mode. |
| `initial` | `Array<string \| number>` | `[]` | Initially selected item IDs. |

### SelectionMode

```typescript
type SelectionMode = 'none' | 'single' | 'multiple'
```

### SelectionState

Internal selection state.

```typescript
interface SelectionState {
  selected:     Set<string | number>
  focusedIndex: number
}
```

---

## Adapter Types

### VListAdapter

Adapter for async data loading, passed to `withAsync()`.

```typescript
interface VListAdapter<T extends VListItem = VListItem> {
  read: (params: AdapterParams) => Promise<AdapterResponse<T>>
}
```

### AdapterParams

Parameters passed to `adapter.read`.

```typescript
interface AdapterParams {
  offset: number
  limit:  number
  cursor: string | undefined
}
```

| Property | Type | Description |
|----------|------|-------------|
| `offset` | `number` | Starting offset. |
| `limit` | `number` | Number of items to fetch. |
| `cursor` | `string \| undefined` | Cursor for cursor-based pagination. |

### AdapterResponse

Response from `adapter.read`.

```typescript
interface AdapterResponse<T extends VListItem = VListItem> {
  items:    T[]
  total?:   number
  cursor?:  string
  hasMore?: boolean
}
```

| Property | Type | Description |
|----------|------|-------------|
| `items` | `T[]` | Fetched items. |
| `total` | `number` | Total count (if known). |
| `cursor` | `string` | Next cursor for pagination. |
| `hasMore` | `boolean` | Whether more items exist. |

---

## State Types

### ViewportState

The internal state of the virtual viewport. Updated on every scroll and resize.

```typescript
interface ViewportState {
  scrollPosition:   number
  containerSize:    number
  totalSize:        number
  actualSize:       number
  isCompressed:     boolean
  compressionRatio: number
  visibleRange:     Range
  renderRange:      Range
}
```

| Property | Type | Description |
|----------|------|-------------|
| `scrollPosition` | `number` | Current scroll offset along the main axis. |
| `containerSize` | `number` | Container size along the main axis. |
| `totalSize` | `number` | Total content size (may be capped for compression). |
| `actualSize` | `number` | True total size without compression. |
| `isCompressed` | `boolean` | Whether compression is active. |
| `compressionRatio` | `number` | Ratio of virtual to actual size (1 = no compression). |
| `visibleRange` | `Range` | Currently visible item range. |
| `renderRange` | `Range` | Rendered range (includes overscan). |

### Range

A contiguous range of item indices.

```typescript
interface Range {
  start: number
  end:   number
}
```

---

## Event Types

### VListEvents

All events and their payloads. See [Events](./events.md) for detailed documentation.

```typescript
interface VListEvents<T extends VListItem = VListItem> {
  'item:click':        { item: T; index: number; event: MouseEvent }
  'item:dblclick':     { item: T; index: number; event: MouseEvent }
  'selection:change':  { selected: Array<string | number>; items: T[] }
  'scroll':            { scrollPosition: number; direction: 'up' | 'down' }
  'velocity:change':   { velocity: number; reliable: boolean }
  'range:change':      { range: Range }
  'load:start':        { offset: number; limit: number }
  'load:end':          { items: T[]; total?: number; offset?: number }
  'error':             { error: Error; context: string }
  'resize':            { height: number; width: number }
}
```

### EventHandler

```typescript
type EventHandler<T> = (payload: T) => void
```

### Unsubscribe

Returned by `on()`. Call it to remove the subscription.

```typescript
type Unsubscribe = () => void
```

---

## Feature Types

### SectionsConfig (GroupsConfig)

Configuration for `withSections()`. The interface is named `GroupsConfig` in source.

```typescript
interface GroupsConfig {
  getGroupForIndex: (index: number) => string
  headerHeight:     number | ((group: string, groupIndex: number) => number)
  headerTemplate:   (group: string, groupIndex: number) => string | HTMLElement
  sticky?:          boolean
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `getGroupForIndex` | `(index) => string` | — | **Required.** Returns the group key for a data index. Items must be pre-sorted by group. |
| `headerHeight` | `number \| (group, groupIndex) => number` | — | **Required.** Size of group header elements in pixels. |
| `headerTemplate` | `(group, groupIndex) => string \| HTMLElement` | — | **Required.** Render function for group headers. |
| `sticky` | `boolean` | `true` | Enable sticky headers that follow the viewport. |

### GridConfig

Configuration for `withGrid()`.

```typescript
interface GridConfig {
  columns: number
  gap?:    number
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `columns` | `number` | — | **Required.** Number of grid columns. |
| `gap` | `number` | `0` | Gap between items in pixels (applied both horizontally and vertically). |

### MasonryConfig

Configuration for `withMasonry()`.

```typescript
interface MasonryConfig {
  columns: number
  gap?:    number
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `columns` | `number` | — | **Required.** Number of cross-axis divisions. Items flow into the shortest column. |
| `gap` | `number` | `0` | Gap between items in pixels. |

---

## Builder & Feature Types

### VListBuilder

The chainable builder returned by `vlist()`.

```typescript
interface VListBuilder<T extends VListItem = VListItem> {
  use(feature: VListFeature<T>): VListBuilder<T>
  build(): VList<T>
}
```

| Method | Description |
|--------|-------------|
| `.use(feature)` | Register a feature. Chainable. |
| `.build()` | Materialize the list — creates DOM, initializes features, returns the instance API. |

### VListFeature

The interface for builder features. Each feature wires handlers and methods into the `BuilderContext` during setup.

```typescript
interface VListFeature<T extends VListItem = VListItem> {
  readonly name:       string
  readonly priority?:  number
  setup(ctx: BuilderContext<T>): void
  destroy?():          void
  readonly methods?:   readonly string[]
  readonly conflicts?: readonly string[]
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | — | Unique feature name (used for deduplication and error messages). |
| `priority` | `number` | `50` | Execution order — lower runs first. |
| `setup` | `(ctx) => void` | — | Receives `BuilderContext`, wires handlers and methods. |
| `destroy` | `() => void` | — | Optional cleanup function called on list destroy. |
| `methods` | `string[]` | — | Methods this feature adds to the public API. |
| `conflicts` | `string[]` | — | Features this feature cannot be combined with. |

### BuilderContext

The internal interface that features receive during `setup()`. Provides access to core components, mutable state, and registration points for handlers, methods, and cleanup callbacks.

```typescript
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

For feature authoring details, see [Exports](./exports.md).

### BuilderState

Mutable state stored inside `BuilderContext`.

```typescript
interface BuilderState {
  viewportState:      ViewportState
  lastRenderRange:    Range
  isInitialized:      boolean
  isDestroyed:        boolean
  cachedCompression:  CachedCompression | null
}
```

### ResolvedBuilderConfig

Immutable configuration stored inside `BuilderContext` after defaults are applied.

```typescript
interface ResolvedBuilderConfig {
  readonly overscan:       number
  readonly classPrefix:    string
  readonly reverse:        boolean
  readonly wrap:           boolean
  readonly horizontal:     boolean
  readonly ariaIdPrefix:   string
}
```

---

## Public API Types

### VList

The instance returned by `.build()`. Always-available methods are required properties. Feature methods are optional — they exist only when the corresponding feature is registered via `.use()`.

```typescript
interface VList<T extends VListItem = VListItem> {
  // Properties
  readonly element: HTMLElement
  readonly items:   readonly T[]
  readonly total:   number

  // Data methods (always available)
  setItems:     (items: T[]) => void
  appendItems:  (items: T[]) => void
  prependItems: (items: T[]) => void
  updateItem:   (id: string | number, updates: Partial<T>) => void
  removeItem:   (id: string | number) => void
  reload:       () => Promise<void>

  // Scroll methods (always available)
  scrollToIndex:    (index: number, alignOrOptions?: 'start' | 'center' | 'end' | ScrollToOptions) => void
  cancelScroll:     () => void
  getScrollPosition: () => number

  // Events (always available)
  on:  <K extends keyof VListEvents<T>>(event: K, handler: EventHandler<VListEvents<T>[K]>) => Unsubscribe
  off: <K extends keyof VListEvents<T>>(event: K, handler: EventHandler<VListEvents<T>[K]>) => void

  // Lifecycle
  destroy: () => void

  // Feature methods (present only when feature is registered)
  select?:            (...ids: Array<string | number>) => void
  deselect?:          (...ids: Array<string | number>) => void
  toggleSelect?:      (id: string | number) => void
  selectAll?:         () => void
  clearSelection?:    () => void
  getSelected?:       () => Array<string | number>
  getSelectedItems?:  () => T[]
  getScrollSnapshot?: () => ScrollSnapshot
  restoreScroll?:     (snapshot: ScrollSnapshot) => void

  // Extensible — features add arbitrary methods
  [key: string]: unknown
}
```

**Always available:**
- Data: `setItems`, `appendItems`, `prependItems`, `updateItem`, `removeItem`, `reload`
- Scroll: `scrollToIndex`, `cancelScroll`, `getScrollPosition`
- Events: `on`, `off`
- Lifecycle: `destroy`

**Added by features:**
- `select`, `deselect`, `toggleSelect`, `selectAll`, `clearSelection`, `getSelected`, `getSelectedItems` — added by `withSelection`
- `getScrollSnapshot`, `restoreScroll` — added by `withSnapshots`

> **Note:** There is no `scrollToItem(id)` method. If you need to scroll to an item by ID, maintain your own `id → index` map and call `scrollToIndex`.

---

## Rendering Types

### SizeCache

Efficient size management for fixed and variable item sizes. Axis-neutral — the same interface handles both vertical heights and horizontal widths.

```typescript
interface SizeCache {
  getOffset(index: number): number
  getSize(index: number): number
  indexAtOffset(offset: number): number
  getTotalSize(): number
  getTotal(): number
  rebuild(totalItems: number): void
  isVariable(): boolean
}
```

| Method | Description |
|--------|-------------|
| `getOffset(index)` | Position of item along the main axis — O(1). |
| `getSize(index)` | Size of a specific item. |
| `indexAtOffset(offset)` | Item at a scroll offset — O(1) fixed, O(log n) variable. |
| `getTotalSize()` | Total content size. |
| `getTotal()` | Current item count. |
| `rebuild(total)` | Rebuild cache after data changes. |
| `isVariable()` | Whether sizes are variable (false = fixed fast path). |

### DOMStructure

The DOM hierarchy created by vlist.

```typescript
interface DOMStructure {
  root:     HTMLElement
  viewport: HTMLElement
  content:  HTMLElement
  items:    HTMLElement
}
```

### CompressionContext

Context for positioning items in compressed mode.

```typescript
interface CompressionContext {
  scrollPosition: number
  totalItems:     number
  containerSize:  number
  rangeStart:     number
}
```

### CompressionState

Result of compression calculation.

```typescript
interface CompressionState {
  isCompressed: boolean
  actualSize:   number
  virtualSize:  number
  ratio:        number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `isCompressed` | `boolean` | Whether compression is active. |
| `actualSize` | `number` | True total size (uncompressed). |
| `virtualSize` | `number` | Capped size used for the scroll container (≤ `MAX_VIRTUAL_SIZE`). |
| `ratio` | `number` | `virtualSize / actualSize` (1 = no compression, <1 = compressed). |

### Renderer

DOM rendering instance.

```typescript
interface Renderer<T extends VListItem = VListItem> {
  render:            (items: T[], range: Range, selectedIds: Set<string | number>, focusedIndex: number, compressionCtx?: CompressionContext) => void
  updatePositions:   (compressionCtx: CompressionContext) => void
  updateItem:        (index: number, item: T, isSelected: boolean, isFocused: boolean) => void
  updateItemClasses: (index: number, isSelected: boolean, isFocused: boolean) => void
  getElement:        (index: number) => HTMLElement | undefined
  clear:             () => void
  destroy:           () => void
}
```

### ElementPool

Element pool for recycling DOM elements.

```typescript
interface ElementPool {
  acquire: () => HTMLElement
  release: (element: HTMLElement) => void
  clear:   () => void
  stats:   () => { poolSize: number; created: number; reused: number }
}
```

---

## Emitter Types

### Emitter

Type-safe event emitter created by `createEmitter()`.

```typescript
interface Emitter<T extends EventMap> {
  on:            <K extends keyof T>(event: K, handler: EventHandler<T[K]>) => Unsubscribe
  off:           <K extends keyof T>(event: K, handler: EventHandler<T[K]>) => void
  emit:          <K extends keyof T>(event: K, payload: T[K]) => void
  once:          <K extends keyof T>(event: K, handler: EventHandler<T[K]>) => Unsubscribe
  clear:         <K extends keyof T>(event?: K) => void
  listenerCount: <K extends keyof T>(event: K) => number
}
```

### EventMap

Base type for event maps.

```typescript
type EventMap = Record<string, unknown>
```

---

## Deprecated Types

### ScrollbarConfig

Legacy scrollbar configuration. Use `scroll.scrollbar` in `BuilderConfig` instead.

```typescript
/** @deprecated Use ScrollConfig.scrollbar instead */
interface ScrollbarConfig {
  enabled?:       boolean
  autoHide?:      boolean
  autoHideDelay?: number
  minThumbSize?:  number
}
```

### GridHeightContext

Renamed to `GridSizeContext`. The old name is kept as a type alias for backwards compatibility.

```typescript
/** @deprecated Use GridSizeContext instead */
type GridHeightContext = GridSizeContext
```

---

## Usage Examples

### Custom Item Type

```typescript
import { vlist } from '@floor/vlist'

interface Product extends VListItem {
  id: number
  name: string
  price: number
  category: string
}

const list = vlist<Product>({
  container: '#products',
  item: {
    height: 56,
    template: (product, index, state) => `
      <div class="product ${state.selected ? 'selected' : ''}">
        <span>${product.name}</span>
        <span>$${product.price.toFixed(2)}</span>
      </div>
    `,
  },
  items: products,
}).build()
```

### Typed Event Handlers

```typescript
interface User extends VListItem {
  id: string
  name: string
  email: string
}

list.on('item:click', ({ item, index, event }) => {
  // item is typed as User
  console.log(item.name, item.email)
})

list.on('selection:change', ({ selected, items }) => {
  // items is typed as User[]
  console.log(`${selected.length} users selected`)
})
```

### Adapter Type Safety

```typescript
interface Article extends VListItem {
  id: number
  title: string
  body: string
  publishedAt: string
}

const adapter: VListAdapter<Article> = {
  read: async ({ offset, limit }) => {
    const response = await fetch(`/api/articles?offset=${offset}&limit=${limit}`)
    const data = await response.json()
    return {
      items: data.articles,
      total: data.total,
      hasMore: data.hasMore,
    }
  },
}
```

---

## Related

- [API Reference](./reference.md) — Config, properties, and methods
- [Events](./events.md) — All events and payloads
- [Constants](./constants.md) — Default values and thresholds
- [Exports](./exports.md) — Low-level utilities and feature authoring
- [Features](../features/overview.md) — All features with examples and compatibility

---

*All types are exported from `@floor/vlist` — import what you need.*