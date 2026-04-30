# Sortable Feature

> Drag-and-drop reordering with smooth item shifting.

## Overview

The `withSortable()` feature enables **drag-and-drop reordering** of items in a virtual list. Grab an item (or its handle) and drag to reorder — surrounding items shift out of the way in real time, like iOS list reordering.

**Import:**
```typescript
import { vlist, withSortable } from 'vlist';
```

**Key characteristics:**

- **Live reorder** — items shift with smooth CSS transitions as you drag, giving immediate visual feedback
- **Ghost clone** — a semi-transparent clone follows the pointer; the original item is hidden
- **Handle support** — optionally restrict drag initiation to a handle element (e.g. a grip icon)
- **Edge auto-scroll** — the list scrolls automatically when dragging near the top or bottom of the viewport, with quadratic speed ramp
- **Drag threshold** — a minimum pointer movement prevents accidental drags on click
- **Keyboard reordering** — grab, move, drop, and cancel items entirely via keyboard
- **Accessible** — ARIA attributes and live region announcements for screen readers
- **Data-agnostic** — the feature does NOT reorder your data. On drop, it emits `sort:end` with `{ fromIndex, toIndex }` — you reorder the array and call `setItems()`

## Quick Start

```typescript
import { vlist, withSortable } from 'vlist';

const items = [
  { id: 1, name: 'Review pull request' },
  { id: 2, name: 'Update documentation' },
  { id: 3, name: 'Fix login redirect' },
];

const list = vlist({
  container: '#list',
  items,
  item: {
    height: 56,
    template: (item) => `
      <div class="task">
        <span class="grip">&#x2807;</span>
        ${item.name}
      </div>
    `,
  },
})
  .use(withSortable({ handle: '.grip' }))
  .build();

// Reorder data on drop
list.on('sort:end', ({ fromIndex, toIndex }) => {
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  items.length = 0;
  items.push(...reordered);
  list.setItems(items);
});

// Restore order on keyboard cancel (Escape)
list.on('sort:cancel', ({ originalItems }) => {
  items.length = 0;
  items.push(...originalItems);
  list.setItems(items);
});
```

## API

### withSortable(config?)

Creates the sortable feature. Accepts an optional configuration object.

