---
test_file: test/integration/scale-scrollbar.test.ts
source_files:
  - src/plugins/scale/plugin.ts
  - src/plugins/scrollbar/plugin.ts
  - src/core/create.ts
coverage:
  tests: 6
  passing: 6
status: passing
v1_delta: null
tags: [integration, scale, scrollbar]
---

# Scale + Scrollbar Integration

## What We Test
- Scale plugin combined with custom scrollbar plugin
- Scrollbar element rendering in DOM
- Item positioning with scale plugin active
- Scrollbar handling with 10K items
- Scale + scrollbar for very large datasets (100K items, force: true)
- Clean destroy of both plugins

## Test Groups
- **scale with custom scrollbar** (3 tests): create with both plugins, scrollbar element rendered, items positioned correctly
- **scrollbar with large datasets** (2 tests): 10K items with scrollbar, 100K items with scale(force: true) + scrollbar
- **destroy with scale + scrollbar** (1 test): clean destroy, root removed from DOM

## Known Gaps
- No test for scrollbar thumb position accuracy with compression
- No test for scrollbar drag interaction with scale
