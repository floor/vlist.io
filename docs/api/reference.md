# VList API Reference

> Complete reference for the core VList API — factory, configuration, properties, and methods.
>
> For feature-specific documentation (`withGrid`, `withAsync`, `withSelection`, etc.), see the [Features](../features/overview.md) section.

---

## Installation

```sh
npm install @floor/vlist
```

```ts
import { vlist } from '@floor/vlist'
import '@floor/vlist/styles'
```

Optional extras (variants, loading states, animations):

```ts
import '@floor/vlist/styles/extras'
```

---

## Quick Start

```ts
import { vlist } from '@floor/vlist'
import '@floor/vlist/styles'

const list = vlist({
  container: '#my-list',
  items: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` })),
  item: {
    height: 48,
    template: (item) => `<div>${item.name}</div>`,
  },
}).build()

list.scrollToIndex(5000)
list.on('item:click', ({ item }) => console.log(item))
```

---

## vlist(config)

Creates a `VListBuilder` — a chainable object for composing features before materializing the list.

```ts
function vlist<T extends VListItem>(config: BuilderConfig<T>): VListBuilder<T>
```

**Returns** a `VListBuilder` with two methods:

| Method | Description |
|--------|-------------|
| `.use(feature)` | Register a feature. Chainable. |
| `.build()` | Materialize the list — creates DOM, initializes features, returns the instance API. |

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

All configuration types passed to `vlist()` and its features.

### VListItem

All items must have a unique `id`. This is the only constraint — add any other fields your template needs.

```ts
interface VListItem {
  id: string | number
  [key: string]: unknown
}
```

### BuilderConfig

The top-level configuration object passed to `vlist()`.

```ts
interface BuilderConfig<T extends VListItem = VListItem> {
  container:    HTMLElement | string
  item:         ItemConfig<T>
  items?:       T[]
  overscan?:    number
  orientation?: 'vertical' | 'horizontal'
  padding?:     number | [number, number] | [number, number, number, number]
  reverse?:     boolean
  classPrefix?: string
  ariaLabel?:   string
  scroll?:      ScrollConfig
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLElement \| string` | — | **Required.** The container element or a CSS selector. |
| `item` | `ItemConfig` | — | **Required.** Item sizing and template. |
| `items` | `T[]` | `[]` | Static items array. Omit when using `withAsync`. |
| `overscan` | `number` | `3` | Extra items rendered outside the viewport in each direction. Higher values reduce blank flashes during fast scrolling at the cost of more DOM nodes. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Scroll axis. Use `'horizontal'` for carousels or timelines. |
| `padding` | `number \| [number, number] \| [number, number, number, number]` | `0` | Padding around the list content. Works like CSS `padding` — adds inset space between the viewport edge and items. Follows CSS shorthand: `number` (all sides), `[v, h]` (vertical/horizontal), or `[top, right, bottom, left]`. Works with list, grid, and masonry layouts. See [Gap & Padding](#gap--padding). |
| `reverse` | `boolean` | `false` | Reverse mode — list starts scrolled to the bottom. `appendItems` auto-scrolls if already at bottom; `prependItems` preserves scroll position. Useful for any bottom-anchored content: chat, logs, activity feeds, timelines. |
| `classPrefix` | `string` | `'vlist'` | CSS class prefix for all internal elements. |
| `ariaLabel` | `string` | — | Sets `aria-label` on the root listbox element. |
| `scroll` | `ScrollConfig` | — | Fine-grained scroll behavior options. |

---

### ItemConfig

Controls how items are sized and rendered. Supports two sizing strategies, each with an axis-neutral `SizeCache` underneath — the same code path handles vertical heights and horizontal widths.

```ts
interface ItemConfig<T extends VListItem = VListItem> {
  height?:          number | ((index: number, context?: GridHeightContext) => number)
  width?:           number | ((index: number) => number)
  estimatedHeight?: number
  estimatedWidth?:  number
  gap?:             number
  striped?:         boolean | "data" | "even" | "odd"
  template:         ItemTemplate<T>
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `height` | `number \| (index, ctx?) => number` | — | Item size in pixels along the main axis. Required for vertical lists. A plain number enables the fast path (zero per-item overhead). A function enables variable sizes with a prefix-sum array for O(1) offset lookup and O(log n) index search. In grid mode, receives a context object as a second argument — see [Grid](../features/grid.md). |
| `width` | `number \| (index) => number` | — | Item size in pixels along the main axis for horizontal lists (`orientation: 'horizontal'`). Same semantics as `height`. Ignored in vertical mode. |
| `estimatedHeight` | `number` | — | Estimated size for auto-measurement (Mode B). Items are rendered at this size, then measured via `ResizeObserver`, and the real size is cached. Use for content whose size can't be predicted from data. Ignored if `height` is also set. |
| `estimatedWidth` | `number` | — | Horizontal equivalent of `estimatedHeight`. Ignored if `width` is also set. |
| `gap` | `number` | `0` | Gap between items in pixels along the main axis. Adds consistent spacing between items without CSS margin hacks. Ignored when `withGrid` or `withMasonry` is active (those features manage their own gap). See [Gap & Padding](#gap--padding). |
| `striped` | `boolean \| "data" \| "even" \| "odd"` | `false` | Toggles `.vlist-item--odd` class for zebra-stripe styling. `true` counts all items (including group headers). `"data"` excludes group headers from the count (continuous across groups). `"even"` resets the counter after each group header — first data row is always even/non-striped (macOS Finder behavior). `"odd"` same reset but first data row is odd/striped. Without `withGroups`, all string modes behave like `true`. See [Groups — Striped Rows](../features/groups.md#striped-rows-with-groups). |
| `template` | `ItemTemplate<T>` | — | **Required.** Render function for each visible item. |

#### Sizing modes

vlist supports two sizing strategies. Pick the one that matches your data:

**Mode A — Known sizes.** Use when you can derive the item size from data alone, without rendering. This is the fast path — zero measurement overhead.

| Variant | When to use | Example use cases |
|---------|-------------|-------------------|
| Fixed (`number`) | All items have the same size | Contact lists, data tables, settings panels |
| Variable (`function`) | Size varies but is computable from data | Expanded/collapsed rows, mixed row types (header vs item) |

```ts
// Fixed — all items 48px
item: {
  height: 48,
  template: (item) => `<div>${item.name}</div>`,
}

// Variable — derive size from data
item: {
  height: (index) => data[index].type === 'header' ? 64 : 48,
  template: (item) => `<div>${item.name}</div>`,
}
```

**Mode B — Auto-measurement.** Use when the size depends on rendered content that you can't predict from data — variable-length user text, images with unknown aspect ratios, mixed-media feeds. You provide an *estimate*; vlist renders items at that size, measures the actual DOM size via `ResizeObserver`, caches the result, and adjusts scroll position to prevent visual jumps.

```ts
// Social feed — posts vary from one-liner to multi-paragraph with images
item: {
  estimatedHeight: 120,
  template: (post) => `
    <article class="post">
      <div class="post__body">${post.text}</div>
      ${post.image ? `<img src="${post.image}" />` : ''}
    </article>
  `,
}
```

Once an item is measured, it behaves identically to Mode A — subsequent renders use the cached size with no further measurement. See [Measurement](../internals/measurement.md) for the full architecture.

**Precedence:** If both `height` and `estimatedHeight` are set, `height` wins (Mode A). The estimate is silently ignored. This means upgrading from Mode B to Mode A is a single config change.

**Scaling:** All three variants (fixed, variable, measured) work with `withScale` for 1M+ items. The compression ratio is computed from the actual total size reported by the `SizeCache`, not from a uniform item size assumption — so variable and measured sizes compress correctly.

---

### ItemTemplate

```ts
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

```ts
interface ItemState {
  selected: boolean   // true when this item is in the selection set
  focused:  boolean   // true when this item has keyboard focus
}
```

---

### ScrollConfig

Scroll behavior options, passed as the `scroll` property of `BuilderConfig`.

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

### ScrollbarOptions

Fine-tuning for the custom scrollbar. Pass as `scroll.scrollbar` or to `withScrollbar()`.

```ts
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
| `autoHide` | `boolean` | `true` | Hide the scrollbar thumb after the list goes idle. |
| `autoHideDelay` | `number` | `1000` | Milliseconds of idle time before the thumb fades out. |
| `minThumbSize` | `number` | `30` | Minimum thumb size in pixels. Prevents the thumb from becoming too small to grab. |
| `showOnHover` | `boolean` | `true` | Reveal the scrollbar when the cursor moves near the scrollbar edge. |
| `hoverZoneWidth` | `number` | `16` | Width in pixels of the invisible hover detection zone along the scrollbar edge. |
| `showOnViewportEnter` | `boolean` | `true` | Show the scrollbar whenever the cursor enters the list viewport. |

---

## Properties

The object returned by `.build()` exposes these read-only properties.

### element

```ts
readonly element: HTMLElement
```

The root DOM element created by vlist. Already inserted into the container you specified — no need to append it yourself.

### items

```ts
readonly items: readonly T[]
```

The current items array. This is a read-only snapshot — mutating it has no effect. Use `setItems`, `appendItems`, `prependItems`, `updateItem`, or `removeItem` to change data.

### total

```ts
readonly total: number
```

Total item count. For static lists this equals `items.length`. With `withAsync`, this reflects the total reported by the adapter (which may be larger than the number of items currently loaded).

---

## Methods

All methods are available on the object returned by `.build()`.

### setItems

Replace the entire dataset. Triggers a full re-render.

```ts
setItems(items: T[]): void
```

```ts
list.setItems(newData)
```

---

### appendItems

Add items to the end of the list. In reverse mode, auto-scrolls to the bottom if the user was already there.

```ts
appendItems(items: T[]): void
```

```ts
list.appendItems([{ id: 101, name: 'New item' }])
```

---

### prependItems

Add items to the beginning of the list. Preserves the current scroll position so older content loads silently above.

```ts
prependItems(items: T[]): void
```

---

### updateItem

Patch a single item by ID. Only the provided fields are merged; the item's position in the list is unchanged.

```ts
updateItem(id: string | number, updates: Partial<T>): void
```

```ts
list.updateItem(42, { name: 'Renamed', unread: false })
```

---

### removeItem

Remove a single item by ID.

```ts
removeItem(id: string | number): void
```

---

### reload

Clear all loaded data and re-fetch from the beginning. When used with `withAsync`, triggers a fresh adapter call. Returns a promise that resolves when the initial page is loaded.

```ts
reload(): Promise<void>
```

---

### scrollToIndex

Scroll so that the item at `index` is visible.

```ts
scrollToIndex(
  index: number,
  alignOrOptions?: 'start' | 'center' | 'end' | ScrollToOptions
): void
```

Accepts either a simple alignment string or a full options object:

```ts
interface ScrollToOptions {
  align?:    'start' | 'center' | 'end'   // default: 'start'
  behavior?: 'auto' | 'smooth'            // default: 'auto' (instant)
  duration?: number                        // default: 300 (ms, smooth only)
}
```

```ts
list.scrollToIndex(500)
list.scrollToIndex(500, 'center')
list.scrollToIndex(500, { align: 'center', behavior: 'smooth', duration: 400 })
```

When `scroll.wrap` is `true`, indices past the last item wrap to the beginning and negative indices wrap from the end.

> **Note:** There is no `scrollToItem(id)` method. If you need to scroll to an item by ID, maintain your own `id → index` map and call `scrollToIndex`.

---

### cancelScroll

Immediately stop any in-progress smooth scroll animation.

```ts
cancelScroll(): void
```

---

### getScrollPosition

Returns the current scroll offset in pixels along the main axis.

```ts
getScrollPosition(): number
```

---

### on

Subscribe to an event. Returns an unsubscribe function.

```ts
on<K extends keyof VListEvents<T>>(
  event: K,
  handler: (payload: VListEvents<T>[K]) => void
): Unsubscribe
```

```ts
const unsub = list.on('item:click', ({ item, index }) => {
  console.log('clicked', item)
})

// Later
unsub()
```

See [Events](./events.md) for all event types and payloads.

### off

Unsubscribe a previously registered handler by reference.

```ts
off<K extends keyof VListEvents<T>>(
  event: K,
  handler: Function
): void
```

```ts
const handler = ({ item }) => console.log(item)
list.on('item:click', handler)
list.off('item:click', handler)
```

### destroy

Tear down the list — removes DOM elements and event listeners, disconnects observers, cancels pending requests, and clears all internal references. Always call this when removing the list from the page.

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

## Gap & Padding

vlist provides two complementary spacing options: **gap** (between items) and **padding** (around the list content).

### Item Gap

The `item.gap` property adds consistent spacing between items along the scroll axis. The gap is baked into the size cache — each slot occupies `itemSize + gap` pixels — and subtracted from the DOM element's size, so items are visually separated without CSS margin hacks.

```ts
const list = vlist({
  container: '#list',
  items: data,
  item: {
    height: 48,
    gap: 8,     // 8px between each item
    template: (item) => `<div>${item.name}</div>`,
  },
}).build()
```

**How it works:**

- Each slot in the size cache = `itemSize + gap`
- The trailing gap (after the last item) is automatically removed
- DOM elements are sized to the item size only (gap is spacing, not part of the element)
- Works with fixed sizes, variable sizes, and auto-measurement (Mode B)
- Ignored when `withGrid` or `withMasonry` is active — those features manage their own `gap` via their config

**Single item or empty list:** No gap is visible. The trailing-gap correction ensures single items report their true size.

### Content Padding

The top-level `padding` property adds inset space between the viewport edge and the items, exactly like CSS `padding`. It follows the CSS shorthand convention:

```ts
// All sides equal
const list = vlist({
  container: '#list',
  padding: 16,
  items: data,
  item: { height: 48, template: renderRow },
}).build()

// Vertical / horizontal
const list = vlist({
  container: '#list',
  padding: [16, 12],  // 16px top/bottom, 12px left/right
  items: data,
  item: { height: 48, template: renderRow },
}).build()

// Per-side (CSS order: top, right, bottom, left)
const list = vlist({
  container: '#list',
  padding: [16, 12, 20, 8],
  items: data,
  item: { height: 48, template: renderRow },
}).build()
```

**How it works:**

- Applied as CSS `padding` + `box-sizing: border-box` on the `.vlist-content` element
- Zero positioning overhead — items keep their normal `translateY` offsets; CSS padding handles the visual inset
- Main-axis padding (top/bottom in vertical mode) is added to the content size so `scrollToIndex` reaches the true edges
- Cross-axis padding (left/right in vertical mode) is subtracted from the container width for grid and masonry column calculations
- Works identically for list, grid, and masonry layouts
- No-op when padding is `0` — zero overhead

### Combining Gap and Padding

Gap and padding compose naturally:

```ts
const list = vlist({
  container: '#list',
  padding: [24, 16],   // 24px top/bottom, 16px left/right
  items: data,
  item: {
    height: 48,
    gap: 8,             // 8px between items
    template: renderRow,
  },
}).build()
```

For grid and masonry layouts, use the feature's own `gap` config instead of `item.gap`:

```ts
const gallery = vlist({
  container: '#gallery',
  padding: 16,          // inset around the entire grid
  items: photos,
  item: {
    height: 200,
    template: renderPhoto,
  },
})
  .use(withGrid({ columns: 4, gap: 8 }))  // 8px between grid cells
  .build()
```

---

## See Also

- **[Events](./events.md)** — All event types, payloads, and subscription patterns
- **[Types](./types.md)** — Full TypeScript type reference
- **[Constants](./constants.md)** — Default values and thresholds
- **[Exports](./exports.md)** — Low-level utilities and feature authoring
- **[Features](../features/overview.md)** — All features with examples, bundle costs, and compatibility

---

*VList is built and maintained by [Floor IO](https://floor.io). Source at [github.com/floor/vlist](https://github.com/floor/vlist).*