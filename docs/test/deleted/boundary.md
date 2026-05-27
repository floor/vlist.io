---
v1_file: test/builder/boundary.test.ts
v2_equivalent: null
v1_tests: 27
action: adapt
adapt_target: test/integration/boundary.test.ts
tags: [edge-cases, empty-list, large-dataset, dimensions, validation, data-mutation]
---

# Boundary Conditions (v1)

## What v1 Tested

- **Empty Lists** (5 tests): empty array render, transition empty->non-empty, non-empty->empty, scrollToIndex on empty, events on empty list
- **Single Item Lists** (4 tests): render single item, scroll with single item, scrollToIndex(0), out-of-bounds scrollToIndex
- **Extreme Dataset Sizes** (3 tests): 100K items virtualization, 1M items with 16M px content cap, scrollToIndex at end of 100K list
- **Extreme Item Dimensions** (3 tests): 1px tall items, 10000px tall items, mixed extreme variable heights
- **Zero-Dimension Containers** (3 tests): 0px height container, 0px width horizontal container, resize from 0 to non-zero
- **Invalid Values** (6 tests): negative itemHeight (should throw), 0 itemHeight (should throw), NaN itemHeight, negative scroll position, scrollToIndex with negative index, scrollToIndex beyond data length
- **Rapid Data Mutations** (3 tests): rapid setData calls, setData during scroll, alternating small/large datasets

## Relevance to v2

- **Empty Lists** — STILL RELEVANT. v2 `createVList()` must handle zero-item lists, transitions to/from empty, and scrollToIndex on empty without crashing.
- **Single Item Lists** — STILL RELEVANT. Edge case for range calculations, pool sizing, and scroll behavior.
- **Extreme Dataset Sizes** — STILL RELEVANT. Tests virtualization correctness and the 16M px content height cap (if preserved in v2). The 1M item test validates that content height is clamped to `MAX_CONTENT_SIZE`.
- **Extreme Item Dimensions** — STILL RELEVANT. Tiny and huge items stress range calculations and overscan logic. Variable height via function is still supported.
- **Zero-Dimension Containers** — STILL RELEVANT. ResizeObserver fires with 0 dimensions; engine must not divide by zero or render negative ranges.
- **Invalid Values** — PARTIALLY RELEVANT. v2 validation may have different error messages or thresholds. Negative/zero height validation needs checking against v2 config schema. NaN handling is universal.
- **Rapid Data Mutations** — STILL RELEVANT. Stress-tests data replacement during scroll, alternating dataset sizes. Tests internal state consistency.

## Adaptation Notes

- Replace `vlist<T>({...}).build()` with v2's `createVList(config)` factory.
- Replace `instance.element` with v2's root element accessor.
- Replace `instance.setItems(arr)` with v2's data update API.
- Replace `instance.scrollToIndex(n)` with v2's scroll API.
- DOM queries like `.vlist-viewport`, `.vlist-content`, `[data-index]` may use different selectors in v2.
- The `setupDOM({ width, height })` helper needs the v2 equivalent (happy-dom based, not JSDOM).
- The 16M px content height cap test needs to verify whether v2 preserves this constant from `src/constants.ts`.
- `VListItem` type may be renamed or restructured in v2.
- Consider splitting the 27 tests across `test/integration/boundary.test.ts` (full-stack tests) and unit tests in appropriate `test/core/` files for range calculation edge cases.
