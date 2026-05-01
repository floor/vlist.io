---
created: 2026-02-17
updated: 2026-04-04
status: draft
---

# Benchmarks

The benchmark page (`/benchmarks/`) runs two categories of live performance suites directly in the browser:

1. **Framework variant suites** — Test vlist itself across JS, React, SolidJS, Vue, and Svelte
2. **Library comparison suites** — Compare vlist against other virtual list libraries (TanStack Virtual, react-window, Virtua, vue-virtual-scroller)

> **📈 Crowdsourced History** — Every comparison run is automatically persisted to a SQLite database and aggregated on the [Comparison History](/benchmarks/history) page. Results accumulate across all visitors, providing statistically meaningful data across hardware, browsers, and vlist versions.

**URL:** `/benchmarks/` (served by vlist.io)

All framework variant benchmarks are available in **five variants**:
- **JavaScript** — Pure `vlist()` API (baseline)
- **React** — `useVList()` hook with `createRoot()` / `unmount()`
- **SolidJS** — `useVList()` hook with fine-grained reactivity
- **Vue** — `useVList()` composable with `createApp()` / `mount()`
- **Svelte** — `vlist()` action (direct API, no Svelte runtime)

This allows direct comparison of vlist performance across different framework integrations.

## Quick Reference

### Pages

| URL | Purpose |
|-----|---------|
| `/benchmarks/` | Overview — list of all suite and comparison pages |
| `/benchmarks/render` | Initial render suite (variant switcher) |
| `/benchmarks/scroll` | Scroll FPS suite (variant switcher) |
| `/benchmarks/memory` | Memory suite (variant switcher) |
| `/benchmarks/scrollto` | ScrollTo latency suite (variant switcher) |
| `/benchmarks/react-window` | vs react-window |
| `/benchmarks/react-virtuoso` | vs react-virtuoso |
| `/benchmarks/tanstack-virtual` | vs TanStack Virtual |
| `/benchmarks/virtua` | vs Virtua |
| `/benchmarks/vue-virtual-scroller` | vs vue-virtual-scroller |
| `/benchmarks/solidjs` | vs TanStack Virtual (SolidJS) |
| `/benchmarks/legend-list` | vs Legend List |
| `/benchmarks/clusterize` | vs Clusterize.js |
| `/benchmarks/performance-comparison` | Static results table |
| `/benchmarks/bundle` | Bundle size comparison |
| `/benchmarks/features` | Feature coverage matrix |
| `/benchmarks/history` | **Crowdsourced comparison history** |


### Framework Variant Suites

| Suite | What it measures | Key metric | Variants |
|-------|-----------------|------------|----------|
| **Initial Render** | Time from `vlist()` to first painted frame | Median (ms) | JS, React, SolidJS, Vue, Svelte |
| **Scroll FPS** | Sustained scroll rendering throughput over 5s | Avg FPS, Frame budget (ms) | JS, React, SolidJS, Vue, Svelte |
| **Memory** | Heap usage after render and after 10s of scrolling | Scroll delta (MB) | JS, React, SolidJS, Vue, Svelte |
| **scrollToIndex** | Latency of smooth `scrollToIndex()` animation | Median (ms) | JS, React, SolidJS, Vue, Svelte |

### Library Comparison Suites

| Suite | Compares against | Metrics |
|-------|-----------------|---------|
| **TanStack Virtual** | `@tanstack/react-virtual` v3.13.18 | Render time, memory, scroll FPS, P95 frame time |
| **react-window** | `react-window` v1.8.10 | Render time, memory, scroll FPS, P95 frame time |
| **react-virtuoso** | `react-virtuoso` v4.18.3 | Render time, memory, scroll FPS, P95 frame time |
| **Virtua** | `virtua` v0.48.6 (React) | Render time, memory, scroll FPS, P95 frame time |
| **vue-virtual-scroller** | `vue-virtual-scroller` v2.0.0-beta.8 | Render time, memory, scroll FPS, P95 frame time |
| **SolidJS** | `@tanstack/solid-virtual` v3.13.18 | Render time, memory, scroll FPS, P95 frame time |
| **Legend List** | `@legendapp/list/react` v3.0.0-beta.40 | Render time, memory, scroll FPS, P95 frame time |

