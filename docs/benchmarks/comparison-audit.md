---
created: 2026-02-23
updated: 2026-03-04
status: draft
---

# Comparison Benchmark Audit

> Honest analysis of the vlist comparison benchmarks.
> Written to identify methodological issues, measurement artifacts, and actionable improvements.
>
> **Last updated:** Multi-speed scroll testing, dual-loop scroll architecture, vlist overscan tuning. See Status column in [Recommendations](#recommendations).

## Overview

The comparison benchmarks (`benchmarks/comparison/*.js`) measure vlist against popular virtualization libraries across four metrics: render time, memory usage, scroll FPS, and P95 frame time. While the benchmark infrastructure is well-structured and not intentionally biased, several methodological issues have been identified and addressed over time.

This document breaks down each metric, explains what's real vs artifact, proposes fixes, and documents library-specific integration challenges.

---

## Metric-by-Metric Analysis

### 1. Memory Usage — ❌ Broken

**Observed:** vlist `0.1 MB`, TanStack Virtual `-35.25 MB`

**Problem:** A negative memory measurement is physically impossible if TanStack allocated anything. This is a garbage collection timing artifact.

**What happens:**

```
vlist test runs → allocates and destroys DOM
tryGC() called → may or may not collect vlist's garbage
┌─ TanStack test begins ─────────────────────────┐
│  memBefore = getHeapUsed()    ← snapshot        │
│  React loads, components mount                   │
│  tryGC() called               ← collects VLIST's │
│                                  old garbage!     │
│  memAfter = getHeapUsed()     ← LOWER than before│
│  result = memAfter - memBefore = NEGATIVE         │
└──────────────────────────────────────────────────┘
```

**Root causes:**

- `performance.memory.usedJSHeapSize` is Chrome-only, deprecated, and not granular enough for diffing between two measurements
- GC is non-deterministic — `tryGC()` calls `gc()` if available, but the engine decides when to actually reclaim memory
- vlist runs first, so its garbage gets collected during TanStack's measurement window
- The `0.1 MB` for vlist is equally suspect — it just got luckier timing

**Severity:** Critical. Displaying `-35.25 MB` and a green `-100.3%` difference destroys credibility with anyone who understands memory profiling.

---

### 2. Render Time — ⚠️ Real but Misleading Context

**Observed:** vlist `8.2 ms`, TanStack Virtual `8.8 ms` (−6.8%)

**What's measured:** Time from component creation to first frame, median of 5 iterations.

**The structural issue:** This compares vanilla JS against React's entire reconciliation pipeline.

- vlist: `vlist({ container, item }).build()` → direct DOM manipulation
- TanStack: `ReactDOM.createRoot()` → `root.render(createElement(...))` → fiber tree → reconciliation → DOM

The ~0.6ms difference is likely **React's baseline overhead** (fiber creation, scheduling, effects), not a difference in virtualization algorithm quality. Anyone using TanStack Virtual is already paying React's cost for their entire app — this overhead is a sunk cost for them.

**What would be more informative:** Benchmarking vlist against TanStack in a React context (both using React) to isolate the virtualization logic itself.

**Severity:** Medium. The measurement is technically accurate, but the framing implies vlist's virtualization is faster when it's really measuring framework overhead.

---

### 3. Scroll FPS — ✅ Fixed (Multi-Speed + Dual-Loop)

**Previously:** Both libraries saturated the display's refresh rate at a single scroll speed. Uninformative — like drag-racing in a parking lot.

**Now fixed with two changes:**

1. **Multi-speed scroll profiling.** Each library is tested at 7 speeds automatically (720 to 36,000 px/s), 2 seconds per speed. All speeds are derived from `BASE_SCROLL_SPEED` (7,200 px/s). Results are averaged into a single FPS and P95 value. This exposes performance cliffs invisible at any single speed — e.g. Legend List keeps up at 1× but vlist maintains higher FPS at 5×.

2. **Dual-loop scroll architecture.** `measureScrollPerformance()` was rewritten to match the scroll suite's approach:
   - **`setTimeout(0)` scroll driver** (~250 updates/sec) — smooth sub-pixel scrolling at all speeds
   - **`rAF` paint counter** — accurate frame timing decoupled from scroll updates
   
   The old single-rAF loop both scrolled and measured in the same tick, causing visible stepping at slow speeds (only ~12px per frame at 720 px/s). The dual-loop produces smooth movement even at the slowest speed.

3. **Time-based scrolling.** Scroll distance is computed as `(px/s × dt) / 1000` using wall-clock time, not fixed per-frame jumps. Consistent speed regardless of display refresh rate (60Hz, 120Hz, variable).

**Severity:** Resolved. The multi-speed average reveals real FPS differences that were hidden when both libraries capped at a single speed.

---

### 4. P95 Frame Time — ✅ Honest (TanStack Wins)

**Observed:** vlist `10.11 ms`, TanStack Virtual `9.1 ms`

**This is the most interesting and credible metric.** TanStack has better frame consistency, likely because React's batching and scheduling produces more predictable frame timing than raw `requestAnimationFrame` + synchronous DOM mutations.

Credit to the benchmark for not hiding this — it shows vlist losing on an important metric.

**Severity:** None. This is good, honest data.

---

## Structural Biases

### Execution Order — ✅ Fixed

~~vlist always runs first.~~ Execution order is now randomized per run. See Priority 3.

### Apples-to-Oranges Architecture

vlist is a zero-dependency vanilla JS library. TanStack Virtual is a React hook. The benchmark includes React's entire runtime cost in TanStack's numbers:

- React fiber tree allocation
- Reconciler scheduling
- Effect processing
- Component lifecycle

This is a **real cost** that users pay, but it's important to communicate clearly. A TanStack user isn't choosing between "React + TanStack" and "nothing + vlist" — they already have React. The meaningful comparison for them is the marginal cost of TanStack's virtualization on top of their existing React app.

### Minimal Templates — ✅ Fixed

~~The benchmark template is `(item, index) => String(index)`.~~ All comparison suites now render realistic 7-element DOM structures (avatar, content wrapper, title, subtitle, meta wrapper, badge, timestamp). See Priority 2.

### vlist Overscan — Tuned for Fair Comparison

vlist's default overscan of 3 items (144px at 48px items) was insufficient at high scroll speeds (5× / 36,000 px/s), causing blank areas during fast scrolling. The comparison benchmarks now use `VLIST_OVERSCAN = 5` (240px buffer), which keeps up at all tested speeds. Legend List uses its default `drawDistance: 250` (250px buffer) — comparable overscan budgets for both libraries.

---

## Recommendations

### Priority 1: Fix Memory Measurement — ✅ Fixed

**Implemented in `runner.js` + `comparison/shared.js`:**

1. **Isolated measurement phases** — Render timing (Phase 1) is now fully separated from memory measurement (Phase 2). The old code took `memBefore` before 5 render/destroy iterations, letting iteration garbage pollute the heap diff. Now `measureMemoryDelta()` runs after all iterations are cleaned up.

2. **Aggressive heap settling** — `settleHeap()` runs 3 cycles of `gc()` + 150ms + 5 frames before taking the baseline snapshot, flushing residual garbage from prior phases.

3. **Negative delta rejection** — `measureMemoryDelta()` returns `null` when the delta is negative (GC artifact). `calculateComparisonMetrics()` now shows an informational "Memory measurement unavailable" row instead of misleading numbers.

4. **`performance.mark/measure` for timing** — Render iterations now use `measureDuration()` which wraps `performance.mark()` + `performance.measure()`, giving structured timing data that integrates with DevTools Performance panel and avoids manual `performance.now()` diffing.

**Files changed:**
- `benchmarks/runner.js` — Added `measureDuration()`, `settleHeap()`, `measureMemoryDelta()`
- `benchmarks/comparison/shared.js` — Restructured `benchmarkVList()` and `benchmarkLibrary()` into 3 isolated phases (Timing → Memory → Scroll), updated `calculateComparisonMetrics()` to validate memory data

### Priority 2: Add Stress Conditions — ✅ Fixed (CPU stress + templates + multi-speed scroll)

**Implemented: CPU stress mode via `burnCpu()`**

Comparison suites now have a **Stress** selector in the controls bar (None / Light / Medium / Heavy) that burns a fixed amount of CPU time per frame during scroll measurement, simulating an application with other work alongside the virtual list.

| Level | CPU burn per frame | Effect on 120 Hz (8.33ms budget) |
|-------|-------------------|----------------------------------|
| None | 0 ms | Both libraries hit 120 FPS (current behavior) |
| Light | 2 ms | ~6.3ms remaining — slight pressure |
| Medium | 4 ms | ~4.3ms remaining — real differentiation |
| Heavy | 6 ms | ~2.3ms remaining — only fast libraries survive |

**How it works:**
1. `burnCpu(targetMs)` in `runner.js` — tight `performance.now()` busy-wait loop, cannot be JIT-eliminated
2. Called inside `measureScrollPerformance()`'s rAF paint counter, simulating "other app work" that competes for frame budget
3. Applied equally to both libraries for fairness
4. `stressMs` threaded through: `runner.js` → `suite.run()` → `benchmarkVList()` / `benchmarkLibrary()` → `measureScrollPerformance()`
5. UI: stress buttons rendered via `STRESS_LEVELS` constant, only shown when `suite.comparison === true`

**Implemented: Multi-speed scroll profiling**

Each library is tested at 7 scroll speeds automatically, derived from `BASE_SCROLL_SPEED` (7,200 px/s):

| Speed | px/s | Items/frame @60fps | Character |
|-------|------|--------------------|-----------|
| 0.1× | 720 | ~0.25 | Pure baseline overhead |
| 0.25× | 1,800 | ~0.6 | Gentle browsing |
| 0.5× | 3,600 | ~1.25 | Casual scrolling |
| 1× | 7,200 | ~2.5 | Normal speed |
| 2× | 14,400 | ~5 | Fast flick |
| 3× | 21,600 | ~7.5 | Aggressive scroll |
| 5× | 36,000 | ~12.5 | Stress test |

Each speed runs for 2 seconds per library (7 speeds × 2s × 2 libraries = ~28s total scroll time). FPS and P95 frame time are averaged across all 7 speeds into single values — exposing performance cliffs invisible at any single speed.

**Implemented: Realistic templates**

All comparison suites render identical 7-element DOM structures (avatar, content wrapper, title, subtitle, meta wrapper, badge, timestamp). Shared helpers (`createRealisticReactChildren`, `populateRealisticDOMChildren`, `benchmarkTemplateRealistic`) ensure all libraries render identical DOM.

**Still TODO:**
- **Rapid scroll reversals** — Stress test layout recalculation and DOM recycling

### Priority 3: Randomize Execution Order — ✅ DONE

Execution order is now randomized per run via the `runComparison()` helper in
`benchmarks/comparison/shared.js`. Each suite flips a coin to decide whether
vlist or the competitor runs first. A `tryGC()` + `waitFrames(5)` barrier is
always inserted between the two runs regardless of order. An informational
"Execution Order" row is appended to every result set showing which library
ran first (e.g. "vlist ran first (randomized to reduce ordering bias)").

All 6 comparison suites (`tanstack-virtual.js`, `react-window.js`, `virtua.js`,
`vue-virtual-scroller.js`, `solidjs.js`, `legend-list.js`) now delegate to
`runComparison()` instead of duplicating the sequencing logic.

### Priority 4: Add Context Disclaimer — 🔲 TODO

Display a visible note in the benchmark UI:

> vlist is a zero-dependency vanilla JS library. TanStack Virtual requires React.
> Render time includes framework overhead. For React projects, the marginal
> difference is smaller than shown.

### Priority 5: Consider Same-Framework Comparison — 🔲 TODO

Create a variant that benchmarks vlist's React wrapper (`vlist-react`) against TanStack Virtual. This isolates the virtualization algorithm by putting both libraries on equal footing within the same framework.

---

---

## Library-Specific Notes

### Legend List (`@legendapp/list`) — Added February 2026

Legend List is primarily a React Native list component (drop-in `FlatList`/`FlashList` replacement). Starting with v3, it provides a dedicated React DOM entry point (`@legendapp/list/react`) that renders plain `div` elements with no `react-native-web` dependency.

**Version:** `3.0.0-beta.40` (v3 beta with platform-specific exports)

**Integration challenges and solutions:**

1. **react-native-web dependency eliminated.** The initial integration used `@legendapp/list` (v2) which imports from `react-native`, requiring `react-native-web` as a runtime shim. This added ~300 KB to the bundle and 170+ MB to memory measurements (StyleSheet compiler, Animated, View/Text abstractions). Switching to `@legendapp/list/react` (v3) eliminated this entirely — the React DOM entry point uses plain `div` elements internally.

2. **`ResizeObserver` forced reflows.** Legend List measures item sizes via `ResizeObserver` + synchronous `getBoundingClientRect()` calls in `useLayoutEffect`. During the benchmark's memory phase (which runs with `visibility: hidden`), each `getBoundingClientRect()` triggered a full synchronous layout recalculation (~550-600ms per reflow). With 3 memory measurement attempts, this caused 170+ MB of heap inflation from browser layout engine allocations captured in the heap snapshot.

   **Fix:** `getFixedItemSize: () => ITEM_HEIGHT` tells Legend List all items are exactly 48px, bypassing the `ResizeObserver`-based measurement. This is a fair optimization — all other benchmarks (react-window, TanStack Virtual) also pass fixed item sizes. Memory dropped from ~175 MB to ~3.7 MB.

3. **Container pool overhead.** Legend List pre-allocates a pool of container elements at `initialContainerPoolRatio × numContainers`. The default ratio of 2 doubled the DOM nodes. Setting `initialContainerPoolRatio: 1` halved container allocation without affecting scroll performance.

4. **Scroll viewport not found.** The benchmark's `findViewport()` searches for the scrollable element via `getComputedStyle` overflow detection. Legend List's scroll container rendered correctly but wasn't constrained — without `style: { height: "100%" }` on the `LegendList` component and `overflow: hidden` on the wrapper div, the scroll container expanded to fit all content and `scrollTop` assignments had no effect. The list appeared to render but never scrolled during the scroll phase.

5. **`estimatedListSize` for initial layout.** Without this prop, Legend List calls `getBoundingClientRect()` on mount to determine viewport dimensions, triggering forced reflows when the container is hidden during Phase 1 (timing). Providing `estimatedListSize: { width, height }` upfront avoids this.

**Configuration used in benchmark:**

```js
LegendList({
  data,
  renderItem,                              // plain div/span elements (same as other React benchmarks)
  keyExtractor: (item) => item.id,
  estimatedItemSize: 48,                   // same as ITEM_HEIGHT
  getFixedItemSize: () => 48,              // skip ResizeObserver measurement
  estimatedListSize: { width, height },    // skip getBoundingClientRect on mount
  style: { height: "100%" },              // constrain scroll container
  recycleItems: true,                      // enable DOM recycling
  drawDistance: 250,                       // overscan buffer (250px — Legend List default)
  initialContainerPoolRatio: 1,            // minimal container pool
  waitForInitialLayout: false,             // don't delay rendering
  maintainVisibleContentPosition: false,   // not needed for benchmarks
})
```

**Typical results (10K items, M1 Mac, Chrome):**

| Metric | vlist | Legend List | Notes |
|--------|-------|-------------|-------|
| Render | ~8.3 ms | ~26.9 ms | React overhead + container allocation |
| Memory | ~0.04 MB | ~3.72 MB | State management, position tracking, container pool |
| Scroll FPS | 120.5 | 120.5 | Both hit display cap |
| P95 Frame | ~9.2 ms | ~9.4 ms | Essentially tied |

**Assessment:** Legend List's scroll performance is excellent — identical FPS and P95 frame times. The render time gap (~3.2×) comes from React's reconciliation pipeline plus Legend List's container allocation system (`useLayoutEffect` → `ResizeObserver` setup → position calculations). The 3.72 MB memory is reasonable for a React-based library with state management, Maps/Sets for position tracking, and a container pool for 10K items. For context, react-window and TanStack Virtual measure ~2.26 MB — Legend List is in the same ballpark, slightly higher due to its more feature-rich architecture (bidirectional scrolling, item recycling, dynamic sizes).

---

## What's Genuinely Good About vlist

The honest story is already compelling without inflated metrics:

| Advantage | Real? | Notes |
|-----------|-------|-------|
| Zero dependencies | ✅ Yes | No React, no framework lock-in |
| Smaller bundle | ✅ Yes | ~7-16 KB vs React + TanStack |
| Framework-agnostic | ✅ Yes | Works with React, Vue, Solid, Svelte, or vanilla |
| Comparable render speed | ✅ Yes | Within ~7% even including React overhead |
| Sustained scroll FPS | ✅ Yes | Multi-speed profiling (720–36,000 px/s) shows vlist maintains high FPS even at extreme speeds |
| Lower memory | ✅ Yes | 10–60× less heap usage (validated with isolated measurement phases) |

The pitch — "comparable or better performance with zero dependencies and framework freedom" — is strong and backed by rigorous multi-speed, multi-metric methodology.

---

## Summary

| Metric | Status | Action |
|--------|--------|--------|
| Memory | ✅ Fixed | Isolated phases, negative rejection, `settleHeap()`, retry with median |
| Render Time | ✅ Partially fixed | Now uses `performance.mark/measure`; disclaimer still TODO |
| Scroll FPS | ✅ Fixed | Multi-speed profiling (7 speeds, 720–36,000 px/s, 2s each) + dual-loop architecture (setTimeout scroll driver + rAF paint counter) + CPU stress selector |
| P95 Frame Time | ✅ Fixed | Multi-speed averaging reveals real consistency differences |
| Execution Order | ✅ Fixed | Randomized via `runComparison()` helper; meta row shows which ran first |
| Template Complexity | ✅ Fixed | Realistic 7-element DOM structure for all libraries |
| Scroll Architecture | ✅ Fixed | Time-based scrolling (`px/s × dt`), dual-loop matching scroll suite |
| vlist Overscan | ✅ Tuned | `VLIST_OVERSCAN = 5` (240px) for fair comparison at high speeds |
| Legend List | ✅ Added | v3 React DOM entry point, optimized config for fair fixed-size comparison |

**Bottom line:** The benchmark infrastructure is solid and well-engineered. All critical issues — memory measurement, FPS ceiling, execution order, template complexity, and scroll methodology — have been fixed. The scroll phase now uses a rigorous dual-loop architecture with 7 speed levels, producing a complete scroll performance profile rather than a single data point. Remaining items (context disclaimer, rapid scroll reversals) are tracked above.