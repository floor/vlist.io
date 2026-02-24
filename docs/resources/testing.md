# Testing

> Test suite, coverage configuration, and testing patterns for vlist.

## Overview

vlist uses [Bun's built-in test runner](https://bun.sh/docs/test/writing) with JSDOM for DOM simulation. The test suite is organized by module, mirroring the `src/` directory structure for easy navigation.

**Current stats:**

| Metric | Value |
|--------|-------|
| Total tests | 1,848 |
| Passing tests | 1,848 (100%) ✅ |
| Total assertions | 5,334 |
| Test files | 36 |
| Coverage | 93.98% lines, 92.86% functions |
| Runtime | ~10s |

> **Coverage note:** Overall percentages decreased from 97%→94% because `page/feature.ts` (window scroll mode) is now imported by its test file, adding ~60 uncovered lines to the report. Previously it was invisible to coverage since no test imported it. The actual amount of tested code *increased*.

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

# Generate lcov report (for CI/editors)
bun test --coverage --coverage-reporter=lcov
```

## Test Structure

Tests mirror the source directory layout for easy navigation:

```
test/
├── builder/                         # Builder system (src/builder/)
│   ├── context.test.ts             # Context creation & wiring
│   ├── core.test.ts                # Builder core (TODO)
│   ├── data.test.ts                # Data handling (TODO)
│   ├── dom.test.ts                 # DOM operations (TODO)
│   ├── index.test.ts               # Composable builder, features, integration
│   ├── materialize.test.ts         # DOM materialization & rendering
│   ├── measured.test.ts            # Measured heights
│   ├── pool.test.ts                # Element pool (DOM recycling)
│   ├── range.test.ts               # Range calculations
│   ├── scroll.test.ts              # Scroll handling
│   └── velocity.test.ts            # Scroll velocity tracking
├── events/                          # Event system (src/events/)
│   └── emitter.test.ts             # Event emitter
├── features/                        # Feature tests (src/features/)
│   ├── async/                      # Async data loading
│   │   ├── feature.test.ts         # withAsync feature integration
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

## Test Inventory

### Builder System

| File | Tests | Assertions | What it covers |
|------|------:|----------:|----------------|
| `builder/index.test.ts` | 233 | 531 | Composable builder (`vlist().use().build()`) — builder core, validation, feature system, `withSelection`, `withScrollbar`, `withAsync`, `withScale`, `withSnapshots`, `withGrid`, `withSections`, feature combinations, reverse mode, scroll config, horizontal mode, keyboard navigation, velocity-aware loading, sticky headers, template rendering, grid scroll virtualization integration |
| `builder/materialize.test.ts` | 85 | 171 | DOM materialization — element creation, positioning, template application, update cycles, render range handling |
| `builder/measured.test.ts` | 41 | 121 | Measured heights — dynamic height tracking, resize detection, height cache updates |
| `builder/range.test.ts` | 36 | 180 | Range calculations — visible range, render range, overscan, edge cases |
| `builder/velocity.test.ts` | 30 | 70 | Velocity tracker — sample collection, stale gap detection, momentum calculation, smoothing |
| `builder/scroll.test.ts` | 28 | 62 | Scroll handling — scroll event processing, position tracking, direction detection |
| `builder/pool.test.ts` | 23 | 41 | Element pool — DOM element recycling, acquire/release, pool limits |
| `builder/context.test.ts` | 1 | 1 | Export verification (fully covered by `index.test.ts` — 233 tests via builder pipeline) |
| `builder/core.test.ts` | 3 | 5 | Smoke tests — vlist() export, builder shape, use() chaining (fully covered by `index.test.ts`) |
| `builder/data.test.ts` | 78 | 186 | SimpleDataManager — factory, getItem, isItemLoaded, getItemsInRange, setItems (full/partial/offset), updateItem, removeItem, setTotal, clear, reset, callbacks (onStateChange, onItemsLoaded), stub methods, edge cases |
| `builder/dom.test.ts` | 10 | 16 | resolveContainer (string selector, HTMLElement, error message), createDOMStructure (nesting, classes, ARIA, horizontal mode) |

### Feature Tests

| File | Tests | Assertions | What it covers |
|------|------:|----------:|----------------|
| `features/async/manager.test.ts` | 113 | 215 | Data manager — setItems, setTotal, updateItem, removeItem, getters, loadRange, ensureRange, loadInitial, loadMore, reload, clear, reset, eviction, concurrent dedup, sparse array expansion |
| `features/async/sparse.test.ts` | 111 | 272 | Sparse storage — chunk creation, get/set, ranges, LRU eviction, cache limits, loaded range tracking, clear, stats |
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

Several modules are primarily tested through integration tests in `builder/index.test.ts` (233 tests, 531 assertions). Their dedicated test files contain smoke tests + documentation noting indirect coverage:

| File | Tests | Coverage via |
|------|------:|-------------|
| `builder/core.test.ts` | 3 | `builder/index.test.ts` — 86% lines via full builder pipeline |
| `builder/context.test.ts` | 1 | `builder/index.test.ts` — every `.build()` call creates a context |
| `builder/dom.test.ts` | 10 | Also tested in `rendering/renderer.test.ts` (same logic, different module) |
| `features/selection/state.test.ts` | 1 | `selection/index.test.ts` — 61 tests cover 100% of state.ts via barrel |

Feature integration tests wire their respective modules into the builder context using mock contexts. They verify factory shape, config validation, DOM modifications, handler registration, public method registration, and destroy cleanup — but do not duplicate the unit-level logic tests already in sibling files (e.g., `scrollbar.test.ts`, `controller.test.ts`, `layout.test.ts`).

The `page/feature.test.ts` tests are limited by JSDOM's inability to support `getBoundingClientRect()`, `window.scrollTo()`, and real layout calculations. They verify everything testable without a real browser: DOM style changes, context method delegation, handler registration, and cleanup.

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

**Overall: 93.98% lines, 92.86% functions**

> The overall percentage decreased from 97%→94% because `page/feature.ts` (window scroll mode, ~175 lines) is now imported by its test file and counted in the report. Previously it was invisible since no test touched it. See the Page entry below for details.

| Category | Lines | Functions |
|----------|------:|----------:|
| **Builder** | | |
| `src/builder/core.ts` | 86.34% | 81.48% |
| `src/builder/dom.ts` | 97.96% | 100% |
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
| **Features — Async** | | |
| `src/features/async/feature.ts` | 89.90% | 75.00% |
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
| `builder/core.ts` | ~14% uncovered | Error paths, edge cases, compression branches, window mode paths requiring real browser |
| `builder/materialize.ts` | ~2% uncovered | Edge cases in DOM diffing |
| `features/async/feature.ts` | ~10% uncovered | Velocity-aware loading paths depending on real scroll timing |
| `features/page/feature.ts` | ~43% uncovered | Window scroll mode — `getBoundingClientRect()`, `window.scrollTo()`, resize listener internals all require real browser layout. Tests cover factory, DOM modifications, context delegation, and cleanup |
| `features/scale/feature.ts` | ~12% uncovered | Touch momentum physics, browser-specific paths |
| `features/scrollbar/feature.ts` | ~11% uncovered | Edge cases in destroy cleanup path |
| `features/sections/feature.ts` | ~15% uncovered | Complex section reflow paths |
| `features/sections/sticky.ts` | ~14% uncovered | Sticky header transitions requiring real layout (style assignment fails in JSDOM) |
| `rendering/scale.ts` | ~10% uncovered | Compression edge cases at extreme ratios |
| `rendering/viewport.ts` | ~4% uncovered | Defensive bounds checks |

**Note:** Despite gaps in line coverage, all critical paths are tested through integration tests in `builder/index.test.ts`. The uncovered lines are primarily:
- Error handling paths (throw statements, defensive guards)
- Browser-specific features requiring real DOM/layout
- Touch/momentum physics edge cases
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
const simulateScroll = (list: BuiltVList<TestItem>, scrollTop: number): void => {
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
const getRenderedIndices = (list: BuiltVList<TestItem>): number[] => {
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
import type { BuiltVList } from "../../src/builder/types";
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
  let list: BuiltVList<TestItem> | null = null;

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
| `src/builder/` | `test/builder/` | 11 |
| `src/events/` | `test/events/` | 1 |
| `src/features/async/` | `test/features/async/` | 4 |
| `src/features/grid/` | `test/features/grid/` | 3 |
| `src/features/page/` | `test/features/page/` | 1 |
| `src/features/scale/` | `test/features/scale/` | 1 |
| `src/features/scrollbar/` | `test/features/scrollbar/` | 3 |
| `src/features/sections/` | `test/features/sections/` | 3 |
| `src/features/selection/` | `test/features/selection/` | 3 |
| `src/features/snapshots/` | `test/features/snapshots/` | 1 |
| `src/rendering/` | `test/rendering/` | 5 |
| **Total** | | **36** |

---

*For module-specific implementation details, see the corresponding module documentation: [async data](./features/async.md), [scrollbar](./features/scrollbar.md), [rendering](./internals/rendering.md), [selection](./features/selection.md), [events](./api/events.md), [sections](./features/sections.md), [snapshots](./features/snapshots.md), [scale](./features/scale.md).*