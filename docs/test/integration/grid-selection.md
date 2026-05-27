---
test_file: test/integration/grid-selection.test.ts
source_files:
  - src/plugins/grid/plugin.ts
  - src/plugins/selection/plugin.ts
  - src/core/create.ts
coverage:
  tests: 12
  passing: 12
status: passing
v1_delta: null
tags: [integration, grid, selection]
---

# Grid + Selection Integration

## What We Test
- Grid layout combined with selection plugin
- Programmatic select, deselect, toggleSelect, selectAll, clearSelection in grid mode
- selection:change event emission in grid
- Single selection mode enforcement in grid
- Grid layout correctness with rendered items and gap support
- Keyboard navigation (selectNext, selectPrevious) in grid mode

## Test Groups
- **grid with selection** (8 tests): create with both plugins, select, deselect, toggleSelect, selectAll, clearSelection, selection:change event, single mode
- **grid layout correctness** (2 tests): rendered items with grid positioning, grid with gap
- **keyboard navigation in grid** (2 tests): selectNext, selectPrevious

## Known Gaps
- No test for multi-column keyboard navigation (ArrowLeft/ArrowRight across columns)
- No test for selection visual state (CSS class) on grid items
