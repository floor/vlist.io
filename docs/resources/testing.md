# Testing

> Test suite, coverage configuration, and testing patterns for vlist.

## Overview

vlist uses [Bun's built-in test runner](https://bun.sh/docs/test/writing) with JSDOM for DOM simulation. The test suite is organized by module, mirroring the `src/` directory structure for easy navigation.

**Current stats:**

| Metric | Value |
|--------|-------|
| Total tests | 2,107 |
| Passing tests | 2,107 (100%) ✅ |
| Total assertions | 5,673 |
| Test files | 42 |
| Coverage | 94.29% lines, 93.14% functions |
| Runtime | ~20s |

**Phase 1 (Critical Gaps) ✅ COMPLETE:**
- Added 75 new tests across 3 files (boundary, recovery, async integration)
- Focused on boundary conditions, error recovery, and async robustness

**Phase 2 (Robustness) ✅ COMPLETE:**
- Added 184 new tests across 3 files (integration, memory, performance)
- Cross-feature integration scenarios, memory leak detection, performance benchmarks
- Coverage improved: lines 94.03% → 94.29%, functions 92.95% → 93.14%

## Quick Start

```bash
# Run all tests
bun test

# Run with coverage report
bun test --coverage

# Run a specific test file
bun test test/rendering/sizes.test.ts

# Run tests matching a name pattern
bun test --test-name-pattern="velocity"

# Run a directory
bun test test/builder/
bun test test/features/grid/

# Run Phase 1 tests (boundary, recovery, async integration)
bun test test/builder/boundary.test.ts
bun test test/builder/recovery.test.ts
bun test test/features/async/integration.test.ts

# Run Phase 2 tests (integration, memory, performance)
bun test test/integration/
bun test test/integration/features.test.ts
bun test test/integration/memory.test.ts
bun test test/integration/performance.test.ts

# Generate lcov report (for CI/editors)
bun test --coverage --coverage-reporter=lcov
```

## Test Structure

Tests mirror the source directory layout for easy navigation:

```
test/
├── builder/                         # Builder system (src/builder/)
│   ├── boundary.test.ts            # Edge cases: empty lists, extreme sizes, invalid values (Phase 1)
│   ├── context.test.ts             # Context creation & wiring
│   ├── core.test.ts                # Builder core (TODO)
│   ├── data.test.ts                # Data handling (TODO)
│   ├── dom.test.ts                 # DOM operations (TODO)
│   ├── index.test.ts               # Composable builder, features, integration
│   ├── materialize.test.ts         # DOM materialization & rendering
│   ├── measured.test.ts            # Measured heights
│   ├── pool.test.ts                # Element pool (DOM recycling)
│   ├── range.test.ts               # Range calculations
│   ├── recovery.test.ts            # Error handling: invalid config, adapter errors, state corruption (Phase 1)
│   ├── scroll.test.ts              # Scroll handling
│   └── velocity.test.ts            # Scroll velocity tracking
├── events/                          # Event system (src/events/)
│   └── emitter.test.ts             # Event emitter
├── features/                        # Feature tests (src/features/)
│   ├── async/                      # Async data loading
│   │   ├── feature.test.ts         # withAsync feature integration
│   │   ├── integration.test.ts     # Async loading states, race conditions, memory (Phase 1)
│   │   ├── manager.test.ts         # Data manager (coordinator)
│   │   ├── placeholder.test.ts     # Placeholder generation
│   │   └── sparse.test.ts          # Sparse chunk storage
│   ├── grid/                       # Grid layout
│   │   ├── feature.test.ts         # withGrid feature integration
│   │   ├── layout.test.ts          # Grid layout math
│   │   └── renderer.test.ts        # Grid rendering
│   ├── page/                       # Pagination
│   │   └── feature.test.ts         # withPage feature (TODO)
│   ├── scale/                      # Touch scroll & compression
│   │   └── feature.test.ts         # withScale touch handling
│   ├── scrollbar/                  # Custom scrollbar
│   │   ├── controller.test.ts      # Scroll controller (all modes)
│   │   ├── feature.test.ts         # withScrollbar feature (TODO)
│   │   └── scrollbar.test.ts       # Custom scrollbar UI
│   ├── sections/                   # Sections & sticky headers
│   │   ├── feature.test.ts         # withSections feature (TODO)
│   │   ├── layout.test.ts          # Section layout
│   │   └── sticky.test.ts          # Sticky headers (TODO)
│   ├── selection/                  # Item selection
│   │   ├── feature.test.ts         # withSelection feature (TODO)
│   │   ├── index.test.ts           # Selection state management
│   │   └── state.test.ts           # Selection state (TODO)
│   └── snapshots/                  # Scroll snapshots
│       └── feature.test.ts         # withSnapshots save/restore
├── integration/                     # Cross-cutting integration tests (Phase 2)
│   ├── features.test.ts            # Cross-feature interactions, dblclick, wrap mode, conflicts
│   ├── memory.test.ts              # Memory leak detection, DOM cleanup, create/destroy cycles
│   └── performance.test.ts         # Performance benchmarks, timing bounds, virtualization
└── rendering/                       # Rendering system (src/rendering/)
    ├── measured.test.ts             # Measured height tracking
    ├── renderer.test.ts             # DOM renderer & element pool
    ├── scale.test.ts                # Height compression (1M+ items)
    ├── sizes.test.ts                # Size cache
    └── viewport.test.ts             # Viewport calculation
```

**Structure Benefits:**
- ✅ 1:1 mapping with `src/` directory structure
- ✅ Easy to find tests: `src/features/grid/` → `test/features/grid/`
- ✅ Clear separation: builder, features, rendering, events
- ✅ Scalable as new features are added
- ✅ TODO stubs for modules awaiting comprehensive tests
- ✅ Integration tests for cross-feature scenarios, memory, and performance

## Test Inventory

### Phase 1: Critical Gaps ✅ COMPLETE

| File | Tests | What it covers |
|------|------:|----------------|
| `builder/boundary.test.ts` | 27 | Empty lists (0 items), single item lists, extreme datasets (100k-1M items), extreme dimensions (1px-10000px items), zero-dimension containers, invalid values (negative/NaN/0), rapid data mutations, viewport resizing edge cases |
| `builder/recovery.test.ts` | 26 | Invalid configuration handling, adapter errors (sync/async/malformed), ResizeObserver requirements, state corruption recovery, event handler errors, memory leak prevention, multiple destroy calls safety |
| `features/async/integration.test.ts` | 22 | Loading state transitions (aria-busy), error recovery and graceful degradation, race conditions with rapid scroll, memory leak detection, placeholder→content transitions, concurrent request handling, edge cases with async |

**Phase 1 Results:** ✅ **75 new tests, all passing (100%)**

These tests ensure vlist handles edge cases gracefully and recovers from errors without crashing. Coverage maintained at 94%+ while adding comprehensive boundary condition and error handling tests.

### Phase 2: Robustness ✅ COMPLETE

| File | Tests | Assertions | What it covers |
|------|------:|----------:|----------------|
| `integration/features.test.ts` | 87 | 130 | Double-click events (`item:dblclick`), horizontal mode with features, wrap mode `scrollToIndex`, feature method collision/conflict detection, group header click skip, scrollbar content size updates, scroll `wheel:false` config, scroll idle detection (scrolling class toggle), cross-feature destroy ordering (6 combos), async+snapshots, async+selection, async+grid, grid+selection, scale+selection, reverse+selection, reverse+snapshots, sections+grid combined, sections sticky+scroll, data operations with features, custom class prefix propagation, ARIA with selection, velocity events+idle, concurrent scroll+data |
| `integration/memory.test.ts` | 47 | 62 | DOM cleanup after destroy (root, items, scrollbar, sticky, grid, ARIA live region), create/destroy cycles with no DOM accumulation (7 feature combos + async), async destroy during pending load, event listener leak detection (accumulation, unsub, off, post-destroy), ResizeObserver disconnect tracking, timer cleanup (idle, animation frames, cancelScroll), element pool cleanup, double-destroy safety (8 feature combos), data change cleanup (setItems, append/remove, scroll+render), feature state cleanup (selection, snapshots, async reload), large dataset cleanup (100K, 1M, replace cycles) |
| `integration/performance.test.ts` | 50 | 55 | Init timing: 10K (<100ms), 100K (<500ms), 1M compressed (<2s), with features (<200ms). Render cycles: single scroll (<5–20ms), 100 consecutive (<50–100ms), compressed (<100ms). Data ops: setItems 10K (<50ms), append/prepend 1K (<10ms), updateItem (<1ms), removeItem (<5ms). Destroy: all sizes <10ms. scrollToIndex: all sizes <2–20ms. Selection: select 1K (<200ms), selectAll 10K (<100ms). Snapshots: capture <1ms, restore <5ms. Compression transitions, feature overhead bounds, virtualization correctness (rendered count stays bounded) |

**Phase 2 Results:** ✅ **184 new tests, all passing (100%)**

Phase 2 tests verify that features work correctly together, resources are properly cleaned up, and operations complete within reasonable time bounds. Coverage improved: lines 94.03% → 94.29%, functions 92.95% → 93.14%. Notable improvements: `builder/core.ts` 88.44% → 91.87% (+3.4%), `async/feature.ts` 89.90% → 96.94% (+7%).

### Builder System

| File | Tests | Assertions | What it covers |
|------|------:|----------:|----------------|
| `builder/index.test.ts` | 233 | 531 | Composable builder (`vlist().use().build()`) — builder core, validation, feature system, `withSelection`, `withScrollbar`, `withAsync`, `withScale`, `withSnapshots`, `withGrid`, `withSections`, feature combinations, reverse mode, scroll config, horizontal mode, keyboard navigation, velocity-aware loading, sticky headers, template rendering, grid scroll virtualization integration |
| `builder/materialize.test.ts` | 85 | 171 | DOM materialization — element creation, positioning, template application, update cycles, render range handling |
| `builder/data.test.ts` | 78 | 186 | SimpleDataManager — factory, getItem, isItemLoaded, getItemsInRange, setItems (full/partial/offset), updateItem, removeItem, setTotal, clear, reset, callbacks (onStateChange, onItemsLoaded), stub methods, edge cases |
| `builder/measured.test.ts` | 41 | 121 | Measured heights — dynamic height tracking, resize detection, height cache updates |
| `builder/range.test.ts` | 36 | 180 | Range calculations — visible range, render range, overscan, edge cases |
| `builder/velocity.test.ts` | 30 | 70 | Velocity tracker — sample collection, stale gap detection, momentum calculation, smoothing |
| `builder/scroll.test.ts` | 28 | 62 | Scroll handling — scroll event processing, position tracking, direction detection |
| `builder/boundary.test.ts` | 27 | 26 | Edge cases — empty lists (0 items), single item lists, extreme datasets (100k-1M items), extreme dimensions (1px-10000px), zero-dimension containers, invalid values (negative/NaN/0), rapid data mutations *(Phase 1)* |
| `builder/recovery.test.ts` | 26 | 26 | Error handling — invalid config, adapter errors (sync/async/malformed), ResizeObserver requirements, state corruption recovery, event handler errors, memory leak prevention, multiple destroy safety *(Phase 1)* |
| `builder/pool.test.ts` | 23 | 41 | Element pool — DOM element recycling, acquire/release, pool limits |
| `builder/dom.test.ts` | 10 | 16 | resolveContainer (string selector, HTMLElement, error message), createDOMStructure (nesting, classes, ARIA, horizontal mode) |
| `builder/core.test.ts` | 3 | 5 | Smoke tests — vlist() export, builder shape, use() chaining (fully covered by `index.test.ts`) |
| `builder/context.test.ts` | 1 | 1 | Export verification (fully covered by `index.test.ts` — 233 tests via builder pipeline) |

### Feature Tests

| File | Tests | Assertions | What it covers |
|------|------:|----------:|----------------|
| `features/async/manager.test.ts` | 113 | 215 | Data manager — setItems, setTotal, updateItem, removeItem, getters, loadRange, ensureRange, loadInitial, loadMore, reload, clear, reset, eviction, concurrent dedup, sparse array expansion |
| `features/async/sparse.test.ts` | 111 | 272 | Sparse storage — chunk creation, get/set, ranges, LRU eviction, cache limits, loaded range tracking, clear, stats |
| `features/async/integration.test.ts` | 22 | 22 | Loading state transitions (aria-busy), error recovery, race conditions with rapid scroll, memory leak detection, placeholder→content transitions, concurrent request handling, edge cases with async *(Phase 1)* |
| `features/scrollbar/controller.test.ts` | 119 | 193 | Scroll controller — native, compressed, window, horizontal modes, velocity tracking, stale gap detection, smoothing, compression enable/disable, wheel handling, idle detection |
| `features/grid/layout.test.ts` | 94 | 245 | Grid math — row/column calculation, item ranges, column width, offsets, round-trips, groups-aware layout with `isHeaderFn` |
| `features/grid/renderer.test.ts` | 53 | 134 | Grid rendering — positioning, gap handling, resize, variable columns |
| `features/grid/feature.test.ts` | 52 | 66 | withGrid integration — builder integration, scroll virtualization, column updates |
| `features/scrollbar/scrollbar.test.ts` | 55 | 68 | Custom scrollbar — creation, position updates, show/hide, drag interaction, auto-hide, destroy |
| `features/async/placeholder.test.ts` | 47 | 91 | Placeholder generation — structure analysis, string/number/boolean field masking, arrays, nested objects |
| `features/sections/layout.test.ts` | 47 | 328 | Section layout — header positioning, item offset, group boundaries |
| `features/snapshots/feature.test.ts` | 47 | 79 | Snapshots — getScrollSnapshot, restoreScroll, auto-restore via config, NaN guards, sizeCache rebuild, loadVisibleRange |
| `features/async/feature.test.ts` | 42 | 53 | withAsync integration — adapter loading, data flow, error handling |
| `features/selection/index.test.ts` | 61 | 100 | Selection state — single/multiple modes, toggle, range select, clear, keyboard focus |
| `features/selection/feature.test.ts` | 30 | 42 | withSelection integration — factory, modes, click/keyboard handlers, 7 public methods (select/deselect/toggleSelect/selectAll/clearSelection/getSelected/getSelectedItems), initial selection, single vs multiple mode, ARIA live region, none mode |
| `features/selection/state.test.ts` | 1 | 2 | Smoke check (fully covered by `index.test.ts` — 61 tests via barrel export) |
| `features/scale/feature.test.ts` | 26 | 48 | Touch scroll — touch drag, momentum/inertial scroll, edge clamping, cancellation, horizontal mode, touchcancel, destroy cleanup |
| `features/scrollbar/feature.test.ts` | 13 | 14 | withScrollbar integration — factory, config variants, DOM class, afterScroll/resize/destroy handler registration |
| `features/sections/feature.test.ts` | 10 | 12 | withSections integration — factory, config variants, DOM class, template/size replacement, afterScroll handler, destroy cleanup |
| `features/sections/sticky.test.ts` | 5 | 8 | createStickyHeader — factory, DOM append/remove, destroy cleanup, double-destroy safety, empty layout |
| `features/page/feature.test.ts` | 20 | 35 | withPage (window scroll) — factory, DOM modifications (overflow, height, scrollbar class), context delegation (disableViewportResize, disableWheelHandler, setScrollTarget, setScrollFns, setContainerDimensions), scroll position functions, handler registration, destroy cleanup |

### Rendering

| File | Tests | Assertions | What it covers |
|------|------:|----------:|----------------|
| `rendering/sizes.test.ts` | 83 | 1,006 | Size cache — fixed heights, function-based heights, total height, resize, range calculations |
| `rendering/viewport.test.ts` | 78 | 116 | Viewport state — visible range, render range, overscan, compression ratio, edge cases |
| `rendering/measured.test.ts` | 57 | 561 | Measured heights — dynamic height tracking, cache management |
| `rendering/scale.test.ts` | 50 | 92 | Compression — threshold detection, ratio calculation, virtual-to-actual mapping, large item counts |
| `rendering/renderer.test.ts` | 43 | 101 | DOM renderer — element pool overflow, aria-setsize updates, template re-application |

### Events

| File | Tests | Assertions | What it covers |
|------|------:|----------:|----------------|
| `events/emitter.test.ts` | 22 | 46 | Event emitter — subscribe, emit, unsubscribe, once, error isolation, listener count |

### Coverage Notes

**Phase 1 ✅ COMPLETE - Critical Gaps Addressed:**
- **Edge Cases (27 tests):** Comprehensive boundary condition testing including empty lists, single items, extreme dataset sizes (1M+ items), extreme dimensions (1px to 10000px), zero-dimension containers, invalid values (negative/NaN/0), and rapid data mutations
- **Error Handling (26 tests):** Full error recovery testing including invalid configs, adapter failures, ResizeObserver requirements, state corruption, event handler errors, memory leak prevention, and multiple destroy safety
- **Async Adapter (22 tests):** Deep testing of loading states (aria-busy), error recovery, race conditions with rapid scroll, memory management, placeholder transitions, and edge cases

**Phase 2 ✅ COMPLETE - Robustness Addressed:**
- **Integration Scenarios (87 tests):** Cross-feature interactions (dblclick events, horizontal mode, wrap mode scrollToIndex, method collision/conflict detection, group header click skip, scroll config, idle detection, 20+ feature combinations, data operations with features, ARIA, velocity events, concurrent operations)
- **Memory Leak Detection (47 tests):** DOM cleanup verification, create/destroy cycles with DOM node counting, event listener leak detection, ResizeObserver disconnect tracking, timer cleanup, element pool cleanup, double-destroy safety across all features, large dataset cleanup (100K–1M items)
- **Performance Benchmarks (50 tests):** Timing bounds for initialization (10K–1M items), render cycles, data operations, destroy, scrollToIndex, selection, snapshots, compression transitions, feature overhead comparison, virtualization correctness

**Combined Impact:** Added 259 tests across 6 files, coverage at 94.29% lines / 93.14% functions. All 2,107 tests passing.

Several modules are primarily tested through integration tests in `builder/index.test.ts` (233 tests, 531 assertions). Their dedicated test files contain smoke tests + documentation noting indirect coverage:

| File | Tests | Coverage via |
|------|------:|-------------|
| `builder/core.test.ts` | 3 | `builder/index.test.ts` — 88% lines via full builder pipeline |
| `builder/context.test.ts` | 1 | `builder/index.test.ts` — every `.build()` call creates a context |
| `builder/dom.test.ts` | 10 | Also tested in `rendering/renderer.test.ts` (same logic, different module) |
| `features/selection/state.test.ts` | 1 | `selection/index.test.ts` — 61 tests cover 100% of state.ts via barrel |

Feature integration tests wire their respective modules into the builder context using mock contexts. They verify factory shape, config validation, DOM modifications, handler registration, public method registration, and destroy cleanup — but do not duplicate the unit-level logic tests already in sibling files (e.g., `scrollbar.test.ts`, `controller.test.ts`, `layout.test.ts`).

The `page/feature.test.ts` tests are limited by JSDOM's inability to support `getBoundingClientRect()`, `window.scrollTo()`, and real layout calculations. They verify everything testable without a real browser: DOM style changes, context method delegation, handler registration, and cleanup.

**Next Steps (Phase 3 - Optional):**
- Phase 3: Cross-browser compatibility scenarios, real browser E2E tests

**Note:** Phase 1 + 2 coverage is sufficient for production use. Remaining gaps are primarily in window mode (requires real browser), touch momentum physics, and defensive error paths.

## Coverage

Coverage is configured in `bunfig.toml`:

```vlist/bunfig.toml#L1-5
[test]

# Only report coverage for source files, not the bundled dist output
coverageSkipTestFiles = true
coveragePathIgnorePatterns = ["dist/**"]
```

- **`coverageSkipTestFiles`** — excludes test files from the coverage report
- **`coveragePathIgnorePatterns`** — excludes the bundled `dist/` output (only source matters)

### Running Coverage

```bash
# Text report to console
bun test --coverage

# lcov report for CI/editors
bun test --coverage --coverage-reporter=lcov
```

The lcov report is written to `coverage/lcov.info`.

### Coverage Summary

**Overall: 94.29% lines, 93.14% functions** (2,107 tests)

After Phase 2: Added 184 new tests focused on cross-feature integration, memory leak detection, and performance benchmarks. Coverage improved from 94.03% → 94.29% lines, 92.95% → 93.14% functions. Notable improvements: `builder/core.ts` +3.4%, `async/feature.ts` +7%.

| Category | Lines | Functions | Notes |
|----------|------:|----------:|-------|
| **Builder** | | | |
| `src/builder/core.ts` | 91.87% | 87.04% | Improved with Phase 2 (was 88.44%) |
| `src/builder/dom.ts` | 100% | 100% |
| `src/builder/materialize.ts` | 97.61% | 79.12% |
| `src/builder/pool.ts` | 100% | 100% |
| `src/builder/range.ts` | 100% | 100% |
| `src/builder/scroll.ts` | 100% | 100% |
| `src/builder/velocity.ts` | 100% | 100% |
| `src/constants.ts` | 100% | 100% |
| **Events** | | |
| `src/events/emitter.ts` | 100% | 100% |
| `src/events/index.ts` | 100% | 100% |
| **Rendering** | | |
| `src/rendering/index.ts` | 100% | 100% |
| `src/rendering/measured.ts` | 100% | 100% |
| `src/rendering/renderer.ts` | 96.59% | 96.43% |
| `src/rendering/scale.ts` | 90.00% | 100% |
| `src/rendering/sizes.ts` | 100% | 100% |
| `src/rendering/viewport.ts` | 95.83% | 94.74% |
| **Features — Async** | | | |
| `src/features/async/feature.ts` | 96.94% | 80.95% | Improved with Phase 2 (was 89.90%) |
| `src/features/async/index.ts` | 100% | 100% |
| `src/features/async/manager.ts` | 100% | 100% |
| `src/features/async/placeholder.ts` | 100% | 100% |
| `src/features/async/sparse.ts` | 100% | 100% |
| **Features — Grid** | | |
| `src/features/grid/feature.ts` | 98.01% | 86.96% |
| `src/features/grid/layout.ts` | 97.71% | 100% |
| `src/features/grid/renderer.ts` | 100% | 100% |
| **Features — Page** | | |
| `src/features/page/feature.ts` | 57.14% | 77.78% |
| **Features — Scale** | | |
| `src/features/scale/feature.ts` | 88.18% | 86.96% |
| **Features — Scrollbar** | | |
| `src/features/scrollbar/controller.ts` | 97.87% | 100% |
| `src/features/scrollbar/feature.ts` | 89.06% | 75.00% |
| `src/features/scrollbar/index.ts` | 100% | 100% |
| `src/features/scrollbar/scrollbar.ts` | 97.00% | 90.48% |
| **Features — Sections** | | |
| `src/features/sections/feature.ts` | 85.22% | 82.61% |
| `src/features/sections/index.ts` | 100% | 100% |
| `src/features/sections/layout.ts` | 100% | 100% |
| `src/features/sections/sticky.ts` | 86.07% | 100% |
| `src/features/sections/types.ts` | 100% | 100% |
| **Features — Selection** | | |
| `src/features/selection/feature.ts` | 99.29% | 80.65% |
| `src/features/selection/index.ts` | 100% | 100% |
| `src/features/selection/state.ts` | 100% | 100% |
| **Features — Snapshots** | | |
| `src/features/snapshots/feature.ts` | 100% | 100% |

### Uncovered Lines

Some lines remain uncovered due to JSDOM limitations, defensive code, and edge cases:

| File | Uncovered | Reason |
|------|-----------|--------|
| `builder/core.ts` | ~8% uncovered | Horizontal wheel handler, measurement flush paths, window mode paths requiring real browser. Improved from ~14% by Phase 2 integration tests (dblclick, wrap mode, conflict detection, idle detection, scroll config) |
| `builder/materialize.ts` | ~2% uncovered | Edge cases in DOM diffing |
| `features/async/feature.ts` | ~3% uncovered | A few velocity-aware loading paths depending on real scroll timing. Improved from ~10% by Phase 2 integration tests |
| `features/page/feature.ts` | ~43% uncovered | Window scroll mode — `getBoundingClientRect()`, `window.scrollTo()`, resize listener internals all require real browser layout. Tests cover factory, DOM modifications, context delegation, and cleanup |
| `features/scale/feature.ts` | ~12% uncovered | Touch momentum physics, browser-specific paths |
| `features/scrollbar/feature.ts` | ~11% uncovered | Edge cases in destroy cleanup path |
| `features/sections/feature.ts` | ~15% uncovered | Complex section reflow paths |
| `features/sections/sticky.ts` | ~14% uncovered | Sticky header transitions requiring real layout (style assignment fails in JSDOM) |
| `rendering/scale.ts` | ~10% uncovered | Compression edge cases at extreme ratios |
| `rendering/viewport.ts` | ~4% uncovered | Defensive bounds checks |

**Note:** Despite gaps in line coverage, all critical paths are tested through integration tests in `builder/index.test.ts` (233 tests) and `integration/features.test.ts` (87 tests). The uncovered lines are primarily:
- Browser-specific features requiring real DOM/layout (window scroll, touch momentum)
- Horizontal wheel handler (requires real WheelEvent with deltaX/deltaY)
- Measurement flush during scroll (requires real ResizeObserver timing)
- Backwards compatibility code paths

## Testing Patterns

### JSDOM Setup

Every test file that touches the DOM uses JSDOM with a shared `beforeAll`/`afterAll` lifecycle:

```vlist/test/features/snapshots/feature.test.ts#L22-49
let dom: JSDOM;
let originalDocument: any;
let originalWindow: any;
let originalQueueMicrotask: any;

let originalRAF: any;

beforeAll(() => {
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  originalDocument = global.document;
  originalWindow = global.window;
  originalQueueMicrotask = global.queueMicrotask;
  originalRAF = global.requestAnimationFrame;

  global.document = dom.window.document;
  global.window = dom.window as any;
  global.HTMLElement = dom.window.HTMLElement;

  // JSDOM doesn't provide requestAnimationFrame — polyfill with setTimeout
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (cb: FrameRequestCallback): number =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number;
  }
});
```

Key points:
- Save original globals before overwriting
- Restore in `afterAll` to prevent test pollution
- `pretendToBeVisual: true` enables `requestAnimationFrame` in JSDOM
- Always close the JSDOM window in cleanup

### ResizeObserver Mock

JSDOM doesn't include `ResizeObserver`. Tests that use `vlist` or the builder (which use `ResizeObserver` internally) must provide a mock:

```/dev/null/resizeobserver-mock.ts#L1-20
global.ResizeObserver = class MockResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    // Fire immediately with initial dimensions
    this.callback([{
      target,
      contentRect: { width: 400, height: 600, /* ... */ },
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    }], this as any);
  }

  unobserve() {}
  disconnect() {}
} as any;
```

### Container Setup

Tests that create vlist instances use a container helper with `clientHeight`/`clientWidth` defined (JSDOM doesn't compute layout):

```/dev/null/container-helper.ts#L1-7
const createContainer = (): HTMLElement => {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientHeight", { value: 600 });
  Object.defineProperty(container, "clientWidth", { value: 400 });
  document.body.appendChild(container);
  return container;
};
```

### requestAnimationFrame Mock

Since JSDOM doesn't always provide `requestAnimationFrame`, tests mock it with `setTimeout`:

```/dev/null/raf-mock.ts#L1-7
global.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  return setTimeout(() => cb(performance.now()), 0) as unknown as number;
};

global.cancelAnimationFrame = (id: number): void => {
  clearTimeout(id);
};
```

### Simulating Scroll Events

JSDOM doesn't fire scroll events when `scrollTop` is set. Tests use a helper:

```/dev/null/scroll-helper.ts#L1-6
const simulateScroll = (list: VList<TestItem>, scrollTop: number): void => {
  const viewport = list.element.querySelector(".vlist-viewport") as HTMLElement;
  if (!viewport) return;
  viewport.scrollTop = scrollTop;
  viewport.dispatchEvent(new dom.window.Event("scroll"));
};
```

### Async Adapter Testing

Tests for data loading use controlled-resolution adapters to simulate network behavior:

```/dev/null/async-adapter-pattern.ts#L1-24
let resolveRead: ((v: any) => void) | null = null;

const adapter = {
  read: async ({ offset, limit }) => {
    return new Promise((resolve) => {
      resolveRead = () => resolve({
        items: items.slice(offset, offset + limit),
        total: items.length,
        hasMore: offset + limit < items.length,
      });
    });
  },
};

// Start the load
const loadPromise = manager.loadRange(0, 49);

// Assert loading state
expect(manager.getIsLoading()).toBe(true);

// Resolve when ready
resolveRead!(undefined);
await loadPromise;
```

### Integration Testing for Scroll Virtualization

Feature integration tests must verify scroll-triggered rendering, not just initial render. Many features (like `withGrid`) replace render functions but may not properly calculate visible/render ranges on scroll.

```/dev/null/scroll-virtualization-test.ts#L1-24
it("should virtualize and render multiple rows on scroll", () => {
  list = vlist<TestItem>({
    container,
    item: { height: 100, template },
    items: createTestItems(600),
  })
    .use(withGrid({ columns: 4 }))
    .build();

  // Initial: verify first rows rendered
  let indices = getRenderedIndices(list);
  expect(indices.length).toBeGreaterThan(16);
  const firstMax = Math.max(...indices);
  expect(firstMax).toBeLessThan(60);

  // Scroll down significantly
  simulateScroll(list, 2000);
  flush();

  indices = getRenderedIndices(list);
  const secondMin = Math.min(...indices);
  expect(secondMin).toBeGreaterThan(50); // Past initial rows
});
```

**Why this matters:**
- Initial render tests only verify feature setup, not ongoing virtualization
- Features that replace render functions may miss range calculation
- Without scroll tests, bugs show in production but pass all tests

**Helpers:**

```/dev/null/scroll-test-helpers.ts#L1-7
const getRenderedIndices = (list: VList<TestItem>): number[] => {
  const elements = list.element.querySelectorAll("[data-index]");
  return Array.from(elements).map((el) =>
    parseInt((el as HTMLElement).dataset.index!, 10),
  );
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
```

### Unit-Level Testing (No DOM)

Pure logic modules (velocity, range, sizes, sparse storage) can be tested without JSDOM. Import the module directly and test with plain values:

```vlist/test/builder/velocity.test.ts#L20-29
describe("velocity constants", () => {
  it("should have correct default values", () => {
    expect(VELOCITY_SAMPLE_COUNT).toBe(5);
    expect(STALE_GAP_MS).toBe(100);
    expect(MIN_RELIABLE_SAMPLES).toBe(2);
  });
});
```

This pattern is used in:
- `builder/velocity.test.ts` — velocity tracker math
- `builder/range.test.ts` — range calculations
- `features/async/sparse.test.ts` — sparse chunk storage
- `features/async/placeholder.test.ts` — placeholder generation
- `rendering/sizes.test.ts` — size cache
- `rendering/viewport.test.ts` — viewport calculations
- `rendering/scale.test.ts` — compression math

## Writing New Tests

### Conventions

- **File naming**: `<module>.test.ts`, placed in the test directory tree mirroring `src/`
- **Imports**: use `from "bun:test"` for `describe`, `it`, `expect`, `mock`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
- **Structure**: `describe` blocks grouped by feature, `it` blocks for individual behaviors
- **Assertions**: prefer specific matchers (`toBe`, `toEqual`, `toBeGreaterThan`) over generic `toBeTruthy`
- **Cleanup**: always destroy vlist instances and remove containers in `afterEach`
- **Mocking**: use `mock(() => {})` from bun:test for function spies
- **Section comments**: use `// ===` banners to separate setup, constants, and test groups

### Test Template (Pure Logic)

For modules without DOM dependency:

```/dev/null/test-template-pure.ts#L1-22
import { describe, it, expect } from "bun:test";
import { myFunction } from "../../src/module/path";

// =============================================================================
// myFunction
// =============================================================================

describe("myFunction", () => {
  it("should handle basic input", () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });

  it("should handle edge case", () => {
    const result = myFunction(edgeInput);
    expect(result).toEqual(expectedEdge);
  });
});
```

### Test Template (DOM / Builder)

For tests requiring JSDOM and the builder:

```/dev/null/test-template-dom.ts#L1-50
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";
import { vlist } from "../../src/builder/core";
import { withMyFeature } from "../../src/features/myfeature/feature";
import type { VList } from "../../src/builder/types";
import type { VListItem } from "../../src/types";

// =============================================================================
// JSDOM Setup
// =============================================================================

let dom: JSDOM;

beforeAll(() => {
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  global.document = dom.window.document;
  global.window = dom.window as any;
  global.HTMLElement = dom.window.HTMLElement;
  // ... mock ResizeObserver, requestAnimationFrame as needed
});

afterAll(() => {
  dom.window.close();
});

// =============================================================================
// Tests
// =============================================================================

interface TestItem extends VListItem { id: number; name: string; }

describe("withMyFeature", () => {
  let container: HTMLElement;
  let list: VList<TestItem> | null = null;

  beforeEach(() => { container = createContainer(); });
  afterEach(() => {
    if (list) { list.destroy(); list = null; }
    container.remove();
  });

  it("should add feature functionality", () => {
    list = vlist<TestItem>({
      container,
      item: { height: 40, template: (el, item) => { el.textContent = item.name; } },
      items: Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Item ${i}` })),
    })
      .use(withMyFeature({ option: "value" }))
      .build();

    expect(list.element).toBeDefined();
  });
});
```

### Running a Subset

```bash
# By file path
bun test test/features/scrollbar/controller.test.ts

