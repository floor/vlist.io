# Selection Module

> Single, multi, and keyboard-navigated item selection.

## Overview

The selection module provides item selection with keyboard navigation for vlist:

- **Single/Multiple Selection**: Configurable selection modes
- **Keyboard Navigation**: Focus management with arrow keys, Home/End, Page Up/Down
- **Range Selection**: Shift+click for selecting ranges
- **Programmatic Control**: Select, deselect, toggle, and query via the list instance

## Module Structure

```
src/features/selection/
├── index.ts   # Module exports
├── feature.ts  # withSelection() feature
└── state.ts   # Selection state management
```

## withSelection Configuration

The `withSelection` feature is the main API for adding selection to vlist:

```typescript
import { vlist, withSelection } from '@floor/vlist';

const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item, index, { selected, focused }) => `
      <div class="item ${selected ? 'selected' : ''} ${focused ? 'focused' : ''}">
        ${item.name}
      </div>
    `,
  },
  items: users,
})
  .use(withSelection({ mode: 'multiple', initial: ['user-1'] }))
  .build();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'none' \| 'single' \| 'multiple'` | `'single'` | Selection mode |
| `initial` | `Array<string \| number>` | `[]` | Initially selected item IDs |

### Selection Modes

| Mode | Description |
|------|-------------|
| `none` | Selection disabled |
| `single` | Only one item can be selected at a time |
| `multiple` | Multiple items can be selected |

## Instance Methods

When `withSelection` is active, the list instance exposes these methods:

```typescript
// Select items
list.select('user-2', 'user-3');

// Deselect items
list.deselect('user-1');

// Toggle an item
list.toggleSelect('user-4');

// Select all (multiple mode only)
list.selectAll();

// Clear selection
list.clearSelection();

// Get selected IDs
const ids = list.getSelected();
// ['user-2', 'user-3', 'user-4']

// Get selected item objects
const selectedUsers = list.getSelectedItems();
```

## Events

```typescript
list.on('selection:change', ({ selected, items }) => {
  console.log(`Selected: ${selected.join(', ')}`);
  updateUI(items);
});
```

The `selection:change` event fires on every selection change with:

| Field | Type | Description |
|-------|------|-------------|
| `selected` | `Array<string \| number>` | Currently selected IDs |
| `items` | `T[]` | Currently selected item objects |

## Template State

The template function receives selection state via its third argument:

```typescript
template: (item, index, { selected, focused }) => `
  <div class="item ${selected ? 'selected' : ''} ${focused ? 'focused' : ''}">
    ${item.name}
  </div>
`
```

| Property | Type | Description |
|----------|------|-------------|
| `selected` | `boolean` | Whether this item is currently selected |
| `focused` | `boolean` | Whether this item has keyboard focus |

## Keyboard Navigation

Built-in keyboard handling when `withSelection` is active:

| Key | Action |
|-----|--------|
| `↑` Arrow Up | Move focus up (wraps to bottom) |
| `↓` Arrow Down | Move focus down (wraps to top) |
| `Home` | Move focus to first item |
| `End` | Move focus to last item |
| `Page Up` | Move focus up by page size |
| `Page Down` | Move focus down by page size |
| `Space` / `Enter` | Toggle selection on focused item |

### Focus vs Selection

- **Focus**: Visual indicator of keyboard navigation position (single index)
- **Selection**: Set of selected item IDs (can be multiple)

Focus and selection are independent — you can navigate with arrow keys without changing the selection, then press Space to toggle the focused item.

## Usage Examples

### Single Selection

```typescript
import { vlist, withSelection } from '@floor/vlist';

const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item, index, { selected }) => `
      <div class="item ${selected ? 'selected' : ''}">${item.name}</div>
    `,
  },
  items: users,
})
  .use(withSelection({ mode: 'single' }))
  .build();

list.on('selection:change', ({ selected }) => {
  // In single mode, at most one item is selected
  console.log('Selected:', selected[0] ?? 'none');
});
```

### Multi-Select with Initial Selection

```typescript
import { vlist, withSelection } from '@floor/vlist';

const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item, index, { selected, focused }) => `
      <div class="item ${selected ? 'selected' : ''} ${focused ? 'focused' : ''}">
        <input type="checkbox" ${selected ? 'checked' : ''} tabindex="-1" />
        ${item.name}
      </div>
    `,
  },
  items: users,
})
  .use(withSelection({ mode: 'multiple', initial: ['user-1', 'user-3'] }))
  .build();
```

### Programmatic Selection

```typescript
// Select specific items
list.select('user-5', 'user-8');

// Get current selection
const ids = list.getSelected();
const items = list.getSelectedItems();

// Clear and reselect
list.clearSelection();
list.select('user-10');
```

### Range Selection

Shift+click selects all items between the last selected item and the clicked item (multiple mode only). This is handled automatically by `withSelection`.

## Internals

The following pure functions power the selection system. Most users never call these directly — they are used internally by `withSelection` and exposed for advanced use cases like custom feature authoring.

### SelectionState

```typescript
interface SelectionState {
  selected: Set<string | number>;  // Selected item IDs
  focusedIndex: number;            // Keyboard focus position (-1 if none)
}
```

### State Creation

#### createSelectionState

Creates initial selection state.

```typescript
function createSelectionState(
  initial?: Array<string | number>
): SelectionState;

// Usage
const state = createSelectionState();                    // Empty
const state = createSelectionState(['id1', 'id2']);     // With initial selection
```

