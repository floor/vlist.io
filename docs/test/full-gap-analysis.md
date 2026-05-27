---
title: Full Test Gap Analysis — v1.9.1 → v2
date: 2026-05-27
v2_tests: 2911
v2_passing: 2911
v2_failing: 0
v1_tests: 3486
gap: ~575
status: in-progress
phases_completed: 6
---

# Full Test Gap Analysis — v1.9.1 → v2

Comprehensive gap analysis between v1.9.1 (3,486 tests) and v2 (2,911 tests).
Organized into actionable recovery phases.

## Current State (after Phase 6)

| Metric | Value |
|--------|-------|
| v2 tests | 2,911 |
| v2 passing | 2,911 |
| v2 failing | 0 |
| v1 tests | ~3,486 |
| Gap | ~575 |
| Test files (v2) | 80 |
| Test files (v1) | 63 |

## Progress

| Phase | Commit | Tests Added | Description |
|-------|--------|-------------|-------------|
| 1 | `3bdd640` | — | Config validation, template errors, plugin resilience |
| 2 | `13c001e` | +155 | Scroll bounds, grid/masonry 2D nav, performance benchmarks |
| 3 | `1f5aae6` | +45 | item:dblclick, item:contextmenu, 16M warning, live region |
| 4 | `1e6f670` | +57 | A11y extended, event reuse, autosize gap, selection+groups |
| 5 | `fa6fabd` | +71 | Data ops, error recovery, range/overscan, scroll events |
| 6 | `9439b46` | +51 | Fix 29 groups/layout, scrollToIndex alignment, horizontal mode |

---

## Gap 1: Deleted v1 Builder Files (804 v1 tests, no direct v2 equivalent)

The v1 `builder/` directory was replaced by `core/` in v2. Several builder files were
deleted without full coverage migration.

### `builder/index.test.ts` — 254 tests

End-to-end builder API tests (`vlist().use().build()`). The largest single file in v1.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Config defaults & resolution | ~40 | `validation.test.ts` (17) | ~23 |
| Plugin composition & ordering | ~30 | `lifecycle.test.ts` (26) | ~4 |
| DOM structure verification | ~25 | `dom.test.ts` (13) | ~12 |
| Data operations round-trip | ~35 | `data-ops.test.ts` (28) | ~7 |
| Scroll behavior E2E | ~30 | `scroll.test.ts` (29), `scroll-events.test.ts` (9) | ~0 |
| Event emission E2E | ~25 | `mouse-events.test.ts` (9), `range.test.ts` (13) | ~3 |
| Resize handling | ~20 | `core-coverage.test.ts` (34) | ~0 |
| Destroy & cleanup E2E | ~15 | `error-recovery.test.ts` (18) | ~0 |
| Horizontal mode E2E | ~15 | `horizontal.test.ts` (10) | ~5 |
| Accessibility E2E | ~19 | `a11y.test.ts` (20), `a11y-extended.test.ts` (12) | ~0 |
| **Total** | **254** | | **~54** |

### `builder/materialize.test.ts` — 96 tests

`.build()` internals: plugin wiring, hook registration, context assembly.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Plugin init ordering | ~20 | `lifecycle.test.ts` (26) | ~0 |
| Hook registration (render, scroll, resize) | ~25 | `core-coverage.test.ts` (34) | ~5 |
| Context assembly & API surface | ~20 | None | ~20 |
| Plugin conflict detection | ~15 | `lifecycle.test.ts` | ~5 |
| Deferred init (rAF) | ~8 | None | ~8 |
| Error handling during build | ~8 | `resilience.test.ts` (10) | ~0 |
| **Total** | **96** | | **~38** |

### `builder/data.test.ts` — 78 tests

