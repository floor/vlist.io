---
test_file: test/integration/scale-selection.test.ts
source_files:
  - src/plugins/scale/plugin.ts
  - src/plugins/selection/plugin.ts
  - src/core/create.ts
coverage:
  tests: 7
  passing: 7
status: passing
v1_delta: null
tags: [integration, scale, selection]
---

# Scale + Selection Integration

## What We Test
- Selection operations in scaled (compressed) mode
- Select items at extremes (1, 500, 1000) with scale plugin
- Clear selection in scaled mode
- Toggle selection in scaled mode
- selection:change event with scale
- Force-compressed dataset (100K items) with selection
- Single selection enforcement in scaled mode
- Clean destroy of both plugins

## Test Groups
- **selection in scaled mode** (4 tests): select at extremes, clear, toggle, selection:change event
- **forced compression with selection** (1 test): 100K items with force: true, select across range
- **single selection with scale** (1 test): enforce single mode replaces previous
- **destroy with scale + selection** (1 test): clean destroy after selectAll

## Known Gaps
- No test for selection visual state on compressed-positioned elements
- No test for keyboard navigation with scale