# By directory — all files in a feature
bun test test/features/grid/
bun test test/features/async/

# All builder tests
bun test test/builder/

# All rendering tests
bun test test/rendering/

# By test name pattern
bun test --test-name-pattern="velocity"
bun test --test-name-pattern="compression"
bun test --test-name-pattern="grid"
```

## Source ↔ Test Mapping

| Source Directory | Test Directory | Files |
|-----------------|---------------|------:|
| `src/builder/` | `test/builder/` | 13 |
| `src/events/` | `test/events/` | 1 |
| `src/features/async/` | `test/features/async/` | 5 |
| `src/features/grid/` | `test/features/grid/` | 3 |
| `src/features/page/` | `test/features/page/` | 1 |
| `src/features/scale/` | `test/features/scale/` | 1 |
| `src/features/scrollbar/` | `test/features/scrollbar/` | 3 |
| `src/features/sections/` | `test/features/sections/` | 3 |
| `src/features/selection/` | `test/features/selection/` | 3 |
| `src/features/snapshots/` | `test/features/snapshots/` | 1 |
| `src/rendering/` | `test/rendering/` | 5 |
| *(cross-cutting)* | `test/integration/` | 3 |
| **Total** | | **42** |

---

*For module-specific implementation details, see the corresponding module documentation: [async data](./features/async.md), [scrollbar](./features/scrollbar.md), [rendering](./internals/rendering.md), [selection](./features/selection.md), [events](./api/events.md), [sections](./features/sections.md), [snapshots](./features/snapshots.md), [scale](./features/scale.md).*