All suites can be run at three item counts: **10K**, **100K**, and **1M**.

---

## Framework Variants

Each benchmark suite is available in five framework variants, allowing direct performance comparison:

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

### SolidJS
Uses the `useVList()` hook within a SolidJS component. Fine-grained reactivity with minimal overhead.

**Example:**
```javascript
function BenchmarkList(props) {
  const { containerRef } = useVList({
    get items() { return props.items; },
    item: { height: 48, template: benchmarkTemplate },
  });
  return <div ref={containerRef} />;
}
```

**Performance characteristics:**
- ~5-10% overhead vs. JavaScript baseline
- Fine-grained reactivity (no virtual DOM)
- Reactive primitives with minimal runtime

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
JavaScript  React  SolidJS  Vue  Svelte
    ↑                                    ← Click to switch
```

Or use URL parameters:
```
/benchmarks/render?variant=react
/benchmarks/scroll?variant=solidjs
/benchmarks/memory?variant=vue
/benchmarks/scrollto?variant=svelte
```

### Expected Results

Based on initial render benchmark data:

| Variant | Median @ 100K items | Overhead vs. JS |
|---------|---------------------|-----------------|
| JavaScript | 8.1 ms | — (baseline) |
| Svelte | 8.2 ms | +1.2% |
| SolidJS | 8.7 ms | +7.4% |
| React | 16.6 ms | +105% |
| Vue | 16.6 ms | +105% |

**Why React/Vue are slower:**
- Framework reconciliation/reactivity systems
- Additional lifecycle processing
- Virtual DOM overhead (React)
- Reactive dependencies tracking (Vue)

**Why Svelte/SolidJS are fast:**
- **Svelte:** Compiles to efficient imperative code, no runtime overhead
- **SolidJS:** Fine-grained reactivity without virtual DOM diffing
- Both avoid full component re-renders

---

## Framework Variant Suites

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

## Library Comparison Suites

The comparison benchmarks (`benchmarks/comparison/`) run vlist head-to-head against other virtual list libraries. Each suite measures both libraries using the same methodology and reports side-by-side metrics with percentage differences.

### Compared Libraries

| Library | Ecosystem | Architecture | Suite File |
|---------|-----------|-------------|------------|
| **[react-window](https://github.com/bvaughn/react-window)** v1.8.10 | React | Component-based, fixed/variable size lists | `react-window.js` |
| **[react-virtuoso](https://github.com/petyosi/react-virtuoso)** v4.18.3 | React | Feature-rich virtualization (~16 KB gzip) with auto-height, groups, reverse mode, table support | `react-virtuoso.js` |
| **[TanStack Virtual](https://tanstack.com/virtual)** v3.13.18 | React | Headless virtualizer hook (`useVirtualizer`) | `tanstack-virtual.js` |
| **[Virtua](https://github.com/inokawa/virtua)** v0.48.6 | React | Zero-config `<VList>` component (~3 kB per component) | `virtua.js` |
| **[Legend List](https://github.com/LegendApp/legend-list)** v3.0.0-beta.40 | React (+ React Native) | `LegendList` component with item recycling, v3 React DOM entry point | `legend-list.js` |
| **[vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller)** v2.0.0-beta.8 | Vue 3 | `<RecycleScroller>` component with DOM recycling | `vue-virtual-scroller.js` |
| **[TanStack Virtual (SolidJS)](https://tanstack.com/virtual)** v3.13.18 | SolidJS | `createVirtualizer` with fine-grained reactivity | `solidjs.js` |
| **[Clusterize.js](https://github.com/NeXTs/Clusterize.js)** v0.18.1 | Vanilla JS | DOM virtualization requiring all row HTML upfront | `clusterize.js` |

**Why these libraries?** Selection criteria:
- **Popularity** — High npm download counts and community adoption
- **Quality** — Production-ready, actively maintained
- **Diversity** — Different ecosystems (React, Vue, SolidJS, Vanilla JS, React Native)
- **Approach** — Different architectural styles (headless, component-based, zero-config, HTML string-based)

### Measurement Methodology

Each comparison runs in **three isolated phases**:

| Phase | What | How |
|-------|------|-----|
| **1. Timing** | Render time (median of 5 iterations) | `performance.mark()` + `performance.measure()` |
| **2. Memory** | Heap delta for a single mounted instance | `measureMemoryDelta()` with `settleHeap()` isolation |
| **3. Scroll** | FPS and P95 frame time across 7 speeds | Dual-loop: `setTimeout` scroll driver + `rAF` paint counter |

**Why three separate phases?** Render iterations create and destroy components repeatedly, generating garbage that contaminates heap snapshots. By isolating memory measurement into its own phase — with aggressive GC settling between phases — we get reliable heap deltas instead of GC timing artifacts.

### Timing: `performance.mark/measure`

Render iterations use the Performance Timeline API (`performance.mark()` + `performance.measure()`) instead of manual `performance.now()` diffing. This provides:

- Structured timing entries visible in the DevTools Performance panel
- Automatic high-resolution timestamps
- Clean measurement lifecycle (marks are cleared after each iteration)

### Memory: Isolated Heap Deltas

Memory measurement uses `measureMemoryDelta()` from `runner.js`:

1. **`settleHeap()`** — 3 cycles of `gc()` + 150ms + 5 frames to flush residual garbage from prior phases
2. **Baseline snapshot** — `performance.memory.usedJSHeapSize` 
3. **Create component** — Mount the library's virtual list
4. **Settle** — Wait for frames + gentle GC to reclaim transient allocations
5. **Final snapshot** — Second heap reading
6. **Validate** — If `delta < 0`, return `null` (GC artifact, not real data)

When either library's memory measurement is unreliable (null), the memory comparison row shows "Memory measurement unavailable" instead of misleading numbers.

### Comparison Metrics

| Metric | Unit | Better | Description |
|--------|------|--------|-------------|
| **vlist Render Time** | ms | Lower | Median render time across 5 iterations |
| **{Library} Render Time** | ms | Lower | Same measurement for the compared library |
| **Render Time Difference** | % | Lower | Percentage difference (negative = vlist faster) |
| **vlist Memory Usage** | MB | Lower | Heap delta after mounting vlist |
| **{Library} Memory Usage** | MB | Lower | Heap delta after mounting the compared library |
| **Memory Difference** | % | Lower | Percentage difference (negative = vlist uses less) |
| **vlist Scroll FPS** | fps | Higher | Average median FPS across 7 scroll speeds |
| **{Library} Scroll FPS** | fps | Higher | Same for the compared library |
| **FPS Difference** | % | Higher | Percentage difference (positive = vlist smoother) |
| **vlist P95 Frame Time** | ms | Lower | Average P95 frame time across 7 scroll speeds |
| **{Library} P95 Frame Time** | ms | Lower | Same for the compared library |

### Randomized Execution Order

To eliminate systematic bias, `runComparison()` in `shared.js` **randomizes which library runs first** on every invocation (`Math.random() < 0.5`). This addresses two forms of ordering bias:

1. **GC bleed** — Garbage from the first runner can inflate the second runner's memory phase
2. **JIT warmth** — The JavaScript engine may optimize differently for the first vs second library

A `tryGC()` + `waitFrames(5)` barrier is always inserted between the two runs regardless of order. The final results include an **Execution Order** informational row so reviewers can see which library ran first in each run.

### Realistic Template Rendering

All comparison suites render **identical DOM structures** to ensure a fair comparison. The template contains an avatar, content block (title + subtitle), and metadata (badge + timestamp) — matching vlist's `benchmarkTemplate`:

| Ecosystem | Helper | Source |
|-----------|--------|--------|
| React (react-window, TanStack Virtual, Virtua) | `createRealisticReactChildren(React, index)` | `shared.js` |
| SolidJS (TanStack Virtual) | `populateRealisticDOMChildren(el, index)` | `shared.js` |
| Vue (vue-virtual-scroller) | Inline `<template>` with same structure | `vue-virtual-scroller.js` |
| vlist (baseline) | `benchmarkTemplate` from `runner.js` | `runner.js` |

This ensures performance differences reflect library overhead, not template complexity mismatches.

### CPU Stress Testing

All comparison suites accept an optional `stressMs` parameter that burns CPU for the specified duration on every scroll frame (via `burnCpu()`). This simulates real-world application overhead (e.g., state management, analytics, other components) and reveals how each library degrades under load — whereas on idle benchmarks both libraries often hit the display's FPS ceiling.

### Multi-Speed Scroll Profiling

Each library is tested at **7 scroll speeds** automatically (no user selection), derived from `BASE_SCROLL_SPEED` (7,200 px/s):

| Speed | px/s | Items/frame @60fps | Character |
|-------|------|--------------------|-----------|
| 0.1× | 720 | ~0.25 | Pure baseline overhead |
| 0.25× | 1,800 | ~0.6 | Gentle browsing |
| 0.5× | 3,600 | ~1.25 | Casual scrolling |
| 1× | 7,200 | ~2.5 | Normal speed |
| 2× | 14,400 | ~5 | Fast flick |
| 3× | 21,600 | ~7.5 | Aggressive scroll |
| 5× | 36,000 | ~12.5 | Stress test |

Each speed runs for **2 seconds** per library (7 speeds × 2s × 2 libraries = ~28s total scroll time). FPS and P95 frame time are **averaged across all 7 speeds** into single values — exposing performance cliffs invisible at any single speed.

The scroll phase uses a **dual-loop architecture** matching the scroll suite:
- **`setTimeout(0)` scroll driver** (~250 updates/sec) — smooth sub-pixel scrolling at all speeds
- **`rAF` paint counter** — accurate frame timing decoupled from scroll updates

Scroll distance is time-based (`px/s × dt / 1000`), ensuring consistent speed regardless of display refresh rate (60Hz, 120Hz, variable).

### vlist Overscan

vlist's default overscan of 3 items (144px) is insufficient at high scroll speeds (5× / 36,000 px/s). The comparison benchmarks use `VLIST_OVERSCAN = 5` (240px buffer at 48px items), which keeps up at all tested speeds. Legend List uses its default `drawDistance: 250` (250px) — comparable overscan budgets.

### Shared Utilities (`shared.js`)

All comparison suites import from `shared.js` to ensure consistent methodology:

**Constants:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `ITEM_HEIGHT` | 48 px | Fixed row height for all benchmarks |
| `VLIST_OVERSCAN` | 5 | Extra items rendered beyond viewport (240px at 48px items) |
| `MEASURE_ITERATIONS` | 5 | Render iterations for median calculation |
| `MEMORY_ATTEMPTS` | 10 | Retries for reliable heap measurement |
| `SCROLL_DURATION_MS` | 2000 | Scroll test duration per speed |
| `BASE_SCROLL_SPEED` | 7200 | Base scroll speed in px/s (1× multiplier) |
| `COMPARISON_SCROLL_SPEEDS` | 7 entries | Speed presets from 0.1× (720 px/s) to 5× (36,000 px/s) |

**Functions:**

| Function | Purpose |
|----------|---------|
| `benchmarkVList(container, itemCount, onStatus, stressMs)` | vlist baseline — 3-phase measurement (timing → memory → multi-speed scroll) |
| `benchmarkLibrary(config)` | Generic wrapper — same 3-phase measurement for any library |
| `runComparison(opts)` | Randomized runner — coin-flip execution order + GC barrier + metrics calculation |
| `calculateComparisonMetrics(vlist, lib, name, ...)` | Builds the side-by-side metrics array with averaged scroll results and percentage diffs |
| `findViewport(container)` | Locates the scrollable element — tries `.vlist-viewport` first, then depth-first search for any `overflow: auto/scroll` descendant |
| `measureScrollPerformance(viewport, duration, stressMs, speedPxPerSec)` | Dual-loop (setTimeout scroll driver + rAF paint counter) with time-based scrolling, returns median FPS + P95 frame time |
| `measureMemoryWithRetries(config)` | Up to `MEMORY_ATTEMPTS` isolated heap measurements, returns median of valid readings |
| `createRealisticReactChildren(React, index)` | Shared React element tree for consistent templates |
| `populateRealisticDOMChildren(el, index)` | Same structure via raw DOM for SolidJS |

### Typical Results (10K Items)

Based on standard hardware (M1 Mac, Chrome). Scroll FPS and P95 are averages across 7 speeds (720–36,000 px/s):

| Library | Render Time | Memory | Scroll FPS | P95 Frame Time |
|---------|------------|--------|------------|----------------|
| **vlist** | ~8.3 ms | ~0.04 MB | ~120.5 fps | ~9.2 ms |
| react-window | ~9.1 ms | ~2.26 MB | ~120.5 fps | ~9.1 ms |
| react-virtuoso | ~8.5 ms | ~0.71 MB | ~120.5 fps | ~10.2 ms |
| TanStack Virtual | ~11.2 ms | ~0.97 MB | ~117.9 fps | ~12 ms |
| Legend List | ~25.1 ms | ~3.64 MB | ~109.9 fps | ~17.8 ms |
| vue-virtual-scroller | ~13.4 ms | ~11.0 MB | ~120.5 fps | ~10.4 ms |
| Clusterize.js | ~93.3 ms | ~0.09 MB | ~120.5 fps | ~9.3 ms |

**Key insight:** Multi-speed scroll profiling reveals real performance differences that were hidden when both libraries capped at the display refresh rate at a single speed. vlist consistently uses **10–60× less memory** while maintaining equal or better render and scroll performance across all speed levels. Note: Clusterize.js has significantly slower initial render due to requiring all row HTML upfront, but achieves excellent scroll performance and very low memory usage.

### Known Limitations

**Architectural asymmetry:** vlist is a zero-dependency vanilla JS library. Libraries like TanStack Virtual require React. The benchmark includes framework runtime overhead (fiber tree, reconciliation, effects) in the compared library's numbers. This is the real cost users pay, but it measures **framework + library**, not just the virtualization algorithm.

**Memory API limitations:** `performance.memory.usedJSHeapSize` is Chrome-only and non-deterministic. Even with `settleHeap()` isolation, results can vary between runs. The negative-delta rejection prevents impossible values, but small positive values (< 0.1 MB) should be treated as approximate.

**Scope:** These benchmarks test core virtualization performance with fixed-height items and realistic templates. They do not test variable heights, images/rich content, user interactions, or real-world application overhead (though `stressMs` simulates CPU load and multi-speed scroll profiling reveals performance under varying DOM churn pressure).

### Adding a New Comparison

To add a new library comparison:

**1. Create the benchmark file** (`benchmarks/comparison/new-library.js`):

```javascript
import { defineSuite, rateLower, rateHigher } from "../runner.js";
import { ITEM_HEIGHT, benchmarkLibrary, runComparison } from "./shared.js";

