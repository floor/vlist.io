# Testing

> Test suite, coverage configuration, and testing patterns for vlist.

## Overview

vlist uses [Bun's built-in test runner](https://bun.sh/docs/test/writing) with JSDOM for DOM simulation. The test suite is organized by module, mirroring the `src/` directory structure with `test/plugins/` matching `src/plugins/` for easy navigation.

**Current stats:**

| Metric | Value |
|--------|-------|
| Total tests | 1,701 |
| Passing tests | 1,701 (100%) ✅ |
| Total assertions | 5,943 |
| Test files | 22 |
| Coverage | 100% test pass rate |
| Runtime | ~10s |

**Status:** All tests passing after builder pattern and plugin architecture refactoring!

## Quick Start

```bash
# Run all tests
bun test

# Run with coverage report
bun test --coverage

# Run a specific test file
bun test test/data/index.test.ts

# Run tests matching a name pattern
bun test --test-name-pattern="reverse mode"

# Generate lcov report (for CI/editors)
bun test --coverage --coverage-reporter=lcov
```

## Test Structure

Tests mirror the source directory layout for easy navigation:

```
test/
├── adapters/
│   └── svelte.test.ts          # Svelte action adapter
├── builder/
│   └── index.test.ts           # Composable builder & plugin system
├── events/
│   └── index.test.ts           # Event emitter
├── plugins/                    # Plugin tests (mirrors src/plugins/)
│   ├── data/
│   │   ├── index.test.ts       # Data manager (coordinator)
│   │   ├── sparse.test.ts      # Sparse chunk storage
│   │   └── placeholder.test.ts # Placeholder generation
│   ├── grid/
│   │   ├── layout.test.ts      # Grid layout math
│   │   └── renderer.test.ts    # Grid rendering
│   ├── groups/
│   │   ├── layout.test.ts      # Group layout
│   │   └── sticky.test.ts      # Sticky group headers
│   ├── scroll/
│   │   ├── controller.test.ts  # Scroll controller (all modes)
│   │   └── scrollbar.test.ts   # Custom scrollbar
│   └── selection/
│       └── index.test.ts       # Selection state
├── render/
│   ├── compression.test.ts     # Height compression (1M+ items)
│   ├── heights.test.ts         # Height cache
│   ├── renderer.test.ts        # DOM renderer & element pool
│   └── virtual.test.ts         # Viewport calculation
├── accessibility.test.ts       # WAI-ARIA, keyboard nav, screen readers
├── core.test.ts                # Core vlist (legacy monolithic)
├── integration.test.ts         # Cross-module integration
├── reverse.test.ts             # Reverse mode (chat UI)
└── vlist-coverage.test.ts      # Full vlist edge cases & coverage
```

**Structure Benefits:**
- ✅ 1:1 mapping with `src/` directory structure
- ✅ Easy to find tests for specific modules (`test/plugins/grid/` → `src/plugins/grid/`)
- ✅ Clear separation: core tests vs plugin tests
- ✅ Scalable as new plugins are added

## Test Inventory

### Core & Integration

| File | Tests | What it covers |
|------|------:|----------------|
| `core.test.ts` | 218 | `createVList` from `vlist/core` — initialization, items, data methods, scroll, events, templates, rendering, overscan, destroy, large lists, edge cases, height cache, emitter, DOM structure, element pool, visible range, scroll position, overscan, render branches |
| `integration.test.ts` | 126 | Cross-module scenarios — horizontal mode, grid compression, groups data, reverse data, selection, event lifecycle, variable heights, validation, wrap mode, destroy idempotency |
| `vlist-coverage.test.ts` | 58 | Full `createVList` from `vlist` — scrollbar modes, grid gap, idle callbacks, compression transitions, sticky headers, event off(), window resize, adapter loading, reverse with adapter, groups scrollToIndex |
| `context.test.ts` | 20 | Context creation, wiring, state management |

### Builder & Plugins

| File | Tests | What it covers |
|------|------:|----------------|
| `builder/index.test.ts` | 233 | Composable builder (`vlist().use().build()`) — builder core, validation, plugin system, `withSelection`, `withScrollbar`, `withData`, `withCompression`, `withSnapshots`, `withGrid`, `withGroups`, plugin combinations, reverse mode, scroll config, horizontal mode, keyboard navigation, velocity-aware loading, sticky headers, template rendering, grid scroll virtualization integration tests |

### Plugin Tests (mirrors `src/plugins/`)

| File | Tests | What it covers |
|------|------:|----------------|
| `plugins/data/index.test.ts` | 113 | Data manager — setItems, setTotal, updateItem, removeItem, getters, loadRange, ensureRange, loadInitial, loadMore, reload, clear, reset, eviction, concurrent dedup, sparse array expansion |
| `plugins/data/sparse.test.ts` | 111 | Sparse storage — chunk creation, get/set, ranges, LRU eviction, cache limits, loaded range tracking, clear, stats |
| `plugins/data/placeholder.test.ts` | 63 | Placeholder generation — structure analysis, string/number/boolean field masking, arrays, nested objects |
| `plugins/scroll/controller.test.ts` | 119 | Scroll controller — native, compressed, window, horizontal modes, velocity tracking, stale gap detection, smoothing, compression enable/disable, wheel handling, idle detection |
| `plugins/scroll/scrollbar.test.ts` | 55 | Custom scrollbar — creation, position updates, show/hide, drag interaction, auto-hide, destroy |
| `plugins/selection/index.test.ts` | 61 | Selection state — single/multiple modes, toggle, range select, clear, keyboard focus |
| `plugins/grid/layout.test.ts` | 55 | Grid math — row/column calculation, item ranges, column width, offsets, round-trips |
| `plugins/grid/renderer.test.ts` | 50 | Grid rendering — positioning, gap handling, resize, variable columns |
| `plugins/groups/layout.test.ts` | 44 | Group layout — header positioning, item offset, group boundaries |
| `plugins/groups/sticky.test.ts` | 47 | Sticky headers — scroll tracking, transition, out-of-bounds, invalidation |

### Core & Rendering

| File | Tests | What it covers |
|------|------:|----------------|
| `render/heights.test.ts` | 83 | Height cache — fixed heights, function-based heights, total height, resize, range calculations |
| `render/virtual.test.ts` | 78 | Viewport state — visible range, render range, overscan, compression ratio, edge cases |
| `render/compression.test.ts` | 50 | Compression — threshold detection, ratio calculation, virtual-to-actual mapping, large item counts |
| `render/renderer.test.ts` | 15 | DOM renderer — element pool overflow, aria-setsize updates, template re-application, resolveContainer |
| `events/index.test.ts` | 22 | Event emitter — subscribe, emit, unsubscribe, once, error isolation, listener count |

### Integration & Coverage

| File | Tests | What it covers |
|------|------:|----------------|
| `core.test.ts` | 218 | Legacy `createVList` from `vlist/core` — comprehensive coverage of monolithic implementation |
| `integration.test.ts` | 126 | Cross-module scenarios — horizontal mode, grid compression, groups data, reverse data, selection, event lifecycle, variable heights, validation, wrap mode, destroy idempotency |
| `vlist-coverage.test.ts` | 58 | Full `createVList` from `vlist` — scrollbar modes, grid gap, idle callbacks, compression transitions, sticky headers, event off(), window resize, adapter loading, reverse with adapter, groups scrollToIndex |

### Cross-Cutting

| File | Tests | What it covers |
|------|------:|----------------|
| `accessibility.test.ts` | 40 | aria-setsize, aria-posinset, unique element IDs, aria-activedescendant, aria-busy, live region announcements, baseline ARIA attributes, core vlist ARIA, grid mode ARIA, keyboard navigation ARIA |
| `reverse.test.ts` | 36 | Reverse mode — validation (rejects groups/grid), initial scroll to bottom, appendItems auto-scroll, prependItems scroll preservation, setItems, data methods, selection, events, scroll save/restore, variable heights, edge cases |
| `adapters/svelte.test.ts` | 18 | Svelte action — lifecycle (create/destroy), option passing, reactive updates, event forwarding |

## Coverage

**Current Status:** ✅ **1701/1701 tests passing (100%)**

After the builder pattern and plugin architecture refactoring, all tests have been updated and are passing. The test suite provides comprehensive coverage of all features, modes, and edge cases.

Coverage is configured in `bunfig.toml`:

```toml
[test]
coverageSkipTestFiles = true
coveragePathIgnorePatterns = ["dist/**"]
```

- **`coverageSkipTestFiles`** — excludes test files from the coverage report
- **`coveragePathIgnorePatterns`** — excludes the bundled `dist/` output (only source matters)

### Running Coverage

```bash
# Run all tests
bun test

# Text report to console
bun test --coverage

# lcov report for CI/editors
bun test --coverage --coverage-reporter=lcov
```

**Test Statistics:**
- Total tests: 1701
- Passing: 1701 (100%)
- Test files: 22
- Coverage: Comprehensive across all modules and plugins

The lcov report is written to `coverage/lcov.info`.

### Coverage Breakdown

| File | Functions | Lines |
|------|----------:|------:|
| `src/adapters/svelte.ts` | 100% | 100% |
| `src/builder/core.ts` | 75.31% | 92.25% |
| `src/compression/plugin.ts` | 80% | 85.55% |
| `src/constants.ts` | 100% | 100% |
| `src/context.ts` | 100% | 100% |
| `src/core.ts` | 97.06% | 100% |
| `src/data/index.ts` | 100% | 100% |
| `src/data/manager.ts` | 100% | 100% |
| `src/data/placeholder.ts` | 100% | 100% |
| `src/data/plugin.ts` | 61.11% | 80.25% |
| `src/data/sparse.ts` | 100% | 100% |
| `src/events/emitter.ts` | 100% | 100% |
| `src/events/index.ts` | 100% | 100% |
| `src/grid/index.ts` | 100% | 100% |
| `src/grid/layout.ts` | 100% | 100% |
| `src/grid/plugin.ts` | 91.67% | 92.98% |
| `src/grid/renderer.ts` | 100% | 100% |
| `src/groups/index.ts` | 100% | 100% |
| `src/groups/layout.ts` | 100% | 100% |
| `src/groups/plugin.ts` | 76.47% | 89.78% |
| `src/groups/sticky.ts` | 100% | 100% |
| `src/groups/types.ts` | 100% | 100% |
| `src/handlers.ts` | 100% | 100% |
| `src/methods.ts` | 100% | 100% |
| `src/render/compression.ts` | 100% | 100% |
| `src/render/heights.ts` | 100% | 100% |
| `src/render/index.ts` | 100% | 100% |
| `src/render/renderer.ts` | 100% | 97.92% |
| `src/render/virtual.ts` | 94.74% | 95.83% |
| `src/scroll/controller.ts` | 100% | 99.76% |
| `src/scroll/index.ts` | 100% | 100% |
| `src/scroll/plugin.ts` | 71.43% | 80.36% |
| `src/scroll/scrollbar.ts` | 90.48% | 97% |
| `src/selection/index.ts` | 100% | 100% |
| `src/selection/plugin.ts` | 100% | 99.23% |
| `src/selection/state.ts` | 100% | 100% |
| `src/snapshots/plugin.ts` | 100% | 82.43% |
| `src/vlist.ts` | 93.33% | 99.87% |
| **All source files** | **95.57%** | **97.19%** |

### Uncovered Lines

Some lines remain uncovered due to JSDOM limitations and defensive code:

| File | Lines | Reason |
|------|-------|--------|
| `builder/core.ts` | 624-636, 959-970 | **Window scroll mode** — JSDOM doesn't support real window scrolling. These paths work in real browsers but can't be tested without Playwright/Puppeteer. |
| `snapshots/plugin.ts` | 89-96, 127-131 | **Compression snapshot paths** — Requires actual scroll position changes in compressed mode. JSDOM's `scrollTop` assignment doesn't actually scroll. |
| `scroll/plugin.ts` | 125-131 | **Scrollbar thumb drag** — Requires real mouse drag events with coordinates. |
| `data/plugin.ts` | 144-151, 171-176 | **Velocity-aware loading** — Requires scroll velocity tracking which depends on real scroll timing. |
| `scroll/controller.ts` | L527 | **Coverage tool quirk** — the `} else {` between horizontal and non-horizontal scroll restore branches. The else body IS executed (4 hits). |
| `vlist.ts` | L1240 | **Defensive `.catch()`** — the error handler on `dataManager.loadInitial().catch(...)`. The promise never rejects in practice. |

These edge cases work correctly in production (real browsers) but would require browser-based testing tools (Playwright, Puppeteer) to cover in automated tests.

## Testing Patterns

### JSDOM Setup

Every test file that touches the DOM uses JSDOM with a shared `beforeAll`/`afterAll` lifecycle:

```typescript
import { beforeAll, afterAll } from "bun:test";
import { JSDOM } from "jsdom";

let dom: JSDOM;

beforeAll(() => {
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  global.document = dom.window.document;
  global.window = dom.window as any;
  global.HTMLElement = dom.window.HTMLElement;
  // ... other globals
});

afterAll(() => {
  // Restore originals
  dom.window.close();
});
```

### ResizeObserver Mock

JSDOM doesn't include `ResizeObserver`. Tests that use `createVList` or the builder (which use `ResizeObserver` internally) must provide a mock:

```typescript
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

```typescript
const createContainer = (): HTMLElement => {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientHeight", { value: 600 });
  Object.defineProperty(container, "clientWidth", { value: 400 });
  document.body.appendChild(container);
  return container;
};
```

### Mock Context Pattern

Handler tests use a mock `VListContext` to test handlers in isolation without creating a full vlist instance:

```typescript
const ctx = {
  config: createMockConfig({ hasAdapter: true }),
  dom: createMockDOM(),
  dataManager: createMockDataManager(items),
  scrollController: createMockScrollController(),
  renderer: createMockRenderer(),
  emitter: createMockEmitter(),
  state: createMockState(),
  // ...
};

const handler = createScrollHandler(ctx, renderCallback);
handler(scrollTop, direction);
```

### Async Adapter Testing

Tests for data loading use controlled-resolution adapters to simulate network behavior:

```typescript
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

### requestAnimationFrame Mock

Since JSDOM doesn't have `requestAnimationFrame`, tests mock it with `setTimeout`:

```typescript
global.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  return setTimeout(() => cb(performance.now()), 0) as unknown as number;
};

global.cancelAnimationFrame = (id: number): void => {
  clearTimeout(id);
};
```

### Simulating Scroll Events

JSDOM doesn't fire scroll events when `scrollTop` is set. Tests use a helper:

```typescript
const simulateScroll = (list: BuiltVList<TestItem>, scrollTop: number): void => {
  const viewport = list.element.querySelector(".vlist-viewport") as HTMLElement;
  if (!viewport) return;
  viewport.scrollTop = scrollTop;
  viewport.dispatchEvent(new dom.window.Event("scroll"));
};
```

### Integration Testing for Scroll Virtualization

**Critical pattern**: Plugin integration tests must verify scroll-triggered rendering, not just initial render. Many plugins (like `withGrid`) replace render functions but may not properly calculate visible/render ranges on scroll.

```typescript
it("should virtualize and render multiple rows on scroll", () => {
  // Use tall container to show multiple rows
  container.style.height = "600px";

  list = vlist<TestItem>({
    container,
    item: { height: 100, template },
    items: createTestItems(600), // Many items
  })
    .use(withGrid({ columns: 4 }))
    .build();

  // Initial: verify first rows rendered
  let indices = getRenderedIndices(list);
  expect(indices.length).toBeGreaterThan(16); // More than 1 row
  const firstMax = Math.max(...indices);
  expect(firstMax).toBeLessThan(60); // Still near top

  // Scroll down significantly
  simulateScroll(list, 2000);
  flush(); // Wait for RAF

  indices = getRenderedIndices(list);
  const secondMin = Math.min(...indices);
  const secondMax = Math.max(...indices);

  // Range should have shifted - virtualization working!
  expect(secondMin).toBeGreaterThan(50); // Past initial rows
  expect(secondMax).toBeGreaterThan(firstMax); // Further than before
});
```

**Why this matters:**

- Initial render tests only verify plugin setup, not ongoing virtualization
- Plugins that replace render functions may miss range calculation
- Without scroll tests, bugs show in production but pass all tests
- This pattern caught the grid plugin bug where only first row rendered

**Helper used:**

```typescript
const getRenderedIndices = (list: BuiltVList<TestItem>): number[] => {
  const elements = list.element.querySelectorAll("[data-index]");
  return Array.from(elements).map((el) =>
    parseInt((el as HTMLElement).dataset.index!, 10),
  );
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
```

## Writing New Tests

### Conventions

- **File naming**: `<module>.test.ts`, placed next to the module in the test directory tree
- **Imports**: use `from "bun:test"` for `describe`, `it`, `expect`, `mock`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
- **Structure**: `describe` blocks grouped by feature, `it` blocks for individual behaviors
- **Assertions**: prefer specific matchers (`toBe`, `toEqual`, `toBeGreaterThan`) over generic `toBeTruthy`
- **Cleanup**: always destroy vlist instances and remove containers in `afterEach`
- **Mocking**: use `mock(() => {})` from bun:test for function spies

### Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";

describe("myFeature", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it("should do something specific", () => {
    // Arrange
    const items = createTestItems(20);

    // Act
    const result = myFunction(items);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Builder Plugin Test Template

```typescript
import { vlist } from "../src/builder/core";
import { withSelection } from "../src/selection/plugin";
import { withScrollbar } from "../src/scroll/plugin";

describe("withMyPlugin plugin", () => {
  let container: HTMLElement;
  let list: BuiltVList<TestItem> | null = null;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    if (list) {
      list.destroy();
      list = null;
    }
    container.remove();
  });

  it("should add plugin functionality", () => {
    list = vlist<TestItem>({
      container,
      item: { height: 40, template },
      items: createTestItems(20),
    })
      .use(withMyPlugin({ option: "value" }))
      .build();

    expect(list.myPluginMethod).toBeDefined();
  });

  it("should work with other plugins", () => {
    list = vlist<TestItem>({
      container,
      item: { height: 40, template },
      items: createTestItems(20),
    })
      .use(withMyPlugin())
      .use(withSelection({ mode: "multiple" }))
      .use(withScrollbar())
      .build();

    // Test combined functionality
    expect(list.element).toBeDefined();
  });
});
```

### Running a Subset

```bash
# By file path (note: now under test/plugins/)
bun test test/plugins/scroll/controller.test.ts

# Test a specific plugin
bun test test/plugins/grid/
bun test test/plugins/groups/

# Test the builder
bun test test/builder/

# Test by pattern
bun test --test-name-pattern "grid"
bun test --test-name-pattern "selection"
```

---

## Test Structure Reorganization

**Recent Update (2026-02-16):** The test structure was reorganized to mirror the `src/` directory structure after the plugin architecture refactoring.

**Key Changes:**
- Plugin tests moved to `test/plugins/` subdirectory
- Builder tests moved to `test/builder/` subdirectory
- Clear 1:1 mapping with source code structure

**Migration:**
- `test/grid/` → `test/plugins/grid/`
- `test/groups/` → `test/plugins/groups/`
- `test/selection/` → `test/plugins/selection/`
- `test/scroll/` → `test/plugins/scroll/`
- `test/data/` → `test/plugins/data/`
- `test/builder.test.ts` → `test/builder/index.test.ts`

**Benefits:**
- Easy navigation: find tests for `src/plugins/grid/` at `test/plugins/grid/`
- Scalable: new plugins follow same pattern
- Consistent: test structure matches source structure
- Maintainable: clear organization as project grows

**All 1701 tests continue to pass (100%) after reorganization.**

# By test name pattern
bun test --test-name-pattern="compression"

# By directory (all files in data/)
bun test test/data/

# Builder tests only
bun test test/builder.test.ts
```

---

*For module-specific implementation details, see the corresponding module documentation: [data](./data.md), [scroll](./scroll.md), [render](./render.md), [selection](./selection.md), [events](./events.md), [handlers](./handlers.md), [methods](./methods.md), [accessibility](./accessibility.md).*