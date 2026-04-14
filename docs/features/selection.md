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
- **`mode: 'multiple'`** — Focus and selection are independent. Arrow keys move focus only. Space/Enter toggles selection on the focused item. Click toggles selection. **Shift+click** and **Shift+Arrow/Page/Home/End** perform range selection from an anchor point.
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

| Key | Flat List | Grid | Masonry |
|-----|-----------|------|---------|
| `↑` / `↓` | Move focus ±1 | Move focus by ±columns (row) | Move to prev/next item in same lane |
| `←` / `→` | — (disabled) | Move focus ±1 (cell) | Move to nearest item in adjacent lane |
| `Home` / `End` | First / last item | First / last cell in current row | First / last item |
| `Ctrl+Home` / `Ctrl+End` | — | First / last item overall | — |
| `Page Up` / `Page Down` | Move by visible items | Move by visible rows (same column) | Move by visible items in same lane |
| `Space` / `Enter` | Toggle selection | Toggle selection | Toggle selection |

> In horizontal orientation, Up/Down and Left/Right axes are swapped for both grid and masonry.

Wrapping is controlled by `scroll.wrap` (default: false). When off, pressing `↑` on the first item does nothing.

### withSelection (single mode)

By default, arrow keys move focus only (same as core). With `followFocus: true`, arrow keys also select — this is the WAI-ARIA selection-follows-focus pattern, opt-in:

| Key | Action (default) | Action (`followFocus: true`) |
|-----|--------|--------|
| `↑` / `↓` | Move focus only | Move focus **and select** |
| `Home` / `End` | Move focus to first / last item | Move focus to first / last item and select |
| `Page Up` / `Page Down` | Move focus by one page | Move focus by one page and select |
| `Space` / `Enter` | Toggle selection on focused item | Toggle selection on focused item |

When combined with `withGrid` or `withMasonry`, `withSelection` inherits the same 2D navigation as the core baseline (see table above). Arrow key deltas are resolved from the layout feature's `_getNavDelta` or `_navigate` method.

### withSelection (multiple mode)

Focus and selection are independent — navigate first, then toggle with Space/Enter, or hold Shift while navigating to select a contiguous range:

| Key | Flat List | Grid | Masonry |
|-----|-----------|------|---------|
| `↑` / `↓` | Move focus ±1 | Move focus by ±columns (row) | Move to prev/next item in same lane |
| `←` / `→` | — (disabled) | Move focus ±1 (cell) | Move to nearest item in adjacent lane |
| `Home` / `End` | First / last item | First / last cell in current row | First / last item |
| `Ctrl+Home` / `Ctrl+End` | — | First / last item overall | — |
| `Page Up` / `Page Down` | Move by visible items | Move by visible rows (same column) | Move by visible items in same lane |
| `Space` / `Enter` | Toggle selection | Toggle selection | Toggle selection |
| `Shift+↑` / `Shift+↓` | Extend range ±1 from anchor | Extend range by ±columns from anchor | Extend range in same lane from anchor |
| `Shift+←` / `Shift+→` | — (disabled) | Extend range ±1 (cell) from anchor | Extend range to adjacent lane from anchor |
| `Shift+Home` / `Shift+End` | Select from anchor to first / last | Select from anchor to first / last | Select from anchor to first / last |
| `Shift+Page Up` / `Shift+Page Down` | Extend range by one page from anchor | Extend range by visible rows from anchor | Extend range by visible items from anchor |

> In horizontal orientation, Up/Down and Left/Right axes are swapped for both grid and masonry.

Page size is calculated as `floor(containerSize / itemHeight)`.

**Shift+nav anchor behavior:** The anchor is the starting point for range selection. It is set automatically whenever you navigate without Shift, toggle with Space/Enter, or click without Shift. When you hold Shift and press a navigation key, the selection is replaced with the contiguous range from the anchor to the new focus position. Continuing to Shift+navigate extends or shrinks the range while keeping the same anchor. Releasing Shift and navigating resets the anchor to the new position.

### Shared `scrollToFocus` Utility

Both the core baseline and `withSelection` use a shared `scrollToFocus()` function located in `src/rendering/scroll.ts`. This utility handles edge-aligned scrolling — the list only scrolls when the focused item is outside the viewport:

- **Scrolling down** — the focused item aligns to the bottom edge
- **Scrolling up** — the focused item aligns to the top edge
- **Already visible** — no scroll, focus ring moves in place
- **Padding-aware** — respects container padding so items are never hidden behind padded edges

