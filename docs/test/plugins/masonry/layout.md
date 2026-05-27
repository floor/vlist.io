---
test_file: test/plugins/masonry/layout.test.ts
source_files:
  - src/plugins/masonry/layout.ts
  - src/plugins/masonry/types.ts
coverage:
  tests: 61
  passing: 61
status: passing
v1_delta: 0
tags: [plugin, masonry, layout, pure-functions]
---

# Masonry Layout Tests

## What We Test

- createMasonryLayout factory with various column counts and gaps
- calculateLayout shortest-lane algorithm (item placement, lane balancing)
- Tie-breaking behavior when multiple lanes share the same height
- getTotalSize for total content height from placements
- getVisibleItems for viewport-based item filtering
- update method for recalculating layout with new parameters
- Complex multi-column scenarios with varied item heights
- Gap applied to visibility calculations
- Round-trip verification (layout then visibility finds all items)
- Edge cases (zero items, single column, very large lists)
- Fallback paths for external placements and linear scan

## Test Groups

- **createMasonryLayout** (6 tests): factory creation, default config, column/gap params
- **calculateLayout** (16 tests): shortest-lane placement, lane assignment, position calculation, multi-column distribution
- **calculateLayout - tie-breaking** (1 test): deterministic placement when lanes have equal height
- **getTotalSize** (6 tests): total content height from placements, multi-column max
- **getVisibleItems** (9 tests): viewport range filtering, partial visibility, edge indices
- **update** (8 tests): recalculate layout on column/gap/item changes
- **calculateLayout - complex scenarios** (4 tests): varied heights, many columns, stress cases
- **getVisibleItems - with gap** (2 tests): gap factored into visibility ranges
- **round-trip: layout -> visibility -> all items found** (2 tests): end-to-end placement and retrieval
- **edge cases** (4 tests): zero items, single column, boundary conditions
- **getTotalSize - fallback for external placements** (1 test): handles externally-provided placements
- **getVisibleItems - linear fallback** (2 tests): linear scan when index-based lookup unavailable

## Known Gaps

- None; v1 and v2 have identical test counts and groups
