# Library Comparison Benchmarks

Head-to-head performance comparisons between **vlist** and popular virtualization libraries. All benchmarks run live in your browser with identical test conditions.

## Available Comparisons

### React Ecosystem
- **[react-window](./react-window.js)** - Brian Vaughn's minimalist library, actively maintained
- **[TanStack Virtual](./tanstack-virtual.js)** - Headless virtualization from the TanStack team
- **[Virtua](./virtua.js)** - Modern React library with great DX

### Vue Ecosystem
- **[vue-virtual-scroller](./vue-virtual-scroller.js)** - Popular Vue 3 virtualization component

## What Each Comparison Tests

All comparisons measure the same 4 metrics:

### 1. **Initial Render Time**
- Time from creation to first paint
- Median of 5 iterations
- **Lower is better**

### 2. **Memory Usage**
- JS heap size after render (Chrome only)
- Delta from baseline
- **Lower is better**

### 3. **Scroll Performance (FPS)**
- Sustained scroll over 5 seconds
- Median frames per second
- **Higher is better** (120 FPS = monitor cap)

### 4. **P95 Frame Time**
- 95th percentile frame consistency
- Measures jank/stuttering
- **Lower is better**

## Methodology

All benchmarks follow identical methodology to ensure fair comparison:

1. **Isolated Environment** - Each library runs in a clean container
2. **Multiple Iterations** - Render measured 5 times, median reported
3. **Garbage Collection** - Manual GC between tests for clean baselines
4. **Real Scrolling** - 5 seconds at 100px/frame with direction changes
5. **Native APIs** - Uses Chrome's `performance.memory` for accurate measurements

See [shared.js](./shared.js) for the implementation.

## File Structure

```
comparison/
├── shared.js                    # Shared utilities (454 lines)
│   ├── Constants (ITEM_HEIGHT, etc.)
│   ├── findViewport()
│   ├── measureScrollPerformance()
│   ├── benchmarkVList()
│   ├── benchmarkLibrary()
│   └── calculateComparisonMetrics()
├── react-window.js              # vs react-window (150 lines)
├── tanstack-virtual.js          # vs TanStack Virtual (186 lines)
├── virtua.js                    # vs Virtua (151 lines)
├── vue-virtual-scroller.js      # vs vue-virtual-scroller (171 lines)
└── memory-optimization.js       # vlist config comparison
```

## Shared Utilities

### `shared.js` - Reusable Code

All comparison benchmarks import from `shared.js`:

**Constants:**
- `ITEM_HEIGHT` - Fixed at 48px for consistency
- `MEASURE_ITERATIONS` - 5 iterations for median calculation
- `SCROLL_DURATION_MS` - 5 second scroll test

**Functions:**
- `findViewport(container)` - Locates scrollable element
- `measureScrollPerformance(viewport, duration)` - FPS measurement
- `benchmarkVList(container, items, onStatus)` - vlist baseline benchmark
- `benchmarkLibrary(config)` - Generic benchmark wrapper
- `calculateComparisonMetrics(vlistResults, libResults, name, ...)` - Metrics calculation

This eliminates ~1,600 lines of duplication across comparison files!

## Adding a New Comparison

1. **Create the benchmark file** (e.g., `new-library.js`)

```javascript
import { defineSuite, generateItems, rateLower, rateHigher } from "../runner.js";
import { ITEM_HEIGHT, benchmarkVList, benchmarkLibrary, calculateComparisonMetrics } from "./shared.js";

// 1. Library-specific loading
const loadLibraries = async () => { ... };

// 2. Library-specific benchmark
const benchmarkNewLibrary = async (container, items, onStatus) => {
  const loaded = await loadLibraries();
  if (!loaded) throw new Error("Library not available");

  return benchmarkLibrary({
    libraryName: "New Library",
    container,
    items,
    onStatus,
    createComponent: async (container, items) => {
      // Create and mount your component
      return instance;
    },
    destroyComponent: async (instance) => {
      // Cleanup
    },
  });
};

// 3. Suite definition
defineSuite({
  id: "new-library",
  name: "New Library Comparison",
  description: "Compare vlist vs New Library performance side-by-side",
  icon: "⚔️",
  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);
    const vlistResults = await benchmarkVList(container, items, onStatus);
    
    let libResults;
    try {
      libResults = await benchmarkNewLibrary(container, items, onStatus);
    } catch (err) {
      libResults = { library: "New Library", error: err.message };
    }
    
    return calculateComparisonMetrics(vlistResults, libResults, "New Library", rateLower, rateHigher);
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

That's it! The shared utilities handle everything else.

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
- `/benchmarks/comparisons` - Overview and methodology
- `/benchmarks/performance-comparison` - Results table
- `/benchmarks/react-window` - vs react-window
- `/benchmarks/tanstack-virtual` - vs TanStack Virtual
- `/benchmarks/virtua` - vs Virtua
- `/benchmarks/vue-virtual-scroller` - vs vue-virtual-scroller

## Requirements

- **Chrome browser** - Memory measurements use `performance.memory` API
- **Full metrics mode** - Launch Chrome with `--enable-precise-memory-info`
- **Dependencies installed** - All comparison libraries must be in `package.json`

## Typical Results (10K Items)

Based on standard hardware (M1 Mac, Chrome):

| Library | Render | Memory | Scroll FPS | P95 Frame |
|---------|--------|--------|------------|-----------|
| **vlist** | ~8.5ms | ~0.24 MB | 120.5 | ~9.2ms |
| react-window | ~9.1ms | ~2.26 MB | 120.5 | ~9.1ms |
| TanStack Virtual | ~9.1ms | ~2.26 MB | 120.5 | ~9.1ms |
| Virtua | ~17.2ms | ~14.3 MB | 120.5 | ~9.0ms |
| vue-virtual-scroller | ~13.4ms | ~11.0 MB | 120.5 | ~10.4ms |

**Key Insight:** vlist consistently uses 10-60x less memory while maintaining equal or better performance.

## Why These Libraries?

We chose comparison targets based on:
- **Popularity** - High npm download counts
- **Quality** - Production-ready, well-maintained
- **Diversity** - Different ecosystems (React, Vue)
- **Approach** - Different architectural styles (headless, component-based)

## Limitations

These benchmarks test **core virtualization performance** only:

**Not tested:**
- Complex templates (images, rich content)
- Variable heights
- User interactions
- Real-world application overhead
- Mobile devices

**Why?** To isolate library performance from other factors.

## Contributing

Found an issue or want to add a comparison?

1. Check if the library is popular and production-ready
2. Follow the "Adding a New Comparison" guide above
3. Ensure consistent methodology (use `shared.js` utilities)
4. Test thoroughly
5. Submit a pull request

## Notes

- All comparisons use the **same shared utilities** for consistency
- Results are **hardware-dependent** - your mileage may vary
- Benchmarks are **reproducible** - run them yourself!
- Data is **versioned** in `../data/performance.json`

For questions or issues, see the main [vlist.dev documentation](../../README.md).