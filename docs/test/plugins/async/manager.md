---
test_file: test/plugins/async/manager.test.ts
source_files:
  - src/plugins/async/index.ts
  - src/plugins/async/manager.ts
coverage:
  tests: 119
  passing: 119
status: passing
v1_delta: 0
tags: [plugin, async, data-manager, sparse-storage]
---

# Async Data Manager Tests

## What We Test

- createDataManager factory (no adapter, initial items, initial total, callbacks)
- setItems at various offsets with total management
- setTotal explicit total override
- updateItem by index and by ID with onStateChange
- removeItem with shift-down and total update
- getItem / getItemById / getIndexById lookups
- isItemLoaded sparse checks
- getItemsInRange (loaded, sparse, out-of-range)
- loadRange via adapter with state change callbacks
- ensureRange (skips loaded data, loads missing ranges)
- loadInitial (first page load)
- loadMore (cursor-based pagination)
- reload (clears and re-loads)
- clear (resets data, preserves config)
- reset (full reset including total)
- Direct getters (total, cached count, loaded ranges)
- State change callbacks (onStateChange, onItemsLoaded)
- evictDistant (chunk-based eviction by distance from viewport)
- Advanced updateItem (by ID, missing entry handling)
- Advanced getItemsInRange (partial loads, boundary conditions)
- Advanced setItems (sparse arrays, auto-expand total, without explicit total)
- Advanced loadRange (deduplication, concurrent chunks, fully loaded skip)
- Advanced loadMore (cursor forwarding, hasMore flag, empty pages)
- Advanced ensureRange (loaded data skip)
- Advanced reload (preserves adapter reference)
- Advanced removeItem (boundary conditions)
- mergeRanges utility (adjacent/overlapping range merging)
- calculateMissingRanges utility (gap detection)
- Concurrent chunk deduplication (parallel loads)

## Test Groups

- **createDataManager > initialization** (5 tests): factory creation, initial items, initial total, callbacks
- **createDataManager > setItems** (3 tests): offset placement, total update
- **createDataManager > setTotal** (2 tests): explicit total, total increase
- **createDataManager > updateItem** (4 tests): by index, by ID, callback trigger
- **createDataManager > removeItem** (3 tests): removal with shift, total decrease, callback
- **createDataManager > getItem** (4 tests): valid index, out-of-range, unloaded
- **createDataManager > getItemById** (2 tests): found and not-found cases
- **createDataManager > getIndexById** (2 tests): found and not-found cases
- **createDataManager > isItemLoaded** (2 tests): loaded and unloaded indices
- **createDataManager > getItemsInRange** (3 tests): full range, partial, sparse
- **createDataManager > loadRange** (4 tests): adapter call, state update, callback
- **createDataManager > ensureRange** (3 tests): skip loaded, load missing
- **createDataManager > loadInitial** (2 tests): first page, total set
- **createDataManager > loadMore** (5 tests): cursor pagination, hasMore, empty page
- **createDataManager > reload** (2 tests): clear + re-load
- **createDataManager > clear** (1 test): data reset
- **createDataManager > reset** (2 tests): full reset including total
- **createDataManager > direct getters** (5 tests): total, cached, loaded ranges
- **createDataManager > state change callbacks** (6 tests): onStateChange, onItemsLoaded triggers
- **createDataManager > evictDistant** (7 tests): chunk eviction by distance
- **createDataManager > updateItem advanced** (4 tests): by ID, missing storage entry
- **createDataManager > getItemsInRange advanced** (3 tests): partial loads, boundaries
- **createDataManager > setItems advanced** (18 tests): sparse arrays, auto-expand total, without total
- **createDataManager > loadRange advanced** (18 tests): dedup, concurrent, fully loaded skip
- **createDataManager > loadMore advanced** (6 tests): cursor forwarding, edge cases
- **createDataManager > ensureRange advanced** (3 tests): loaded data skip
- **createDataManager > reload advanced** (6 tests): adapter preservation
- **createDataManager > removeItem advanced** (3 tests): boundary conditions
- **mergeRanges** (6 tests): adjacent/overlapping range merging
- **calculateMissingRanges** (7 tests): gap detection in loaded ranges
- **data manager concurrent chunk deduplication** (variable tests): parallel load dedup
- **data/manager uncovered lines** (variable tests): edge case coverage for specific lines

## Known Gaps

- None; v1 and v2 have identical test counts (119)
