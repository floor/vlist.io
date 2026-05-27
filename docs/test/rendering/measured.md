---
test_file: test/rendering/measured.test.ts
source_files:
  - src/rendering/measured.ts
coverage:
  tests: 57
  passing: 57
status: passing
v1_delta: 0
tags: [rendering, sizes, measured, variable-height]
---

# Measured Size Cache

## What We Test
- createMeasuredSizeCache factory: creation, total count, estimated size, initial zero measured count, all items unmeasured
- getSize: estimated for unmeasured, measured after setMeasuredSize, no cross-contamination, overwriting
- setMeasuredSize / isMeasured: tracking state, measuredCount increments, no double-count on overwrite, index 0, last item
- getOffset: first item 0, estimated-only prefix sums, measured sizes after rebuild, multiple measured items, clamp for negative/overflow
- getTotalSize: estimated total, measured sizes after rebuild, all measured, empty list
- indexAtOffset: binary search with estimated, mixed measured/estimated after rebuild, negative offsets, beyond total, empty list, single item
- rebuild: preserves measured, discards out-of-range on shrink, updates total, rebuild to 0, growth with estimated defaults, prefix sums after rebuild, binary search correctness after rebuild
- consistency: indexAtOffset(getOffset(i)) === i for estimated and measured, getOffset(indexAtOffset(y)) <= y
- Edge cases: single item (unmeasured/measured), empty list, all items measured, very large/small estimated, zero-height item, matching estimated, large sparse measurements, multiple rebuilds, rebuild after grow
- isVariable: always true
- getEstimatedSize: returns initial, unchanged after measurements and rebuilds

## Test Groups
- **createMeasuredSizeCache** (5 tests): factory, total, estimated size, zero measured, all unmeasured
- **getSize** (4 tests): estimated, measured, isolation, overwrite
- **setMeasuredSize / isMeasured** (5 tests): state tracking, measuredCount, no double-count, index 0, last item
- **getOffset** (6 tests): first item, estimated, measured after rebuild, multiple measured, clamp negative, overflow
- **getTotalSize** (4 tests): estimated, measured after rebuild, all measured, empty
- **indexAtOffset** (7 tests): offset 0, estimated, mixed after rebuild, negative, beyond total, empty, single item
- **rebuild** (8 tests): preserve, discard on shrink, update total, to 0, growth, prefix sums, binary search, grow after measure
- **consistency** (3 tests): round-trip estimated, round-trip measured, inverse property
- **edge cases** (12 tests): single unmeasured/measured, empty, all measured, large/small estimated, zero height, matching estimated, large sparse, multiple rebuilds, rebuild after grow
- **isVariable** (2 tests): always true, true even when all measured
- **getEstimatedSize** (3 tests): initial value, unchanged after measurements, unchanged after rebuilds

## Known Gaps
- No test for thread safety or concurrent setMeasuredSize calls
