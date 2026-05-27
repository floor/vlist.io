---
test_file: test/rendering/scroll-compressed.test.ts
source_files:
  - src/rendering/scroll.ts
  - src/rendering/scale.ts
  - src/rendering/sizes.ts
coverage:
  tests: 48
  passing: 48
status: passing
v1_delta: 0
tags: [rendering, scroll, compression, focus, keyboard-navigation]
---

# Compressed-mode scrollToFocus

## What We Test
- Compression slack calculation: effectiveSize * (1 - ratio), last item reachable at maxScroll, last item bottom at viewport bottom
- Compression slack with CSS padding: larger than without padding, includes main-axis padding, larger maxScroll, last item reachable, last item within reduced viewport, ratio=1 returns padding, proportional increase
- calculateCompressedVisibleRange (no interpolation): start at 0, last items at maxScroll, start <= end invariant, purely linear (no discontinuities near bottom)
- scrollToFocus in compressed mode: item already visible (no scroll for next item, middle item, start+1 item), item below viewport (scroll past fully-visible area, fractional alignment, bottom flush positioning), item above viewport (above visibleRange.start, partially clipped start, exact index * compressedItemSize)
- scrollToFocus without visibleRange fallback: below viewport, above viewport, within viewport, fractional alignment
- End then repeated PageUp (issue #7): monotonically decreasing positions, never empty visible range, focused item always within visible range
- PageUp then PageDown round-trip: increasing scroll positions on PageDown
- calculateCompressedScrollToIndex (no interpolation): first item 0, last item positive, last item within padded maxScroll, monotonically increasing for increasing indices
- calculateCompressedItemPosition (no interpolation): first item at 0, correct spacing at any scroll, correct at maxScroll, no discontinuity near bottom
- Different configurations: 4 viewport/item/total combinations testing last item reachability, bottom positioning, PageUp focus visibility
- Mixed item sizes (group headers): ArrowDown bottom alignment with mixed sizes, continuous ArrowDown, no undershoot by header height (original bug), ArrowUp top alignment, continuous ArrowUp visibility, uniform sizes regression check

## Test Groups
- **compressionSlack** (3 tests): formula, last item reachable, bottom positioning
- **compressionSlack with CSS padding** (7 tests): larger, includes padding, larger maxScroll, reachable, reduced viewport, ratio=1, proportional
- **calculateCompressedVisibleRange** (4 tests): start 0, last items, invariant, linearity
- **scrollToFocus — item visible** (3 tests): next item, middle, start+1
- **scrollToFocus — item below** (3 tests): past fully-visible, fractional alignment, bottom flush
- **scrollToFocus — item above** (3 tests): above start, partially clipped, exact position
- **scrollToFocus — no visibleRange** (4 tests): below, above, within, fractional
- **End then PageUp** (3 tests): monotonic decrease, no empty ranges, focused in visible
- **PageUp then PageDown** (1 test): increasing positions on PageDown
- **scrollToIndex no interpolation** (4 tests): first, last positive, last within max, monotonic
- **itemPosition no interpolation** (4 tests): first at 0, spacing, at maxScroll, no discontinuity
- **different configurations** (3 tests per config, 4 configs): reachability, positioning, PageUp focus
- **mixed sizes (group headers)** (6 tests): ArrowDown bottom, continuous ArrowDown, no undershoot, ArrowUp top, continuous ArrowUp, uniform regression

## Known Gaps
- No test for scrollToFocus with horizontal mode