```typescript
withSortable(config?: SortableConfig): VListFeature
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `handle` | `string` | `undefined` | CSS selector for the drag handle within each item. When set, only elements matching this selector initiate a drag. When omitted, the entire item is draggable. |
| `ghostClass` | `string` | `'vlist-sort-ghost'` | CSS class added to the drag ghost element. Override to customize the ghost appearance. |
| `shiftDuration` | `number` | `150` | Transition duration in ms for item shift animations. Set to `0` for instant shifts. |
| `edgeScrollZone` | `number` | `40` | Size in px of the auto-scroll zone at viewport edges. When the pointer enters this zone during drag, the list auto-scrolls. |
| `edgeScrollSpeed` | `number` | `20` | Auto-scroll speed in pixels per frame at the edge boundary. Speed ramps quadratically as the pointer moves deeper into the zone. |
| `dragThreshold` | `number` | `5` | Minimum distance in px the pointer must move before drag starts. Prevents accidental drags on click. |

### Instance Methods

When `withSortable` is active, the list instance exposes:

```typescript
list.isSorting(): boolean
```

Returns `true` while a drag or keyboard reorder is in progress.

## Events

### sort:start

Emitted when a drag begins (after the pointer crosses the drag threshold) or when an item is grabbed via keyboard (Space).

```typescript
list.on('sort:start', ({ index }) => {
  console.log(`Dragging item at index ${index}`);
});
```

| Field | Type | Description |
|-------|------|-------------|
| `index` | `number` | Index of the item being dragged |

### sort:move

Emitted during a pointer drag whenever the **drop position changes**. Use this to show live feedback (e.g. updating a status panel in real time). Not emitted for keyboard reordering (use `sort:end` instead, which fires per arrow key press).

```typescript
list.on('sort:move', ({ fromIndex, currentIndex }) => {
  console.log(`Would drop at #${currentIndex + 1} (started at #${fromIndex + 1})`);
});
```

| Field | Type | Description |
|-------|------|-------------|
| `fromIndex` | `number` | Index of the item being dragged |
| `currentIndex` | `number` | Current drop target index |

### sort:end

Emitted when a drag completes and the item was moved to a different position. **Not emitted** if the item is dropped back to its original position.

For keyboard reordering, `sort:end` is emitted on **each arrow key press** (incremental moves), not just on drop.

```typescript
list.on('sort:end', ({ fromIndex, toIndex }) => {
  // Reorder your data array
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  list.setItems(reordered);
});
```

| Field | Type | Description |
|-------|------|-------------|
| `fromIndex` | `number` | Original index of the dragged item |
| `toIndex` | `number` | New index where the item was dropped |

### sort:cancel

Emitted when a keyboard reorder is cancelled via **Escape**. Contains the original items array from before the grab, so the consumer can restore the original order. Not emitted for pointer drags (pointer cancel simply restores visual state without data changes).

```typescript
list.on('sort:cancel', ({ originalItems }) => {
  list.setItems(originalItems);
});
```

| Field | Type | Description |
|-------|------|-------------|
| `originalItems` | `unknown[]` | Snapshot of the items array at the moment the item was grabbed |

## Keyboard Reordering

The sortable feature supports full keyboard-driven reordering. When composed with `withSelection`, the focused item (navigated via arrow keys) can be grabbed and moved.

### Keys

| Key | Action |
|-----|--------|
| `Space` | **Grab** the focused item (enters grab mode) |
| `Arrow Up` / `Arrow Down` | **Move** the grabbed item up/down by one position |
| `Arrow Left` / `Arrow Right` | Same as Up/Down (for horizontal lists) |
| `Space` / `Enter` | **Drop** the grabbed item at its current position |
| `Escape` | **Cancel** — restore the original order |

### How It Works

```
Arrow keys navigate to an item (via withSelection)
    |
Space — grab the focused item
    sort:start emitted
    .vlist--sorting class added to root
    .vlist-item--kb-sorting class added to grabbed item
    Screen reader: "Grabbed {item}. Position N of M."
    |
Arrow Down — move item down one position
    sort:end emitted per move (consumer reorders data)
    Screen reader: "{item} moved. New position N of M."
    |
Arrow Down — continue moving...
    |
Space — drop the item
    .vlist--sorting removed
    .vlist-item--kb-sorting removed
    Screen reader: "{item} dropped. Final position N of M."

    — or —

Escape — cancel and restore original order
    sort:cancel emitted with original items snapshot
    Screen reader: "Reorder cancelled. Returned to position N of M."
```

### Interaction with Selection

When `withSortable` and `withSelection` are both active:

- **Space** is intercepted by sortable for grab/drop. Use **Enter** to toggle selection on focused items.
- During grab mode, all keys (arrows, Space, Escape) are handled by sortable. Selection's keyboard handler is blocked.
- After drop or cancel, selection focus is updated to the item's final position.

## Accessibility

### ARIA Attributes

The feature automatically applies ARIA attributes to rendered items:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `aria-roledescription` | `"sortable item"` | Tells screen readers this is a reorderable item |
| `aria-describedby` | Points to hidden instructions | Provides reorder instructions on focus |

A visually-hidden instructions element is appended to the root:

> "Press Space to reorder. Use arrow keys to move, Space to drop, Escape to cancel."

### Live Region Announcements

All sort actions are announced via the shared `aria-live="polite"` region:

| Action | Announcement |
|--------|-------------|
| Grab | "Grabbed {item}. Current position N of M. Use Up and Down arrow keys to move, Space to drop, Escape to cancel." |
| Move | "{item} moved. New position N of M." |
| Drop | "{item} dropped. Final position N of M." |
| Cancel | "Reorder cancelled. Returned to position N of M." |

## How It Works

### Drag Lifecycle (Pointer)

```
pointerdown on item (or handle)
    |
