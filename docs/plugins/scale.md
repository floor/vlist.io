---
created: 2026-02-10
updated: 2026-05-27
status: published
---

# Scale

Enables lists with 1M+ items by compressing scroll space when content exceeds the browser's maximum element height (~16.7M pixels).

```ts
import { createVList, scale } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: largeDataset, // 1,000,000+ items
}, [scale()]);
```

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `force` | `boolean` | `false` | Force compression even for smaller lists |

### How it works

When total content exceeds the browser's pixel limit (~16.7M px), the plugin compresses the scroll space by a ratio (e.g. 0.33 for 1M items at 48px). In compressed mode:

- Native scroll is disabled (`overflow: hidden`)
- Custom wheel handler with lerp-based smooth scrolling
- Custom touch handler with momentum/deceleration
- Items positioned relative to viewport via `onCalculate` hook
- Built-in scrollbar (uses scrollbar plugin internally)

### scrollToIndex in compressed mode

The scale plugin takes over `scrollToIndex` entirely when compressed — it computes the target position in virtual (compressed) space and animates directly, avoiding any coordinate round-trip through native scroll. The `easing` and `duration` options work the same:

```ts
list.scrollToIndex(999999, {
  behavior: "smooth",
  duration: 800,
  easing: (t) => Math.pow(2, -10 * t) * Math.sin((t - 0.075) * 2 * Math.PI / 0.3) + 1,
});
```

When compression is not active (list is small enough), `scrollToIndex` falls through to the default implementation.

### Notes

- Activates automatically when total content size exceeds browser limits
- Transparent to the rest of the API — `scrollToIndex()`, events, etc. work as normal
- Conflicts with: sortable
