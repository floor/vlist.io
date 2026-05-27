---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Plugin Authoring

> Write custom vlist plugins that hook into the rendering lifecycle, register public methods, and compose with built-in plugins.

## VListPlugin Interface

A plugin is an object with a `name`, optional `setup()` for one-time wiring, optional `hooks` for per-frame work, and optional `destroy()` for cleanup:

```ts
import type { VListPlugin, VListItem } from "vlist";

interface VListPlugin<T extends VListItem = VListItem> {
  readonly name: string;
  readonly priority?: number;       // Lower runs first (default: 100)
  readonly conflicts?: readonly string[];  // Plugin names that can't coexist

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

---

## Hook Lifecycle

Hooks run on every render frame in this order:

1. **`onCalculate`** — Modify sizes, ranges, or virtual totals before the engine renders. Hot path — keep it fast.
2. **`onCommit`** — Runs after DOM updates. Use for post-render adjustments (e.g. measuring DOM elements, updating ARIA attributes).
3. **`onAfterScroll`** — Runs on each scroll event. `direction` is `1` (forward) or `-1` (backward).
4. **`onIdle`** — Fires after scrolling stops (after `scroll.idleTimeout`). Use for deferred work.
5. **`onResize`** — Container size changed.

Multiple plugins' hooks for the same phase are compiled into a flat array and iterated in priority order.

---

## PluginContext

The `ctx` object passed to `setup()` — your gateway to the list internals.

### DOM & Config

| Member | Type | Description |
|--------|------|-------------|
| `ctx.dom` | `DOMStructure` | `{ root, viewport, content, liveRegion }` |
| `ctx.config` | `ResolvedConfig` | Resolved config (overscan, horizontal, reverse, gap, padding, etc.) |
| `ctx.sizeCache` | `SizeCache` | Item size storage |
| `ctx.pool` | `ElementPool` | DOM element pool (`acquire()`, `release()`) |
| `ctx.template` | `ItemTemplate<T>` | The user's item template function |
| `ctx.emitter` | `Emitter` | Event emitter — `emit()`, `on()`, `off()` |

### Public API Registration

| Method | Description |
|--------|-------------|
| `ctx.registerMethod(name, fn)` | Add a method to the VList instance (e.g. `getGridLayout`) |
| `ctx.getMethod(name)` | Get a method registered by another plugin |

### Event Handlers

| Method | Description |
|--------|-------------|
| `ctx.registerClickHandler(fn)` | Add a click handler on the content element |
| `ctx.registerKeydownHandler(fn)` | Add a keydown handler on the content element |
| `ctx.registerDestroyHandler(fn)` | Add a cleanup function called on `destroy()` |

### Rendering

| Method | Description |
|--------|-------------|
| `ctx.renderIfNeeded()` | Trigger a render if viewport state changed |
| `ctx.forceRender()` | Force a full re-render |
| `ctx.rebuildSizeCache()` | Recalculate all item sizes |
| `ctx.updateContentSize(size)` | Set the content element's size (scroll height) |
| `ctx.getRenderedElement(index)` | Get the DOM element for a rendered item (or `null`) |

### Data Access

| Method | Description |
|--------|-------------|
| `ctx.getItems()` | Current item array |
| `ctx.getItem(index)` | Item at index |
| `ctx.getState()` | Current `EngineState` |

### Scroll Control

| Method | Description |
|--------|-------------|
| `ctx.scrollTo(position)` | Set scroll position |
| `ctx.smoothScrollTo(pos, duration, easing?)` | Animated scroll |
| `ctx.disableDefaultScroll()` | Take over scroll handling from the core |
| `ctx.setScrollTarget(target)` | Change the scroll event target (e.g. `window`) |
| `ctx.onScrollFrame()` | Manually trigger scroll frame processing |

### Navigation

| Method | Description |
|--------|-------------|
| `ctx.setNavConfig(config)` | Configure keyboard navigation (step sizes, custom navigate function) |
| `ctx.getNavConfig()` | Read current nav config |

### Item Overrides

| Method | Description |
|--------|-------------|
| `ctx.setItemStateFn(fn)` | Set a callback to enrich `ItemState` (selected, focused) per item |
| `ctx.setSizeConfig(config)` | Override the size function |
| `ctx.setVirtualTotalFn(fn)` | Override total item count (e.g. groups adds headers) |
| `ctx.setGetItemFn(fn)` | Override item lookup (e.g. groups maps layout → data indices) |
| `ctx.setInsertItemFn(fn)` | Override `insertItem()` |
| `ctx.setRemoveItemFn(fn)` | Override `removeItem()` |

---

## EngineState

The state object passed to `onCalculate` and `onCommit` hooks:

```ts
interface EngineState {
  scrollPosition: number;
  containerSize: number;
  totalSize: number;
  totalItems: number;
  visibleRange: Range;
  renderRange: Range;
  direction: number;
}
```

---

## Minimal Plugin Example

A plugin that logs when items enter/leave the viewport:

```ts
import type { VListPlugin, VListItem } from "vlist";

function visibilityLogger<T extends VListItem>(): VListPlugin<T> {
  let prevRange = { start: 0, end: 0 };

  return {
    name: "visibility-logger",
    priority: 200,

    hooks: {
      onCommit(state) {
        const { start, end } = state.visibleRange;
        if (start !== prevRange.start || end !== prevRange.end) {
          console.log(`Visible: ${start}–${end}`);
          prevRange = { start, end };
        }
      },
    },
  };
}
```

Usage:

```ts
const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [visibilityLogger()]);
```

---

## Plugin with Setup

A plugin that adds a public method and listens to events:

```ts
function itemCounter<T extends VListItem>(): VListPlugin<T> {
  let clickCount = 0;

  return {
    name: "item-counter",

    setup(ctx) {
      ctx.registerClickHandler(() => { clickCount++; });
      ctx.registerMethod("getClickCount", () => clickCount);
      ctx.registerDestroyHandler(() => { clickCount = 0; });
    },
  };
}
```

After adding this plugin, `list.getClickCount()` is available on the instance.

---

## Conventions

- **Priority**: Lower numbers run first. Core uses 10–50, built-in plugins use 50–150. Use 200+ for third-party plugins to run after built-ins.
- **Conflicts**: Declare conflicts to prevent incompatible combinations (e.g. `conflicts: ["grid", "table"]`).
- **Hot path**: `onCalculate` and `onCommit` run every frame during scroll. Avoid allocations and DOM reads.
- **Cleanup**: Always use `ctx.registerDestroyHandler()` to clean up timers, observers, and external listeners.

---

## See Also

- **[Plugin System](./plugin-system)** — How plugins compose together
- **[Exports](/docs/exports)** — All low-level utilities from `vlist/internals`
- **[Types](/docs/types)** — Complete TypeScript type reference
- **[API Reference](/docs/api)** — Core API (config, methods, events)
