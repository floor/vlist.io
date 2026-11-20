---
created: 2026-02-10
updated: 2026-11-10
status: published
---

# Data

Async data loading with pagination, placeholders, and infinite scroll.

```ts
import { createVList, data } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
}, [data({
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/items?offset=${offset}&limit=${limit}`);
      const { items, total } = await res.json();
      return { items, total };
    },
  },
  total: 1000,
})]);
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `adapter` | `VListAdapter<T>` | required | Data source |
| `total` | `number` | — | Total item count (if known) |
| `autoLoad` | `boolean` | `true` | Auto-load initial data |
| `storage.chunkSize` | `number` | `100` | Items per request |
| `storage.maxCachedItems` | `number` | `10000` | Max cached items |
| `storage.evictionBuffer` | `number` | `500` | Extra items to keep around visible range |
| `loading.cancelThreshold` | `number` | `15` | Velocity above which loading is cancelled (px/ms) |
| `loading.preloadThreshold` | `number` | `2` | Velocity above which preloading kicks in (px/ms) |
| `loading.preloadAhead` | `number` | `50` | Items to preload ahead of scroll direction |

## Adapter Interface

```ts
interface VListAdapter<T> {
  read(params: {
    offset: number;
    limit: number;
    cursor: string | undefined;
    signal: AbortSignal;
  }): Promise<{
    items: T[];
    total?: number;
    cursor?: string;
    hasMore?: boolean;
  }>;
}
```

## Methods

| Method | Description |
|--------|-------------|
| `reload()` | Reset and reload all data (e.g. after a server-side sort/filter). Keeps the last-known total so the list shows placeholders while reloading |
| `loadVisibleRange()` | Load visible items on demand (no-op until the viewport is measured) |
| `loadInitial()` | Load page 1 deterministically, regardless of container dimensions |
| `getTotal()` | Get total item count |
| `setTotal(n)` | Set total item count |

## Events

| Event | Payload |
|-------|---------|
| `load:start` | `{ offset, limit }` |
| `load:end` | `{ items, total }` |
| `error` | `{ error, context }` — `context` is `"load"`, `"ensureRange"`, or `"loadInitial"` |

## Placeholders while scrolling fast

When scroll velocity exceeds `loading.cancelThreshold` (default `15` px/ms), `data()` skips chunk fetches and renders unloaded rows as repeating placeholders marked with `.vlist-item--placeholder`. Once scrolling slows down or settles, the visible range loads and replaced rows receive `.vlist-item--replaced` (faded in by `vlist/styles`).

While the scroll is fast, placeholders take a directional smear: a one-axis gaussian, offset along the scroll, dimmed to 0.7, and drawn behind the row. Toggle `.vlist--fast` from `velocity:change`. `N` is `min(12, max(1.5, velocity * 0.28))`. The offset is `sign * min(22, max(4, velocity * 0.55))`, and `sign` follows the scroll direction. A vertical list (axis y, the default `orientation`) uses `stdDeviation` `"0 N"`, `dy` equal to that offset and `dx` 0, with the filter region below. A horizontal list (`orientation: "horizontal"`, axis x) uses `"N 0"`, `dx` equal to that offset and `dy` 0, and widens the region on x (`x="-70%"`, `width="240%"`). The settle fade on `.vlist-item--replaced` is unchanged.

```html
    <svg class="motion-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="velocity-motion" x="-8%" y="-70%" width="116%" height="240%" color-interpolation-filters="sRGB">
            <feGaussianBlur id="velocity-motion-blur" in="SourceGraphic" stdDeviation="0 4" result="smear"></feGaussianBlur>
            <feOffset id="velocity-motion-shift" in="smear" dx="0" dy="8" result="shifted"></feOffset>
            <feComponentTransfer in="shifted" result="trail">
                <feFuncA type="linear" slope="0.7"></feFuncA>
            </feComponentTransfer>
            <feMerge>
                <feMergeNode in="trail"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
        </filter>
    </svg>
```

```js
function motionSpread(velocity) {
  return Math.min(12, Math.max(1.5, velocity * 0.28));
}

function motionShiftAmount(velocity, direction) {
  const sign = direction > 0 ? 1 : -1;
  return sign * Math.min(22, Math.max(4, velocity * 0.55));
}

function updateTrailSpread() {
  if (!motionBlur || !list) return;
  const n = motionSpread(currentVelocity).toFixed(1);
  const axis = listConfig.orientation === "horizontal" ? "x" : "y";
  motionBlur.setAttribute("stdDeviation", axis === "x" ? `${n} 0` : `0 ${n}`);
  if (!motionFilter) return;
  if (axis === "x") {
    motionFilter.setAttribute("x", "-70%");
    motionFilter.setAttribute("y", "-8%");
    motionFilter.setAttribute("width", "240%");
    motionFilter.setAttribute("height", "116%");
  } else {
    motionFilter.setAttribute("x", "-8%");
    motionFilter.setAttribute("y", "-70%");
    motionFilter.setAttribute("width", "116%");
    motionFilter.setAttribute("height", "240%");
  }
}

function updateTrailShift(direction) {
  if (!motionShift || !list || direction === 0) return;
  const shift = motionShiftAmount(currentVelocity, direction).toFixed(1);
  const axis = listConfig.orientation === "horizontal" ? "x" : "y";
  if (axis === "x") {
    motionShift.setAttribute("dx", shift);
    motionShift.setAttribute("dy", "0");
  } else {
    motionShift.setAttribute("dx", "0");
    motionShift.setAttribute("dy", shift);
  }
}
```

```js
    list.element.classList.toggle(
      "vlist--fast",
      reliable && velocity > LOAD_VELOCITY_THRESHOLD,
    );
    updateTrailSpread();
```

```css
.motion-defs {
    position: absolute;
    width: 0;
    height: 0;
}

.vlist .vlist-item--placeholder {
    transition: filter 0.15s ease;
}

.vlist--fast .vlist-item--placeholder {
    contain: none;
    overflow: visible;
    z-index: 2;
    background-color: transparent;
    filter: url("#velocity-motion");
    animation: none;
}
```

See the [Velocity Loading example](/examples/velocity-loading) for a live demo.

## Loading resilience

When a chunk fails to load (network drop, server error, timeout), the plugin keeps the list usable and recovers on its own:

- **Placeholders, not empty rows** — failed and unloaded ranges render placeholders. `reload()` keeps the last-known total, so a server-side sort or filter shows placeholders for the full range while the new data loads, instead of collapsing to an empty list. The total is corrected once the first new chunk arrives.
- **Automatic retry with backoff** — a failed load re-attempts the visible range with exponential backoff (2s → 30s cap). Once a load succeeds the backoff resets, and placeholders are replaced with real data — no scrolling required.
- **Event-independent** — recovery does **not** rely solely on the browser `online` event. The backoff timer also recovers from server errors, timeouts, and blocked requests where `online` never fires. When the `online` event *does* fire, the backoff resets and the visible range retries immediately.

Off-screen ranges that failed are retried when scrolled back into view (or on the next `online` event).

## Notes

- Velocity-aware: skips loads during fast scroll, loads on idle
- Deduplicates concurrent requests for the same range
- Supports cursor-based pagination via `cursor` in adapter response
- Sets `aria-busy` on root during loading
- Aborts in-flight requests on `reload()` (via the adapter's `signal`) — aborts are not surfaced as errors

## Examples

- [Velocity Loading](/examples/velocity-loading) — smart async loading with scroll-speed awareness
- [Window Scroll](/examples/window-scroll) — document-level scrolling with async data
- [Data Table](/examples/data-table) — async-loaded table with 10K rows
