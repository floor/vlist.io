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

## When to Use

vlist has two sizing modes:

| | Fixed size (Mode A) | Autosize (Mode B) |
|---|---|---|
| **Config** | `height: 48` or `height: (i) => sizes[i]` | `estimatedHeight: 80` + `autosize()` |
| **Scrollbar** | Pixel-perfect from start | Approximate until items are measured |
| **scrollToIndex** | Exact | Adapts on the fly as sizes are measured |
| **Best for** | Uniform or pre-known sizes | Dynamic content (text, images, cards) |

Use Mode A when you know the heights upfront. Use `autosize()` when item heights depend on content rendered in the DOM.

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gap` | `number` | `item.gap` | Extra space per item (px). Inherits from `item.gap` if not set. |

## Methods

| Method | Description |
|--------|-------------|
| `isMeasured(index)` | Check if item has been measured |
| `setMeasuredSize(index, size)` | Manually set an item's measured size |
| `getMeasuredCount()` | Number of items measured so far |

## Choosing a Good Estimate

The closer `estimatedHeight` is to the real average, the less the scrollbar jumps as items are measured. Profile 50–100 representative items and use the **median** height.

## Notes

- Requires `estimatedHeight` (or `estimatedWidth`) in item config — not `height`
- Measures each item once via ResizeObserver, then pins the size
- Scroll position is corrected when items above the viewport measure differently than estimated
- Auto-snaps to bottom if user was already scrolled there
- On Windows/Linux, native scrollbars consume ~17px inside the viewport — if your items are width-sensitive (e.g. text wrapping), measured heights may differ from production layout. The custom `scrollbar()` plugin avoids this by using an overlay scrollbar
