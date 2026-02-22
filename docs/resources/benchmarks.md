# Benchmarks

The benchmark page (`/benchmarks/`) runs four live performance suites directly in the browser against a real vlist instance. Each suite creates a vlist, exercises it programmatically, and reports measured metrics with quality ratings.

**URL:** `/benchmarks/` (served by vlist.dev)

All benchmarks are available in **four framework variants**:
- **JavaScript** — Pure `vlist()` API (baseline)
- **React** — `useVList()` hook with `createRoot()` / `unmount()`
- **Vue** — `useVList()` composable with `createApp()` / `mount()`
- **Svelte** — `vlist()` action (direct API, no Svelte runtime)

This allows direct comparison of vlist performance across different framework integrations.

## Quick Reference

| Suite | What it measures | Key metric | Variants |
|-------|-----------------|------------|----------|
| **Initial Render** | Time from `vlist()` to first painted frame | Median (ms) | JS, React, Vue, Svelte |
| **Scroll FPS** | Sustained scroll rendering throughput over 5s | Avg FPS, Frame budget (ms) | JS, React, Vue, Svelte |
| **Memory** | Heap usage after render and after 10s of scrolling | Scroll delta (MB) | JS, React, Vue, Svelte |
| **scrollToIndex** | Latency of smooth `scrollToIndex()` animation | Median (ms) | JS, React, Vue, Svelte |

All suites can be run at three item counts: **10K**, **100K**, and **1M**.

---

## Framework Variants

Each benchmark suite is available in four framework variants, allowing direct performance comparison:

### JavaScript (Baseline)
Pure vlist API using `vlist()`. This is the baseline — fastest possible performance with no framework overhead.

**Example:**
```javascript
const list = vlist({
  container,
  item: { height: 48, template: benchmarkTemplate },
  items,
});
```

### React
Uses the `useVList()` hook within a React component. Includes React's reconciliation overhead.

**Example:**
```javascript
function BenchmarkList({ items }) {
  const { containerRef } = useVList({
    items,
    item: { height: 48, template: benchmarkTemplate },
  });
  return <div ref={containerRef} />;
}
```

**Performance characteristics:**
- ~100% slower than JavaScript baseline (render benchmark data)
- Extra frames needed for React lifecycle
- Framework bundle included (~450 KB)

### Vue
Uses the `useVList()` composable within a Vue component. Includes Vue's reactivity system overhead.

**Example:**
```javascript
const BenchmarkList = {
  props: { items: Array },
  setup(props) {
    const { containerRef } = useVList({
      items: props.items,
      item: { height: 48, template: benchmarkTemplate },
    });
    return { containerRef };
  },
  template: '<div ref="containerRef"></div>',
};
```

**Performance characteristics:**
- ~100% slower than JavaScript baseline (render benchmark data)
- Extra frames needed for Vue lifecycle
- Vue compiler included (~700 KB for template string support)

### Svelte
Uses the `vlist()` action directly. Nearly identical performance to JavaScript baseline since Svelte compiles away.

**Example:**
```javascript
const action = vlist(container, {
  config: {
    item: { height: 48, template: benchmarkTemplate },
    items,
  },
});
```

**Performance characteristics:**
- ~1-5% overhead vs. JavaScript baseline
- Minimal framework runtime
- Svelte compiles to efficient JavaScript

### Switching Variants

Use the variant switcher at the top of each benchmark page:

```
JavaScript  React  Vue  Svelte
    ↑                          ← Click to switch
```

Or use URL parameters:
```
/benchmarks/render?variant=react
/benchmarks/scroll?variant=vue
/benchmarks/memory?variant=svelte
```

### Expected Results

Based on initial render benchmark data:

| Variant | Median @ 100K items | Overhead vs. JS |
|---------|---------------------|-----------------|
| JavaScript | 8.1 ms | — (baseline) |
| Svelte | 8.2 ms | +1.2% |
| React | 16.6 ms | +105% |
| Vue | 16.6 ms | +105% |

**Why React/Vue are slower:**
- Framework reconciliation/reactivity systems
- Additional lifecycle processing
- Virtual DOM overhead (React)
- Reactive dependencies tracking (Vue)

**Why Svelte is fast:**
- Compiles to efficient imperative code
- No runtime framework overhead
- Direct vlist API calls

---

## Suites

### ⚡ Initial Render

Measures how long it takes to create a vlist and render the first visible frame. Runs multiple iterations and reports statistical summaries.

