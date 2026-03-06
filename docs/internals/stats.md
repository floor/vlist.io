# Stats Module

> Pure computation module for scroll statistics — visible item count, progress, and velocity tracking.

**Source:** `vlist/src/utils/stats.ts`
**Export:** `import { createStats } from "vlist"`

## Overview

The stats module computes scroll-derived metrics from a vlist instance without depending on internal APIs or DOM access. All inputs are provided via callbacks, making it usable in any environment.

It answers three questions:
- **How many items** has the user scrolled through?
- **What percentage** of the list has been seen?
- **How fast** is the user scrolling?

## API

### createStats(config)

```typescript
interface StatsConfig {
  getScrollPosition: () => number;  // scrollTop or scrollLeft
  getTotal: () => number;           // total item count
  getItemSize: () => number;        // item size along scroll axis
  getContainerSize: () => number;   // viewport size (clientHeight or clientWidth)
  getColumns?: () => number;        // grid/masonry column count (defaults to 1)
}

interface StatsState {
  progress: number;     // 0–100
  velocity: number;     // current px/ms
  velocityAvg: number;  // running average px/ms
  itemCount: number;    // items visible up to scroll position
  total: number;        // total items
}

interface Stats {
  getState: () => StatsState;
  onVelocity: (velocity: number) => void;
}
```

All config properties are callbacks so the tracker always reflects the latest values without needing to be recreated when the list, item size, or column count changes.

### Usage

```typescript
import { createStats } from "vlist";

const stats = createStats({
  getScrollPosition: () => list.getScrollPosition(),
  getTotal: () => items.length,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () => containerEl.clientHeight,
});

// Read state on any event
list.on("scroll", () => {
  const { progress, itemCount, total } = stats.getState();
  console.log(`${itemCount} / ${total} (${progress.toFixed(0)}%)`);
});

// Feed velocity samples
list.on("velocity:change", ({ velocity }) => {
  stats.onVelocity(velocity);
});
```

For grid or masonry layouts, pass `getColumns`:

```typescript
const stats = createStats({
  getScrollPosition: () => list.getScrollPosition(),
  getTotal: () => ITEM_COUNT,
  getItemSize: () => rowHeight,
  getColumns: () => currentColumns,
  getContainerSize: () => containerEl.clientHeight,
});
```

For horizontal lists, measure `clientWidth` instead of `clientHeight`:

```typescript
const stats = createStats({
  getScrollPosition: () => list.getScrollPosition(),
  getTotal: () => items.length,
  getItemSize: () => ITEM_WIDTH + gap,
  getContainerSize: () => containerEl.clientWidth,
});
```

## Geometric Item Count

The core computation maps a virtual scroll position back to a cumulative item count using the same linear scaling that vlist uses internally for compressed/scaled mode.

### Formula

```
columns         = getColumns() ?? 1
totalRows       = ceil(total / columns)
totalActualSize = totalRows × itemSize
totalVirtualSize = min(totalActualSize, MAX_VIRTUAL_SIZE)
maxVirtualScroll = totalVirtualSize − containerSize
maxActualScroll  = totalActualSize − containerSize
ratio            = maxActualScroll / maxVirtualScroll
actualOffset     = scrollPosition × ratio
visibleRows      = ceil((actualOffset + containerSize) / itemSize)
itemCount        = min(visibleRows × columns, total)
```

### Why scroll-range ratio, not size ratio

The compression ratio could be computed two ways:

- **Size ratio:** `totalActualSize / totalVirtualSize` — maps total sizes
- **Scroll-range ratio:** `maxActualScroll / maxVirtualScroll` — maps scrollable ranges

The size ratio doesn't account for the fact that the viewport is a fixed physical size — only the *scrollable range* is compressed. Using the size ratio, the last item is never reached: at max scroll, the bottom of the viewport lands ~24 items short.

The scroll-range ratio ensures that `scrollPosition = maxVirtualScroll` maps to `actualOffset = maxActualScroll`, which means the bottom of the viewport aligns exactly with the last item.

### Examples (1M items, 48px height, 598px container)

| Scroll position | Actual offset | Item count |
|-----------------|--------------|------------|
| 0 | 0 | 13 |
| 5px | 15px | 13 |
| maxVirtualScroll | maxActualScroll | 1,000,000 |

### Grid and masonry

For grid/masonry layouts, vlist virtualizes **rows**, not individual items. Each row contains `columns` items. The formula accounts for this:

1. Convert total items → total rows (`ceil(total / columns)`)
2. Compute visible rows from scroll position
3. Convert back to items (`visibleRows × columns`)
4. Clamp to total

A 4-column grid with 900 items and 5 visible rows reports `20 / 900`, not `5 / 900`.

## Velocity Tracking

`onVelocity(v)` accepts samples from the `velocity:change` event and maintains:

- **Current velocity** — the most recent sample
- **Running average** — mean of all samples between 0.1 and 50 px/ms

Samples outside the 0.1–50 range are stored as current but excluded from the average to filter noise (idle drift and unrealistic spikes).

## Example Footer Integration

The `vlist.dev` examples pair `createStats` with a thin DOM layer in `examples/footer.js`:

```
stats.js   → re-exports createStats from vlist (convenience path)
footer.js  → renderFooter(state) + createFooterUpdater(stats)
script.js  → wires events, owns the RAF loop via createFooterUpdater
```

`createFooterUpdater(stats)` returns a RAF-batched function that coalesces multiple calls per frame into a single `renderFooter(stats.getState())`.

```javascript
import { createStats } from "../stats.js";
import { createFooterUpdater } from "../footer.js";

const stats = createStats({ /* config */ });
const updateFooter = createFooterUpdater(stats);

list.on("scroll", updateFooter);
list.on("range:change", updateFooter);
list.on("velocity:change", ({ velocity }) => {
  stats.onVelocity(velocity);
  updateFooter();
});

updateFooter(); // initial render
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Callback-based config | Avoids recreating the tracker when list/columns/size changes |
| `getContainerSize` instead of `container` selector | Keeps module DOM-free; caller decides vertical vs horizontal |
| `getScrollPosition` instead of `getList` | Single responsibility — module doesn't know about the VList interface |
| No internal RAF or DOM | Pure computation; rendering is the caller's concern |
| Imported `MAX_VIRTUAL_SIZE` from constants | Single source of truth with vlist's compression module |
| Velocity filtering (0.1–50 px/ms) | Excludes idle drift and unrealistic spikes from the average |