Data operations: setItems, append, prepend, insert, update, remove.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| setItems (replace, empty, same, ref isolation) | ~12 | `data-ops.test.ts` (4) | ~8 |
| appendItems (end, empty, large batch) | ~10 | `data-ops.test.ts` (3) | ~7 |
| prependItems (beginning, indices, empty) | ~10 | `data-ops.test.ts` (3) | ~7 |
| insertItem (positions, clamp, getIndexById) | ~10 | `data-ops.test.ts` (5) | ~5 |
| updateItem (merge, nonexistent, preserve) | ~10 | `data-ops.test.ts` (4) | ~6 |
| removeItem/removeItems | ~10 | `data-ops.test.ts` (9) | ~1 |
| Data ops + DOM re-render verification | ~16 | None | ~16 |
| **Total** | **78** | | **~50** |

### `builder/core.test.ts` — 67 tests

Config resolution, defaults, internal state management.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Default config values | ~15 | `validation.test.ts` (17) | ~0 |
| Config overrides & merging | ~12 | `validation.test.ts` | ~5 |
| Internal state initialization | ~15 | `core-coverage.test.ts` (34) | ~0 |
| Size config resolution (height/width/fn) | ~10 | None | ~10 |
| Gap/padding config resolution | ~8 | `gap.test.ts` (14), `padding.test.ts` (23) | ~0 |
| Class prefix customization | ~7 | `dom.test.ts` (13) | ~2 |
| **Total** | **67** | | **~17** |

### `builder/context.test.ts` — 54 tests

BuilderContext (now PluginContext) API contract.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Context property access | ~15 | None | ~15 |
| Hook registration API | ~12 | None | ~12 |
| State read/write | ~10 | None | ~10 |
| DOM references | ~8 | None | ~8 |
| Replacement method registration | ~9 | None | ~9 |
| **Total** | **54** | | **~54** |

### `builder/measured.test.ts` — 44 tests

Auto-measurement via ResizeObserver, variable size handling.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| ResizeObserver setup/teardown | ~10 | `autosize/plugin.test.ts` (28) | ~0 |
| Measurement → size cache update | ~12 | `rendering/measured.test.ts` (57) | ~0 |
| Scroll compensation on resize | ~8 | `autosize/gap.test.ts` (8) | ~2 |
| estimatedHeight fallback | ~6 | None | ~6 |
| Measurement with gap | ~8 | `autosize/gap.test.ts` (8) | ~0 |
| **Total** | **44** | | **~8** |

### `builder/range.test.ts` — 36 tests

Range calculation, overscan application.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Visible range calculation | ~10 | `range.test.ts` (13) | ~0 |
| Overscan application | ~8 | `range.test.ts` (4) | ~4 |
| Range clamping at boundaries | ~8 | `scroll-bounds.test.ts` (15) | ~0 |
| Range with variable sizes | ~5 | None | ~5 |
| Range after data mutation | ~5 | None | ~5 |
| **Total** | **36** | | **~14** |

### `builder/scroll.test.ts` — 34 tests

Scroll handling, smooth scroll, sub-pixel filtering.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Scroll position tracking | ~8 | `scroll.test.ts` (29) | ~0 |
| Smooth scroll with easing | ~8 | `scroll.test.ts` | ~3 |
| Sub-pixel filtering | ~4 | `scroll-events.test.ts` (2) | ~2 |
| Idle detection | ~4 | `scroll-events.test.ts` (3) | ~1 |
| scrollSetFn override | ~5 | None | ~5 |
| Cross-axis passthrough | ~5 | None | ~5 |
| **Total** | **34** | | **~16** |

### `builder/recovery.test.ts` — 32 tests

Error recovery: template throws, adapter errors, ResizeObserver errors.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Template throw recovery | ~8 | `template-errors.test.ts` (10) | ~0 |
| Double destroy | ~4 | `error-recovery.test.ts` (2) | ~2 |
| API after destroy | ~8 | `error-recovery.test.ts` (9) | ~0 |
| Adapter/plugin error isolation | ~6 | `resilience.test.ts` (10) | ~0 |
| ResizeObserver error recovery | ~6 | None | ~6 |
| **Total** | **32** | | **~8** |

### `builder/boundary.test.ts` — 27 tests

