# API Methods Reference

> Complete reference for all vlist instance methods.

## Overview

After calling `.build()`, you have a `VList<T>` instance with methods for data, navigation, events, and lifecycle management. Plugin methods are added when you include those plugins.

```typescript
import { vlist, withSelection } from '@floor/vlist';

const list = vlist({
  container: '#app',
  items: users,
  item: { height: 48, template: renderUser },
})
  .use(withSelection({ mode: 'single' }))
  .build();

// Core methods (always available)
list.setItems(newUsers);
list.scrollToIndex(50);
list.on('scroll', handler);
list.destroy();

// Plugin methods (from withSelection)
list.select(5);
list.getSelected();
```

---

## Core Methods

These methods are always available on every vlist instance.

### Data

#### `setItems(items)`

Replace all items with a new array.

```typescript
list.setItems(items: T[]): void
```

```typescript
list.setItems([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]);
```

Re-renders the list from scratch. Clears the internal index and emits `range:change`.

---

#### `appendItems(items)`

Add items to the end of the list.

```typescript
list.appendItems(items: T[]): void
```

```typescript
list.appendItems([{ id: 4, name: 'David' }]);
```

In reverse mode: auto-scrolls to bottom if the user was already at the bottom.

---

#### `prependItems(items)`

Add items to the beginning of the list.

```typescript
list.prependItems(items: T[]): void
```

```typescript
list.prependItems([{ id: 0, name: 'Zoe' }]);
```

Adjusts scroll position to preserve the currently visible content. Use this to load history in a chat UI.

---

#### `updateItem(id, updates)`

Merge an update into a single item by its ID.

```typescript
list.updateItem(id: string | number, updates: Partial<T>): void
```

```typescript
list.updateItem(5, { name: 'Updated Name', status: 'active' });
```

Re-renders only the affected item. Preserves all other properties.

---

#### `removeItem(id)`

Remove an item by its ID.

```typescript
list.removeItem(id: string | number): void
```

```typescript
list.removeItem(5);
```

Updates indices, adjusts scroll if needed, and re-renders.

---

### Navigation

#### `scrollToIndex(index, align?)`

Scroll to a specific item by index (instant).

```typescript
list.scrollToIndex(index: number, align?: 'start' | 'center' | 'end'): void
```

```typescript
list.scrollToIndex(100);              // top of viewport
list.scrollToIndex(100, 'center');    // centered in viewport
list.scrollToIndex(100, 'end');       // bottom of viewport
```

---

#### `scrollToIndex(index, options)`

Scroll to an item with smooth animation.

```typescript
list.scrollToIndex(index: number, options: ScrollToOptions): void

interface ScrollToOptions {
  align?: 'start' | 'center' | 'end';  // Default: 'start'
  behavior?: 'auto' | 'smooth';        // Default: 'auto'
  duration?: number;                   // ms, default: 300 (smooth only)
}
```

```typescript
list.scrollToIndex(100, { align: 'center', behavior: 'smooth', duration: 500 });
```

Smooth scrolling uses `easeInOutQuad` easing for consistent cross-browser behaviour.

---

#### `scrollToItem(id, align?)`

Scroll to an item by its ID.

```typescript
list.scrollToItem(id: string | number, align?: 'start' | 'center' | 'end'): void
```

```typescript
list.scrollToItem('user-123');
list.scrollToItem('user-123', 'center');
```

No-op if the ID does not exist.

---

#### `scrollToItem(id, options)`

Scroll to an item with smooth animation.

```typescript
list.scrollToItem(id: string | number, options: ScrollToOptions): void
```

```typescript
list.scrollToItem('user-123', { align: 'center', behavior: 'smooth' });
```

---

#### `getScrollPosition()`

Get the current scroll position in pixels.

```typescript
list.getScrollPosition(): number
```

Returns pixels from the top (or left for horizontal direction).

---

### Snapshots

#### `getScrollSnapshot()`

Capture scroll position as a serialisable snapshot.

```typescript
list.getScrollSnapshot(): ScrollSnapshot

interface ScrollSnapshot {
  index: number;        // First visible item index
  offsetInItem: number; // Pixels scrolled into that item
}
```