const benchmarkNewLibrary = async (container, itemCount, onStatus, stressMs = 0) => {
  return benchmarkLibrary({
    libraryName: "New Library",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      // Mount the library's virtual list, return instance handle
    },
    destroyComponent: async (instance) => {
      // Cleanup / unmount
    },
  });
};

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

**2. Wire it up:**
- Add to `benchmarks/navigation.json` (slug, name, icon, description)
- Add to `src/server/sitemap.ts` (maps slug to source file)
- Import in `benchmarks/script.js`
- Install the library (`bun add new-library`)

**3. Rebuild and test:**
```bash
bun run benchmarks/build.ts
# Open http://localhost:3338/benchmarks/new-library
```

The `shared.js` utilities handle all measurement infrastructure — you only need to implement `createComponent` and `destroyComponent`.

### Comparison Source Files

| File | Purpose |
|------|---------|
| `benchmarks/comparison/shared.js` | Shared infrastructure — `benchmarkVList()`, `benchmarkLibrary()`, `runComparison()`, `calculateComparisonMetrics()` |
| `benchmarks/comparison/tanstack-virtual.js` | TanStack Virtual v3.13.18 (React) comparison suite |
| `benchmarks/comparison/react-window.js` | react-window v1.8.10 comparison suite |
| `benchmarks/comparison/react-virtuoso.js` | react-virtuoso v4.18.3 (React) comparison suite |
| `benchmarks/comparison/virtua.js` | Virtua v0.48.6 (React) comparison suite |
| `benchmarks/comparison/legend-list.js` | Legend List v3.0.0-beta.40 (React DOM, `@legendapp/list/react`) comparison suite |
| `benchmarks/comparison/vue-virtual-scroller.js` | vue-virtual-scroller v2.0.0-beta.8 comparison suite |
| `benchmarks/comparison/solidjs.js` | TanStack Virtual v3.13.18 (SolidJS) comparison suite |
| `benchmarks/comparison/clusterize.js` | Clusterize.js v0.18.1 (Vanilla JS) comparison suite |

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

