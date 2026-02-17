# API Methods Reference

> Complete reference for all vlist instance methods.

## Overview

After building a vlist instance, you have access to various methods for manipulating data, scrolling, and more. Some methods are always available, while others are added by specific plugins.

```typescript
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
list.selectItem(5);
list.getSelectedIds();
```

---

## Core Methods

These methods are always available on every vlist instance.

### Data Manipulation

#### `setItems(items)`

Replace all items with a new array.

```typescript
list.setItems(items: T[]): void
```

**Example:**
```typescript
list.setItems([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
]);
```

**Effects:**
- Clears existing items
- Rebuilds internal index
- Re-renders list
- Emits `range:change` event

---

#### `appendItems(items)`

Add items to the end of the list.

```typescript
list.appendItems(items: T[]): void
```

**Example:**
```typescript
list.appendItems([
  { id: 4, name: 'David' },
  { id: 5, name: 'Eve' },
]);
```

**Effects:**
- Adds items to end
- Updates total count
- Re-renders if needed
- In reverse mode: auto-scrolls to bottom if user was at bottom

**Use case:** Loading more items, adding new content

---

#### `prependItems(items)`

Add items to the beginning of the list.

```typescript
list.prependItems(items: T[]): void
```

**Example:**
```typescript
list.prependItems([
  { id: 0, name: 'Zoe' },
]);
```

**Effects:**
- Adds items to start
- Adjusts scroll position to preserve view
- Updates indices
- Re-renders

**Use case:** Loading older messages in chat, prepending new data

---

#### `updateItem(id, updates)`

Update a single item by its ID.

```typescript
list.updateItem(id: string | number, updates: Partial<T>): boolean
```

**Parameters:**
- `id` - Item ID
- `updates` - Partial object with properties to update

**Returns:** `true` if item was found and updated, `false` otherwise

**Example:**
```typescript
list.updateItem(5, { name: 'Updated Name', status: 'active' });
```

**Effects:**
- Merges updates into existing item
- Re-renders the specific item
- Preserves other properties

---

#### `removeItem(id)`

Remove an item by its ID.

```typescript
list.removeItem(id: string | number): boolean
```

**Parameters:**
- `id` - Item ID to remove

**Returns:** `true` if item was found and removed, `false` otherwise

**Example:**
```typescript
list.removeItem(5);
```

**Effects:**
- Removes item from list
- Updates indices
- Adjusts scroll if needed
- Re-renders

---

### Navigation

#### `scrollToIndex(index, align?)`

Scroll to a specific item by index.

```typescript
list.scrollToIndex(index: number, align?: 'start' | 'center' | 'end'): void
```

**Parameters:**
- `index` - Item index (0-based)
- `align` - Alignment in viewport (default: `'start'`)
  - `'start'` - Item at top of viewport
  - `'center'` - Item centered in viewport
  - `'end'` - Item at bottom of viewport

**Example:**
```typescript
list.scrollToIndex(100);                    // Scroll to item 100 (top)
list.scrollToIndex(100, 'center');          // Scroll to item 100 (centered)
list.scrollToIndex(100, 'end');             // Scroll to item 100 (bottom)
```

**Instant scroll** - no animation by default.

---

#### `scrollToIndex(index, options)`

Scroll to an item with smooth animation.

```typescript
list.scrollToIndex(index: number, options: ScrollToOptions): void
```

**Options:**
```typescript
interface ScrollToOptions {
  align?: 'start' | 'center' | 'end';  // Default: 'start'
  behavior?: 'auto' | 'smooth';        // Default: 'auto'
  duration?: number;                   // Animation duration in ms (default: 300)
}
```

**Example:**
```typescript
list.scrollToIndex(100, {
  align: 'center',
  behavior: 'smooth',
  duration: 500,
});
```

**Smooth scrolling** uses custom easing (easeInOutQuad) for consistent behavior across browsers.

---

#### `scrollToItem(id, align?)`

Scroll to an item by its ID.

```typescript
list.scrollToItem(id: string | number, align?: 'start' | 'center' | 'end'): void
```

**Example:**
```typescript
list.scrollToItem('user-123');
list.scrollToItem('user-123', 'center');
```

**Note:** If item ID doesn't exist, nothing happens.

---

#### `scrollToItem(id, options)`

Scroll to an item with smooth animation.

```typescript
list.scrollToItem(id: string | number, options: ScrollToOptions): void
```

**Example:**
```typescript
list.scrollToItem('user-123', {
  align: 'center',
  behavior: 'smooth',
  duration: 500,
});
```

---

#### `getScrollPosition()`

Get the current scroll position in pixels.

```typescript
list.getScrollPosition(): number
```

**Example:**
```typescript
const scrollTop = list.getScrollPosition();
console.log('Scrolled to:', scrollTop, 'px');
```

**Returns:** Scroll position in pixels from top (or left for horizontal).

---

#### `getVisibleRange()`

Get the currently visible item range.

```typescript
list.getVisibleRange(): { start: number; end: number }
```

