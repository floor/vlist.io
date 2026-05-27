# Getting Started

vlist v2 is a high-performance virtual scrolling library with zero dependencies and a plugin architecture.

## Install

```bash
# npm
npm install vlist

# bun
bun add vlist

# pnpm
pnpm add vlist
```

Import styles:

```ts
import "vlist/styles";
```

Or via link tag:

```html
<link rel="stylesheet" href="node_modules/vlist/dist/vlist.css" />
```

## Basic Usage

```ts
import { createVList } from "vlist";
import "vlist/styles";

const list = createVList({
  container: "#my-list",
  item: {
    height: 48,
    template: (item) => `<div class="my-item">${item.name}</div>`,
  },
  items: [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    // ...
  ],
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement \| string` | required | DOM element or CSS selector |
| `item.height` | `number \| (index) => number` | — | Fixed or per-index height (Mode A) |
| `item.estimatedHeight` | `number` | — | Auto-measure with ResizeObserver (Mode B) |
| `item.template` | `(item, index, state) => string \| HTMLElement` | required | Render function |
| `item.gap` | `number` | `0` | Spacing between items |
| `item.striped` | `boolean \| "data" \| "even" \| "odd"` | `false` | Zebra stripe classes |
| `items` | `T[]` | `[]` | Initial data |
| `overscan` | `number` | `3` | Extra items rendered offscreen |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | Scroll axis |
| `padding` | `number \| [top, bottom] \| [t, r, b, l]` | `0` | Container padding |
| `classPrefix` | `string` | `"vlist"` | CSS class prefix |
| `interactive` | `boolean` | `true` | Enable click/keyboard |
| `reverse` | `boolean` | `false` | Reverse scroll direction |
| `ariaLabel` | `string` | — | Container aria-label |
| `scroll.idleTimeout` | `number` | `150` | Idle detection timeout (ms) |

## Sizing Modes

**Mode A — fixed height:** Pass `item.height` as a number or a function. Position math is O(1) — use this when possible.

```ts
// Uniform height
item: { height: 48, template: renderItem }

// Per-index height
item: { height: (i) => sizes[i], template: renderItem }
```

**Mode B — auto-measure:** Pass `item.estimatedHeight` instead. vlist uses ResizeObserver to measure each item once after first render. Use when item height varies by content.

```ts
const list = createVList({
  container: "#my-list",
  item: {
    estimatedHeight: 60,
    template: (item) => `<div class="my-item">${item.body}</div>`,
  },
  items: data,
});
```

## Item Template

The template function receives `(item, index, state)`. `state` carries `selected` and `focused` booleans (populated by the selection plugin when active).

```ts
// Return an HTML string
template: (item, index, state) =>
  `<div class="row${state.selected ? " row--selected" : ""}">${item.name}</div>`

// Return an HTMLElement
template: (item, index, state) => {
  const el = document.createElement("div");
  el.className = "row";
  if (state.selected) el.classList.add("row--selected");
  el.textContent = item.name;
  return el;
}
```

## Methods

| Method | Description |
|---|---|
| `setItems(items)` | Replace the full dataset |
| `appendItems(items)` | Add items to the end |
| `prependItems(items)` | Add items to the beginning |
| `insertItem(item, index?)` | Insert at position (appends if omitted) |
| `updateItem(id, updates)` | Partial update by ID |
| `removeItem(id)` | Remove a single item by ID |
| `removeItems(ids)` | Bulk remove by IDs |
| `getItemAt(index)` | Get item at index |
| `getIndexById(id)` | Get index by ID |
| `scrollToIndex(index, align?)` | Scroll to item (`"start"`, `"center"`, `"end"`) |
| `getScrollPosition()` | Current scroll offset in pixels |
| `on(event, handler)` | Subscribe to an event — returns an unsubscribe function |
| `off(event, handler)` | Unsubscribe a specific handler |
| `destroy()` | Teardown — removes DOM, listeners, and observers |

## Events

```ts
const unsub = list.on("item:click", ({ item, index, event }) => {
  console.log("Clicked", item.id);
});

// Stop listening
unsub();
```

| Event | Payload |
|---|---|
| `item:click` | `{ item, index, event }` |
| `item:dblclick` | `{ item, index, event }` |
| `item:contextmenu` | `{ item, index, event }` |
| `scroll` | `{ scrollPosition, direction }` |
| `scroll:idle` | `{ scrollPosition }` |
| `range:change` | `{ range: { start, end } }` |
| `resize` | `{ width, height }` |
| `data:change` | `{ type, id }` |
| `destroy` | — |

Plugins add their own events (`selection:change`, `sort:start`, etc.) — see the plugin docs.

## Plugins

Pass plugins as a second argument to `createVList`. They are tree-shakeable — only imported plugins are included in your bundle.

```ts
import { createVList, grid, selection } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 80, template: renderItem },
  items: data,
}, [
  grid({ columns: 3, gap: 8 }),
  selection({ mode: "multiple" }),
]);
```

See [plugins/overview.md](./plugins/overview.md) for the full list of available plugins and their options.

## Cleanup

```ts
list.destroy();
```

Call `destroy()` when removing the list from the DOM — it clears all event listeners, ResizeObservers, and DOM nodes created by vlist.