> **Results are automatically saved.** Every completed comparison run is persisted to the crowdsourced database — no extra steps required.

### Tips for Accurate Results

- **Close other tabs** — background work affects frame timing
- **Use your laptop screen** — external monitors may run at 30Hz, capping rAF
- **Disable Low Power Mode** (macOS) — throttles display refresh rate
- **Use Chrome** — the memory suite requires `performance.memory`
- **Launch with `--enable-precise-memory-info`** — improves heap measurement granularity for memory and comparison suites
- **Run multiple times** — results vary slightly between runs; look for consistency
- **Use CPU throttling** (comparison suites) — DevTools → Performance → 4x/6x slowdown for additional stress
- **Be patient with comparisons** — multi-speed scroll profiling runs 7 speeds × 2s × 2 libraries = ~28s of scroll testing

---

## Crowdsourced History

Every time a visitor completes a **library comparison** benchmark (react-window, virtua, TanStack, etc.), the result is automatically POSTed to `/api/benchmarks` and stored in a SQLite database. This is fire-and-forget — it never blocks the UI and failures are silently ignored.

The [Comparison History](/benchmarks/history) page aggregates all submissions across visitors, providing:
- Statistical aggregation (median, mean, p5, p95, stddev) across many hardware profiles
- Time-series charts showing metric trends as vlist versions evolve
- Browser breakdown (Chrome vs Firefox vs Safari vs Edge)
- Per-version run counts and first/last seen dates