pointermove crosses dragThreshold (5px)
    |
sort:start emitted
Ghost clone created, original hidden (opacity: 0)
Root gets .vlist--sorting class
    |
pointermove updates ghost position
    Nearby items shift via CSS transform transitions
    sort:move emitted each time drop position changes
    Edge zones trigger auto-scroll
    |
pointerup
    |
Ghost animates to drop target position
Ghost removed, shifts cleared, DOM restored
    |
sort:end emitted (if position changed)
```

### Ghost Element

The dragged item is **cloned** — the clone (ghost) follows the pointer with `position: fixed`, while the original is hidden. This approach is safer than moving the original because vlist's renderer may recycle or reposition elements during scroll.

The ghost receives structural inline styles (position, size, coordinates) and the `ghostClass` for visual styles. The default `.vlist-sort-ghost` class provides:

```css
.vlist-sort-ghost {
    opacity: 0.85;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    cursor: grabbing;
}
```

Override `ghostClass` or the CSS class to customize the ghost appearance.

### Item Shifting

Items shift out of the way using CSS transitions on their `transform` property. The shift direction is determined by comparing the ghost's leading edge against each item's midpoint:

- **Dragging down** — ghost bottom edge vs. target midpoint
- **Dragging up** — ghost top edge vs. target midpoint

Direction is calculated from the pointer's current position relative to the drag start position, making it stable (no flickering from frame-to-frame jitter).

### Edge Auto-Scroll

When the pointer enters the edge zone (default 40px from viewport top/bottom), the list auto-scrolls:

- **Quadratic speed ramp** — speed increases as `t^2` where `t` is depth into the zone (0 at boundary, 1 at edge)
- **Beyond viewport** — scrolling continues when the pointer moves outside the viewport, capped at 3x max speed
- **Shifts frozen** — item shifts are suspended during edge scrolling to avoid jarring double-movement
- **Re-entry** — shifts resume when the pointer re-enters the viewport
- **Boundary detection** — auto-scroll stops at list boundaries (top/bottom)

### Drop Animation

On pointer release, the ghost smoothly transitions to the target item's position (both axes) via CSS `transition`. A `transitionend` listener cleans up the ghost, with a `setTimeout` fallback in case the event doesn't fire.

## CSS Classes

| Class | Applied to | When |
|-------|-----------|------|
| `vlist-sort-ghost` | Ghost element | During pointer drag (default `ghostClass`) |
| `vlist--sorting` | Root element | During pointer drag or keyboard grab (`user-select: none`) |
| `vlist-item--kb-sorting` | Grabbed item | During keyboard grab (focus ring + selected background) |

### Styling the Ghost

Override the default ghost styles:

```css
/* Custom ghost appearance */
.vlist-sort-ghost {
    opacity: 0.9;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    cursor: grabbing;
}
```

Or use a custom class:

```typescript
.use(withSortable({ ghostClass: 'my-drag-ghost' }))
```

### Styling the Handle

Style the drag handle to indicate it's grabbable:

```css
.grip {
    cursor: grab;
    opacity: 0.4;
    user-select: none;
}

.grip:hover {
    opacity: 0.7;
}

