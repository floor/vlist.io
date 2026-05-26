# Sortable

Drag-and-drop and keyboard reordering.

```ts
import { createVList, sortable } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [sortable()]);

list.on("sort:end", ({ fromIndex, toIndex }) => {
  // Reorder your data and call list.setItems(reordered)
  const reordered = [...data];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  list.setItems(reordered);
});
```

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `handle` | `string` | — | CSS selector for drag handle |
| `ghostClass` | `string` | `"vlist-sort-ghost"` | Class for ghost element |
| `shiftDuration` | `number` | `150` | Shift animation duration (ms) |
| `edgeScrollZone` | `number` | `40` | Pixels from edge to trigger auto-scroll |
| `edgeScrollSpeed` | `number` | `20` | Auto-scroll speed |
| `dragThreshold` | `number` | `5` | Pixels to move before drag starts |
| `ghostContainer` | `HTMLElement` | — | Custom container for ghost element |

### Events

| Event | Payload |
|-------|---------|
| `sort:start` | `{ index }` |
| `sort:move` | `{ fromIndex, currentIndex }` |
| `sort:end` | `{ fromIndex, toIndex }` |
| `sort:cancel` | `{ originalItems }` |

### CSS Classes

- `.vlist--sorting` on root during drag
- `.vlist--settling` on root during drop animation
- `.vlist-item--drag-source` on dragged item
- `.vlist-item--kb-sorting` on keyboard-grabbed item

### Notes

- Visual only — reordering emits `sort:end`, you reorder data and call `setItems()`
- Pointer drag with ghost element, or keyboard via Space + Arrow keys
- Auto-scroll at viewport edges
- Full ARIA support (`aria-roledescription`, grab/drop announcements)
- Conflicts with: grid, masonry, table, scale
