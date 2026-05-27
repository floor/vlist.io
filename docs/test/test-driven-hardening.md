---
title: Test-Driven Hardening — v2 Recovery Report
date: 2026-05-27
v2_start: 2633
v2_final: 3223
v1_baseline: 3486
recovery_rate: 69%
phases: 13
status: complete
---

# Test-Driven Hardening — v2 Recovery Report

The v2 rewrite changed the architecture from builder pattern (`vlist().use().build()`) to
plugin factory (`createVList(config, [plugins])`). During this rewrite, 51 test files were
deleted and 48 new ones created — resulting in ~853 fewer tests (2,633 vs 3,486). This
document records the systematic recovery of that coverage across 13 phases.

## Final State

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Tests | 2,633 | 3,223 | +590 |
| Passing | 2,604 | 3,223 | +619 |
| Failing | 29 | 0 | -29 |
| Test files | 80 | 92 | +12 |
| Function coverage | 93.98% | 94.80% | +0.82% |
| Line coverage | 94.30% | 95.99% | +1.69% |
| Runtime (concurrent) | ~9s | ~11s | +2s |

The remaining gap vs v1 (~263 tests) consists of:
- Builder-pattern API tests that have no v2 equivalent (builder chaining, `.use()` method)
- `BuilderContext` unit tests replaced by `PluginContext` integration coverage
- Redundant coverage where v2's architecture naturally exercises the same paths differently

## Phase Summary

| Phase | Commit | Tests | Cumulative | Description |
|-------|--------|-------|------------|-------------|
| 1 | `3bdd640` | +0 | 2,633 | Source fixes: config validation, template errors, plugin/destroy resilience |
| 2 | `13c001e` | +155 | 2,788 | Scroll bounds, grid/masonry 2D keyboard nav, performance benchmarks |
| 3 | `1f5aae6` | +45 | 2,833 | `item:dblclick`, `item:contextmenu` events, 16M size warning, live region |
| 4 | `1e6f670` | +57 | 2,890 | A11y extended, event reuse safety, autosize gap, selection+groups |
| 5 | `fa6fabd` | +71 | 2,961 | Data ops edge cases, error recovery, range/overscan, scroll event pipeline |
| 6 | `9439b46` | +51 | 3,012 | Fix 29 groups/layout failures, scrollToIndex alignment, horizontal mode |
| 7 | `687eedc` | +45 | 3,057 | Boundary conditions: extreme dims, zero containers, data transitions, cleanup |
| 8 | `c319599` | +33 | ~3,057 | Async lifecycle: velocity gating, preload, idle, ARIA, chunk dedup |
| 9 | `49779ef` | +42 | ~3,057 | Cross-feature integration: three-way combos, async+grid/table/groups |
| 10 | `338a747` | +48 | 3,057 | Memory leak detection, perf benchmarks, data operation sequences |
| 11 | uncommitted | +80 | 3,137 | Scroll handler extended, core E2E, easing, config/plugin validation |
| 12 | uncommitted | +40 | 3,177 | Selection extended (Shift+Arrow, followFocus), table extended (events, sync) |
| 13 | uncommitted | +46 | 3,223 | Pipeline unit tests, DOM snapshots, data ops extended |

Phases 8-9 were committed together with Phase 10 since they shared the same verification step.

## Files Created

### Phase 1 — Source Fixes (no test files)

Source changes only: config validation in `create.ts`, template error wrapping,
plugin destroy resilience, `--scrolling` class lifecycle.

### Phase 2 — Scroll, Navigation, Performance

| File | Tests | Scope |
|------|-------|-------|
| `test/core/scroll-events.test.ts` | 9 | Scroll event pipeline (scroll, velocity:change, range:change, idle) |
| `test/plugins/grid/keyboard-nav.test.ts` | 58 | 2D keyboard navigation in grid layout |
| `test/plugins/masonry/keyboard-nav.test.ts` | 58 | 2D keyboard navigation in masonry layout |
| `test/integration/performance.test.ts` | 17 | Init/render/scroll benchmarks with 10K/100K items |
| `test/core/validation.test.ts` | 17 | Config validation: height/width/gap/overscan |

### Phase 3 — Events & Accessibility

| File | Tests | Scope |
|------|-------|-------|
| `test/core/mouse-events.test.ts` | 9 | item:click, item:dblclick, item:contextmenu emission |
| _Source changes_ | — | `item:dblclick` event, 16M content size warning, live region announcements |

### Phase 4 — A11y, Events, Selection

| File | Tests | Scope |
|------|-------|-------|
| `test/core/a11y-extended.test.ts` | 12 | PageUp/PageDown, empty list, destroy cleanup |
| `test/events/emitter-extended.test.ts` | 7 | Event payload reuse safety |
| `test/plugins/autosize/gap.test.ts` | 14 | Autosize with gap handling |
| `test/plugins/selection/groups.test.ts` | 41 | Range selection with group headers |

### Phase 5 — Data, Recovery, Range, Scroll

| File | Tests | Scope |
|------|-------|-------|
| `test/core/data-ops.test.ts` | 28 | setItems, append, prepend, insert, update, remove edge cases |
| `test/integration/resilience.test.ts` | 10 | Error recovery: template throws, plugin errors |
| `test/core/range.test.ts` | 13 | range:change, scroll events, velocity, overscan |
| `test/core/scroll-events.test.ts` | +9 | Additional scroll event pipeline tests |

### Phase 6 — Groups Fix & Horizontal