Edge cases: empty lists, extreme sizes, 1M+ items, zero-dimension containers.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Empty list handling | ~5 | Scattered (data-ops, range) | ~2 |
| Single item lists | ~4 | `range.test.ts` (1) | ~3 |
| 100K+ items | ~3 | `performance.test.ts` (17) | ~0 |
| Extreme item dimensions | ~3 | None | ~3 |
| Zero-dimension containers | ~3 | None | ~3 |
| Invalid config values | ~6 | `validation.test.ts` (17) | ~0 |
| Rapid data mutations | ~3 | `error-recovery.test.ts` (3) | ~0 |
| **Total** | **27** | | **~11** |

### `builder/memory.test.ts` — 24 tests

Heap growth, GC pressure, pool cleanup.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Heap growth under sustained scroll | ~8 | `memory.test.ts` (10) | ~0 |
| Pool element recycling | ~6 | `pool.test.ts` (27) | ~0 |
| Timer cleanup on destroy | ~4 | None | ~4 |
| 16M content height cap | ~3 | `size-overflow.test.ts` (5) | ~0 |
| Event listener cleanup | ~3 | None | ~3 |
| **Total** | **24** | | **~7** |

**Builder subtotal: 804 v1 tests → ~277 gap remaining**

---

## Gap 2: Deleted v1 Integration & Feature Files (254 v1 tests)

### `integration/features.test.ts` — 109 tests

Cross-feature combination tests.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| grid + selection | ~15 | `grid-selection.test.ts` (12) | ~3 |
| grid + scale | ~10 | None | ~10 |
| async + selection | ~10 | `async-selection.test.ts` (8) | ~2 |
| async + groups | ~10 | `groups-grid.test.ts` (6) | ~4 |
| async + page | ~10 | `async-page.test.ts` (12) | ~0 |
| scale + scrollbar | ~8 | `scale-scrollbar.test.ts` (6) | ~2 |
| scale + selection | ~8 | `scale-selection.test.ts` (7) | ~1 |
| selection + scrollbar | ~8 | `selection-scrollbar.test.ts` (7) | ~1 |
| groups + selection | ~8 | `selection/groups.test.ts` (12) | ~0 |
| snapshots + async | ~8 | `async-snapshots.test.ts` (6) | ~2 |
| Three-way combos | ~14 | None | ~14 |
| **Total** | **109** | | **~39** |

### `integration/performance.test.ts` — 50 tests

Performance benchmarks: 10K, 100K, 1M items.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Creation benchmarks | ~10 | `performance.test.ts` (17) | ~0 |
| Scroll performance | ~12 | `performance.test.ts` | ~5 |
| Memory under load | ~10 | `memory.test.ts` (10) | ~0 |
| Large dataset operations | ~8 | None | ~8 |
| Grid/masonry performance | ~10 | None | ~10 |
| **Total** | **50** | | **~23** |

### `integration/grid-masonry-nav.test.ts` — 25 tests

2D keyboard navigation across grid and masonry layouts.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Grid arrow nav | ~8 | `grid/keyboard-nav.test.ts` (19) | ~0 |
| Masonry arrow nav | ~8 | `masonry/keyboard-nav.test.ts` (27) | ~0 |
| Cross-layout switching | ~5 | None | ~5 |
| Nav with selection | ~4 | None | ~4 |
| **Total** | **25** | | **~9** |

### `integration/scale-keyboard-nav.test.ts` — 24 tests

Scale plugin + keyboard navigation.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Compressed scroll + arrow keys | ~8 | None | ~8 |
| Scale + grid nav | ~8 | None | ~8 |
| Scale + Home/End | ~4 | None | ~4 |
| Scale + PageUp/PageDown | ~4 | None | ~4 |
| **Total** | **24** | | **~24** |

### `features/async/integration.test.ts` — 22 tests

Async data adapter end-to-end.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Load → render cycle | ~6 | `async/plugin.test.ts` (30) | ~0 |
| Error → retry flow | ~5 | None | ~5 |
| Scroll-driven loading | ~5 | None | ~5 |
| Cancel on destroy | ~3 | None | ~3 |
| Race condition guards | ~3 | None | ~3 |
| **Total** | **22** | | **~16** |

### `features/groups/async-integration.test.ts` — 24 tests

