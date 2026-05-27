---
test_file: test/plugins/grid/layout.test.ts
source_files:
  - src/plugins/grid/layout.ts
  - src/plugins/grid/types.ts
coverage:
  tests: 94
  passing: 94
status: passing
v1_delta: 0
tags: [plugin, grid, layout, pure-functions]
---

# Grid Layout Tests

## What We Test

- createGridLayout factory (columns, gap, clamping, fractional floor)
- getTotalRows (zero items, fewer than columns, exact multiples, ceil for remainders)
- getRow (item-to-row mapping)
- getCol (item-to-column mapping)
- getPosition (row + col for any flat index)
- getItemRange (row range to flat index range)
- getItemIndex (row + col to flat index)
- getColumnWidth (container width divided by columns with gap)
- getColumnOffset (column position with gap)
- Round-trip consistency (flat index to row/col to flat index)
- Round-trip row range to item range coverage
- Edge cases (single column, single item, large indices, max items boundary)
- Groups-aware layout with isHeaderFn (headers occupy full row):
  - getTotalRows with headers (headers as full rows)
  - getRow/getCol with headers (skip header indices)
  - getItemRange with headers (range mapping around headers)
  - getPosition with headers
  - update config with headers (column/gap changes)
  - Complex groups scenarios (multiple header positions, mixed sizes)

## Test Groups

- **createGridLayout** (6 tests): factory creation, default gap, custom gap, column clamping, fractional floor, negative columns
- **getTotalRows** (4 tests): zero items, partial row, exact multiples, ceil remainders
- **getRow** (3 tests): first row, middle rows, last row
- **getCol** (3 tests): first col, middle cols, wrap-around
- **getPosition** (4 tests): combined row+col, various indices
- **getItemRange** (6 tests): single row, multi-row, boundary rows
- **getItemIndex** (3 tests): row+col to flat index
- **getColumnWidth** (4 tests): no gap, with gap, single column, many columns
- **getColumnOffset** (4 tests): first column, middle, last, with gap
- **round-trip: flat index to row/col to flat index** (1 test): consistency verification
- **round-trip: row range to item range** (3 tests): full coverage check
- **edge cases** (5 tests): single column, single item, large indices, boundary
- **groups-aware layout with isHeaderFn > getTotalRows with headers** (8 tests): header rows counted correctly
- **groups-aware layout with isHeaderFn > getRow with headers** (3 tests): row mapping skips headers
- **groups-aware layout with isHeaderFn > getCol with headers** (4 tests): col mapping for items after headers
- **groups-aware layout with isHeaderFn > getItemRange with headers** (5 tests): range around header indices
- **groups-aware layout with isHeaderFn > getPosition with headers** (3 tests): position with header offsets
- **groups-aware layout with isHeaderFn > update config with headers** (5 tests): column/gap changes with headers
- **groups-aware layout with isHeaderFn > complex groups scenarios** (5 tests): multiple headers, mixed sizes

## Known Gaps

- None; v1 and v2 have identical test counts (94)