```typescript
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('scroll', JSON.stringify(snapshot));
```

---

#### `restoreScroll(snapshot)`

Restore scroll position from a snapshot.

```typescript
list.restoreScroll(snapshot: ScrollSnapshot): void
```

```typescript
const saved = JSON.parse(sessionStorage.getItem('scroll') ?? 'null');
if (saved) list.restoreScroll(saved);
```

---

### Events

#### `on(event, handler)`

Subscribe to an event.

```typescript
list.on<K extends keyof VListEvents>(
  event: K,
  handler: (payload: VListEvents[K]) => void
): Unsubscribe
```

Returns an unsubscribe function.

```typescript
const off = list.on('scroll', ({ scrollTop, direction }) => {
  console.log('Scrolled to:', scrollTop);
});

// Later — stop listening
off();
```

**Available events:**

| Event | Payload |
|---|---|
| `scroll` | `{ scrollTop, direction }` |
| `item:click` | `{ item, index, event }` |
| `range:change` | `{ range: { start, end } }` |
| `selection:change` | `{ selectedIds, selectedItems }` |
| `load:start` | `{ offset, limit }` |
| `load:end` | `{ items, total }` |
| `load:error` | `{ error }` |
| `resize` | `{ height, width }` |

---

#### `off(event, handler)`

Unsubscribe from an event by handler reference.

```typescript
list.off<K extends keyof VListEvents>(
  event: K,
  handler: (payload: VListEvents[K]) => void
): void
```

```typescript
const handler = ({ scrollTop }: { scrollTop: number }) => console.log(scrollTop);
list.on('scroll', handler);
list.off('scroll', handler);
```

---

### Lifecycle

#### `destroy()`

Destroy the list instance and clean up all resources.

```typescript
list.destroy(): void
```

Removes all DOM elements, event listeners, and internal state. Calls plugin cleanup handlers. The instance is unusable after this — create a new one if needed.

---

### Properties

#### `element`

The root DOM element (read-only).

```typescript
list.element: HTMLElement
```

---

#### `items`

Current items array (read-only).

```typescript
list.items: readonly T[]
```

---

#### `total`

Total number of items (read-only).

```typescript
list.total: number
```

---

## Plugin Methods

### Selection — `withSelection()`

Available when using the `withSelection()` plugin.

#### `select(...ids)`

Select one or more items by ID.

```typescript
list.select(...ids: Array<string | number>): void
```

```typescript
list.select(5);
list.select(1, 2, 3);   // select multiple at once
```

In `'single'` mode: clears previous selection first. Emits `selection:change`.

---

#### `deselect(...ids)`

Deselect one or more items by ID.

```typescript
list.deselect(...ids: Array<string | number>): void
```

```typescript
list.deselect(5);
list.deselect(1, 2);
```

---

#### `toggleSelect(id)`

Toggle selection state of a single item.

```typescript
list.toggleSelect(id: string | number): void
```

```typescript
list.toggleSelect(5);  // selected → deselected, or vice versa
```

---

#### `selectAll()`

Select all items (multiple mode only).

```typescript
list.selectAll(): void
```

No-op in `'single'` mode.

---

#### `clearSelection()`

Clear all selections.

```typescript
list.clearSelection(): void
```

---

#### `getSelected()`

Get an array of selected item IDs.

```typescript
list.getSelected(): Array<string | number>
```

```typescript
const ids = list.getSelected(); // [1, 5, 10]
```

---

#### `getSelectedItems()`

Get an array of selected items (full objects).

```typescript
list.getSelectedItems(): T[]
```

```typescript
const selectedUsers = list.getSelectedItems();
selectedUsers.forEach(u => console.log(u.name));
```

---

#### `update({ selectionMode })`

Change selection mode at runtime.

```typescript
list.update({ selectionMode: 'none' | 'single' | 'multiple' }): void
```

```typescript
list.update({ selectionMode: 'multiple' });
list.update({ selectionMode: 'none' });    // disables selection, clears state
```

In `'none'`: clears all selections. In `'single'`: keeps only the first selected item.

---

### Grid — `withGrid()`