**Example:**
```typescript
const range = list.getVisibleRange();
console.log('Visible items:', range.start, 'to', range.end);
```

**Returns:** Inclusive range of visible item indices.

---

### Scroll Snapshots

#### `getScrollSnapshot()`

Capture current scroll position for later restoration.

```typescript
list.getScrollSnapshot(): ScrollSnapshot
```

**Returns:**
```typescript
interface ScrollSnapshot {
  index: number;          // First visible item index
  offsetInItem: number;   // Pixels scrolled into that item
}
```

**Example:**
```typescript
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('scroll', JSON.stringify(snapshot));
```

**Use case:** Save scroll position before navigation, restore on return.

---

#### `restoreScroll(snapshot)`

Restore scroll position from a snapshot.

```typescript
list.restoreScroll(snapshot: ScrollSnapshot): void
```

**Parameters:**
- `snapshot` - Snapshot from `getScrollSnapshot()`

**Example:**
```typescript
const saved = JSON.parse(sessionStorage.getItem('scroll'));
if (saved) {
  list.restoreScroll(saved);
}
```

**Use case:** SPA navigation, tab switching, session persistence.

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

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = list.on('scroll', ({ scrollTop, direction }) => {
  console.log('Scrolled to:', scrollTop, 'direction:', direction);
});

// Later: stop listening
unsubscribe();
```

**Available events:** See [Events Reference](./events.md)

---

#### `off(event, handler)`

Unsubscribe from an event.

```typescript
list.off<K extends keyof VListEvents>(
  event: K,
  handler: (payload: VListEvents[K]) => void
): void
```

**Example:**
```typescript
const handler = ({ scrollTop }) => console.log(scrollTop);

list.on('scroll', handler);
// ... later
list.off('scroll', handler);
```

**Note:** Handler must be the same function reference.

---

### Lifecycle

#### `destroy()`

Destroy the list instance and clean up all resources.

```typescript
list.destroy(): void
```

**Example:**
```typescript
list.destroy();
```

**Effects:**
- Removes all DOM elements
- Removes all event listeners
- Clears internal state
- Calls plugin cleanup handlers
- Instance is unusable after this

**Use case:** Component unmount, page navigation, replacing list.

---

### Properties

#### `element`

The root DOM element.

```typescript
list.element: HTMLElement
```

**Example:**
```typescript
const root = list.element;
console.log('Container:', root);
```

**Read-only** - do not modify directly.

---

#### `items`

Current items array.

```typescript
list.items: readonly T[]
```

**Example:**
```typescript
console.log('Total items:', list.items.length);
const firstItem = list.items[0];
```

**Read-only** - use `setItems()`, `appendItems()`, etc. to modify.

---

#### `total`

Total number of items.

```typescript
list.total: number
```

**Example:**
```typescript
console.log('List has', list.total, 'items');
```

**Read-only** - updated automatically when items change.

---

## Plugin Methods

These methods are added by specific plugins.

### Selection Methods (withSelection)

Available when using `withSelection()` plugin.

#### `selectItem(id)`

Select an item by ID.

```typescript
list.selectItem(id: string | number): void
```

**Example:**
```typescript
list.selectItem(5);
list.selectItem('user-123');
```

**Effects:**
- Adds item to selection
- In `'single'` mode: clears previous selection
- In `'multiple'` mode: adds to selection
- Updates visual state
- Emits `selection:change` event

---

#### `deselectItem(id)`

Deselect an item by ID.

```typescript
list.deselectItem(id: string | number): void
```

**Example:**
```typescript
list.deselectItem(5);
```

---

#### `toggleSelection(id)`

Toggle selection state of an item.

```typescript
list.toggleSelection(id: string | number): void
```

**Example:**
```typescript
list.toggleSelection(5);  // Selected → Deselected (or vice versa)
```

---

#### `selectAll()`

Select all items (multiple mode only).

```typescript
list.selectAll(): void
```

**Example:**
```typescript
list.selectAll();
```

**Note:** Only works in `mode: 'multiple'`. Does nothing in single mode.

---

#### `clearSelection()`

Clear all selections.

```typescript
list.clearSelection(): void
```

**Example:**
```typescript
list.clearSelection();
```

---

#### `getSelectedIds()`

Get array of selected item IDs.

```typescript
list.getSelectedIds(): Array<string | number>
```

**Example:**
```typescript
const selectedIds = list.getSelectedIds();
console.log('Selected:', selectedIds);  // [1, 5, 10]
```

---

#### `getSelectedItems()`

Get array of selected items (full objects).

```typescript
list.getSelectedItems(): T[]
```

**Example:**
```typescript
const selectedItems = list.getSelectedItems();
selectedItems.forEach(item => {
  console.log('Selected:', item.name);
});
```

---

#### `setSelectionMode(mode)`

Change selection mode dynamically.

```typescript
list.setSelectionMode(mode: 'none' | 'single' | 'multiple'): void
```

**Example:**
```typescript
list.setSelectionMode('multiple');  // Enable multi-select
list.setSelectionMode('none');      // Disable selection
```

**Effects:**
- Changes selection behavior
- In `'none'`: clears selection
- In `'single'`: keeps only first selected item

---

### Grid Methods (withGrid)

Available when using `withGrid()` plugin.

#### `updateGrid(config)`

Update grid configuration dynamically.

```typescript
list.updateGrid(config: Partial<GridConfig>): void
```

**Config:**
```typescript
interface GridConfig {
  columns?: number;
  gap?: number;
}
```

**Example:**
```typescript
list.updateGrid({ columns: 6 });
list.updateGrid({ gap: 20 });
list.updateGrid({ columns: 3, gap: 12 });
```

**Effects:**
- Recalculates layout
- Re-renders all items
- Preserves scroll position (relative)
- Recalculates heights if using aspect ratio

---

### Async Methods (withAsync)

Available when using `withAsync()` plugin.

#### `reload()`

Reload all data from the adapter.

```typescript
list.reload(): Promise<void>
```

**Example:**
```typescript
await list.reload();
console.log('Data reloaded!');
```

**Effects:**
- Clears all cached data
- Fetches initial page from adapter
- Shows loading placeholders
- Emits `load:start` and `load:end` events

**Use case:** Refresh button, pull-to-refresh, data invalidation.

---

## Method Cheatsheet

### Core (Always Available)

| Method | Description |
|--------|-------------|
| `setItems(items)` | Replace all items |
| `appendItems(items)` | Add to end |
| `prependItems(items)` | Add to start |
| `updateItem(id, updates)` | Update one item |
| `removeItem(id)` | Remove one item |
| `scrollToIndex(index, align?)` | Scroll to item by index |
| `scrollToItem(id, align?)` | Scroll to item by ID |
| `getScrollPosition()` | Get scroll position in pixels |
| `getVisibleRange()` | Get visible item range |
| `getScrollSnapshot()` | Save scroll position |
| `restoreScroll(snapshot)` | Restore scroll position |
| `on(event, handler)` | Subscribe to event |
| `off(event, handler)` | Unsubscribe from event |
| `destroy()` | Clean up and destroy |

### Plugin Methods

| Method | Plugin | Description |
|--------|--------|-------------|
| `selectItem(id)` | `withSelection()` | Select an item |
| `deselectItem(id)` | `withSelection()` | Deselect an item |
| `toggleSelection(id)` | `withSelection()` | Toggle selection |
| `selectAll()` | `withSelection()` | Select all items |
| `clearSelection()` | `withSelection()` | Clear selection |
| `getSelectedIds()` | `withSelection()` | Get selected IDs |
| `getSelectedItems()` | `withSelection()` | Get selected items |
| `setSelectionMode(mode)` | `withSelection()` | Change selection mode |
| `updateGrid(config)` | `withGrid()` | Update grid layout |
| `reload()` | `withAsync()` | Reload from adapter |

---

## Common Patterns

### Update and Scroll to Item

```typescript
list.updateItem(5, { status: 'updated' });
list.scrollToItem(5, 'center');
```

### Bulk Updates

```typescript
// Remove old items
oldIds.forEach(id => list.removeItem(id));

