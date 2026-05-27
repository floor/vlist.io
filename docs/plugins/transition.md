---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Transition

FLIP-based enter/exit animations for item insertion and removal.

```ts
import { createVList, transition } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [transition()]);

// Animated insert
list.insertItem({ id: "new", name: "New Item" }, 0);

// Animated remove
list.removeItem("some-id");
```

### How It Works (FLIP)

1. **First** — capture current positions of all visible items
2. **Last** — mutate the data and re-render (items jump to final positions)
3. **Invert** — apply CSS transforms to push items back to their old positions
4. **Play** — animate transforms to zero so items slide to their new positions

On **remove**, a clone of the removed element collapses via `scaleY(0)` + fade while siblings slide up. On **insert**, the new element expands from `scaleY(0)` + fades in while siblings slide down.

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `200` | Base animation duration (ms, max 1000) |
| `easing` | `string` | `cubic-bezier(0.2, 0, 0, 1)` | Base easing function |
| `insert` | `{ duration, easing } \| false` | inherits base | Insert animation config, or `false` to disable |
| `remove` | `{ duration, easing } \| false` | inherits base | Remove animation config, or `false` to disable |

### Events

| Event | Payload |
|-------|---------|
| `remove:end` | `{ id }` — after exit animation completes and clone is removed from DOM |
| `data:change` | `{ type: "insert" \| "remove", id }` |

### Reduced Motion

The transition plugin uses `element.animate()` (Web Animations API) directly and does not check `prefers-reduced-motion`. To respect the user's preference:

```ts
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [
  reducedMotion ? null : transition(),
].filter(Boolean));
```

### Notes

- Overrides `insertItem()` and `removeItem()` with animated versions
- Batch removals animate simultaneously with overlapping FLIP
- Conflicts with: grid, table, masonry (only works with flat lists)
