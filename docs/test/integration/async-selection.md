---
test_file: test/integration/async-selection.test.ts
source_files:
  - src/plugins/async/plugin.ts
  - src/plugins/selection/plugin.ts
  - src/core/create.ts
coverage:
  tests: 8
  passing: 8
status: passing
v1_delta: null
tags: [integration, async, selection]
---

# Async + Selection Integration

## What We Test
- Selection operations on async-loaded data
- Selecting items before and after async data loads
- Selection persistence across reload
- Clearing selection with async data
- getSelectedItems returning actual item objects
- selectAll with async data
- Single selection mode enforcement with async
- selection:change event emission with async data

## Test Groups
- **selection with async data** (5 tests): select after load, select before load (id-based), preserve across reload, clear, getSelectedItems
- **selectAll with async** (1 test): select all loaded items
- **single selection with async** (1 test): enforce single mode replaces previous
- **selection events with async** (1 test): selection:change fires with async data

## Known Gaps
- No test for selecting items in ranges that have not yet been loaded
- No test for deselecting items that are subsequently removed by reload
