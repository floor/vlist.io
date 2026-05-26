---
test_file: test/integration/lifecycle.test.ts
source_files:
  - src/core/create.ts
  - src/core/types.ts
coverage:
  tests: 26
  passing: 26
status: passing
v1_delta: null
tags: [integration, lifecycle, core]
---

# Lifecycle Integration

## What We Test
- Full lifecycle: creation, initial render, data mutations, lookups, scroll, events, destroy
- DOM structure verification (viewport, content elements)
- Visible item rendering within viewport bounds
- Content height based on total items
- Total count and items array exposure
- Empty items array handling
- Data mutations: setItems, appendItems, prependItems, insertItem, removeItem, removeItems, updateItem
- Lookup methods: getItemAt, getIndexById
- Scroll: initial position, scrollToIndex with start alignment, clamping to valid range
- Events: item:click, destroy event
- Destroy: DOM removal, rendered element cleanup, idempotent destroy, create-destroy-create cycle
- Horizontal mode: content width, horizontal scrollToIndex

## Test Groups
- **creation and initial render** (6 tests): DOM structure, visible items, content height, total count, items array, empty items
- **data mutations** (7 tests): setItems, appendItems, prependItems, insertItem, removeItem, removeItems, updateItem
- **lookup methods** (2 tests): getItemAt, getIndexById
- **scroll** (3 tests): initial position 0, scrollToIndex start, clamp to valid range
- **events** (2 tests): item:click, destroy event
- **destroy** (4 tests): DOM removal, clear rendered, idempotent, create-destroy-create
- **horizontal mode** (2 tests): content width, horizontal scrollToIndex

## Known Gaps
- No test for resize behavior
- No test for scroll event emission
