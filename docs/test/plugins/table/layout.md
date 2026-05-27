---
test_file: test/plugins/table/layout.test.ts
source_files:
  - src/plugins/table/layout.ts
  - src/plugins/table/types.ts
coverage:
  tests: 63
  passing: 63
status: passing
v1_delta: 0
tags: [plugin, table, layout, columns, resize, flex]
---

# Table Layout Tests

## What We Test

- Layout factory: column storage, initial totalWidth before resolve, empty columns handling
- Fixed width resolution: explicit widths, cumulative offsets, no auto-stretch, horizontal scroll when total exceeds container
- Flex width resolution: equal distribution, remaining space after fixed, mixed fixed+flex, single flex, zero remaining space, negative remaining space
- Min/max clamping: explicit width clamped to min/max, flex width clamped to min/max, global minColumnWidth/maxColumnWidth defaults, column-level overrides, minWidth > maxWidth resolution
- Resizable flag: default resizable, column-level false, global false, column override of global
- Resize operations: width change, offset recalculation, totalWidth update, min/max clamping, non-resizable rejection, out-of-bounds returns 0, last column resize, first column resize
- Column queries: getColumn by index (valid and out-of-bounds), getColumnAtX binary search (mid-column, negative, beyond totalWidth, empty columns), getColumnOffset (cumulative offsets, out-of-bounds), getColumnWidth (per-column widths, out-of-bounds)
- Column replacement: updateColumns definition swap, offset reset, reduce to fewer, expand to more
- Container resize: flex redistribution, fixed column preservation, offset recalculation, manual resize width preservation
- Edge cases: single column, zero container width, large column count, mixed fixed/flex with varying min/max, column index and def reference preservation, minWidth of 1, idempotent resolve, fractional container width
- Multiple resize operations: sequential resizes on same column, resizes on different columns

## Test Groups

- **createTableLayout** (3 tests): column storage, initial totalWidth, empty columns
- **resolve fixed** (4 tests): explicit widths, cumulative offsets, no stretch, horizontal scroll
- **resolve flex** (6 tests): equal distribution, remaining after fixed, mixed fixed+flex, single flex, zero remaining, negative remaining
- **resolve min/max** (8 tests): explicit min/max clamping, flex min/max clamping, global defaults, column overrides, minWidth > maxWidth
- **resolve resizable** (4 tests): default true, column false, global false, column override
- **resizeColumn** (9 tests): width change, offset recalc, totalWidth update, min clamp, max clamp, non-resizable rejection, out-of-bounds, last column, first column
- **getColumn** (2 tests): valid index, out-of-bounds
- **getColumnAtX** (4 tests): binary search, negative x, beyond totalWidth, empty columns
- **getColumnOffset** (2 tests): cumulative offsets, out-of-bounds
- **getColumnWidth** (2 tests): per-column widths, out-of-bounds
- **updateColumns** (4 tests): definition swap, offset reset, fewer columns, more columns
- **re-resolve on container resize** (4 tests): flex redistribution, fixed preservation, offset recalc, manual resize preservation
- **edge cases** (9 tests): single column, zero container, large count, mixed config, index/def preservation, minWidth=1, idempotent resolve, fractional container
- **multiple resize** (2 tests): sequential same-column, different columns

## Known Gaps

- None: all 63 v1 tests are present in v2 with identical names
