---
test_file: test/plugins/selection/index.test.ts
source_files:
  - src/plugins/selection/index.ts
coverage:
  tests: 67
  passing: 67
status: passing
v1_delta: 0
tags: [plugin, selection, state, pure-functions]
---

# Selection State Functions Tests

## What We Test

- createSelectionState factory (initial state, initial selection, initial focus)
- selectItems (single, multiple, additive, duplicate handling, mode enforcement)
- deselectItems (single, multiple, non-existent)
- toggleSelection (select/deselect toggle, single mode replacement)
- selectAll (all items, already selected, mode check)
- clearSelection (clears all, preserves focus)
- setFocusedIndex (set, clear with null)
- moveFocusUp (basic, boundary, wrap)
- moveFocusDown (basic, boundary, wrap)
- moveFocusToFirst and moveFocusToLast
- moveFocusByPage (page size, boundary clamping)
- isSelected query
- getSelectedIds (returns selected set)
- getSelectedItems (maps IDs to items, handles missing)
- getSelectionCount and isSelectionEmpty
- selectFocused (selects focused item, no-op without focus, mode handling)
- selectRange (range selection, direction, boundary)
- claimPlaceholderSelection (placeholder claim, conflict resolution)

## Test Groups

- **createSelectionState** (3 tests): factory defaults, initial selection, initial focus
- **selectItems** (6 tests): single select, multi-select, additive, duplicates, mode enforcement
- **deselectItems** (3 tests): single deselect, multi-deselect, non-existent items
- **toggleSelection** (5 tests): toggle on/off, single mode replacement, multiple items
- **selectAll** (4 tests): select all items, already-selected idempotency, mode restrictions
- **clearSelection** (2 tests): clear all selections, preserves focus index
- **setFocusedIndex** (2 tests): set focus, clear focus with null
- **moveFocusUp** (4 tests): basic movement, top boundary, wrap around, no items
- **moveFocusDown** (4 tests): basic movement, bottom boundary, wrap around, no items
- **moveFocusToFirst** (2 tests): move to index 0, already at first
- **moveFocusToLast** (2 tests): move to last index, already at last
- **moveFocusByPage** (4 tests): page-size jump, boundary clamping, direction
- **isSelected** (2 tests): selected returns true, unselected returns false
- **getSelectedIds** (2 tests): returns selected ID set, empty set
- **getSelectedItems** (4 tests): maps IDs to items, handles missing items, empty selection
- **getSelectionCount** (2 tests): count of selected items, zero count
- **isSelectionEmpty** (2 tests): empty returns true, non-empty returns false
- **selectFocused** (4 tests): selects focused item, no-op without focus, single mode, multiple mode
- **selectRange** (4 tests): range selection, forward/backward direction, boundary clamping
- **claimPlaceholderSelection** (6 tests): placeholder claim, conflict resolution, multiple claims

## Known Gaps

- None; v1 and v2 have identical test counts and groups
