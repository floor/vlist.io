---
test_file: test/utils/stats.test.ts
source_files:
  - src/utils/stats.ts
  - src/constants.ts
coverage:
  tests: 38
  passing: 38
status: passing
v1_delta: 0
tags: [utils, stats, velocity, progress]
---

# Stats Utility

## What We Test
- createStats initial state: returns getState and onVelocity functions, zero velocity/velocityAvg, total from config, dynamic config changes reflected
- onVelocity: update current velocity, overwrite previous, accumulate valid samples into velocityAvg, exclude samples at/below MIN_VELOCITY (0.1), exclude samples at/above MAX_VELOCITY (50), zero velocityAvg with no valid samples, set to 0 when fed 0
- getItemCount edge cases: total=0, itemSize=0, itemSize negative, containerSize=0, containerSize negative
- getItemCount basic geometry: visible at scroll 0, scrolled partially, not exceed total, all items fit, partial row at bottom
- getItemCount virtual size compression: scroll-range ratio for large lists (1M items), max virtual scroll maps to last items, no compression under MAX_VIRTUAL_SIZE
- getItemCount grid/columns: default columns=1, columns in item count (4 cols), cap at total with columns, scrolled grid (5 cols)
- progress: 0 when total=0, 100 when all visible, between 0-100 for partial, clamp to 100 max, equals (itemCount/total)*100
- getState full snapshot: all fields present, fresh object each call, reflect velocity changes, reflect dynamic config
- Ratio edge case: ratio=1 when maxVirtualScroll=0

## Test Groups
- **createStats initial state** (4 tests): interface, zero velocity, total from config, dynamic changes
- **onVelocity** (7 tests): update, overwrite, accumulate, exclude low, exclude high, no valid samples, set zero
- **getItemCount edge cases** (5 tests): total 0, itemSize 0, itemSize negative, containerSize 0, containerSize negative
- **getItemCount basic geometry** (5 tests): scroll 0, scrolled, not exceed total, all fit, partial row
- **getItemCount virtual size compression** (3 tests): large list ratio, max scroll, no compression
- **getItemCount grid/columns** (4 tests): default 1, 4 columns, cap at total, scrolled grid
- **progress** (5 tests): 0 total, 100 all visible, partial, clamp 100, formula
- **getState full snapshot** (4 tests): all fields, fresh object, velocity changes, dynamic config
- **ratio edge case** (1 test): ratio=1 when maxVirtualScroll=0

## Known Gaps
- No test for velocity decay over time
- No test for stats with MeasuredSizeCache (variable heights)