| File | Tests | Scope |
|------|-------|-------|
| `test/plugins/groups/layout.test.ts` | (fixed 29) | Adapted groups/layout tests to v2 API |
| `test/core/horizontal.test.ts` | 10 | Horizontal mode DOM, scrolling, rendering |
| `test/core/boundary.test.ts` | 20 | Extreme dims, zero containers, single items, data transitions |

### Phase 7 — Boundary Conditions

| File | Tests | Scope |
|------|-------|-------|
| `test/core/boundary.test.ts` | +25 | ResizeObserver errors, timer/listener cleanup, deferred render |

### Phase 8 — Async Lifecycle

| File | Tests | Scope |
|------|-------|-------|
| `test/plugins/async/lifecycle.test.ts` | 33 | Velocity gating, preload, idle hooks, chunk dedup, error resilience, ARIA busy, autoLoad, network recovery, destroy cleanup |

### Phase 9 — Cross-Feature Integration

| File | Tests | Scope |
|------|-------|-------|
| `test/integration/cross-feature.test.ts` | 42 | Three-way plugin combos, grid+scale, async+grid/groups/table, concurrent ops, destroy ordering, ARIA with selection |

### Phase 10 — Memory & Performance

| File | Tests | Scope |
|------|-------|-------|
| `test/integration/memory-extended.test.ts` | 21 | DOM leak detection per plugin, event listener cleanup, ResizeObserver cleanup, timer cleanup |
| `test/integration/perf-data-ops.test.ts` | 27 | Init with plugins, render cycles, data ops with plugins, destroy, setItems edge cases, mutation sequences |

### Phase 11 — Core E2E & Scroll Handler

| File | Tests | Scope |
|------|-------|-------|
| `test/core/scroll-extended.test.ts` | 45 | Wheel handler (vertical/horizontal), SCROLL_EASING, scroll state, smooth scroll edge cases, scroll cycle |
| `test/core/core-e2e.test.ts` | 35 | Config validation, plugin validation, horizontal E2E, smooth scrollToIndex, destroy safety, data ops, scroll config |

### Phase 12 — Plugin Gaps

| File | Tests | Scope |
|------|-------|-------|
| `test/plugins/selection/extended.test.ts` | 20 | Shift+Arrow toggle, Shift+Space range, followFocus, scroll alignment, Delete/Backspace events |
| `test/plugins/table/extended.test.ts` | 20 | Roles/ARIA, column events, header scroll sync, range events, table+selection integration |

### Phase 13 — Range, Snapshots, Data Ops

| File | Tests | Scope |
|------|-------|-------|
| `test/core/pipeline.test.ts` | 20 | `phase1Calculate` unit tests: range calculation, overscan, fast path, capacity cap, startPadding |
| `test/rendering/snapshots.test.ts` | 12 | DOM structure verification: vertical, horizontal, custom classPrefix |
| `test/core/data-ops-extended.test.ts` | 14 | State transitions, re-render on mutation, string IDs, sequential mutations, getItemAt |

## Key Discoveries

### API Differences (v1 vs v2)

- **Selection**: `(list as any).select(id)` via `ctx.registerMethod`, config uses `mode: "multiple"` not `multiple: true`
- **Grid**: `list.total` returns row count (items/columns), `list.items.length` for actual item count
- **Async**: `list.items.length` stays 0 for async data, `list.total` for async total
- **Groups**: group headers have `data-index` in v2 (clicks DO emit `item:click`)
- **Selection**: no `aria-multiselectable` attribute set by v2 selection plugin

### Concurrent Test Isolation

Several tests required fixes for `bun test --concurrent` mode:

- **Shared module-level variables**: Tests using `beforeEach` to set a shared `container` variable race in concurrent mode. Fix: each test creates its own local container.
- **Global `window` events**: `window.dispatchEvent(new Event("online"))` in one test races with another test's handler. Fix: set `destroyed = true` before `await`.
- **Timer starvation**: `setTimeout` callbacks get starved under concurrent load. Fix: use event-based waits (`list.on("scroll:idle", resolve)`) instead of fixed timeouts.
- **`clientHeight`/`clientWidth` mocks**: Global property overrides must be set in `beforeAll`/`afterAll` within each file, not relied upon from other files.

### Critical Init Ordering

`engineState.initialized = true` must be set AFTER `plugin.setup(ctx)`, not before.
During `createDataManager` construction, `notifyDataChange()` fires and calls `onDataChange`
which checks `initialized` then calls `dataManager.getTotal()` — but `dataManager` is still
being assigned. Setting `initialized` early causes a null-reference crash.

### Error Swallowing

`loadRange` in `src/plugins/async/manager.ts` catches errors internally and stores them
in a local `error` variable without re-throwing. The `.catch(onEnsureError)` in `plugin.ts`
never fires for adapter errors. Tests must verify error state rather than catch handlers.

## Coverage Weak Spots

After all 13 phases, these areas have the lowest coverage:

| Module | Function % | Line % | Notes |
|--------|-----------|--------|-------|
| `plugins/groups/plugin.ts` | ~70% | ~75% | Complex layout, async bridge paths, pre-existing type errors |
| `plugins/async/manager.ts` | 95% | 90% | Edge cases in eviction, reload, error recovery |
| `plugins/async/plugin.ts` | 86% | 92% | Some autoLoad paths, online/offline edge cases |
| `core/pipeline.ts` | 86% | 99.6% | Safety cap branch rarely hit in tests |
| `core/create.ts` | 91% | 94% | Some plugin replacement method paths |
