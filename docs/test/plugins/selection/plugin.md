---
test_file: test/plugins/selection/plugin.test.ts
source_files:
  - src/plugins/selection/plugin.ts
coverage:
  tests: 88
  passing: 88
status: passing
v1_delta: -18
tags: [plugin, selection, click, keyboard, aria, events]
---

# Selection Plugin Tests

## What We Test

- Factory creation with modes (single, multiple, none), initial selection, followFocus, focusOnClick
- Setup wiring (click/keydown handler registration, selectable CSS class, destroy handler)
- Method registration (11 methods in single mode, 9 in none mode)
- Methods behavior (select, deselect, toggle, selectAll, clear, getSelected, getSelectedItems, selectNext, selectPrevious with boundary checking)
- Click handler (toggle on click, data-index attribute, single vs multiple mode, shift+click range selection)
- Keyboard handler (ArrowDown/Up, Home/End, PageDown/Up, Space, Enter, Ctrl+A, Delete/Backspace)
- Shift+keyboard range selection (shift+arrow, shift+home/end, shift+pagedown/pageup)
- followFocus auto-select on focus change
- Emitter events (selection:change, focus:change)

## Test Groups

- **selection - Factory** (8 tests): plugin creation, modes, initial selection, followFocus, focusOnClick config
- **selection - Setup** (7 tests): click/keydown handler registration, selectable CSS class, destroy handler, hook registration
- **selection - Method Registration** (11 tests): method presence in single mode (11 methods) and none mode (9 methods)
- **selection - Methods Behavior** (15 tests): select, deselect, toggle, selectAll, clear, getSelected, getSelectedItems, selectNext, selectPrevious, boundary checking
- **selection - Click Handler** (9 tests): toggle on click, data-index, single vs multiple mode, shift+click range, no-op outside items
- **selection - Keyboard Handler** (16 tests): ArrowDown/Up, Home/End, PageDown/Up, Space, Enter, Ctrl+A, Delete/Backspace navigation and selection
- **selection - Shift+keyboard range selection** (16 tests): shift+arrow extends range, shift+home/end, shift+pagedown/pageup, range direction
- **selection - followFocus** (2 tests): auto-select on focus change, disabled followFocus
- **selection - Emitter Events** (4 tests): selection:change and focus:change event emission

## Known Gaps

- v1 had **ARIA** group (aria-selected, aria-activedescendant) not yet ported as a separate group in v2
- v1 had **None Mode** group with explicit none-mode edge cases
- v1 had **ID resolution** and **sparse ID indexing** groups for non-sequential item IDs
- v1 had **focusin handler** and **focusout handler** groups for DOM focus events
- v1 had **keyboard edge cases** group
- v1 had **ARIA in grid context** group for grid+selection cross-feature ARIA
- v1 had **keyboard scroll** and **PageUp/PageDown** as separate detailed groups
- v1 had **table updateItemClasses delegation** group for table+selection cross-feature
- v1 had **group header skipping** group for groups+selection cross-feature
- v2 restructures many of these into consolidated groups (Keyboard Handler, Methods Behavior) but some v1 cross-feature integration tests are not yet ported
