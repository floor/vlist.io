---
test_file: test/plugins/groups/layout.test.ts
source_files:
  - src/plugins/groups/layout.ts
  - src/plugins/groups/types.ts
coverage:
  tests: 47
  passing: 18
  failing: 29
status: failing
v1_delta: 0
tags: [plugin, groups, layout, pure-functions, regression]
---

# Groups Layout Tests

## What We Test

- createGroupLayout factory (group boundary computation, index mapping, entry lookup)
- Basic construction (groupCount, totalEntries, group boundaries, single/all/per-item groups)
- getEntry (header vs item entry at layout indices)
- layoutToDataIndex / dataToLayoutIndex (bidirectional index mapping)
- getGroupAtLayoutIndex / getGroupAtDataIndex (group lookup by index)
- getHeaderHeight (fixed and variable header heights)
- rebuild (layout update on item count change, rebuild to empty)
- Edge cases (varying group sizes, many groups, large item counts, empty layout fallbacks)
- buildLayoutItems (header pseudo-item injection, group keys, group indices, unique IDs, data item preservation)
- createGroupedSizeFn (header height vs item height dispatch at layout indices, variable heights)
- isGroupHeader type guard (true for headers, false for items/null/non-objects)
- Round-trip consistency (data-to-layout-to-data index round-trip for various group configurations)

## Test Groups

- **createGroupLayout > basic construction** (7 tests, 1 pass / 6 fail): groupCount, totalEntries, group boundaries, empty items, single item, all-in-one-group, each-own-group
- **createGroupLayout > getEntry** (2 tests, 0 pass / 2 fail): header entry at header indices, item entry at item indices
- **createGroupLayout > layoutToDataIndex** (3 tests, 1 pass / 2 fail): -1 for headers, correct data index, consistency across all indices
- **createGroupLayout > dataToLayoutIndex** (2 tests, 1 pass / 1 fail): correct mapping, inverse consistency
- **createGroupLayout > getGroupAtLayoutIndex** (2 tests, 0 pass / 2 fail): correct group for header and item indices
- **createGroupLayout > getGroupAtDataIndex** (1 test, 0 pass / 1 fail): correct group for each data index
- **createGroupLayout > getHeaderHeight** (2 tests, 1 pass / 1 fail): fixed height passes, variable height from function fails
- **createGroupLayout > rebuild** (2 tests, 0 pass / 2 fail): layout update on count change, rebuild to empty
- **createGroupLayout > edge cases** (6 tests, 3 pass / 3 fail): varying sizes fails, many groups fails, large item counts fails; empty layout fallbacks pass (3 tests)
- **buildLayoutItems** (7 tests, 1 pass / 6 fail): header injection fails, group keys fails, group indices fails, unique IDs fails, data item preservation fails, single item fails; empty items passes
- **createGroupedSizeFn** (4 tests, 1 pass / 3 fail): header height dispatch fails, variable item height fails, variable header height fails; fixed item height passes
- **isGroupHeader** (5 tests, 5 pass / 0 fail): all type guard tests pass
- **round-trip consistency** (4 tests, 4 pass / 0 fail): all round-trip configurations pass

## Known Gaps

29 tests are FAILING. The root cause is that `createGroupLayout` returns `groupCount: 0` and `groups: []` for all non-empty inputs, indicating the group boundary computation is broken or unimplemented in v2. This cascades into every test that depends on a populated layout.

### Failing: createGroupLayout > basic construction (6 failures)

All 6 non-empty construction tests fail because `createGroupLayout` does not populate groups:
- `should compute correct number of groups`: expected groupCount 3, received 0
- `should compute correct total entries`: expected 9 (6 items + 3 headers), received 6 (items only)
- `should produce correct group boundaries`: expected groups.length 3, received 0
- `should handle single item`: expected groupCount 1, received 0
- `should handle all items in one group`: expected groupCount 1, received 0
- `should handle each item in its own group`: expected groupCount 4, received 0

### Failing: createGroupLayout > getEntry (2 failures)

With groups empty, getEntry returns item-type entries for all indices:
- `should return header entry at header layout indices`: expected type "header", received "item"
- `should return item entry at item layout indices`: expected dataIndex 0 at layout index 1, received dataIndex 1 (no header offset)

### Failing: createGroupLayout > layoutToDataIndex (2 failures)

Without headers, layout indices map 1:1 to data indices instead of accounting for header offsets:
- `should return -1 for header layout indices`: expected -1 at indices 0/3/7, received 0/3/7
- `should return correct data index for item layout indices`: expected data index 0 at layout 1, received 1

### Failing: createGroupLayout > dataToLayoutIndex (1 failure)

- `should map data indices to correct layout indices`: expected layout index 1 for data index 0, received 0 (no header offset)

### Failing: createGroupLayout > getGroupAtLayoutIndex (2 failures)

With groups empty, group lookup returns fallback values:
- `should return the correct group for header layout indices`: expected group objects, received fallback
- `should return the correct group for item layout indices`: expected group objects, received fallback

### Failing: createGroupLayout > getGroupAtDataIndex (1 failure)

- `should return the correct group for each data index`: group lookup returns fallback

### Failing: createGroupLayout > getHeaderHeight (1 failure)

- `should return variable header height from function`: the function-based height path fails when groups are empty

### Failing: createGroupLayout > rebuild (2 failures)

- `should update layout when item count changes`: rebuild does not populate groups
- `should handle rebuild to empty`: groupCount expected 0 after rebuild with 0 items, but the pre-rebuild state is also 0

### Failing: createGroupLayout > edge cases (3 failures)

- `should handle groups with varying sizes`: groups empty
- `should handle many groups correctly`: groups empty for 26-letter alphabet groups
- `should handle large item counts efficiently`: groups empty for 10000 items across 100 groups

### Failing: buildLayoutItems (6 failures)

`buildLayoutItems` depends on `layout.groups` being populated. With empty groups, no headers are injected:
- `should insert header pseudo-items at group boundaries`: expected 9 items (6 + 3 headers), received 6
- `should set correct group keys on headers`: no headers found to check keys
- `should set correct group indices on headers`: no headers found to check indices
- `should set unique IDs on headers`: no headers found to check IDs
- `should preserve original data items in order`: filters items with `!isGroupHeader` — receives 0 because all items are returned without headers, but the assertion expects 6 data items from a 9-item array
- `should handle single item`: expected 2 items (1 + 1 header), received 0

### Failing: createGroupedSizeFn (3 failures)

With no groups in the layout, `createGroupedSizeFn` cannot distinguish header from item layout indices:
- `should return header height for header layout indices`: expected 32 at index 0, received 48 (item height returned for all indices)
- `should return item height for item layout indices (variable)`: expected 40 at layout index 1 (data index 0), received 45 (layout index used as data index, 40 + 1*5 = 45)
- `should return variable header height from function`: expected 20 at index 0, received 48 (item height)

### Summary of root cause

`createGroupLayout` is not building the groups array from `getGroupForIndex`. The function returns a layout with `groupCount: 0`, `groups: []`, and `totalEntries` equal to the raw item count (no header injection). All 29 failures stem from this single regression. The 18 passing tests either operate on empty inputs, test identity/fallback paths, test the `isGroupHeader` type guard (which does not depend on layout), or test round-trip consistency (which degenerates to identity mapping when no groups exist).
