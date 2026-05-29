---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# API Reference

## createVList(config, plugins?)

Creates a virtual list instance.

```ts
import { createVList } from "vlist";

const list = createVList(config, [plugin1(), plugin2()]);
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | required | DOM element or CSS selector |
| `item.height` | `number \| (index, context?) => number` | — | Fixed or per-index item height |
| `item.width` | `number \| (index) => number` | — | Fixed or per-index item width (horizontal mode) |
| `item.estimatedHeight` | `number` | — | Auto-measure via ResizeObserver (Mode B) |
| `item.estimatedWidth` | `number` | — | Auto-measure for horizontal (Mode B) |
| `item.template` | `(item, index, state) => string \| HTMLElement` | required | Render function |
| `item.gap` | `number` | `0` | Spacing between items (px) |
| `item.striped` | `boolean \| "data" \| "even" \| "odd"` | `false` | Zebra stripe classes |
| `items` | `T[]` | `[]` | Initial dataset |
| `overscan` | `number` | `3` | Extra items rendered offscreen |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | Scroll axis |
| `padding` | `number \| [number, number] \| [t, r, b, l]` | `0` | Container padding (px) |
| `classPrefix` | `string` | `"vlist"` | CSS class prefix |
| `reverse` | `boolean` | `false` | Reverse scroll direction |
| `ariaLabel` | `string` | — | Container `aria-label` |
| `scroll.wheel` | `boolean` | `true` | Mouse wheel scrolling |
| `scroll.gutter` | `"auto" \| "stable"` | `"auto"` | Scrollbar space reservation |
| `scroll.idleTimeout` | `number` | `150` | Idle detection timeout (ms) |

## Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `element` | `HTMLElement` | Root DOM container |
| `items` | `readonly T[]` | Current item array |
| `total` | `number` | Total item count (includes virtual items from plugins) |

## Instance Methods

### Data

| Method | Signature | Description |
|--------|-----------|-------------|
| `setItems` | `(items: T[]) => void` | Replace entire dataset |
| `appendItems` | `(items: T[]) => void` | Add items to end |
| `prependItems` | `(items: T[]) => void` | Add items to beginning |
| `insertItem` | `(item: T, index?: number) => void` | Insert at position (default: end) |
| `updateItem` | `(id: string \| number, updates: Partial<T>) => void` | Partial update by ID |
| `removeItem` | `(id: string \| number) => void` | Remove by ID |
| `removeItems` | `(ids: ReadonlyArray<string \| number>) => number` | Bulk remove, returns count |
| `getItemAt` | `(index: number) => T \| undefined` | Get item at index |
| `getIndexById` | `(id: string \| number) => number` | Get index by ID (-1 if not found) |

### Scroll

| Method | Signature | Description |
|--------|-----------|-------------|
| `scrollToIndex` | `(index: number, align?) => void` | Scroll to item |
| `getScrollPosition` | `() => number` | Current scroll offset (px) |

`scrollToIndex` accepts a string alignment or an options object:

```ts
// Simple alignment
list.scrollToIndex(50, "center");

// Smooth scroll
list.scrollToIndex(50, { align: "end", behavior: "smooth", duration: 300 });

// Custom easing
list.scrollToIndex(50, {
  align: "start",
  behavior: "smooth",
  duration: 800,
  easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
});

