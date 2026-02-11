# Testing

> Test suite, coverage configuration, and testing patterns for vlist.

## Overview

vlist uses [Bun's built-in test runner](https://bun.sh/docs/test/writing) with JSDOM for DOM simulation. The test suite is organized by module, mirroring the `src/` directory structure, with additional cross-cutting test files for integration, accessibility, and reverse mode.

**Current stats:**

| Metric | Value |
|--------|-------|
| Total tests | 1,644 |
| Total assertions | 5,621 |
| Test files | 24 |
| Line coverage | 99.99% |
| Function coverage | 99.68% |
| Files at 100% lines | 28 of 30 |
| Runtime | ~10s |

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

Tests mirror the source directory layout:

```
test/
├── adapters/
│   └── svelte.test.ts          # Svelte action adapter
├── data/
│   ├── index.test.ts           # Data manager (coordinator)
│   ├── sparse.test.ts          # Sparse chunk storage
│   └── placeholder.test.ts     # Placeholder generation
├── events/
│   └── index.test.ts           # Event emitter
├── grid/
│   ├── layout.test.ts          # Grid layout math
│   └── renderer.test.ts        # Grid rendering
├── groups/
│   ├── layout.test.ts          # Group layout
│   └── sticky.test.ts          # Sticky group headers
├── render/
│   ├── compression.test.ts     # Height compression (1M+ items)
│   ├── heights.test.ts         # Height cache
│   ├── renderer.test.ts        # DOM renderer & element pool
│   └── virtual.test.ts         # Viewport calculation
├── scroll/
│   ├── controller.test.ts      # Scroll controller (all modes)
│   └── scrollbar.test.ts       # Custom scrollbar
├── selection/
│   └── index.test.ts           # Selection state
├── accessibility.test.ts       # WAI-ARIA, keyboard nav, screen readers
├── context.test.ts             # Internal context wiring
├── core.test.ts                # Core vlist (lightweight entry point)
├── handlers.test.ts            # Scroll, click, keyboard handlers
├── integration.test.ts         # Cross-module integration
├── methods.test.ts             # Public API methods
├── reverse.test.ts             # Reverse mode (chat UI)
└── vlist-coverage.test.ts      # Full vlist edge cases & coverage
```

## Test Inventory

### Core & Integration

| File | Tests | What it covers |
|------|------:|----------------|
| `core.test.ts` | 218 | `createVList` from `vlist/core` — initialization, items, data methods, scroll, events, templates, rendering, overscan, destroy, large lists, edge cases, height cache, emitter, DOM structure, element pool, visible range, scroll position, overscan, render branches |
| `integration.test.ts` | 126 | Cross-module scenarios — horizontal mode, grid compression, groups data, reverse data, selection, event lifecycle, variable heights, validation, wrap mode, destroy idempotency |
| `vlist-coverage.test.ts` | 58 | Full `createVList` from `vlist` — scrollbar modes, grid gap, idle callbacks, compression transitions, sticky headers, event off(), window resize, adapter loading, reverse with adapter, groups scrollToIndex |
| `context.test.ts` | 20 | Context creation, wiring, state management |

### Feature Modules

| File | Tests | What it covers |
|------|------:|----------------|
| `data/index.test.ts` | 113 | Data manager — setItems, setTotal, updateItem, removeItem, getters, loadRange, ensureRange, loadInitial, loadMore, reload, clear, reset, eviction, concurrent dedup, sparse array expansion |
| `data/sparse.test.ts` | 111 | Sparse storage — chunk creation, get/set, ranges, LRU eviction, cache limits, loaded range tracking, clear, stats |
| `data/placeholder.test.ts` | 63 | Placeholder generation — structure analysis, string/number/boolean field masking, arrays, nested objects |
| `scroll/controller.test.ts` | 119 | Scroll controller — native, compressed, window, horizontal modes, velocity tracking, stale gap detection, smoothing, compression enable/disable, wheel handling, idle detection |
| `scroll/scrollbar.test.ts` | 55 | Custom scrollbar — creation, position updates, show/hide, drag interaction, auto-hide, destroy |
| `render/heights.test.ts` | 83 | Height cache — fixed heights, function-based heights, total height, resize, range calculations |
| `render/virtual.test.ts` | 78 | Viewport state — visible range, render range, overscan, compression ratio, edge cases |
| `render/compression.test.ts` | 50 | Compression — threshold detection, ratio calculation, virtual-to-actual mapping, large item counts |
| `render/renderer.test.ts` | 15 | DOM renderer — element pool overflow, aria-setsize updates, template re-application, resolveContainer |
| `selection/index.test.ts` | 61 | Selection state — single/multiple modes, toggle, range select, clear, keyboard focus |
| `events/index.test.ts` | 22 | Event emitter — subscribe, emit, unsubscribe, once, error isolation, listener count |
| `grid/layout.test.ts` | 55 | Grid math — row/column calculation, item ranges, column width, offsets, round-trips |
| `grid/renderer.test.ts` | 50 | Grid rendering — positioning, gap handling, resize, variable columns |
| `groups/layout.test.ts` | 44 | Group layout — header positioning, item offset, group boundaries |
| `groups/sticky.test.ts` | 47 | Sticky headers — scroll tracking, transition, out-of-bounds, invalidation |

### API & Handlers

| File | Tests | What it covers |
|------|------:|----------------|
| `handlers.test.ts` | 72 | Scroll handler — infinite scroll, velocity gating, preloading, pending range, idle load. Click handler — item click, selection. Keyboard handler — arrow keys, Home/End, Space/Enter, ARIA. Error catch callbacks. Integration with full vlist |
| `methods.test.ts` | 87 | Public API — data methods (setItems, appendItems, prependItems, updateItem, removeItem), scroll methods (scrollToIndex, scrollToItem, cancelScroll), selection methods (getSelected, selectItem, clearSelection), snapshot/restore, property getters |

### Cross-Cutting

| File | Tests | What it covers |
|------|------:|----------------|
| `accessibility.test.ts` | 40 | aria-setsize, aria-posinset, unique element IDs, aria-activedescendant, aria-busy, live region announcements, baseline ARIA attributes, core vlist ARIA, grid mode ARIA, keyboard navigation ARIA |
| `reverse.test.ts` | 36 | Reverse mode — validation (rejects groups/grid), initial scroll to bottom, appendItems auto-scroll, prependItems scroll preservation, setItems, data methods, selection, events, scroll save/restore, variable heights, edge cases |
| `adapters/svelte.test.ts` | 18 | Svelte action — lifecycle (create/destroy), option passing, reactive updates, event forwarding |

## Coverage

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
# Text report to console
bun test --coverage

# lcov report for CI/editors
bun test --coverage --coverage-reporter=lcov

# Both
bun test --coverage --coverage-reporter=text --coverage-reporter=lcov
```

The lcov report is written to `coverage/lcov.info`.

### Coverage Breakdown

| File | Functions | Lines |
|------|----------:|------:|
| `src/adapters/svelte.ts` | 100% | 100% |
| `src/constants.ts` | 100% | 100% |
| `src/context.ts` | 100% | 100% |
| `src/core.ts` | 97.06% | 100% |
| `src/data/index.ts` | 100% | 100% |
| `src/data/manager.ts` | 100% | 100% |
| `src/data/placeholder.ts` | 100% | 100% |
| `src/data/sparse.ts` | 100% | 100% |
| `src/events/emitter.ts` | 100% | 100% |
| `src/events/index.ts` | 100% | 100% |
| `src/grid/index.ts` | 100% | 100% |
| `src/grid/layout.ts` | 100% | 100% |
| `src/grid/renderer.ts` | 100% | 100% |
| `src/groups/index.ts` | 100% | 100% |
| `src/groups/layout.ts` | 100% | 100% |
| `src/groups/sticky.ts` | 100% | 100% |
| `src/groups/types.ts` | 100% | 100% |
| `src/handlers.ts` | 100% | 100% |
| `src/methods.ts` | 100% | 100% |
| `src/render/compression.ts` | 100% | 100% |
| `src/render/heights.ts` | 100% | 100% |
| `src/render/index.ts` | 100% | 100% |
| `src/render/renderer.ts` | 100% | 100% |
| `src/render/virtual.ts` | 100% | 100% |
| `src/scroll/controller.ts` | 100% | 99.76% |
| `src/scroll/index.ts` | 100% | 100% |
| `src/scroll/scrollbar.ts` | 100% | 100% |
| `src/selection/index.ts` | 100% | 100% |
| `src/selection/state.ts` | 100% | 100% |
| `src/vlist.ts` | 93.33% | 99.87% |
| **All source files** | **99.68%** | **99.99%** |

### Uncoverable Lines

Two lines are not covered due to tooling quirks and defensive code:

| File | Line | Reason |
|------|------|--------|
| `scroll/controller.ts` | L527 | **Coverage tool quirk** — the `} else {` between the horizontal and non-horizontal scroll restore branches. The else body (L528) IS executed (4 hits). Bun's V8 coverage instrumentation doesn't count `} else {` on its own line as an executable statement. |
| `vlist.ts` | L1240 | **Defensive `.catch()`** — the error handler on `dataManager.loadInitial().catch(...)`. Since `loadInitial` delegates to `loadRange`, which catches all errors internally via try-catch, the promise never rejects. The `.catch()` is kept as a safety net. |

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

JSDOM doesn't include `ResizeObserver`. Tests that use `createVList` (which uses `ResizeObserver` internally) must provide a mock:

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

### Running a Subset

```bash
# By file path
bun test test/scroll/controller.test.ts

# By test name pattern
bun test --test-name-pattern="compression"

# By directory (all files in data/)
bun test test/data/
```

---

*For module-specific implementation details, see the corresponding module documentation: [data](./data.md), [scroll](./scroll.md), [render](./render.md), [selection](./selection.md), [events](./events.md), [handlers](./handlers.md), [methods](./methods.md), [accessibility](./accessibility.md).*