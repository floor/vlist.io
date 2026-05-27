---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Autosize

Dynamic item measurement via ResizeObserver for items with unknown heights.

```ts
import { createVList, autosize } from "vlist";

const list = createVList({
  container: "#app",
  item: {
    estimatedHeight: 80,
    template: (item) => `<div class="card">${item.content}</div>`,
  },
  items: data,
}, [autosize()]);
```

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gap` | `number` | `item.gap` | Extra space per item (px). Inherits from `item.gap` if not set. |

### Methods

| Method | Description |
|--------|-------------|
| `isMeasured(index)` | Check if item has been measured |
| `setMeasuredSize(index, size)` | Manually set an item's measured size |
| `getMeasuredCount()` | Number of items measured so far |

### Notes

- Requires `estimatedHeight` (or `estimatedWidth`) in item config — not `height`
- Measures each item once via ResizeObserver, then pins the size
- Keeps measured items near viewport for stable scrolling
- Auto-snaps to bottom if user was already scrolled there
