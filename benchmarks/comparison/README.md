# Library Comparison Benchmarks

Head-to-head performance comparisons between **vlist** and popular virtualization libraries. All benchmarks run live in your browser with identical test conditions.

## Available Comparisons

### React Ecosystem
- **[react-window](./react-window.js)** — Brian Vaughn's minimalist library, component-based with fixed/variable size lists
- **[TanStack Virtual](./tanstack-virtual.js)** — Headless virtualization hook (`useVirtualizer`) for React
- **[Virtua](./virtua.js)** — Zero-config `<VList>` component (~3 kB per component)

### Vue Ecosystem
- **[vue-virtual-scroller](./vue-virtual-scroller.js)** — `<RecycleScroller>` component with DOM recycling for Vue 3

### SolidJS Ecosystem
- **[TanStack Virtual (SolidJS)](./solidjs.js)** — `createVirtualizer` with fine-grained reactivity

## What Each Comparison Tests

All comparisons measure the same 4 metrics:

### 1. Initial Render Time
- Time from creation to first paint
- Median of 5 iterations
- **Lower is better**

### 2. Memory Usage
- JS heap delta after render (Chrome only)
- Up to 3 isolated measurement attempts, median of valid readings
- **Lower is better**

### 3. Scroll Performance (FPS)
- Sustained bidirectional scroll over 5 seconds at 100 px/frame
- Median frames per second
- **Higher is better** (120 FPS = typical monitor cap)

### 4. P95 Frame Time
- 95th percentile frame consistency
- Measures jank/stuttering
- **Lower is better**

## Methodology

All benchmarks follow identical methodology to ensure fair comparison:

1. **Isolated Phases** — Timing, memory, and scroll measured in separate phases to prevent cross-contamination
2. **Multiple Iterations** — Render measured 5 times, median reported
3. **Garbage Collection** — `settleHeap()` between phases (3 cycles of `gc()` + 150 ms + 5 frames)
4. **Randomized Execution Order** — Coin-flip decides whether vlist or the competitor runs first, eliminating GC bleed and JIT warmth bias
5. **GC Barrier** — `tryGC()` + `waitFrames(5)` between the two library runs
6. **Realistic Templates** — All libraries render identical DOM structures (avatar + content + metadata)
7. **Real Scrolling** — 5 seconds of bidirectional scrolling with direction changes
8. **Native APIs** — Uses `performance.mark/measure` for timing and `performance.memory` for heap snapshots
9. **CPU Stress Testing** — Optional `stressMs` parameter burns CPU per scroll frame to simulate real-world app overhead

See [shared.js](./shared.js) for the implementation.

## File Structure

```
comparison/
├── shared.js                    # Shared utilities (~865 lines)
│   ├── Constants (ITEM_HEIGHT, MEASURE_ITERATIONS, etc.)
│   ├── createRealisticReactChildren()
│   ├── populateRealisticDOMChildren()
│   ├── findViewport()
│   ├── measureScrollPerformance()
│   ├── measureMemoryWithRetries()
│   ├── benchmarkVList()
│   ├── benchmarkLibrary()
│   ├── calculateComparisonMetrics()
│   └── runComparison()
├── react-window.js              # vs react-window
├── tanstack-virtual.js          # vs TanStack Virtual (React)
├── virtua.js                    # vs Virtua (React)
├── vue-virtual-scroller.js      # vs vue-virtual-scroller (Vue 3)
└── solidjs.js                   # vs TanStack Virtual (SolidJS)
```

## Shared Utilities

### `shared.js` — Reusable Code

All comparison benchmarks import from `shared.js`:

**Constants:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `ITEM_HEIGHT` | 48 px | Fixed row height for all benchmarks |
| `MEASURE_ITERATIONS` | 5 | Render iterations for median calculation |
| `MEMORY_ATTEMPTS` | 3 | Retries for reliable heap measurement |
| `SCROLL_DURATION_MS` | 5000 | Scroll test duration |
| `SCROLL_SPEED_PX_PER_FRAME` | 100 | Pixels scrolled per animation frame |

**Functions:**

| Function | Purpose |
|----------|---------|
| `benchmarkVList(container, itemCount, onStatus, stressMs)` | vlist baseline — 3-phase measurement (timing → memory → scroll) |
| `benchmarkLibrary(config)` | Generic wrapper — same 3-phase measurement for any library |
| `runComparison(opts)` | Randomized runner — coin-flip execution order + GC barrier + metrics calculation |
| `calculateComparisonMetrics(vlist, lib, name, ...)` | Builds side-by-side metrics array with percentage diffs and ratings |
| `findViewport(container)` | Locates scrollable element — tries `.vlist-viewport`, then depth-first search |
| `measureScrollPerformance(viewport, duration, stressMs)` | rAF loop with bidirectional scrolling, returns median FPS + P95 frame time |
| `measureMemoryWithRetries(config)` | Up to `MEMORY_ATTEMPTS` isolated heap measurements, returns median of valid readings |
| `createRealisticReactChildren(React, index)` | Shared React element tree for consistent templates |
| `populateRealisticDOMChildren(el, index)` | Same structure via raw DOM (for SolidJS) |

## Adding a New Comparison

1. **Create the benchmark file** (e.g., `new-library.js`)