This matches native OS list behavior and replaces the center-aligned scroll used by older implementations.

**Grid and masonry support:** In grid mode, the flat item index is converted to a row index via the `i2s` (item-to-scroll-index) mapping before offset lookup. In masonry mode, `scrollToFocus` delegates to a placement-based `_scrollItemIntoView` method that uses pre-calculated x/y coordinates instead of the size cache.

### Compressed Lists (withScale)

`scrollToFocus()` works correctly with `withScale()` for lists with millions of items, automatically switching between:

- **Normal mode** — pixel-perfect positioning via `sizeCache.getOffset()` and direct comparison with `scrollPosition`
- **Compressed mode** — visibility check via `visibleRange` + fractional index math (`exactTopIndex * compressedItemSize`) to position the focused item at the viewport edge

This dual-path approach is necessary because in compressed mode, size cache offsets (actual pixels) and scroll positions (virtual compressed space) are in completely different coordinate systems.

### Focus vs Selection

- **Focus**: Visual indicator of keyboard navigation position (single index)
- **Selection**: Set of selected item IDs (can be multiple)

In single mode, focus and selection are independent by default — navigate with arrow keys, then press Space/Enter to select. With `followFocus: true`, arrow keys also select (selection-follows-focus pattern). In multiple mode, focus and selection are independent — navigate with arrow keys, then press Space to toggle individual items, or hold Shift while navigating to select a contiguous range.

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

### Range Selection (Shift+Click and Shift+Keyboard)

In `mode: 'multiple'`, holding Shift while clicking or pressing navigation keys selects a contiguous range of items between the **anchor** and the target, inclusive.

**Shift+Click** selects the range from the anchor to the clicked item. **Shift+Arrow/Page/Home/End** extends (or shrinks) the range from the anchor to the new focus position, replacing the current selection with exactly that range.

Anchor behavior:

- The anchor is set on every non-shift click, non-shift navigation, or Space/Enter toggle.
- Shift+click or Shift+nav without a prior anchor falls back to the current focus position.
- Continuing to Shift+navigate keeps the same anchor — the range grows or shrinks as you move.
- Releasing Shift and navigating (or toggling with Space) resets the anchor.
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

Both functions accept an optional `delta` parameter (default: `1`). In grid mode, `delta` is set to the column count so focus moves by an entire row. This parameter was added in v1.4.4.

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

Handle shift+click and shift+keyboard range selection.

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
// Used by both shift+click and shift+keyboard navigation
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

For custom feature authoring, here is how the pure functions compose into a keyboard handler (including shift+nav range selection):

```typescript
import {
  moveFocusUp,
  moveFocusDown,
  moveFocusToFirst,
  moveFocusToLast,
  clearSelection,
  selectRange,
  toggleSelection
} from '@floor/vlist';

let shiftAnchor = -1;

function handleKeyboard(event: KeyboardEvent, state: SelectionState, items: VListItem[]) {
  const totalItems = items.length;
  const previousIndex = state.focusedIndex;
  let newState = state;
  let focusOnly = false;

  switch (event.key) {
    case 'ArrowUp':
      newState = moveFocusUp(state, totalItems);
      focusOnly = true;
      break;

    case 'ArrowDown':
      newState = moveFocusDown(state, totalItems);
      focusOnly = true;
      break;

    case 'Home':
      newState = moveFocusToFirst(state, totalItems);
      focusOnly = true;
      break;

    case 'End':
      newState = moveFocusToLast(state, totalItems);
      focusOnly = true;
      break;

    case ' ':
    case 'Enter':
      if (state.focusedIndex >= 0) {
        const item = items[state.focusedIndex];
        newState = toggleSelection(state, item.id, 'multiple');
      }
      shiftAnchor = state.focusedIndex;
      return newState;

    default:
      return state;
  }

  // Shift+nav: select range from anchor to new focus
  if (event.shiftKey && focusOnly && newState.focusedIndex >= 0) {
    if (shiftAnchor < 0) shiftAnchor = previousIndex >= 0 ? previousIndex : 0;
    newState = clearSelection(newState);
    newState = selectRange(newState, items, shiftAnchor, newState.focusedIndex, 'multiple');
  } else if (focusOnly) {
    // Non-shift navigation resets the anchor
    shiftAnchor = newState.focusedIndex;
  }

  return newState;
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