### Selection Operations

All selection operations return a **new state object** (immutable):

#### selectItems

```typescript
function selectItems(
  state: SelectionState,
  ids: Array<string | number>,
  mode: SelectionMode
): SelectionState;

// Single mode: replaces selection
const newState = selectItems(state, ['id2'], 'single');
// newState.selected = Set(['id2'])

// Multiple mode: adds to selection
const newState = selectItems(state, ['id2', 'id3'], 'multiple');
// newState.selected = Set(['id1', 'id2', 'id3'])
```

#### deselectItems

```typescript
function deselectItems(
  state: SelectionState,
  ids: Array<string | number>
): SelectionState;
```

#### toggleSelection

```typescript
function toggleSelection(
  state: SelectionState,
  id: string | number,
  mode: SelectionMode
): SelectionState;
```

#### selectAll

```typescript
function selectAll<T extends VListItem>(
  state: SelectionState,
  items: T[],
  mode: SelectionMode
): SelectionState;
// Only works in 'multiple' mode
```

#### clearSelection

```typescript
function clearSelection(state: SelectionState): SelectionState;
```

### Focus Management

> **⚡ Performance note:** Focus movement functions (`moveFocusUp`, `moveFocusDown`, `moveFocusToFirst`, `moveFocusToLast`, `moveFocusByPage`) mutate `state.focusedIndex` **in-place** and return the same object. This avoids object allocations during keyboard navigation, which is a hot path (arrow keys can fire rapidly). Selection-changing operations (Space/Enter) still create new state objects.

#### setFocusedIndex

```typescript
function setFocusedIndex(
  state: SelectionState,
  index: number
): SelectionState;
```

#### moveFocusUp / moveFocusDown

```typescript
function moveFocusUp(
  state: SelectionState,
  totalItems: number,
  wrap?: boolean  // default: true
): SelectionState;

function moveFocusDown(
  state: SelectionState,
  totalItems: number,
  wrap?: boolean  // default: true
): SelectionState;

// With wrap=true (default): boundaries wrap around
// With wrap=false: boundaries clamp
```

#### moveFocusToFirst / moveFocusToLast

```typescript
function moveFocusToFirst(
  state: SelectionState,
  totalItems: number
): SelectionState;

function moveFocusToLast(
  state: SelectionState,
  totalItems: number
): SelectionState;
```

#### moveFocusByPage

```typescript
function moveFocusByPage(
  state: SelectionState,
  totalItems: number,
  pageSize: number,
  direction: 'up' | 'down'
): SelectionState;
```

### Keyboard Selection Helpers

#### selectFocused

Toggle selection on focused item (Space/Enter key).

```typescript
function selectFocused<T extends VListItem>(
  state: SelectionState,
  items: T[],
  mode: SelectionMode
): SelectionState;
```

#### selectRange

Handle shift+click range selection.

```typescript
function selectRange<T extends VListItem>(
  state: SelectionState,
  items: T[],
  fromIndex: number,
  toIndex: number,
  mode: SelectionMode
): SelectionState;
// Only works in 'multiple' mode
// Selects all items between fromIndex and toIndex (inclusive)
```

### Queries

```typescript
function isSelected(state: SelectionState, id: string | number): boolean;
function getSelectedIds(state: SelectionState): Array<string | number>;
function getSelectedItems<T extends VListItem>(state: SelectionState, items: T[]): T[];
function getSelectionCount(state: SelectionState): number;
function isSelectionEmpty(state: SelectionState): boolean;
```

### Implementation Notes

**Set-based storage** — Selection uses `Set` for O(1) lookup, add, and delete.

**Mode handling** — In `single` mode, `selectItems` clears before adding. In `none` mode, all selection operations are no-ops.

**Immutability exception** — Focus movement mutates `focusedIndex` in-place because the keyboard handler is the only caller on the hot path, and `focusedIndex` is a simple number with no deep state. Selection operations remain fully immutable.

### Complete Keyboard Handler Example

For custom feature authoring, here is how the pure functions compose into a keyboard handler:

```typescript
import {
  moveFocusUp,
  moveFocusDown,
  moveFocusToFirst,
  moveFocusToLast,
  toggleSelection
} from '@floor/vlist';

function handleKeyboard(event: KeyboardEvent, state: SelectionState, items: VListItem[]) {
  const totalItems = items.length;

  switch (event.key) {
    case 'ArrowUp':
      return moveFocusUp(state, totalItems);

    case 'ArrowDown':
      return moveFocusDown(state, totalItems);

    case 'Home':
      return moveFocusToFirst(state, totalItems);

    case 'End':
      return moveFocusToLast(state, totalItems);

    case ' ':
    case 'Enter':
      if (state.focusedIndex >= 0) {
        const item = items[state.focusedIndex];
        return toggleSelection(state, item.id, 'multiple');
      }
      return state;

    default:
      return state;
  }
}
```

## Related Modules

- [Types](../api/types.md) — SelectionMode, SelectionState types
- [Context](../internals/context.md) — BuilderContext wires click and keyboard handlers
- [Reference](../api/reference.md) — Public selection API methods

## Live Examples

- [Controls](/examples/controls) — Full API exploration with selection, navigation, and scroll events (4 frameworks)

---

*The selection module provides single, multi, and keyboard-navigated item selection via `withSelection()`.*