### Table Routing

The database uses **two separate table pairs** to keep suite and comparison data fully isolated:

| Suite Type | Tables | Suite ID examples |
|------------|--------|-------------------|
| Library comparisons | `comparison_runs` + `comparison_metrics` | `react-window`, `virtua`, `tanstack-virtual` |
| vlist suites | `benchmark_runs` + `benchmark_metrics` | `render-vanilla`, `scroll-react`, `memory-vue` |

The server auto-routes each POST to the correct tables based on the `suiteId`. Both pairs have identical column structure.

### What's Stored Per Run

| Field | Source |
|-------|--------|
| `version` | vlist `package.json` version |
| `suite_id` | Benchmark suite ID (e.g. `react-window`) |
| `item_count` | 10K / 100K / 1M |
| `metrics` | All measured values (label, value, unit, better, rating) |
| `user_agent` | `navigator.userAgent` |
| `hardware_concurrency` | CPU core count |
| `device_memory` | RAM in GB (where available) |
| `screen_width` / `screen_height` | Display resolution |
| `stress_ms` / `scroll_speed` | Active stress/speed config |

### API Endpoints

All GET endpoints default to `?type=comparison` (comparison tables). Pass `?type=suite` to query vlist suite tables.

| Endpoint | Description |
|----------|-------------|
| `POST /api/benchmarks` | Store a result — auto-routes to correct tables |
| `GET /api/benchmarks/summary` | High-level overview (run counts, unique versions, browsers) |
| `GET /api/benchmarks/stats?suiteId=react-window&itemCount=10000` | Aggregated metrics per version |
| `GET /api/benchmarks/history?suiteId=react-window&metric=vlist+Render&days=30` | Daily time-series for charting |
| `GET /api/benchmarks/versions` | All known vlist versions with run counts |
| `GET /api/benchmarks/suites` | All known suite IDs with run counts |
| `GET /api/benchmarks/browsers` | Browser breakdown |

