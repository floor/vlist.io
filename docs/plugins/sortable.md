---
created: 2026-05-27
updated: 2026-09-16
status: published
---

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

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `handle` | `string` | — | CSS selector for drag handle |
| `ghostClass` | `string` | `"vlist-sort-ghost"` | Class for ghost element |
| `shiftDuration` | `number` | `150` | Shift animation duration (ms) |
| `edgeScrollZone` | `number` | `40` | Pixels from edge to trigger auto-scroll |
| `edgeScrollSpeed` | `number` | `20` | Auto-scroll speed |
| `dragThreshold` | `number` | `5` | Pixels to move before a mouse or handle drag starts; touch movement past it before `touchDelay` scrolls instead |
| `touchDelay` | `number` | `350` | Touch and pen hold, in ms, before a drag starts without a handle |
| `ghostContainer` | `HTMLElement` | — | Custom container for ghost element |

## Touch and pen

Sortable works with both entries, `vlist` and `vlist/synthetic`, with the same gestures.

- **Without a handle**, a long press of `touchDelay` (350 ms) on an item starts the drag. Moving `dragThreshold` pixels before the press completes scrolls the list instead, so a quick flick never reorders.
- **With `handle`**, the handle drags as soon as the pointer moves `dragThreshold` pixels, with no long press. Touching elsewhere on the item scrolls.
- A touch that lands while the list is still moving stops the motion and does not start a drag. Press again once the list is at rest.
- A second finger or a cancelled pointer cancels the press or the drag.
- Mouse and trackpad dragging is unchanged: it starts after `dragThreshold` pixels.

```ts
sortable({ touchDelay: 350, dragThreshold: 5 })
sortable({ handle: ".drag-handle" })
```

## Events

| Event | Payload |
|-------|---------|
| `sort:start` | `{ index }` |
| `sort:move` | `{ fromIndex, currentIndex }` |
| `sort:end` | `{ fromIndex, toIndex }` |
| `sort:cancel` | `{ originalItems }` |

## CSS Classes

- `.vlist--sorting` on root during drag
- `.vlist--settling` on root during drop animation
- `.vlist-item--drag-source` on dragged item
- `.vlist-item--kb-sorting` on keyboard-grabbed item
- `.vlist-item--touch-sort` on the pressed item during a touch press (suppresses text selection and callouts)
- `.vlist-sort-ghost--touch` on the ghost of a touch or pen drag (a visual cue; override it in CSS)

## Notes

- Visual only — reordering emits `sort:end`, you reorder data and call `setItems()`
- Pointer drag with ghost element, or keyboard via Space + Arrow keys
- Auto-scroll at viewport edges
- Full ARIA support (`aria-roledescription`, grab/drop announcements)
- Conflicts with: grid, masonry, table
- Works with `createVList` from `vlist` or `vlist/synthetic`

## Examples

- [Sortable](/examples/sortable) — drag-and-drop reordering with handle and full-item drag
