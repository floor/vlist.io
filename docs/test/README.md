---
title: vlist v2 Test Audit
date: 2026-05-26
v2_tests: 2632
v2_passing: 2603
v2_failing: 29
v1_tests: ~3486
deleted_v1_tests: 607
coverage_functions: 93.98%
coverage_lines: 94.30%
---

# vlist v2 — Test Audit

Complete audit of all test files in v2 vs v1.9.1. Generated to guide test recovery.

## Summary

| Metric | Value |
|--------|-------|
| v2 test files | 59 |
| v2 tests | 2,632 |
| v2 passing | 2,603 |
| v2 failing | 29 (groups/layout) |
| Deleted v1 test files | 15 (with real gaps) |
| Deleted v1 tests | 607 |
| Net delta from v1 | ~-854 |

## Gaps by Priority

### Failing Tests (29)

| File | Tests | Issue |
|------|-------|-------|
| [groups/layout](plugins/groups/layout.md) | 29 failing | `createGroupLayout` returns empty — single root cause |

### Largest Coverage Losses (existing files)

| File | v1 Delta | What's Missing |
|------|----------|----------------|
| [async/plugin](plugins/async/plugin.md) | -66 | Loading states, error recovery, race conditions, scroll-driven loads |
| [integration/memory](integration/memory.md) | -37 | Heap growth, sustained scroll GC, timer cleanup verification |
| [selection/plugin](plugins/selection/plugin.md) | -18 | ARIA in grid, table delegation, group header skipping, focus handlers |
| [page/plugin](plugins/page/plugin.md) | -11 | scrollPadding scrollToIndex alignment tests |
| [table/plugin](plugins/table/plugin.md) | -8 | column:click event, range:change emission, ARIA migration |
| [core/scroll](core/scroll.md) | -5 | easeInOutQuad unit tests, resolveScrollArgs parsing |
| [core/dom](core/dom.md) | -4 | Items wrapper, liveRegion (intentionally removed in v2) |

### Deleted Files Requiring Recovery (607 tests)

| Doc | v1 File | Tests | Action | Target |
|-----|---------|-------|--------|--------|
| [boundary](deleted/boundary.md) | builder/boundary | 27 | adapt | test/integration/boundary.test.ts |
| [memory](deleted/memory.md) | builder/memory | 24 | merge-into | test/integration/memory.test.ts |
| [recovery](deleted/recovery.md) | builder/recovery | 32 | adapt | test/integration/recovery.test.ts |
| [range](deleted/range.md) | builder/range | 36 | adapt | test/core/range.test.ts |
| [data](deleted/data.md) | builder/data | 78 | adapt | test/core/data.test.ts |
| [scroll](deleted/scroll.md) | builder/scroll | 34 | merge-into | test/core/scroll.test.ts |
| [core](deleted/core.md) | builder/core | 67 | merge-into | test/integration/core-coverage.test.ts |
| [measured](deleted/measured.md) | builder/measured | 44 | merge-into | test/rendering/measured.test.ts |
| [features-integration](deleted/features-integration.md) | integration/features | 109 | adapt | test/integration/ (split by combo) |
| [performance](deleted/performance.md) | integration/performance | 50 | adapt | test/integration/performance.test.ts |
| [grid-masonry-nav](deleted/grid-masonry-nav.md) | integration/grid-masonry-nav | 25 | adapt | test/integration/grid-masonry-nav.test.ts |
| [scale-keyboard-nav](deleted/scale-keyboard-nav.md) | integration/scale-keyboard-nav | 24 | adapt | test/integration/scale-keyboard-nav.test.ts |
| [async-integration](deleted/async-integration.md) | features/async/integration | 22 | adapt | test/integration/async-lifecycle.test.ts |
| [groups-async](deleted/groups-async-integration.md) | features/groups/async-integration | 24 | adapt | test/integration/groups-async.test.ts |
| [snapshots](deleted/snapshots.md) | rendering/snapshots | 11 | adapt | test/rendering/snapshots.test.ts |

## Coverage Gains in v2

| File | v1 Delta | What's New |
|------|----------|------------|
| [autosize/plugin](plugins/autosize/plugin.md) | +16 | More thorough plugin setup + destroy coverage |
| [grid/plugin](plugins/grid/plugin.md) | +15 | Plugin lifecycle, conflict detection, hooks |
| [groups/plugin](plugins/groups/plugin.md) | +14 | Plugin API, sticky headers, group detection |
| [core/pool](core/pool.md) | +4 | MAX_POOL_SIZE enforcement, ARIA cleanup |
| [scrollbar/plugin](plugins/scrollbar/plugin.md) | +3 | Plugin setup wiring |
| [masonry/plugin](plugins/masonry/plugin.md) | +1 | Minor addition |

## File Index

### Core (159 tests)

- [a11y](core/a11y.md) — 20 tests, new in v2
- [dom](core/dom.md) — 13 tests, v1 delta: -4
- [gap](core/gap.md) — 14 tests, new in v2
- [padding](core/padding.md) — 23 tests, new in v2
- [pipeline-aria](core/pipeline-aria.md) — 15 tests, new in v2
- [pool](core/pool.md) — 27 tests, v1 delta: +4
- [scroll](core/scroll.md) — 29 tests, v1 delta: -5
- [velocity](core/velocity.md) — 18 tests, v1 delta: 0