Groups plugin + async data loading.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Placeholder → group rebuild | ~8 | `groups/async-bridge.test.ts` (33) | ~0 |
| Async load with sticky headers | ~6 | None | ~6 |
| Group boundaries on partial load | ~5 | None | ~5 |
| Groups + async + selection | ~5 | None | ~5 |
| **Total** | **24** | | **~16** |

### `rendering/snapshots.test.ts` — 11 tests

DOM structure snapshot tests.

| Category | v1 Tests | v2 Coverage | Gap |
|----------|----------|-------------|-----|
| Basic list DOM snapshot | ~3 | `dom.test.ts` (13) | ~0 |
| Grid DOM snapshot | ~3 | None | ~3 |
| Table DOM snapshot | ~3 | None | ~3 |
| Groups DOM snapshot | ~2 | None | ~2 |
| **Total** | **11** | | **~8** |

**Integration/feature subtotal: 265 v1 tests → ~135 gap remaining**

---

## Gap 3: Existing v2 Files With Fewer Tests Than v1 (~158 delta)

### `async/plugin.test.ts` — 30 tests (v1: 74, delta: -44)

| Missing Category | Gap |
|-----------------|-----|
| Loading state lifecycle (pending → loaded → error) | ~10 |
| Error recovery & retry with backoff | ~8 |
| Race condition guards (rapid scroll) | ~6 |
| maxConcurrent limiting | ~5 |
| Scroll-driven batch loading | ~5 |
| Cache invalidation | ~5 |
| Prefetch / predictive loading | ~5 |
| **Total** | **~44** |

### `integration/memory.test.ts` — 10 tests (v1: 47, delta: -37)

| Missing Category | Gap |
|-----------------|-----|
| Sustained scroll heap growth | ~8 |
| Pool size under memory pressure | ~5 |
| Timer/listener cleanup verification | ~6 |
| GC-friendly teardown | ~5 |
| Large dataset memory profile | ~5 |
| Plugin cleanup completeness | ~4 |
| WeakRef/FinalizationRegistry usage | ~4 |
| **Total** | **~37** |

### `selection/plugin.test.ts` — 88 tests (v1: 104, delta: -16)

| Missing Category | Gap |
|-----------------|-----|
| ARIA attributes in grid mode | ~4 |
| Table column delegation | ~3 |
| Group header skipping (edge cases) | ~3 |
| Focus handlers with disabled items | ~3 |
| Selection persistence across setItems | ~3 |
| **Total** | **~16** |

### `page/plugin.test.ts` — 39 tests (v1: 50, delta: -11)

| Missing Category | Gap |
|-----------------|-----|
| scrollPadding interaction | ~3 |
| scrollToIndex with page mode | ~3 |
| Window resize handling | ~3 |
| IntersectionObserver visibility | ~2 |
| **Total** | **~11** |

### `table/plugin.test.ts` — 70 tests (v1: 78, delta: -8)

| Missing Category | Gap |
|-----------------|-----|
| column:click event emission | ~3 |
| range:change with table headers | ~2 |
| ARIA table role migration | ~3 |
| **Total** | **~8** |

### `core/scroll.test.ts` — 29 tests (v1: 34, delta: -5)

| Missing Category | Gap |
|-----------------|-----|
| easeInOutQuad unit test | ~2 |
| resolveScrollArgs parsing | ~2 |
| Smooth scroll cancelation | ~1 |
| **Total** | **~5** |

### `core/dom.test.ts` — 13 tests (v1: 17, delta: -4)

| Missing Category | Gap |
|-----------------|-----|
| Items wrapper element | ~2 |
| Live region (structural tests) | ~2 |
| **Total** | **~4** |

**Existing file subtotal: ~125 gap remaining**

---

## Gap 4: v2-Specific Features Not In v1 (potential new tests)

These are v2 features that had no v1 equivalent and may benefit from additional coverage.

| Feature | Current Tests | Suggested |
|---------|--------------|-----------|
| PluginContext API contract | 0 | ~20 |
| Plugin conflict detection | ~5 | ~10 |
| `defer` option (rAF init) | 0 | ~5 |
| TypedArray pipeline (phase1/phase2) | ~34 | ~10 |
| Event object reuse documentation | 7 | ~5 |
| `scrollSetFn` override | 0 | ~5 |
| Striped rows | 0 | ~3 |
| **Total** | | **~58** |

