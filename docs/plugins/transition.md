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

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `200` | Base animation duration (ms) |
| `easing` | `string` | `cubic-bezier(0.2, 0, 0, 1)` | Base easing function |
| `insert` | `{ duration, easing } \| false` | inherits base | Insert animation config |
| `remove` | `{ duration, easing } \| false` | inherits base | Remove animation config |

### Events

| Event | Payload |
|-------|---------|
| `remove:end` | `{ id }` — after exit animation completes |
| `data:change` | `{ type: "insert" \| "remove", id }` |

### Notes

- Overrides `insertItem()` and `removeItem()` with animated versions
- Conflicts with: grid, table, masonry (only works with flat lists)