// Add new items
list.appendItems(newItems);

// Scroll to first new item
list.scrollToIndex(list.total - newItems.length);
```

### Save/Restore Scroll

```typescript
// Before navigation
const snapshot = list.getScrollSnapshot();
history.state.scroll = snapshot;

// After navigation back
if (history.state.scroll) {
  list.restoreScroll(history.state.scroll);
}
```

### Conditional Selection

```typescript
if (condition) {
  list.selectItem(itemId);
} else {
  list.deselectItem(itemId);
}

// Or use toggle
list.toggleSelection(itemId);
```

### Respond to Scroll

```typescript
list.on('scroll', ({ scrollTop }) => {
  // Update scroll indicator
  const percent = (scrollTop / maxScroll) * 100;
  indicator.style.width = `${percent}%`;
});
```

### Handle Item Updates

```typescript
list.on('item:click', ({ item, index }) => {
  // Update the clicked item
  list.updateItem(item.id, { clicked: true });
});
```

---

## TypeScript

All methods are fully typed:

```typescript
import { vlist, withSelection, type VList } from 'vlist';

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
    template: (user: User) => `<div>${user.name}</div>`,
  },
})
  .use(withSelection({ mode: 'single' }))
  .build();

// Fully typed!
list.updateItem(5, { name: 'New Name' });  // ✅ TypeScript knows properties
list.updateItem(5, { invalid: true });     // ❌ TypeScript error

const items: User[] = list.getSelectedItems();  // ✅ Typed as User[]
```

---

## See Also

- **[Events Reference](./events.md)** - All available events
- **[Types Reference](./types.md)** - TypeScript type definitions
- **[Plugins Overview](../plugins/README.md)** - Plugin-specific APIs
- **[Quick Start](../QUICKSTART.md)** - Common usage patterns

---

**Interactive Examples:** [vlist.dev/sandbox](https://vlist.dev/sandbox)