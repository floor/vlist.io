---
test_file: test/rendering/scale.test.ts
source_files:
  - src/rendering/scale.ts
  - src/rendering/sizes.ts
coverage:
  tests: 62
  passing: 62
status: passing
v1_delta: 0
tags: [rendering, scale, compression, large-lists]
---

# Compression (Scale)

## What We Test
- MAX_VIRTUAL_SIZE constant (16M pixels)
- getCompressionState: small lists not compressed, large lists compressed with correct ratio, edge case at exactly MAX_VIRTUAL_SIZE, zero items, 10M items, force: true on small/large lists, force: false/undefined
- calculateCompressedVisibleRange: without compression (scroll 0, scrolled), with compression (midpoint mapping, last item reachable with slack, never exceed totalItems), empty list
- calculateCompressedRenderRange: overscan added, start clamped to 0, end clamped to totalItems-1, empty list
- calculateCompressedItemPosition: without compression (absolute position), with compression (relative to virtual scroll index, consecutive item spacing, near-bottom positioning, interpolation in near-bottom zone)
- calculateCompressedScrollToIndex: without compression (start/center/end alignment), with compression (index-to-position mapping, clamping, first item, last item end alignment, center/end alignment, round-trip verification at various indices), empty list
- calculateIndexFromScrollPosition: without compression, with compression (midpoint, start, end), empty list
- needsCompression: small/large lists, item height consideration, SizeCache support
- getMaxItemsWithoutCompression: various heights, edge cases (0, 1)
- getCompressionInfo: non-compressed description, compressed description
- Integration: scroll position consistency, viewport item positioning, reaching end of 10M items
- Variable heights: non-compressed mode, visible range, item positioning, scrollToIndex, center alignment with item height, indexFromScrollPosition

## Test Groups
- **MAX_VIRTUAL_SIZE** (1 test): 16M constant
- **getCompressionState** (10 tests): small, large, exact limit, zero, 10M, force true small, force true ratio, force true large, force false, force undefined
- **calculateCompressedVisibleRange** (6 tests): no compression at 0, no compression scrolled, with compression midpoint, with compression last item, never exceed total, empty list
- **calculateCompressedRenderRange** (4 tests): overscan, clamp start, clamp end, empty
- **calculateCompressedItemPosition** (6 tests): no compression absolute, no compression with scroll, compression relative, consecutive spacing, near-bottom, interpolation zone
- **calculateCompressedScrollToIndex** (14 tests): no compression start/center/end, compression midpoint, clamp, first item, last item end, center, end non-last, center round-trip, end round-trip, start round-trip, various indices round-trip, empty list
- **calculateIndexFromScrollPosition** (5 tests): no compression, compression midpoint, start, end, empty
- **needsCompression** (4 tests): small, large, item height, SizeCache
- **getMaxItemsWithoutCompression** (2 tests): various heights, edge cases
- **getCompressionInfo** (2 tests): non-compressed, compressed
- **Compression Integration** (3 tests): scroll consistency, viewport positioning, 10M end
- **Variable heights** (6 tests): non-compressed, visible range, positioning, scrollToIndex, center alignment, indexFromScrollPosition

## Known Gaps
- No test for compression with MeasuredSizeCache
