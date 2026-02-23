# Comparison Benchmark Audit

> Honest analysis of the vlist vs TanStack Virtual comparison benchmark.
> Written to identify methodological issues, measurement artifacts, and actionable improvements.
>
> **Last updated:** Partial fixes applied — see Status column in [Recommendations](#recommendations).

## Overview

The comparison benchmark (`benchmarks/comparison/tanstack-virtual.js`) measures vlist against TanStack Virtual across four metrics: render time, memory usage, scroll FPS, and P95 frame time. While the benchmark infrastructure is well-structured and not intentionally biased, several methodological issues inflate vlist's apparent advantage.

This document breaks down each metric, explains what's real vs artifact, and proposes fixes.

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

### 3. Scroll FPS — ⚠️ Uninformative (Both Capped)

**Observed:** vlist `120.5 fps`, TanStack Virtual `120.5 fps` (0% difference)

**Problem:** Both libraries saturate the display's refresh rate. This is like drag-racing in a parking lot — both cars hit the speed bump at 5 km/h. You learn nothing about their actual performance ceiling.

The `measureScrollPerformance()` function uses `requestAnimationFrame` which is capped by the browser's compositor at the display refresh rate (120 Hz in this case). Neither library is the bottleneck.

**What would be more informative:**

- CPU throttling (Chrome DevTools 4x/6x slowdown) to push both libraries past their limits
- Heavier item templates (complex DOM, computed styles) instead of `String(index)`
- Measuring during rapid scroll direction changes (stress test for layout recalculation)

**Severity:** Low. The result is honest (a tie), but it doesn't help users make decisions.

---

### 4. P95 Frame Time — ✅ Honest (TanStack Wins)

**Observed:** vlist `10.11 ms`, TanStack Virtual `9.1 ms`

**This is the most interesting and credible metric.** TanStack has better frame consistency, likely because React's batching and scheduling produces more predictable frame timing than raw `requestAnimationFrame` + synchronous DOM mutations.

Credit to the benchmark for not hiding this — it shows vlist losing on an important metric.

**Severity:** None. This is good, honest data.

---

## Structural Biases

### Execution Order

vlist always runs first. This creates two compounding effects:

1. **GC cross-contamination:** vlist's garbage may be collected during TanStack's memory measurement window (explains the negative reading)
2. **JIT warming:** The JavaScript engine optimizes hot paths. The first library to run may face colder JIT, or conversely, the second may benefit from already-compiled shared utilities

**Fix:** Randomize execution order, or run each library in complete isolation.

### Apples-to-Oranges Architecture

vlist is a zero-dependency vanilla JS library. TanStack Virtual is a React hook. The benchmark includes React's entire runtime cost in TanStack's numbers:

- React fiber tree allocation
- Reconciler scheduling
- Effect processing
- Component lifecycle

This is a **real cost** that users pay, but it's important to communicate clearly. A TanStack user isn't choosing between "React + TanStack" and "nothing + vlist" — they already have React. The meaningful comparison for them is the marginal cost of TanStack's virtualization on top of their existing React app.

### Minimal Templates

The benchmark template is `(item, index) => String(index)`. This is trivially fast and makes the virtualization overhead dominate. In real applications, items have:

- Multiple DOM elements (avatar, title, subtitle, actions)
- Computed styles and conditional classes
- Event listeners
- Dynamic content

With complex templates, the template rendering cost would dominate, and the virtualization overhead difference would shrink proportionally.

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

### Priority 2: Add Stress Conditions — ✅ Fixed (CPU stress); 🔲 TODO (heavy templates, scroll reversals)

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
2. Called inside `measureScrollPerformance()`'s rAF tick, BEFORE the scroll update — simulates "other app work" that competes for frame budget
3. Applied equally to both libraries for fairness
4. `stressMs` threaded through: `runner.js` → `suite.run()` → `benchmarkVList()` / `benchmarkLibrary()` → `measureScrollPerformance()`
5. UI: stress buttons rendered via `STRESS_LEVELS` constant, only shown when `suite.comparison === true`

**Files changed:**
- `benchmarks/runner.js` — Added `STRESS_LEVELS`, `burnCpu()`, threaded `stressMs` through `RunOptions` → `suite.run()`
- `benchmarks/comparison/shared.js` — Added `stressMs` param to `measureScrollPerformance()`, `benchmarkVList()`, `benchmarkLibrary()`
- `benchmarks/comparison/*.js` — All 5 suites: added `comparison: true` flag, destructure and pass `stressMs`
- `benchmarks/templates.js` — Conditionally renders stress buttons for comparison suites
- `benchmarks/script.js` — Wires up stress button click handlers, passes `selectedStressMs` to runner

**Still TODO:**
- ~~**Heavy template variant**~~ ✅ DONE — "Template" toggle (Simple / Realistic) added. Realistic mode renders 7 child elements per item (avatar, content wrapper, title, subtitle, meta wrapper, badge, timestamp). Shared helpers (`createRealisticReactChildren`, `populateRealisticDOMChildren`, `benchmarkTemplateRealistic`) ensure all libraries render identical DOM structure. `templateMode` threaded through `runner.js` → `suite.run()` → `runComparison()` → both benchmark functions.
- **Rapid scroll reversals** — Stress test layout recalculation and DOM recycling (still TODO)

### Priority 3: Randomize Execution Order — ✅ DONE

Execution order is now randomized per run via the `runComparison()` helper in
`benchmarks/comparison/shared.js`. Each suite flips a coin to decide whether
vlist or the competitor runs first. A `tryGC()` + `waitFrames(5)` barrier is
always inserted between the two runs regardless of order. An informational
"Execution Order" row is appended to every result set showing which library
ran first (e.g. "vlist ran first (randomized to reduce ordering bias)").

All 5 comparison suites (`tanstack-virtual.js`, `react-window.js`, `virtua.js`,
`vue-virtual-scroller.js`, `solidjs.js`) now delegate to `runComparison()`
instead of duplicating the sequencing logic.

### Priority 4: Add Context Disclaimer — 🔲 TODO

Display a visible note in the benchmark UI:

> vlist is a zero-dependency vanilla JS library. TanStack Virtual requires React.
> Render time includes framework overhead. For React projects, the marginal
> difference is smaller than shown.

### Priority 5: Consider Same-Framework Comparison — 🔲 TODO

Create a variant that benchmarks vlist's React wrapper (`vlist-react`) against TanStack Virtual. This isolates the virtualization algorithm by putting both libraries on equal footing within the same framework.

---

## What's Genuinely Good About vlist

The honest story is already compelling without inflated metrics:

| Advantage | Real? | Notes |
|-----------|-------|-------|
| Zero dependencies | ✅ Yes | No React, no framework lock-in |
| Smaller bundle | ✅ Yes | ~7-16 KB vs React + TanStack |
| Framework-agnostic | ✅ Yes | Works with React, Vue, Solid, Svelte, or vanilla |
| Comparable render speed | ✅ Yes | Within ~7% even including React overhead |
| Matched scroll FPS | ✅ Yes | Both hit display refresh cap |

The pitch — "comparable performance with zero dependencies and framework freedom" — is strong without needing to show a misleading `-100.3%` memory advantage.

---

## Summary

| Metric | Status | Action |
|--------|--------|--------|
| Memory | ✅ Fixed | Isolated phases, negative rejection, `settleHeap()`, 3-attempt retry with median |
| Render Time | ✅ Partially fixed | Now uses `performance.mark/measure`; disclaimer still TODO |
| Scroll FPS | ✅ Fixed (stress mode) | CPU stress selector (None/Light/Medium/Heavy) reveals real FPS differences |
| P95 Frame Time | ✅ Honest, TanStack wins | Keep as-is |
| Execution Order | ✅ Fixed | Randomized via `runComparison()` helper; meta row shows which ran first |
| Template Complexity | ✅ Fixed | Simple/Realistic toggle; realistic = 7 child elements per item |

**Bottom line:** The benchmark infrastructure is solid and well-engineered. The four most critical issues — memory measurement, FPS ceiling, execution order, and template complexity — have been fixed. Remaining items (context disclaimer, rapid scroll reversals) are tracked above.