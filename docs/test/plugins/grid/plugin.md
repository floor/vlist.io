---
test_file: test/plugins/grid/plugin.test.ts
source_files:
  - src/plugins/grid/plugin.ts
coverage:
  tests: 67
  passing: 67
status: passing
v1_delta: +15
tags: [plugin, grid, integration, layout]
---

# Grid Plugin Tests

## What We Test

- Factory creation with columns config (name, priority, validation)
- Column count validation (missing, zero, negative columns throw)
- Gap configuration acceptance
- Setup wiring into PluginContext (CSS class, setRenderFn, resize hook, method registration, setSizeConfig, setVirtualTotal, destroy handler)
- Configuration (columns, gap, rowHeight, responsive breakpoints)
- updateGrid method (column/gap changes, render trigger)
- Render function replacement (DOM output, item positioning, template invocation, ARIA attributes, selection/focus state, re-render behavior, grid item classes)
- Resize hook (viewport resize triggers column recalculation)
- Engine state access (layout, renderer, grid config internals)
- Edge cases (single column, horizontal mode, empty data, large column counts)
- scrollToIndex (row-based scrolling, boundary indices, out-of-range)
- Destroy cleanup (renderer, layout, CSS class removal)
- Layout math (row/col calculations via plugin layer)

## Test Groups

- **grid - Factory** (6 tests): plugin creation, name/priority, column validation (missing/zero/negative), config acceptance
- **grid - Setup** (14 tests): CSS class, setRenderFn, resize hook, method registration (updateGrid, getGridLayout), setSizeConfig, setVirtualTotal, destroy handler, onResize hook
- **grid - Configuration** (5 tests): columns, gap, rowHeight, responsive config
- **grid - updateGrid** (14 tests): column/gap changes, re-render trigger, layout recalculation
- **grid - Render Functions** (19 tests): DOM output, item positioning, sizing, ARIA, selection/focus, templates, re-render, pooling, grid item CSS classes
- **grid - Resize Hook** (6 tests): viewport resize triggers recalc, debounce, responsive breakpoints
- **grid - Engine State** (6 tests): layout/renderer access, config inspection
- **grid - Edge Cases** (11 tests): single column, horizontal mode, empty data, large columns
- **grid - scrollToIndex** (10 tests): row-based scroll, boundary, out-of-range
- **grid - Destroy** (4 tests): renderer/layout cleanup, CSS class removal
- **grid - Layout Math** (2 tests): row/col math through plugin layer

## Known Gaps

- v1 had 52 tests; v2 has 67 tests (+15). The v2 adds expanded setup wiring tests, resize hook coverage, and edge case tests that did not exist in v1.
- No missing coverage relative to v1.
