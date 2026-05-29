---
created: 2026-05-29
updated: 2026-05-29
status: published
---

# Stats

Pure computation module for scroll statistics. Tracks velocity, computes item count and scroll progress using geometric mapping. No DOM access, no side effects.

```ts
import { createVList, createStats } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, plugins);

const stats = createStats({
  getScrollPosition: () => list.getScrollPosition(),
  getTotal: () => data.length,
  getItemSize: () => 48,
  getContainerSize: () => document.querySelector("#app").clientHeight,
});

list.on("scroll", () => {
  const { progress, itemCount, total } = stats.getState();
  console.log(`${progress.toFixed(0)}% — ${itemCount}/${total} items`);
});
```

## Config

All inputs are callbacks so the tracker always reflects the latest values without needing to be recreated when the list changes.

| Option | Type | Description |
|--------|------|-------------|
| `getScrollPosition` | `() => number` | Current scroll position (scrollTop or scrollLeft) |
| `getTotal` | `() => number` | Total number of items |
| `getItemSize` | `() => number` | Item size along the scroll axis (height for vertical, width for horizontal) |
| `getContainerSize` | `() => number` | Viewport size in px (clientHeight for vertical, clientWidth for horizontal) |
| `getColumns` | `() => number` | Column count for grid/masonry layouts. Defaults to 1 |

## State

`stats.getState()` returns:

| Property | Type | Description |
|----------|------|-------------|
| `progress` | `number` | Scroll progress as 0–100 |
| `velocity` | `number` | Current instantaneous velocity in px/ms |
| `velocityAvg` | `number` | Running average velocity in px/ms (filtered) |
| `itemCount` | `number` | Number of items visible up to the current scroll position |
| `total` | `number` | Total number of items |

## Methods

| Method | Description |
|--------|-------------|
| `getState()` | Return the current computed state. Pure read — no side effects |
| `onVelocity(velocity)` | Feed a velocity sample. Call from the `velocity:change` event |

## Velocity tracking

The stats module filters velocity samples to avoid outliers. Only values between 0.1 and 50 px/ms are included in the running average. Feed samples from the `velocity:change` event:

```ts
list.on("velocity:change", ({ velocity }) => {
  stats.onVelocity(velocity);
});
```

## Grid and masonry support

For multi-column layouts, provide `getColumns` so the geometric mapping correctly converts visible rows to item counts:

```ts
const stats = createStats({
  getScrollPosition: () => list.getScrollPosition(),
  getTotal: () => items.length,
  getItemSize: () => effectiveRowHeight,
  getContainerSize: () => container.clientHeight,
  getColumns: () => 4,
});
```

## Scale plugin compatibility

When the [scale](/docs/plugins/scale) plugin compresses scroll space for large lists, `createStats` accounts for the compression ratio automatically. The geometric mapping converts the virtual (compressed) scroll position back to actual item indices using the same linear mapping the scale plugin uses internally.

## Examples

- [Photo Album](/examples/photo-album) — grid/masonry gallery with progress, velocity, and item count display
- [Scrollbar](/examples/scrollbar) — contact list with scroll statistics