### Database Setup

```bash
# Create the database (run once per environment)
bun run seed:benchmarks

# Recreate from scratch — drops all data
bun run seed:benchmarks -- --force
```

The database file (`data/benchmarks.db`) is `.gitignored` — each environment creates its own.

### History Page

The `/benchmarks/history` page is entirely client-side rendered. On load it:
1. Fetches summary, suites, versions, and browsers in parallel
2. Auto-selects the first available comparison suite
3. Populates filter controls (Library, Item Count, Version, Days)
4. Renders results cards, SVG trend chart, browser/version breakdowns, and a contribute CTA

#### Results Card Layout

The history page presents crowdsourced data using the **same metric card layout** as live benchmark results (the "Final results" card you see after running a comparison). Each metric shows the crowdsourced **median** value with:

- **Color-coded ratings** — green (good), yellow (ok), red (bad) matching the live benchmark rating logic
- **Contextual meta notes** on difference rows — "vlist is faster", "vlist uses less", "vlist is smoother"
- **Friendly library names** — e.g. "TanStack Virtual" instead of `tanstack-virtual`, "Clusterize.js" instead of `clusterize`
- **Formatted values** — appropriate precision per unit (ms: 1 decimal, MB: 2 decimals, fps: 1 decimal, %: 1 decimal)

