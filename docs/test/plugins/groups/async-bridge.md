---
test_file: test/plugins/groups/async-bridge.test.ts
source_files:
  - src/plugins/groups/async-bridge.ts
coverage:
  tests: 33
  passing: 33
status: passing
v1_delta: 0
tags: [plugin, groups, async, bridge, index-mapping]
---

# Groups Async Bridge Tests

## What We Test

- createAsyncGroupBridge factory (initial state: zero entries, zero groups)
- Single page load (group discovery from first page, totalEntries, groupCount, groups array)
- Index mapping (dataIndexToLayoutIndex, layoutIndexToDataIndex for items and headers)
- Incremental loading (second/third page extends groups, merges adjacent groups, discovers new groups)
- Sparse loading (non-contiguous pages, group discovery from middle of dataset)
- Group lookups (getGroupAtLayoutIndex, getGroupAtDataIndex)
- removeAt (remove item, shift indices, group shrink, group removal when empty)
- insertAt (insert item, shift indices, group growth, new group creation)
- Reset (clear all state, re-discovery from scratch)
- Header height configuration
- Edge cases (empty page load, single item groups, boundary indices)

## Test Groups

- **createAsyncGroupBridge > initial state** (1 test): zero entries and groups
- **createAsyncGroupBridge > single page load** (6 tests): first page group discovery, totalEntries, groupCount, groups array, header positions
- **createAsyncGroupBridge > index mapping** (6 tests): data-to-layout and layout-to-data for items and headers, round-trip consistency
- **createAsyncGroupBridge > incremental loading** (6 tests): second/third page loading, group merging, new group discovery
- **createAsyncGroupBridge > sparse loading** (4 tests): non-contiguous pages, middle-of-dataset discovery
- **createAsyncGroupBridge > group lookups** (3 tests): getGroupAtLayoutIndex, getGroupAtDataIndex
- **createAsyncGroupBridge > removeAt** (2 tests): item removal with shift, group shrink/removal
- **createAsyncGroupBridge > insertAt** (2 tests): item insertion with shift, group growth
- **createAsyncGroupBridge > reset** (1 test): full state clear
- **createAsyncGroupBridge > header height** (1 test): configurable header height
- **createAsyncGroupBridge > edge cases** (1 test): boundary conditions

## Known Gaps

- None; v1 and v2 have identical test counts (33)