```javascript
import { defineSuite, rateLower, rateHigher } from "../runner.js";
import { ITEM_HEIGHT, benchmarkLibrary, runComparison } from "./shared.js";

// 1. Library-specific loading
const loadLibraries = async () => { /* dynamic imports */ };

// 2. Library-specific benchmark
const benchmarkNewLibrary = async (container, itemCount, onStatus, stressMs = 0) => {
  const loaded = await loadLibraries();
  if (!loaded) throw new Error("Library not available");

  return benchmarkLibrary({
    libraryName: "New Library",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      // Mount the library's virtual list, return instance handle
      return instance;
    },
    destroyComponent: async (instance) => {
      // Cleanup / unmount
    },
  });
};

// 3. Suite definition using runComparison() for randomized execution
defineSuite({
  id: "new-library",
  name: "New Library Comparison",
  description: "Compare vlist vs New Library performance side-by-side",
  icon: "⚔️",
  comparison: true,
  run: async ({ itemCount, container, onStatus, stressMs = 0 }) => {
    return runComparison({
      container, itemCount, onStatus, stressMs,
      libraryName: "New Library",
      benchmarkCompetitor: benchmarkNewLibrary,
      rateLower, rateHigher,
    });
  },
});
```

2. **Add to navigation** (`benchmarks/navigation.json`)

```json
{
  "slug": "new-library",
  "name": "New Library",
  "icon": "⚔️",
  "desc": "Head-to-head performance: vlist vs New Library"
}
```

3. **Update sitemap** (`src/server/sitemap.ts`)

```typescript
"new-library": ["benchmarks/comparison/new-library.js"]
```

4. **Import in script.js** (`benchmarks/script.js`)

```javascript
import "./comparison/new-library.js";
```

5. **Install the library** (if needed)

```bash
bun add new-library
```

6. **Rebuild and test**

```bash
bun run benchmarks/build.ts
open http://localhost:3338/benchmarks/new-library
```

The `shared.js` utilities handle all measurement infrastructure — you only need to implement `createComponent` and `destroyComponent`.

## Updating Performance Results

When benchmark results change (new vlist version, hardware upgrade, etc.):

1. **Run the benchmarks** at `http://localhost:3338/benchmarks/[library-name]`
2. **Copy results** from the UI (10K items recommended)
3. **Update** `../data/performance.json`
4. **Commit** with message explaining what changed

Example:
```json
{
  "lib": "react-window",
  "renderTime": "9.1",
  "memory": "2.26",
  "scrollFPS": "120.5",
  "p95Frame": "9.1",
  "ecosystem": "React",
  "self": false
}
```

## Running Locally

```bash
# From vlist.dev root
bun install
bun run benchmarks/build.ts

# Start dev server
bun run server.ts

# Open browser
open http://localhost:3338/benchmarks/comparisons
```

### Available URLs
- `/benchmarks/comparisons` — Overview and methodology
- `/benchmarks/performance-comparison` — Results table
- `/benchmarks/react-window` — vs react-window
- `/benchmarks/tanstack-virtual` — vs TanStack Virtual
- `/benchmarks/virtua` — vs Virtua
- `/benchmarks/vue-virtual-scroller` — vs vue-virtual-scroller
- `/benchmarks/solidjs` — vs TanStack Virtual (SolidJS)

## Requirements

- **Chrome browser** — Memory measurements use `performance.memory` API
- **Full metrics mode** — Launch Chrome with `--enable-precise-memory-info`
- **Dependencies installed** — All comparison libraries must be in `package.json`

## Typical Results (10K Items)

Based on standard hardware (M1 Mac, Chrome):

| Library | Render | Memory | Scroll FPS | P95 Frame |
|---------|--------|--------|------------|-----------|
| **vlist** | ~8.5 ms | ~0.24 MB | 120.5 | ~9.2 ms |
| react-window | ~9.1 ms | ~2.26 MB | 120.5 | ~9.1 ms |
| TanStack Virtual | ~9.1 ms | ~2.26 MB | 120.5 | ~9.1 ms |
| Virtua | ~17.2 ms | ~14.3 MB | 120.5 | ~9.0 ms |
| vue-virtual-scroller | ~13.4 ms | ~11.0 MB | 120.5 | ~10.4 ms |

**Key insight:** vlist consistently uses 10–60× less memory while maintaining equal or better performance.

## Why These Libraries?

Selection criteria:
- **Popularity** — High npm download counts and community adoption
- **Quality** — Production-ready, actively maintained
- **Diversity** — Different ecosystems (React, Vue, SolidJS)
- **Approach** — Different architectural styles (headless, component-based, zero-config)

## Limitations

These benchmarks test **core virtualization performance** only:

**Not tested:**
- Complex templates (images, rich content)
- Variable heights
- User interactions
- Mobile devices

**Partially addressed:**
- Real-world application overhead — use `stressMs` to simulate CPU load per frame

**Why?** To isolate library performance from other factors.

## Notes

- All comparisons use the **same shared utilities** for consistency
- Execution order is **randomized** per run to eliminate ordering bias
- All libraries render **identical DOM structures** for fair comparison
- Results are **hardware-dependent** — your mileage may vary
- Benchmarks are **reproducible** — run them yourself!
- Data is **versioned** in `../data/performance.json`

For full documentation, see [docs/resources/benchmarks.md](../../docs/resources/benchmarks.md) → Library Comparison Suites.