This replaces the previous dense stats table (version/metric/median/mean/p5/p95/min/max/stddev/samples columns) with a much more readable format that matches the visual language visitors already know from running benchmarks.

#### Confidence Badge

Each version section displays a confidence indicator based on sample count:

| Badge | Sample Count | Meaning |
|-------|-------------|---------|
| 🟢 High confidence | ≥ 20 runs | Statistically meaningful |
| 🟡 Moderate confidence | 5–19 runs | Reasonable estimate |
| ⚪ Low confidence | < 5 runs | Early data, run more benchmarks! |

The badge shows the exact run count (e.g. "Low confidence · 2 runs") and helps visitors understand how much data backs the displayed medians.

#### Collapsible Detailed Stats

The full statistical breakdown (mean, p5, p95, min, max, stddev) is still accessible via a **"Show detailed stats ▸"** toggle below each results card. Hidden by default to keep the view clean, it expands with a fade-in animation to reveal the compact stats table for users who want the full picture.

#### Contribute CTA

A call-to-action section at the bottom of the page encourages visitors to run benchmarks:
- Headline: "Help improve these results"
- Description explaining that more data = more confidence
- Pill-style links (⚔️ react-window, ⚔️ Virtua, etc.) to each comparison benchmark page
- Links are generated from all known comparison suite IDs

---

## Source Files

### Structure

Benchmarks use a variant-based directory structure for framework suites, plus a flat structure for library comparisons:

```
benchmarks/
├── runner.js                  # Benchmark engine — registry, timing, memory utilities
├── script.js                  # Dashboard UI, routing, persistResult()
├── history.js                 # Crowdsourced history page — fetches API, renders chart
├── templates.js               # HTML templates for all benchmark pages
├── styles.css                 # Benchmark page styles
├── build.ts                   # Bun build script with framework deduplication
├── navigation.json            # Sidebar navigation config
├── suites/
│   ├── render/
│   │   ├── vanilla/suite.js   # Pure vlist API
│   │   ├── react/suite.js     # useVList hook
│   │   ├── solidjs/suite.js   # useVList hook (fine-grained)
│   │   ├── vue/suite.js       # useVList composable
│   │   └── svelte/suite.js    # vlist action
│   ├── scroll/
│   │   ├── vanilla/suite.js
│   │   ├── react/suite.js
│   │   ├── solidjs/suite.js
│   │   ├── vue/suite.js
│   │   └── svelte/suite.js
│   ├── memory/
│   │   ├── vanilla/suite.js
│   │   ├── react/suite.js
│   │   ├── solidjs/suite.js
│   │   ├── vue/suite.js
│   │   └── svelte/suite.js
│   └── scrollto/
│       ├── vanilla/suite.js
│       ├── react/suite.js
│       ├── solidjs/suite.js
│       ├── vue/suite.js
│       └── svelte/suite.js
├── comparison/
│   ├── shared.js              # Shared comparison infrastructure (~1000 lines)
│   ├── react-window.js        # vs react-window
│   ├── react-virtuoso.js      # vs react-virtuoso
│   ├── tanstack-virtual.js    # vs TanStack Virtual (React)
│   ├── virtua.js              # vs Virtua
│   ├── vue-virtual-scroller.js# vs vue-virtual-scroller
│   ├── solidjs.js             # vs TanStack Virtual (SolidJS)
│   ├── legend-list.js         # vs Legend List
│   └── clusterize.js          # vs Clusterize.js
└── data/
    ├── bundle.json            # Static bundle size data
    ├── performance.json       # Static performance results table
    └── features.json          # Feature comparison matrix
```