Available when using the `withGrid()` plugin.

#### `update({ grid })`

Update grid configuration at runtime.

```typescript
list.update({ grid: Partial<GridConfig> }): void

interface GridConfig {
  columns?: number;
  gap?: number;
}
```

```typescript
list.update({ grid: { columns: 6 } });
list.update({ grid: { columns: 3, gap: 12 } });
```

Recalculates layout and re-renders. Preserves relative scroll position.

---

### Async — `withAsync()`

Available when using the `withAsync()` plugin.

#### `reload()`

Reload all data from the adapter.

```typescript
list.reload(): Promise<void>
```

```typescript
await list.reload();
```

Clears cached data, shows placeholders, and re-fetches from the adapter. Emits `load:start` and `load:end`.

---

## Method Cheatsheet

### Core (always available)

| Method | Description |
|---|---|
| `setItems(items)` | Replace all items |
| `appendItems(items)` | Add to end |
| `prependItems(items)` | Add to start |
| `updateItem(id, updates)` | Merge update by ID |
| `removeItem(id)` | Remove by ID |
| `scrollToIndex(index, align?)` | Scroll to index |
| `scrollToItem(id, align?)` | Scroll to item by ID |
| `getScrollPosition()` | Current scroll position in px |
| `getScrollSnapshot()` | Save scroll position |
| `restoreScroll(snapshot)` | Restore scroll position |
| `on(event, handler)` | Subscribe to event |
| `off(event, handler)` | Unsubscribe from event |
| `destroy()` | Clean up and destroy |

### Plugin methods

| Method | Plugin | Description |
|---|---|---|
| `select(...ids)` | `withSelection()` | Select by ID |
| `deselect(...ids)` | `withSelection()` | Deselect by ID |
| `toggleSelect(id)` | `withSelection()` | Toggle by ID |
| `selectAll()` | `withSelection()` | Select all items |
| `clearSelection()` | `withSelection()` | Clear selection |
| `getSelected()` | `withSelection()` | Get selected IDs |
| `getSelectedItems()` | `withSelection()` | Get selected items |
| `update({ selectionMode })` | `withSelection()` | Change selection mode |
| `update({ grid })` | `withGrid()` | Update grid layout |
| `reload()` | `withAsync()` | Reload from adapter |

---

## Common Patterns

### Update and scroll to item

```typescript
list.updateItem(5, { status: 'updated' });
list.scrollToItem(5, 'center');
```

### Save and restore scroll (SPA navigation)

```typescript
// Before navigating away
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('scroll', JSON.stringify(snapshot));
list.destroy();

// After navigating back
const list = vlist({ /* same config */ }).build();
const raw = sessionStorage.getItem('scroll');
if (raw) list.restoreScroll(JSON.parse(raw));
```

### Respond to scroll position

```typescript
list.on('scroll', ({ scrollTop }) => {
  const percent = (scrollTop / maxScroll) * 100;
  progressBar.style.width = `${percent}%`;
});
```

### Conditional select on click

```typescript
list.on('item:click', ({ item }) => {
  list.toggleSelect(item.id);
});
```

---

## TypeScript

All methods are fully typed via the `T` generic:

```typescript
import { vlist, withSelection, type VList } from '@floor/vlist';

interface User {
  id: number;
  name: string;
  email: string;
}

const list: VList<User> = vlist<User>({
  container: '#app',
  items: users,
  item: {
    height: 64,
    template: (user) => `<div>${user.name}</div>`,
  },
})
  .use(withSelection({ mode: 'single' }))
  .build();

list.updateItem(5, { name: 'New Name' });   // ✅ type-checked
list.updateItem(5, { invalid: true });       // ❌ TypeScript error

const items: User[] = list.getSelectedItems(); // ✅ typed as User[]
```

---

## See Also

- **[API Reference](./reference.md)** — Full config types, events, and plugin interfaces
- **[Plugins Overview](../plugins/README.md)** — Plugin-specific APIs
- **[Quick Start](../QUICKSTART.md)** — Common usage patterns

---

**Interactive Examples:** [vlist.dev/sandbox](https://vlist.dev/sandbox)