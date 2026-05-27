---
test_file: test/rendering/viewport.test.ts
source_files:
  - src/rendering/viewport.ts
  - src/rendering/scale.ts
  - src/rendering/sizes.ts
coverage:
  tests: 78
  passing: 78
status: passing
v1_delta: 0
tags: [rendering, viewport, scroll, range, variable-height]
---

# Viewport

## What We Test
- simpleVisibleRange: empty when totalItems=0 or containerHeight=0, correct range at scroll 0, scrolled, clamp to totalItems-1, partial items, never negative start
- calculateRenderRange: empty when totalItems=0, overscan added, start clamped to 0, end clamped, zero overscan
- calculateTotalSize: correct calculation, 0 items, large numbers
- calculateItemOffset: first item, correct offset, large indices
- calculateActualSize: raw total height, 0 items, very large lists (not capped), variable heights, ignores totalItems parameter
- calculateScrollToIndex: start/center/end alignment, default to start, compressed lists (1M+ items)
- clampScrollPosition: clamp negative, clamp exceeding max, in-range unchanged, content smaller than container
- getScrollDirection: down, up, unchanged
- createViewportState: initial state, overscan in render range, empty list
- updateViewportState: state after scroll, preserve containerHeight
- updateViewportSize: update container height, recalculate visible range, update total height and compression fields, preserve scroll position, very small container, variable heights, mutate in place, empty list
- updateViewportItems: update total height, recalculate visible range
- rangesEqual: equal, different starts, different ends
- isInRange: within, at start, at end, before, after
- getRangeCount: correct count, single item, invalid range
- rangeToIndices: create array, single element, invalid range, starting at 0, large range
- diffRanges: scrolling down (add/remove), scrolling up, identical ranges, non-overlapping
- Variable height support: calculateTotalSize, calculateItemOffset, createViewportState, updateViewportState, calculateScrollToIndex (start, center, end)

## Test Groups
- **simpleVisibleRange** (7 tests): empty totalItems, empty container, at 0, scrolled, clamp end, partial items, never negative
- **calculateRenderRange** (5 tests): empty, overscan, clamp start, clamp end, zero overscan
- **calculateTotalSize** (3 tests): correct, 0 items, large
- **calculateItemOffset** (3 tests): first, correct, large
- **calculateActualSize** (5 tests): raw height, 0 items, very large, variable, ignores param
- **calculateScrollToIndex** (5 tests): start, center, end, default, compressed
- **clampScrollPosition** (4 tests): negative, exceeding, in-range, smaller than container
- **getScrollDirection** (3 tests): down, up, unchanged
- **createViewportState** (3 tests): initial, overscan, empty
- **updateViewportState** (2 tests): after scroll, preserve containerHeight
- **updateViewportSize** (8 tests): update height, recalculate visible, compression fields, preserve scroll, small container, variable heights, mutate in place, empty
- **updateViewportItems** (2 tests): update total, recalculate visible
- **rangesEqual** (3 tests): equal, different start, different end
- **isInRange** (5 tests): within, start, end, before, after
- **getRangeCount** (3 tests): correct, single, invalid
- **rangeToIndices** (5 tests): array, single, invalid, at 0, large
- **diffRanges** (4 tests): down, up, identical, non-overlapping
- **Variable height support** (7 tests): totalSize, itemOffset, viewportState, updateState, scrollToIndex start/center/end

## Known Gaps
- No test for updateViewportSize with compressed lists
