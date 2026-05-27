---
test_file: test/rendering/sizes.test.ts
source_files:
  - src/rendering/sizes.ts
coverage:
  tests: 83
  passing: 83
status: passing
v1_delta: 0
tags: [rendering, sizes, prefix-sums, binary-search]
---

# Size Cache

## What We Test
- Fixed size cache: creation, total count, getOffset (first item, multiplication, large indices), getSize (constant for any index), indexAtOffset (0, division, floor partial, clamp negative, clamp large, empty, exact boundary), getTotalSize (total * size, empty), rebuild (update total, to 0)
- Variable size cache: creation, total count, getOffset (first item, prefix sums, header pattern, clamp negative, overflow), getSize (correct per index, header pattern), indexAtOffset (0, binary search with known offsets, within items, negative, beyond total, empty, single item, exact boundaries), getTotalSize (sum of all, empty, header pattern), rebuild (new total, to 0, correct offsets, correct binary search)
- Fixed vs Variable consistency: isVariable results, same offsets, same sizes, same indexAtOffset, same total size, same total count
- countVisibleItems: fixed (ceil division, partial items, empty), variable (items fitting, start from index, not exceed total, at least 1, empty)
- countItemsFittingFromBottom: fixed (floor division, partial, empty), variable (from bottom, all fitting, at least 1, empty)
- getOffsetForVirtualIndex: fixed (integer, fractional, 0, empty), variable (integer, fractional, fractional into large item, 0, clamp large, empty), consistency with fixed
- Edge cases: single item fixed/variable, very large counts, all-same variable, extreme variation (huge item), multiple variable rebuilds
- Binary search correctness: every offset in small list, indexAtOffset(getOffset(i)) === i, getOffset(indexAtOffset(y)) <= y

## Test Groups
- **createSizeCache (fixed)** (14 tests): creation, total, getOffset (3), getSize (1), indexAtOffset (7), getTotalSize (2), rebuild (2)
- **createSizeCache (variable)** (28 tests): creation, total, getOffset (5), getSize (2), indexAtOffset (8), getTotalSize (3), rebuild (4)
- **Fixed vs Variable consistency** (6 tests): isVariable, offsets, sizes, indexAtOffset, totalSize, totalCount
- **countVisibleItems** (8 tests): fixed (3), variable (5)
- **countItemsFittingFromBottom** (7 tests): fixed (3), variable (4)
- **getOffsetForVirtualIndex** (12 tests): fixed (4), variable (6), consistency (2)
- **Edge cases** (5 tests): single fixed, single variable, very large, all-same, extreme variation, multiple rebuilds
- **Binary search correctness** (3 tests): every offset, round-trip, inverse

## Known Gaps
- No test for thread safety of rebuild during concurrent reads
