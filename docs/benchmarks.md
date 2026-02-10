# vlist - Benchmarks

The benchmark page (`/benchmarks/`) runs four live performance suites directly in the browser against a real vlist instance. Each suite creates a vlist, exercises it programmatically, and reports measured metrics with quality ratings.

**URL:** `/benchmarks/` (served by vlist.dev)

## Quick Reference

| Suite | What it measures | Key metric |
|-------|-----------------|------------|
| **Initial Render** | Time from `createVList()` to first painted frame | Median (ms) |
| **Scroll FPS** | Sustained scroll rendering throughput over 5s | Avg FPS, Frame budget (ms) |
| **Memory** | Heap usage after render and after 10s of scrolling | Scroll delta (MB) |
| **scrollToIndex** | Latency of smooth `scrollToIndex()` animation | Median (ms) |

All suites can be run at three item counts: **10K**, **100K**, and **1M**.

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
| **After render** | MB | Heap increase after `createVList()` + first paint |
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
A scroll event listener registered *after* `createVList()`, guaranteeing its rAF callback runs *after* vlist's `rafThrottle` handler in the same frame. Measures:
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

| File | Purpose |
|------|---------|
| `benchmarks/script.js` | Dashboard UI, viewport management, result rendering |
| `benchmarks/runner.js` | Benchmark engine — suite registry, execution, utilities |
| `benchmarks/suites/render.js` | Initial Render suite |
| `benchmarks/suites/scroll.js` | Scroll FPS suite (decoupled architecture) |
| `benchmarks/suites/memory.js` | Memory suite |
| `benchmarks/suites/scrollto.js` | scrollToIndex suite |
| `benchmarks/styles.css` | Benchmark page styles |
| `benchmarks/build.ts` | Bun build script (JS bundling + CSS minification) |

### Build

```bash
bun run build:bench        # One-shot build
bun run build:bench:watch  # Watch mode
```

Output goes to `benchmarks/dist/`.