| Metric | Unit | Description |
|--------|------|-------------|
| **Median** | ms | Median render time across iterations |
| **Min** | ms | Fastest iteration |
| **p95** | ms | 95th percentile — worst-case excluding outliers |

### 📜 Scroll FPS

Programmatically scrolls a vlist at a constant speed (7,200 px/s) for 5 seconds and measures rendering throughput. This is the most architecturally complex suite — see [Scroll FPS Architecture](#scroll-fps-architecture) below.

| Metric | Unit | Shown | Description |
|--------|------|-------|-------------|
| **Avg FPS** | fps | Always | Average frames per second during the scroll |
| **Dropped** | % | Only if > 0 | Percentage of frames exceeding 1.5× the median frame time |
| **Frame budget** | ms | Always | Average per-frame rendering cost (JS + layout) |
| **Budget p95** | ms | Always | 95th percentile of per-frame cost |
| **Total frames** | — | Always | Total `requestAnimationFrame` callbacks over 5s |
| **Est. throughput** | fps | Throttled only | Estimated max FPS based on frame budget (display-independent) |
| **⚠️ rAF throttled** | fps | Throttled only | Warning with the measured rAF delivery rate |

### 🍩 Memory

Measures JavaScript heap usage at key points to detect memory leaks. Requires Chrome with `performance.memory` API.

| Metric | Unit | Description |
|--------|------|-------------|
| **After render** | MB | Heap increase after `vlist()` + first paint |
| **Scroll delta** | MB | Heap change after 10s of sustained scrolling vs. after render |
| **Total heap** | MB | Absolute heap size after render |
| **Total delta** | MB | Net heap change from baseline to after scrolling |

A negative or near-zero **Scroll delta** confirms no memory leaks during scroll.

### 🎯 scrollToIndex

Measures the latency of `scrollToIndex()` with smooth animation — the time from the API call until the scroll settles at the target position. Tests random positions across the list.

| Metric | Unit | Description |
|--------|------|-------------|
| **Median** | ms | Median scroll-to-index latency |
| **Min** | ms | Fastest navigation |
| **p95** | ms | 95th percentile latency |
| **Max** | ms | Slowest single navigation |

---

## Scroll FPS Architecture

The scroll benchmark uses a decoupled multi-loop architecture to produce accurate measurements regardless of the display's refresh rate.

### The Problem

A naive approach uses a single `requestAnimationFrame` loop to both drive scrolling and count frames. If the browser throttles rAF (common on macOS with external monitors, ProMotion dynamic refresh, or power-saving modes), both the scroll speed and frame count are affected — making the benchmark report artificially low numbers that reflect a display limitation, not vlist performance.

### The Solution: Three Parallel Loops

```
┌─────────────────────────────────────────────────────────────────┐
│                    setTimeout(0) loop                            │
│  SCROLL DRIVER — advances scrollTop at 7,200 px/s              │
│  Uses performance.now() wall-clock time, ~250 updates/sec       │
│  Completely independent of display refresh rate                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ sets scrollTop → fires scroll events
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              requestAnimationFrame batch (per frame)             │
│                                                                  │
│  1. Paint counter (rAF)     — records frame interval             │
│  2. vlist's rafThrottle     — processes scroll, mutates DOM      │
│  3. Cost probe (rAF)        — measures JS work + forces layout   │
│                                                                  │
│  Registration order guarantees cost probe runs AFTER vlist       │
└─────────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────────┐
│               Canvas refresh rate driver (rAF)                   │
│  1×1 canvas drawn every frame — signals compositor to            │
│  maintain full refresh rate (strongest JS-level hint)            │
└─────────────────────────────────────────────────────────────────┘
```

**Loop 1 — Scroll Driver** (`setTimeout(0)`)
Advances `scrollTop` at a constant 7,200 px/s using wall-clock `performance.now()` deltas. Runs ~250 times per second regardless of display Hz. This ensures the benchmark exercises the same workload whether the display runs at 30Hz, 60Hz, or 120Hz.

**Loop 2 — Paint Counter** (`requestAnimationFrame`)
Registered *before* the scroll loop starts, so it runs first in each rAF batch. Records inter-frame intervals for FPS and jitter analysis. Does not drive scroll or touch the DOM.

**Loop 3 — Cost Probe** (scroll event → `requestAnimationFrame`)
A scroll event listener registered *after* `vlist()`, guaranteeing its rAF callback runs *after* vlist's `rafThrottle` handler in the same frame. Measures:
- `performance.now() - timestamp` → total JS work in the frame (including vlist's handler)
- `offsetHeight` forced reflow → layout cost of vlist's DOM mutations

Together these give the **Frame budget** — vlist's actual per-frame rendering cost, independent of display refresh rate.

### Pre-flight Phases

Before the 5-second measurement, the suite runs:

1. **Canvas refresh driver** — started first, runs for the entire benchmark
2. **Display wake-up** (500ms) — rapid visible DOM mutations + Web Animations API to engage the compositor
3. **rAF rate check** (1s) — measures raw rAF delivery rate to detect throttling
4. **JIT warmup** (500ms) — short scroll pass to let the JS engine optimize hot paths

### Display Throttling Detection

If the pre-flight rAF rate is below 50 fps, the suite activates throttled mode:

- **FPS ratings adapt** to the measured rAF rate (so 30fps on a 30Hz display rates as "good")
- **Est. throughput** appears — computed as `1000 / p95_frame_budget`, showing vlist's real capability
- **⚠️ rAF throttled** warning appears with the measured rate and common causes

---

## Rating System

Each metric receives a quality rating based on thresholds:

| Rating | Color | Meaning |
|--------|-------|---------|
| **good** | Green | Excellent — meets performance targets |
| **ok** | Yellow | Acceptable — minor room for improvement |
| **bad** | Red | Below expectations — investigate |

Thresholds adapt to context. For example, at 1M items the render time thresholds are more lenient than at 10K.

---

## Running Benchmarks

### In the Browser

1. Navigate to `/benchmarks/`
2. Select item counts (10K, 100K, 1M) — multiple can be selected
3. Click **Run All** or individual suite **Run** buttons
4. Results appear in real-time as each suite completes

### Tips for Accurate Results

- **Close other tabs** — background work affects frame timing
- **Use your laptop screen** — external monitors may run at 30Hz, capping rAF
- **Disable Low Power Mode** (macOS) — throttles display refresh rate
- **Use Chrome** — the memory suite requires `performance.memory`
- **Run multiple times** — results vary slightly between runs; look for consistency

---

## Source Files

### Structure

Benchmarks now use a variant-based directory structure:

```
benchmarks/
├── render/
│   ├── javascript/suite.js   # Pure vlist API
│   ├── react/suite.js         # useVList hook
│   ├── vue/suite.js           # useVList composable
│   └── svelte/suite.js        # vlist action
├── scroll/
│   ├── javascript/suite.js
│   ├── react/suite.js
│   ├── vue/suite.js
│   └── svelte/suite.js
├── memory/
│   ├── javascript/suite.js
│   ├── react/suite.js
│   ├── vue/suite.js
│   └── svelte/suite.js
└── scrollto/
    ├── javascript/suite.js
    ├── react/suite.js
    ├── vue/suite.js
    └── svelte/suite.js
```

### Key Files

| File | Purpose |
|------|---------|
| `benchmarks/script.js` | Dashboard UI, variant switcher, result rendering |
| `benchmarks/runner.js` | Benchmark engine — suite registry, execution, utilities |
| `benchmarks/{name}/{variant}/suite.js` | Individual benchmark suite implementations (16 total) |
| `benchmarks/renderer.ts` | Server-side rendering for benchmark pages (SSR variant switcher) |
| `benchmarks/styles.css` | Benchmark page styles |
| `benchmarks/build.ts` | Bun build script with framework deduplication feature |
| `styles/shell.css` | Shared styles including variant switcher component |

### Build

```bash
bun run build:bench        # One-shot build
bun run build:bench:watch  # Watch mode
```

Output goes to `benchmarks/dist/`:
- `script.js` — All 16 suite variants bundled (1,129 KB → 352 KB gzip)
- `runner.js` — Shared benchmark utilities
- `styles.css` — Minified CSS

### Framework Deduplication

The build uses a **Bun feature** to ensure React and Vue are deduplicated when vlist is linked (symlinked during development). Without this feature, Bun would bundle React from both `vlist.dev/node_modules` and `vlist/node_modules`, causing "Invalid hook call" errors.

**Feature configuration** (`benchmarks/build.ts`):
- Forces all `react` and `react-dom` imports to resolve from project root
- Resolves Vue to compiler-included build (`vue.esm-bundler.js`) for template string support
- Ensures single framework instance in the bundle

**Why needed:**
- React's hooks require a singleton instance
- Vue's reactivity system requires unified dependency tracking
- Linked packages can have separate `node_modules` copies

**Bundle size impact:**
- Vue compiler adds ~500 KB to bundle (necessary for `template` option support)
- All frameworks share single instance (no duplication)

---

## Performance Expectations

### Render Benchmark

Expected framework overhead (based on 100K items):

| Variant | Typical Range | Rating |
|---------|---------------|--------|
| JavaScript | 8-10 ms | Baseline |
| Svelte | 8-10 ms | Near-baseline |
| React | 15-20 ms | +100% overhead |
| Vue | 15-20 ms | +100% overhead |

### Scroll Benchmark

Framework overhead appears in **Frame budget** metric:

| Variant | Frame Budget | Rating |
|---------|-------------|--------|
| JavaScript | 3-5 ms | Excellent |
| Svelte | 3-5 ms | Excellent |
| React | 5-8 ms | Good |
| Vue | 5-8 ms | Good |

**Note:** Scroll speed is identical across all variants (decoupled scroll driver). Framework overhead only affects per-frame rendering cost.

### Memory Benchmark

Framework runtime increases baseline heap:

| Variant | After Render (100K items) | Notes |
|---------|---------------------------|-------|
| JavaScript | 5-8 MB | Baseline |
| Svelte | 5-8 MB | Minimal runtime |
| React | 8-12 MB | +450 KB bundle |
| Vue | 10-15 MB | +700 KB bundle |

**Scroll delta should remain near zero** for all variants (no leaks).

### ScrollTo Benchmark

Framework has minimal impact on `scrollToIndex()` latency:

| Variant | Median (100K items) | Notes |
|---------|---------------------|-------|
| JavaScript | 300-400 ms | Baseline |
| Svelte | 300-400 ms | Same as baseline |
| React | 400-500 ms | Slight overhead |
| Vue | 400-500 ms | Slight overhead |

**Why similar:** `scrollToIndex()` is a vlist API method, not framework-specific. Animation settling time dominates.

---

## Implementation Notes

### React Variants

**Lifecycle:**
```javascript
const root = createRoot(container);
root.render(<BenchmarkList items={items} />);
// ... measure ...
root.unmount();
```

**Extra settling frames:** React needs `await waitFrames(5)` after standard frames for commit phase.

**API access:** For `scrollToIndex()`, uses a ref to store API:
```javascript
let listApiRef = null;
function BenchmarkList({ items }) {
  const vlistApi = useVList({ items, ... });
  listApiRef = vlistApi;
  return <div ref={vlistApi.containerRef} />;
}
// Later: listApiRef.scrollToIndex(...)
```

### Vue Variants

**Lifecycle:**
```javascript
const app = createApp(BenchmarkList, { items });
app.mount(container);
// ... measure ...
app.unmount();
```

**Extra settling frames:** Vue needs `await waitFrames(5)` after standard frames for reactivity updates.

**API access:** Same ref pattern as React:
```javascript
let listApiRef = null;
const BenchmarkList = {
  setup(props) {
    const vlistApi = useVList({ items: props.items, ... });
    listApiRef = vlistApi;
    return { containerRef: vlistApi.containerRef };
  },
};
// Later: listApiRef.scrollToIndex(...)
```

### Svelte Variants

**Lifecycle:**
```javascript
const action = vlist(container, { config: { items, ... } });
// ... measure ...
if (action && action.destroy) action.destroy();
```

**No extra frames:** Svelte action is synchronous, no additional settling needed.

**API access:** Direct from action return:
```javascript
const action = vlist(container, { config: { items, ... } });
action.scrollToIndex(...);
```

### Threshold Adjustments

Performance thresholds are adjusted per framework:

**JavaScript/Svelte** (strict):
```javascript
const goodThreshold = itemCount <= 10_000 ? 20 : itemCount <= 100_000 ? 30 : 80;
const okThreshold = itemCount <= 10_000 ? 40 : itemCount <= 100_000 ? 60 : 200;
```

**React/Vue** (more lenient +5-10ms):
```javascript
const goodThreshold = itemCount <= 10_000 ? 25 : itemCount <= 100_000 ? 40 : 100;
const okThreshold = itemCount <= 10_000 ? 50 : itemCount <= 100_000 ? 80 : 250;
```

This ensures ratings reflect expected framework overhead rather than penalizing frameworks for their inherent costs.