### Plugins (1,885 tests)

**async** (334 tests)
- [plugin](plugins/async/plugin.md) — 33 tests, v1 delta: -66
- [manager](plugins/async/manager.md) — 119 tests, v1 delta: 0
- [placeholder](plugins/async/placeholder.md) — 48 tests, v1 delta: 0
- [sparse](plugins/async/sparse.md) — 134 tests, v1 delta: 0

**autosize** (28 tests)
- [plugin](plugins/autosize/plugin.md) — 28 tests, v1 delta: +16

**grid** (218 tests)
- [plugin](plugins/grid/plugin.md) — 67 tests, v1 delta: +15
- [layout](plugins/grid/layout.md) — 94 tests, v1 delta: 0
- [renderer](plugins/grid/renderer.md) — 57 tests, v1 delta: 0

**groups** (148 tests, 29 failing)
- [plugin](plugins/groups/plugin.md) — 50 tests, v1 delta: +14
- [layout](plugins/groups/layout.md) — 47 tests (29 failing), v1 delta: 0
- [sticky](plugins/groups/sticky.md) — 18 tests, v1 delta: 0
- [async-bridge](plugins/groups/async-bridge.md) — 33 tests, v1 delta: 0

**masonry** (174 tests)
- [plugin](plugins/masonry/plugin.md) — 60 tests, v1 delta: +1
- [layout](plugins/masonry/layout.md) — 61 tests, v1 delta: 0
- [renderer](plugins/masonry/renderer.md) — 53 tests, v1 delta: 0

**page** (39 tests)
- [plugin](plugins/page/plugin.md) — 39 tests, v1 delta: -11

**scale** (38 tests)
- [plugin](plugins/scale/plugin.md) — 38 tests, v1 delta: 0

**scrollbar** (231 tests)
- [controller](plugins/scrollbar/controller.md) — 119 tests, v1 delta: 0
- [plugin](plugins/scrollbar/plugin.md) — 27 tests, v1 delta: +3
- [scrollbar](plugins/scrollbar/scrollbar.md) — 85 tests, v1 delta: 0

**selection** (156 tests)
- [plugin](plugins/selection/plugin.md) — 88 tests, v1 delta: -18
- [index](plugins/selection/index.md) — 67 tests, v1 delta: 0
- [state](plugins/selection/state.md) — 1 test, v1 delta: 0

**snapshots** (97 tests)
- [plugin](plugins/snapshots/plugin.md) — 97 tests, v1 delta: 0

**sortable** (70 tests)
- [plugin](plugins/sortable/plugin.md) — 70 tests, v1 delta: 0

**table** (284 tests)
- [plugin](plugins/table/plugin.md) — 70 tests, v1 delta: -8
- [header](plugins/table/header.md) — 63 tests, v1 delta: 0
- [layout](plugins/table/layout.md) — 63 tests, v1 delta: 0
- [renderer](plugins/table/renderer.md) — 88 tests, v1 delta: 0

**transition** (68 tests)
- [plugin](plugins/transition/plugin.md) — 68 tests, v1 delta: 0

### Integration (134 tests)

- [async-page](integration/async-page.md) — 12 tests, new in v2
- [async-selection](integration/async-selection.md) — 8 tests, new in v2
- [async-snapshots](integration/async-snapshots.md) — 6 tests, new in v2
- [core-coverage](integration/core-coverage.md) — 34 tests, new in v2
- [grid-selection](integration/grid-selection.md) — 12 tests, new in v2
- [groups-grid](integration/groups-grid.md) — 6 tests, new in v2
- [lifecycle](integration/lifecycle.md) — 26 tests, new in v2
- [memory](integration/memory.md) — 10 tests, v1 delta: -37
- [scale-scrollbar](integration/scale-scrollbar.md) — 6 tests, new in v2
- [scale-selection](integration/scale-selection.md) — 7 tests, new in v2
- [selection-scrollbar](integration/selection-scrollbar.md) — 7 tests, new in v2

### Rendering (399 tests)

- [aria](rendering/aria.md) — 7 tests, v1 delta: 0
- [measured](rendering/measured.md) — 57 tests, v1 delta: 0
- [renderer](rendering/renderer.md) — 51 tests, v1 delta: 0
- [scale](rendering/scale.md) — 62 tests, v1 delta: 0
- [scroll-compressed](rendering/scroll-compressed.md) — 48 tests, v1 delta: 0
- [sizes](rendering/sizes.md) — 83 tests, v1 delta: 0
- [sort](rendering/sort.md) — 13 tests, v1 delta: 0
- [viewport](rendering/viewport.md) — 78 tests, v1 delta: 0

### Utils (38 tests)

- [stats](utils/stats.md) — 38 tests, v1 delta: 0

### Events (17 tests)

- [emitter](events/emitter.md) — 17 tests, v1 delta: 0

### Deleted (607 tests — see [deleted/](deleted/))

15 files with detailed gap analysis and adaptation notes.
