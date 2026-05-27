---
v1_file: test/integration/performance.test.ts
v2_equivalent: null
v1_tests: 50
action: adapt
adapt_target: test/integration/performance.test.ts
tags: [performance, benchmarks, timing, initialization, render-cycle, data-ops, destroy, compression, feature-overhead]
---

# Performance Benchmarks (v1)

## What v1 Tested

- **Initialization** (7 tests): 10K items < 100ms, 100K items < 500ms, 1M items with compression < 2000ms, 10K with selection+scrollbar < 100ms, 10K with grid < 100ms, grouped 10K items < 200ms, all features combined < 200ms
- **Render Cycles** (7 tests): scroll render cycle < 5ms for 10K, < 5ms for 100K, < 10ms for 1M compressed, grid scroll < 20ms, 100 consecutive scroll events < 50ms, 100 scrolls with selection < 50ms, rapid scrolling with compression < 100ms
- **Data Operations** (8 tests): setItems 10K < 50ms, setItems 100K < 500ms, appendItems 1K < 10ms, prependItems 1K < 10ms, updateItem < 1ms, removeItem < 5ms for 10K, 100 sequential updateItem < 20ms, rapid setItems replacements < 100ms
- **Destroy** (6 tests): destroy 10K < 10ms, destroy 100K < 10ms, destroy 1M compressed < 10ms, destroy with all features < 10ms, destroy grid < 10ms, destroy grouped < 10ms
- **scrollToIndex** (5 tests): scrollToIndex < 2ms for 10K, < 2ms for 100K, < 50ms for 1M compressed, 100 sequential scrollToIndex < 50ms, scrollToIndex with grid < 20ms
- **Selection Operations** (5 tests): select 1K items < 200ms, selectAll 10K < 100ms, clearSelection 10K < 20ms, getSelected 1K < 5ms, getSelectedItems 1K < 20ms
- **Snapshot Operations** (3 tests): capture < 1ms, restore < 5ms, capture with compression < 1ms
- **Compression Transitions** (2 tests): uncompressed to compressed < 500ms, compressed to uncompressed < 50ms
- **Feature Overhead** (2 tests): selection+scrollbar overhead < 5x vs bare, grid scroll overhead < 5x vs standard
- **Virtualization Bounds** (5 tests): bounded rendered count for 10K, 100K, 1M compressed, after scrolling, with grid

## Relevance to v2

- **Initialization** — STILL RELEVANT. v2 must initialize large datasets within reasonable time bounds. Thresholds may need adjustment based on v2's architecture.
- **Render Cycles** — STILL RELEVANT. Per-frame scroll render performance is the most critical metric for a virtual list. The thresholds (5ms, 10ms, 20ms) ensure 60fps scrolling.
- **Data Operations** — STILL RELEVANT. Bulk data operations must be fast. setItems, appendItems, prependItems, updateItem, removeItem timing matters for real-world usage.
- **Destroy** — STILL RELEVANT. Destroy must be fast to avoid UI jank when removing lists.
- **scrollToIndex** — STILL RELEVANT. Programmatic scroll must be fast, especially with compression.
- **Selection Operations** — STILL RELEVANT. Bulk selection operations must scale.
- **Snapshot Operations** — STILL RELEVANT. Capture/restore must be near-instant.
- **Compression Transitions** — STILL RELEVANT if v2 supports dynamic compression switching.
- **Feature Overhead** — STILL RELEVANT. Adding plugins should not dramatically slow down the base case.
- **Virtualization Bounds** — STILL RELEVANT. The fundamental guarantee: rendered element count must be bounded regardless of total items.

## Adaptation Notes

- All timing tests use `performance.now()` before/after and `expectFasterThan(elapsed, threshold)`.
- Apply a CI multiplier: `const CI_MULTIPLIER = process.env.CI ? 3 : 1` to avoid flaky failures on slow CI runners.
- Replace `vlist<T>({...}).use(...).build()` with `createVList(config)`.
- All feature imports change to v2 plugin equivalents.
- JSDOM setup replaced with happy-dom.
- `simulateScroll` helper needs v2 adaptation.
- Timing thresholds may need recalibration for v2's architecture. Run benchmarks on local machine first, then set thresholds at 2-3x the measured times.
- The virtualization bounds tests (`rendered.length < 50` for any dataset size) are the most universally applicable — they don't depend on absolute timing.
- Consider adding `bun:test`'s `test.skip` for particularly timing-sensitive tests that might flake in CI, with a comment explaining why.
- The feature overhead tests (< 5x vs bare) need careful setup: build bare list, measure render cycle, build with features, measure, compare ratio.
- 1M item tests require `withScale({ force: true })` in v1 — adapt to v2's compression API.
