---
v1_file: test/builder/range.test.ts
v2_equivalent: null
v1_tests: 36
action: adapt
adapt_target: test/core/range.test.ts
tags: [range, overscan, scroll-to-index, visible-range, pure-functions]
---

# Range Calculations (v1)

## What v1 Tested

- **calcVisibleRange** (10 tests): range at scroll position 0, range when scrolled (position 1000), empty list (end=-1), zero container height (end=-1), clamp start to 0 on negative scroll, clamp end to totalItems-1 at bottom, variable heights, reuse output range object (mutation), single item, very large scroll position
- **applyOverscan** (10 tests): overscan applied both sides, clamp start to 0, clamp end to totalItems-1, zero overscan (no change), large overscan (covers entire list), empty list, range at start, range at end, reuse output range object, single item visible range
- **calcScrollToPosition** (14 tests): start alignment, center alignment, end alignment, clamp to 0 for negative positions, clamp to maxScroll, empty list returns 0, clamp index to valid range (negative and overflow), variable heights, very tall items, first item all alignments, last item all alignments, container taller than content (maxScroll=0), default alignment
- **Integration** (3 tests): visible + overscan working together, consistency during sequential scrolling, scroll-to-index then calc visible range

## Relevance to v2

- **calcVisibleRange** — STILL RELEVANT. These are pure function tests for range calculation. v2 likely has an equivalent function (possibly in `src/core/` or `src/rendering/`). The exact function signature may differ but the logic is the same: given (scrollPosition, containerSize, sizeCache, totalItems) compute visible {start, end}.
- **applyOverscan** — STILL RELEVANT. Overscan is a core concept in virtual scrolling. v2 must apply overscan to the visible range and clamp to bounds. These are pure function tests that should transfer directly.
- **calcScrollToPosition** — STILL RELEVANT. scrollToIndex with start/center/end alignment is a public API feature. The computation (offset lookup, alignment math, maxScroll clamping) is universal.
- **Integration** — STILL RELEVANT. Verifying that visible range + overscan + scrollToIndex compose correctly catches subtle off-by-one errors.

## Adaptation Notes

- These are pure function tests (no DOM, no builder). They should be the easiest to adapt.
- Import paths change: `../../src/builder/range` becomes the v2 equivalent (possibly `../../src/core/range` or similar).
- `createSizeCache(50, 100)` and `createSizeCache((i) => ..., 100)` come from `../../src/rendering/sizes`. v2 may have a different size cache factory.
- The `Range` type `{ start: number, end: number }` may be renamed or inlined in v2.
- The output mutation pattern (passing `out: Range` to be mutated rather than returning a new object) is a deliberate zero-allocation design. v2 should preserve this pattern.
- `calcScrollToPosition` takes `(index, sizeCache, containerSize, totalItems, align)` — verify v2's scroll-to-index function signature.
- The alignment values `"start" | "center" | "end"` should be the same in v2.
- Variable height tests use `createSizeCache((i) => (i % 2 === 0 ? 50 : 100), 100)` — adapt to v2's variable size cache API.
- Consider keeping these in `test/core/range.test.ts` since they test pure computation, not integration.