---

## Recovery Plan

### Phase 7: Boundary & Error Recovery (target: ~30 tests)

Adapt from `builder/boundary.test.ts` and `builder/recovery.test.ts`.

- [ ] Extreme item dimensions (1px, 10000px, mixed)
- [ ] Zero-dimension containers (0px height, resize from 0)
- [ ] Single item list edge cases
- [ ] ResizeObserver error recovery
- [ ] Timer/listener cleanup verification

### Phase 8: Async Plugin Deep Coverage (target: ~50 tests)

Recover from `features/async/integration.test.ts` and fill `async/plugin.test.ts` gaps.

- [ ] Loading state lifecycle (pending → loaded → error → retry)
- [ ] Error recovery with backoff
- [ ] Race condition guards under rapid scroll
- [ ] maxConcurrent limiting behavior
- [ ] Scroll-driven batch loading
- [ ] Cache invalidation
- [ ] Cancel on destroy
- [ ] Prefetch / predictive loading

### Phase 9: Cross-Feature Integration (target: ~60 tests)

Recover from `integration/features.test.ts`.

- [ ] grid + scale combination
- [ ] Three-way plugin combos (grid+selection+scale, async+groups+selection)
- [ ] scale + keyboard navigation (from `scale-keyboard-nav.test.ts`)
- [ ] Groups + async + sticky headers
- [ ] Cross-layout switching tests

### Phase 10: Memory, Performance & Data Ops (target: ~70 tests)

Recover from `builder/memory.test.ts`, `integration/performance.test.ts`, `builder/data.test.ts`.

- [ ] Sustained scroll heap growth profiling
- [ ] Large dataset operations (10K+ setItems, append, remove)
- [ ] Data ops + DOM re-render verification
- [ ] Pool/timer/listener cleanup verification
- [ ] Grid/masonry performance benchmarks
- [ ] GC-friendly teardown tests

### Phase 11: PluginContext & Builder E2E (target: ~80 tests)

Recover from `builder/context.test.ts`, `builder/index.test.ts`, `builder/materialize.test.ts`.

- [ ] PluginContext API contract (property access, hooks, state, DOM refs)
- [ ] createVList E2E (config defaults, plugin composition, DOM verification)
- [ ] Hook registration and execution order
- [ ] Deferred init (`defer` option)
- [ ] Size config resolution (height/width/fn)

### Phase 12: Remaining Plugin Gaps (target: ~40 tests)

Fill gaps in selection, page, table, scroll, dom.

- [ ] Selection: ARIA in grid, disabled items, persistence across setItems
- [ ] Page: scrollPadding, scrollToIndex, window resize
- [ ] Table: column:click, ARIA roles, range:change
- [ ] Scroll: easing unit tests, scrollSetFn, cross-axis
- [ ] DOM snapshots for grid/table/groups

### Phase 13: Range, Measured & Misc (target: ~30 tests)

- [ ] Range calculation with variable sizes
- [ ] Range after data mutation
- [ ] Overscan edge cases
- [ ] estimatedHeight fallback
- [ ] Striped row class application
- [ ] DOM structure snapshots

---

## Summary

| Phase | Category | Target Tests | Cumulative |
|-------|----------|-------------|------------|
| 1–6 | _(completed)_ | 2,911 | 2,911 |
| 7 | Boundary & error recovery | ~30 | ~2,941 |
| 8 | Async plugin deep coverage | ~50 | ~2,991 |
| 9 | Cross-feature integration | ~60 | ~3,051 |
| 10 | Memory, perf & data ops | ~70 | ~3,121 |
| 11 | PluginContext & builder E2E | ~80 | ~3,201 |
| 12 | Remaining plugin gaps | ~40 | ~3,241 |
| 13 | Range, measured & misc | ~30 | ~3,271 |
| — | v2-specific features | ~58 | **~3,329** |

**Target: ~3,300+ tests** (within ~5% of v1's 3,486, accounting for
intentionally removed builder-pattern tests).
