---
test_file: test/integration/memory.test.ts
source_files:
  - src/core/create.ts
  - src/plugins/selection/plugin.ts
  - src/plugins/scrollbar/plugin.ts
  - src/plugins/grid/plugin.ts
coverage:
  tests: 10
  passing: 10
status: passing
v1_delta: -37
tags: [integration, memory, cleanup]
---

# Memory and Resource Cleanup

## What We Test
- DOM cleanup after destroy: root element removal, rendered item removal, no orphan elements
- Plugin cleanup: selection, scrollbar, grid + selection plugins on destroy
- Create/destroy cycles: rapid cycles without leaking DOM elements, multiple plugins
- Large dataset cleanup: 100K items destroy, destroy after scrolling 10K items

## Test Groups
- **DOM cleanup after destroy** (3 tests): root removed, rendered items removed, no orphans in container
- **plugin cleanup** (3 tests): selection plugin, scrollbar plugin, grid + selection plugins
- **create/destroy cycles** (2 tests): 10 rapid cycles with selection, 5 cycles with grid + selection + scrollbar
- **large dataset cleanup** (2 tests): 100K items clean destroy, scrolled 10K items clean destroy

## Known Gaps
- No explicit memory measurement (WeakRef/FinalizationRegistry)
- No test for event listener cleanup verification
- v1 had 47 tests; v2 reduced to 10 focused tests covering the same scenarios more efficiently
