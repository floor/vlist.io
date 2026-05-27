---
test_file: test/plugins/masonry/plugin.test.ts
source_files:
  - src/plugins/masonry/plugin.ts
coverage:
  tests: 60
  passing: 60
status: passing
v1_delta: 1
tags: [plugin, masonry, integration]
---

# Masonry Plugin Tests

## What We Test

- Factory creation with default and custom config (columns, gap)
- Setup wiring into PluginContext (hooks, render replacement, scroll methods)
- Render function replacement and DOM output for masonry layout
- Variable-height items with auto-measurement
- Engine state access (layout, renderer internals)
- Resize handler recalculates layout
- Data change propagation
- scrollToIndex across columns and edge cases
- Destroy cleanup (renderer, layout, CSS class removal)
- Gap configuration (CSS custom property)
- Column count (explicit, minColumnWidth auto-calculation)
- Edge cases (empty data, single item, zero columns)
- Selection integration (selected/focused state in masonry items)
- Render consistency (idempotent re-renders)
- Plugin metadata (name, priority)

## Test Groups

- **masonry - Factory** (6 tests): plugin creation, name/priority, config acceptance
- **masonry - Setup** (7 tests): PluginContext hook registration, render replacement, CSS class, destroy handler, method registration
- **masonry - Render Functions** (11 tests): render output, DOM structure, item positioning, template invocation, re-render behavior
- **masonry - Variable Heights** (3 tests): items with different heights, measurement, layout recalc
- **masonry - Engine State** (4 tests): layout and renderer access, internal state inspection
- **masonry - Resize Handler** (3 tests): viewport resize triggers layout recalculation
- **masonry - Data Changes** (1 test): setData triggers re-layout
- **masonry - scrollToIndex** (7 tests): scroll to specific index across columns, boundary indices, out-of-range
- **masonry - Destroy** (2 tests): cleanup of renderer and layout, CSS class removal
- **masonry - Gap** (2 tests): gap config sets CSS custom property
- **masonry - Column Count** (3 tests): explicit columns, minColumnWidth, auto-detection
- **masonry - Edge Cases** (4 tests): empty data, single item, zero columns fallback
- **masonry - Selection Integration** (3 tests): selected/focused CSS classes on masonry items
- **masonry - Render Consistency** (2 tests): idempotent rendering, no stale elements
- **masonry - Plugin Metadata** (2 tests): name and priority values

## Known Gaps

- v1 had **withMasonry - Events** group (emitter integration tests) not yet ported to v2
- v1 had **withMasonry - Viewport State** group; v2 renames this to **Engine State** with similar coverage