**Server-side:**
```
src/api/benchmarks.ts          # REST API for crowdsourced storage
scripts/seed-benchmarks.ts     # Creates data/benchmarks.db (run once)
data/benchmarks.db             # SQLite database (gitignored, created by seed script)
```

### Key Files

| File | Purpose |
|------|---------|
| `benchmarks/script.js` | Dashboard UI, variant switcher, result rendering, `persistResult()` |
| `benchmarks/runner.js` | Benchmark engine — suite registry, execution, timing & memory utilities |
| `benchmarks/history.js` | Crowdsourced history page — API fetching, results cards, confidence badges, detail toggles, SVG chart, CTA |
| `benchmarks/templates.js` | HTML templates for all benchmark pages including history |
| `benchmarks/suites/{name}/{variant}/suite.js` | Individual benchmark suite implementations (20 total) |
| `benchmarks/comparison/shared.js` | Comparison infrastructure — isolated 3-phase measurement |
| `benchmarks/comparison/*.js` | Library comparison suite definitions (8 total) |
| `benchmarks/styles.css` | Benchmark page styles including history page |
| `benchmarks/build.ts` | Bun build script with framework deduplication |
| `src/api/benchmarks.ts` | REST API — stores results, serves aggregated queries |
| `scripts/seed-benchmarks.ts` | Creates `data/benchmarks.db` with all 4 tables + indexes |

### Runner Utilities

Key functions exported from `runner.js`:

| Function | Purpose |
|----------|---------|
| `measureDuration(label, fn)` | Time an async function via `performance.mark()` + `performance.measure()` — DevTools-integrated |
| `settleHeap(cycles)` | Aggressive GC settling — 3 cycles of `gc()` + 150ms + 5 frames |
| `measureMemoryDelta(create)` | Isolated heap delta with `settleHeap()` baseline and negative-value rejection |
| `tryGC()` | Light GC attempt — single `gc()` call + 100ms + 3 frames |
| `getHeapUsed()` | Read `performance.memory.usedJSHeapSize` (Chrome-only, returns `null` if unavailable) |
| `median(values)` | Compute median of an array |
| `percentile(sorted, p)` | Compute percentile from sorted array |

### Build

```bash
bun run build:bench        # One-shot build
bun run build:bench:watch  # Watch mode
```

Output goes to `dist/benchmarks/`:
- `script.js` — All 16 suite variants bundled (1,129 KB → 352 KB gzip)
- `runner.js` — Shared benchmark utilities
- `styles.css` — Minified CSS

### Framework Deduplication

The build uses a **Bun feature** to ensure React and Vue are deduplicated when vlist is linked (symlinked during development). Without this feature, Bun would bundle React from both `vlist.io/node_modules` and `vlist/node_modules`, causing "Invalid hook call" errors.

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
| SolidJS | 6-9 MB | +~100 KB runtime |
| React | 8-12 MB | +450 KB bundle |
| Vue | 10-15 MB | +700 KB bundle |

**Scroll delta should remain near zero** for all variants (no leaks).

### ScrollTo Benchmark

Framework has minimal impact on `scrollToIndex()` latency:

| Variant | Median (100K items) | Notes |
|---------|---------------------|-------|
| JavaScript | 300-400 ms | Baseline |
| Svelte | 300-400 ms | Same as baseline |
| SolidJS | 320-420 ms | Minimal overhead |
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

### SolidJS Variants

**Lifecycle:**
```javascript
const dispose = render(() => <BenchmarkList items={items} />, container);
// ... measure ...
dispose();
```

**Extra settling frames:** SolidJS needs `await waitFrames(3)` after standard frames for fine-grained reactivity updates.

**API access:** Same ref pattern as React:
```javascript
let listApiRef = null;
function BenchmarkList(props) {
  const vlistApi = useVList({
    get items() { return props.items; },
    ...
  });
  listApiRef = vlistApi;
  return <div ref={vlistApi.containerRef} />;
}
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
// Later: action.scrollToIndex(...)
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