/* During drag, the root gets .vlist--sorting */
.vlist--sorting .grip {
    cursor: grabbing;
}
```

### Styling the Keyboard Grab

The default `.vlist-item--kb-sorting` provides a focus ring and selected background. Override to customize:

```css
.vlist-item--kb-sorting {
    outline: 2px solid var(--vlist-focus-ring, #3b82f6);
    outline-offset: -2px;
    background-color: var(--vlist-bg-selected);
    z-index: 1;
}
```

## Usage Examples

### Full-Item Drag (No Handle)

```typescript
const list = vlist({
  container: '#list',
  items: tasks,
  item: {
    height: 48,
    template: (task) => `<div class="task">${task.name}</div>`,
  },
})
  .use(withSortable()) // entire item is draggable
  .build();
```

### Handle-Based Drag

```typescript
const list = vlist({
  container: '#list',
  items: tasks,
  item: {
    height: 56,
    template: (task) => `
      <div class="task">
        <span class="drag-handle" aria-label="Drag to reorder">&#x2807;</span>
        <span class="task-name">${task.name}</span>
      </div>
    `,
  },
})
  .use(withSortable({ handle: '.drag-handle' }))
  .build();
```

### With Selection

Sortable composes with `withSelection()`. Use **Enter** for selection toggle (Space is used for grab/drop):

```typescript
import { vlist, withSortable, withSelection } from 'vlist';

const list = vlist({
  container: '#list',
  items: tasks,
  item: {
    height: 56,
    template: (task, i, { selected }) => `
      <div class="task ${selected ? 'task--selected' : ''}">
        <span class="grip">&#x2807;</span>
        ${task.name}
      </div>
    `,
  },
})
  .use(withSortable({ handle: '.grip' }))
  .use(withSelection({ mode: 'single' }))
  .build();
```

### Handling Cancel

When the user cancels a keyboard reorder with Escape, restore the original order:

```typescript
list.on('sort:end', ({ fromIndex, toIndex }) => {
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  list.setItems(reordered);
});

list.on('sort:cancel', ({ originalItems }) => {
  list.setItems(originalItems);
});
```

### Persisting Order

Save the reordered data to your backend:

```typescript
list.on('sort:end', async ({ fromIndex, toIndex }) => {
  // Update local state
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  list.setItems(reordered);

  // Persist to backend
  await fetch('/api/tasks/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromIndex, toIndex }),
  });
});
```

### Live Drag Feedback

Use `sort:move` to update a status panel in real time as the user drags:

```typescript
list.on('sort:move', ({ fromIndex, currentIndex }) => {
  const item = items[fromIndex];
  const delta = currentIndex - fromIndex;
  const arrow = delta > 0 ? '↓' : '↑';
  statusEl.textContent =
    `${item.name}: #${fromIndex + 1} → #${currentIndex + 1} (${arrow} ${Math.abs(delta)})`;
});

list.on('sort:end', ({ fromIndex, toIndex }) => {
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  list.setItems(reordered);
  statusEl.textContent = `Moved "${moved.name}" to #${toIndex + 1}`;
});
```

### Custom Shift Speed

Slow down the shift animation for a more deliberate feel:

```typescript
.use(withSortable({
  handle: '.grip',
  shiftDuration: 250,  // slower transitions
}))
```

Or disable animation entirely:

```typescript
.use(withSortable({
  shiftDuration: 0,  // instant shifts
}))
```

## Module Structure

```
src/features/sortable/
├── index.ts     # Module exports
└── feature.ts   # withSortable() feature
```

## Compatibility

| Feature | Compatible | Notes |
|---------|:----------:|-------|
| `withSelection()` | Yes | Space grabs items; use Enter for selection toggle |
| `withScrollbar()` | Yes | Custom scrollbar works during drag |
| `withAsync()` | Yes | Drag works on loaded items |
| `withScale()` | No | Conflicts — drag calculations require uncompressed scroll positions |
| `withSnapshots()` | Yes | Snapshots capture order after reorder |
| `withGroups()` | Yes | Drag within grouped lists |
| `withGrid()` | No | Conflicts — sortable is for flat lists |
| `withMasonry()` | No | Conflicts — sortable is for flat lists |
| `withTable()` | No | Conflicts — use table's built-in column sorting instead |

## See Also

- [Selection](./selection.md) — Combine with sortable for selectable, reorderable lists
- [Scrollbar](./scrollbar.md) — Custom scrollbar works during drag

## Examples

- [Sortable](/examples/sortable) — Task list with drag-and-drop reordering, handle toggle, and live status
