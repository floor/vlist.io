# Selection Module

> Single, multi, and keyboard-navigated item selection.

## Overview

Selection in vlist follows a **two-tier model**:

### Core baseline (built-in, no features needed)

Every vlist has basic keyboard interaction out of the box — no `withSelection()` required:

- **Arrow keys** move focus only (no selection change)
- **Space / Enter** toggles selection on the focused item
- **Click** selects and focuses the clicked item (single-select only)
- **No events** and no programmatic API
- **Focus ring hidden on mouse click** — only visible during keyboard navigation
- **Wrapping** configurable via `scroll.wrap` (default: false)

This is intended for read-only or display-only lists where basic keyboard scrolling and single item activation is sufficient.

### `withSelection()` (extended features)

The `withSelection()` feature adds configurable selection modes, a programmatic API, and events on top of the core baseline:

- **Programmatic API** — `select()`, `getSelected()`, etc.
- **`selection:change` event**
- **`mode: 'multiple'`** — Focus and selection are independent. Arrow keys move focus only. Space/Enter toggles selection on the focused item. Click toggles selection. **Shift+click** performs range selection.
- **Optional `followFocus: true`** — In single mode, arrow keys also select (WAI-ARIA selection-follows-focus pattern). Off by default.
- **Smart Edge-Scroll**: Only scrolls when the focused item leaves the viewport, aligning to the nearest edge
- **Compressed Mode Support**: Works correctly with `withScale()` for million-item lists
- **Configurable wrapping** via `scroll.wrap`

## Core vs withSelection

| Capability | Core (built-in) | `withSelection()` |
|---|---|---|
| Arrow keys | ✅ Focus + edge-scroll | ✅ Focus + edge-scroll |
| Home / End / PageUp / PageDown | ✅ | ✅ |
| Space / Enter | ✅ Toggle selection | ✅ Toggle selection |
| Click to select | ✅ | ✅ |
| Focus ring hidden on mouse | ✅ | ✅ |
| Wrapping | `scroll.wrap` | `scroll.wrap` |
| Selection follows focus | — | `followFocus: true` (single mode) |
| Multiple selection | — | `mode: 'multiple'` |
| Shift+click range | — | ✅ (multiple mode) |
| Programmatic API | — | `select()`, `getSelected()`, etc. |
| `selection:change` event | — | ✅ |

For most interactive lists, add `withSelection()`. The core baseline is intended for read-only or display-only lists where basic keyboard scrolling is sufficient.

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

// Move focus to next item and select it
list.selectNext();

// Move focus to previous item and select it
list.selectPrevious();
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

### Core baseline

The core baseline provides basic keyboard handling with no features required:

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move focus (no selection change) |
| `Home` / `End` | Move focus to first / last item |
| `Page Up` / `Page Down` | Move focus by one page |
| `Space` / `Enter` | Toggle selection on focused item |

Wrapping is controlled by `scroll.wrap` (default: false). When off, pressing `↑` on the first item does nothing.

### withSelection (single mode)

By default, arrow keys move focus only (same as core). With `followFocus: true`, arrow keys also select — this is the WAI-ARIA selection-follows-focus pattern, opt-in:

| Key | Action (default) | Action (`followFocus: true`) |
|-----|--------|--------|
| `↑` / `↓` | Move focus only | Move focus **and select** |
| `Home` / `End` | Move focus to first / last item | Move focus to first / last item and select |
| `Page Up` / `Page Down` | Move focus by one page | Move focus by one page and select |
| `Space` / `Enter` | Toggle selection on focused item | Toggle selection on focused item |

### withSelection (multiple mode)

Focus and selection are independent — navigate first, then toggle:

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move focus only |
| `Home` / `End` | Move focus to first / last item |
| `Page Up` / `Page Down` | Move focus by one page |
| `Space` / `Enter` | Toggle selection on focused item |

Page size is calculated as `floor(containerSize / itemHeight)`.

### Shared `scrollToFocus` Utility

Both the core baseline and `withSelection` use a shared `scrollToFocus()` function located in `src/rendering/scroll.ts`. This utility handles edge-aligned scrolling — the list only scrolls when the focused item is outside the viewport:

- **Scrolling down** — the focused item aligns to the bottom edge
- **Scrolling up** — the focused item aligns to the top edge
- **Already visible** — no scroll, focus ring moves in place
- **Padding-aware** — respects container padding so items are never hidden behind padded edges

This matches native OS list behavior and replaces the center-aligned scroll used by older implementations.

### Compressed Lists (withScale)

`scrollToFocus()` works correctly with `withScale()` for lists with millions of items, automatically switching between:

- **Normal mode** — pixel-perfect positioning via `sizeCache.getOffset()` and direct comparison with `scrollPosition`
- **Compressed mode** — visibility check via `visibleRange` + fractional index math (`exactTopIndex * compressedItemSize`) to position the focused item at the viewport edge

This dual-path approach is necessary because in compressed mode, size cache offsets (actual pixels) and scroll positions (virtual compressed space) are in completely different coordinate systems.

### Focus vs Selection

- **Focus**: Visual indicator of keyboard navigation position (single index)
- **Selection**: Set of selected item IDs (can be multiple)

In single mode, focus and selection are independent by default — navigate with arrow keys, then press Space/Enter to select. With `followFocus: true`, arrow keys also select (selection-follows-focus pattern). In multiple mode, focus and selection are always independent — navigate with arrow keys, then press Space to toggle.

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

### Shift+Click Range Selection

In `mode: 'multiple'`, Shift+click selects a contiguous range of items between the **anchor** (last selected item) and the clicked item, inclusive. All items in that range are added to the current selection.

- The anchor is updated on every non-shift click or programmatic select.
- Shift+click without a prior anchor falls back to selecting from the first item.
- Range selection is only available in multiple mode — it is a no-op in single mode and in the core baseline.

This is handled automatically by `withSelection`.

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

## See Also

- [Types — Selection](../api/types.md#selection-types) — `SelectionConfig`, `SelectionMode`, `SelectionState`
- [Events — `selection:change`](../api/events.md#selectionchange) — Selected IDs and item objects
- [Exports — Selection](../api/exports.md#selection) — Pure functions for custom selection UIs
- [Snapshots](./snapshots.md) — Selection state included in scroll snapshots automatically

## Examples

- [Contact List](/examples/contact-list) — A–Z grouped contacts with single selection
- [Data Table](/examples/data-table) — Row selection with sortable columns
- [File Browser](/examples/file-browser) — Multi-select in list and grid views
- [Scroll Restore](/examples/scroll-restore) — Selection persisted across navigations