// Elastic easing (overshoot + settle)
const elasticOut = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
};
list.scrollToIndex(999, { behavior: "smooth", duration: 800, easing: elasticOut });
```

When `easing` is omitted, a default easeInOutQuad curve is used.

### Events

| Method | Signature | Description |
|--------|-----------|-------------|
| `on` | `(event, handler) => Unsubscribe` | Subscribe (returns unsubscribe fn) |
| `off` | `(event, handler) => void` | Unsubscribe |

### Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `destroy` | `() => void` | Tear down instance, remove DOM, clean up listeners |

## Events

### Core

| Event | Payload | Description |
|-------|---------|-------------|
| `item:click` | `{ item, index, event: MouseEvent }` | Item clicked |
| `item:dblclick` | `{ item, index, event: MouseEvent }` | Item double-clicked |
| `item:contextmenu` | `{ item, index, event: MouseEvent }` | Item right-clicked |
| `scroll` | `{ scrollPosition, direction: "up" \| "down" \| "left" \| "right" }` | Scroll position changed |
| `scroll:idle` | `{ scrollPosition }` | Scrolling stopped |
| `velocity:change` | `{ velocity, reliable }` | Scroll velocity changed |
| `range:change` | `{ range: { start, end } }` | Visible range changed |
| `resize` | `{ width, height }` | Container resized |
| `data:change` | `{ type: "insert" \| "add" \| "remove" \| "update", id }` | Data mutated |
| `error` | `{ error, context, viewport? }` | Error occurred (see [ErrorViewportSnapshot](./types.md#errorviewportsnapshot)) |
| `destroy` | — | Instance destroyed |

### Selection Plugin

| Event | Payload |
|-------|---------|
| `selection:change` | `{ selected: (string \| number)[], items: T[] }` |
| `focus:change` | `{ id: string \| number, index: number }` |
| `delete` | `{ selected: (string \| number)[], items: T[] }` |

### Async Plugin

| Event | Payload |
|-------|---------|
| `load:start` | `{ offset, limit }` |
| `load:end` | `{ items, total? }` |

### Transition Plugin

| Event | Payload |
|-------|---------|
| `remove:end` | `{ id: string \| number }` |

### Table Plugin

| Event | Payload |
|-------|---------|
| `column:resize` | `{ key, index, previousWidth, width }` |
| `column:sort` | `{ key, index, direction: "asc" \| "desc" \| null }` |

### Sortable Plugin

| Event | Payload |
|-------|---------|
| `sort:start` | `{ index }` |
| `sort:move` | `{ fromIndex, currentIndex }` |
| `sort:end` | `{ fromIndex, toIndex }` |
| `sort:cancel` | `{ originalItems }` |

## Types

### VListItem

```ts
interface VListItem {
  id: string | number;
  [key: string]: unknown;
}
```

### ItemTemplate

```ts
type ItemTemplate<T> = (item: T, index: number, state: ItemState) => string | HTMLElement;

interface ItemState {
  selected: boolean;
  focused: boolean;
}
```

### ScrollToOptions

```ts
interface ScrollToOptions {
  align?: "start" | "center" | "end";
  behavior?: "auto" | "smooth";
  duration?: number;
  easing?: (t: number) => number;
}
```

The `easing` function receives a normalized time `t` (0–1) and returns a normalized progress value. The default is easeInOutQuad. Common easing functions:

| Easing | Function |
|--------|----------|
| Linear | `t => t` |
| Ease-out cubic | `t => 1 - Math.pow(1 - t, 3)` |
| Ease-in-out quad | `t => t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2` (default) |
| Elastic out | `t => Math.pow(2,-10*t) * Math.sin((t-0.075)*2*Math.PI/0.3) + 1` |

### ScrollSnapshot

```ts
interface ScrollSnapshot {
  index: number;
  offsetInItem: number;
  total?: number;
  dataIndex?: number;
  dataTotal?: number;
  offsetRatio?: number;
  selectedIds?: (string | number)[];
  focusedId?: string | number;
  scrollTop?: number;
  scrollRatio?: number;
}
```

### VListAdapter (async plugin)

```ts
interface VListAdapter<T> {
  read(params: AdapterParams): Promise<AdapterResponse<T>>;
}

interface AdapterParams {
  offset: number;
  limit: number;
  cursor: string | undefined;
  signal: AbortSignal;
}

interface AdapterResponse<T> {
  items: T[];
  total?: number;
  cursor?: string;
  hasMore?: boolean;
}
```

### ScrollbarOptions

```ts
interface ScrollbarOptions {
  autoHide?: boolean;
  autoHideDelay?: number;
  minThumbSize?: number;
  showOnHover?: boolean;
  hoverZoneWidth?: number;
  showOnViewportEnter?: boolean;
}
```

### VListPlugin (custom plugins)

```ts
interface VListPlugin<T extends VListItem = VListItem> {
  readonly name: string;
  readonly priority?: number;
  readonly conflicts?: readonly string[];

  setup?(ctx: PluginContext<T>): void;

  hooks?: {
    onCalculate?(state: EngineState): void;
    onCommit?(state: EngineState): void;
    onAfterScroll?(scrollPosition: number, direction: number): void;
    onIdle?(): void;
    onResize?(width: number, height: number): void;
  };

  destroy?(): void;
}
```

See the [Plugin Authoring tutorial](/tutorials/plugin-authoring) for the full `PluginContext` interface and working examples, or [Exports](./exports.md) for all `vlist/internals` utilities.

### Complete Type Reference

For additional types (`ViewportState`, `SelectionState`, `EngineState`, `GridSizeContext`, etc.), see [Types](./types.md).
