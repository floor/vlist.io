// benchmarks/comparison/shared.js — Shared Comparison Utilities
//
// Common functions and constants used across all library comparison benchmarks.
// Eliminates code duplication and ensures consistent methodology.
//
// Memory measurement is isolated from render iterations to prevent GC
// cross-contamination between phases. Negative deltas are rejected as
// artifacts. Timing uses performance.mark/measure for DevTools integration.

import { vlist } from "vlist";
import {
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  measureDuration,
  measureMemoryDelta,
  burnCpu,
  bytesToMB,
  round,
  median,
  percentile,
  ITEM_NAMES,
  ITEM_BADGES,
} from "../runner.js";

// Re-export utilities for comparison benchmarks
export { tryGC, waitFrames };

// Re-export item data arrays for comparison suite renderers (React, Vue, Solid)
export { ITEM_NAMES, ITEM_BADGES };

// =============================================================================
// Constants
// =============================================================================

export const ITEM_HEIGHT = 48;
export const MEASURE_ITERATIONS = 5;
export const MEMORY_ATTEMPTS = 3;
export const SCROLL_DURATION_MS = 5000;
export const SCROLL_SPEED_PX_PER_FRAME = 100;

// =============================================================================
// Helper: Realistic React item children
// =============================================================================

/**
 * Create React children for a realistic list item.
 *
 * Shared across TanStack Virtual, react-window, and Virtua so all three
 * React-based competitors render the exact same DOM structure as vlist's
 * `benchmarkTemplate`.
 *
 * @param {typeof import("react")} React - React module
 * @param {number} index - Item index
 * @returns {React.ReactNode[]} Array of React elements
 */
export const createRealisticReactChildren = (React, index) => {
  const n = ITEM_NAMES[index % ITEM_NAMES.length];
  const n2 = ITEM_NAMES[(index + 3) % ITEM_NAMES.length];
  return [
    React.createElement(
      "div",
      { key: "a", className: "bench-item__avatar" },
      `${n[0]}${n2[0]}`,
    ),
    React.createElement(
      "div",
      { key: "c", className: "bench-item__content" },
      React.createElement(
        "div",
        { className: "bench-item__title" },
        `${n} — Item ${index}`,
      ),
      React.createElement(
        "div",
        { className: "bench-item__sub" },
        "Lorem ipsum dolor sit amet",
      ),
    ),
    React.createElement(
      "div",
      { key: "m", className: "bench-item__meta" },
      React.createElement(
        "span",
        { className: "bench-item__badge" },
        ITEM_BADGES[index % ITEM_BADGES.length],
      ),
      React.createElement(
        "span",
        { className: "bench-item__time" },
        `${(index % 59) + 1}m`,
      ),
    ),
  ];
};

/**
 * Populate a DOM element with realistic item children.
 *
 * Shared helper for SolidJS (and any other suite that uses raw DOM).
 * Mirrors the same structure as `benchmarkTemplate` and
 * `createRealisticReactChildren`.
 *
 * @param {HTMLElement} el - Parent item element
 * @param {number} index - Item index
 */
export const populateRealisticDOMChildren = (el, index) => {
  const n = ITEM_NAMES[index % ITEM_NAMES.length];
  const n2 = ITEM_NAMES[(index + 3) % ITEM_NAMES.length];

  const avatar = document.createElement("div");
  avatar.className = "bench-item__avatar";
  avatar.textContent = `${n[0]}${n2[0]}`;

  const content = document.createElement("div");
  content.className = "bench-item__content";
  const title = document.createElement("div");
  title.className = "bench-item__title";
  title.textContent = `${n} — Item ${index}`;
  const sub = document.createElement("div");
  sub.className = "bench-item__sub";
  sub.textContent = "Lorem ipsum dolor sit amet";
  content.appendChild(title);
  content.appendChild(sub);

  const meta = document.createElement("div");
  meta.className = "bench-item__meta";
  const badge = document.createElement("span");
  badge.className = "bench-item__badge";
  badge.textContent = ITEM_BADGES[index % ITEM_BADGES.length];
  const time = document.createElement("span");
  time.className = "bench-item__time";
  time.textContent = `${(index % 59) + 1}m`;
  meta.appendChild(badge);
  meta.appendChild(time);

  el.appendChild(avatar);
  el.appendChild(content);
  el.appendChild(meta);
};

// =============================================================================
// Helper: Find scrollable viewport
// =============================================================================

/**
 * Find the scrollable viewport element in a container.
 * Tries vlist's viewport first, then searches the subtree for any
 * element with overflow scrolling (depth-first). This handles React
 * libraries that wrap the scroll container in extra divs, which
 * varies across browsers (Firefox in particular).
 */
export const findViewport = (container) => {
  // Check for vlist viewport first
  const vp = container.querySelector(".vlist-viewport");
  if (vp) return vp;

  // Depth-first search for any descendant with overflow scrolling
  const walk = (el) => {
    for (const child of el.children) {
      const style = getComputedStyle(child);
      if (
        style.overflow === "auto" ||
        style.overflow === "scroll" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll"
      ) {
        return child;
      }
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };

  return walk(container) || container.firstElementChild;
};

// =============================================================================
// Helper: Scroll measurement
// =============================================================================

/**
 * Scroll and measure frame times over a duration.
 * Returns median FPS and frame time percentiles.
 *
 * @param {HTMLElement} viewport - Scrollable element
 * @param {number} durationMs - Duration to scroll in milliseconds
 * @param {number} [stressMs=0] - CPU burn per frame (simulates app workload)
 * @returns {Promise<{medianFPS: number, medianFrameTime: number, p95FrameTime: number, totalFrames: number}>}
 */
export const measureScrollPerformance = async (
  viewport,
  durationMs,
  stressMs = 0,
) => {
  const frameTimes = [];
  let lastTime = performance.now();
  let scrollPos = 0;
  let direction = 1;
  const maxScroll = viewport.scrollHeight - viewport.clientHeight;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;

      if (elapsed >= durationMs) {
        // Calculate FPS from frame times
        const medianFrameTime = median(frameTimes);
        const p95FrameTime = percentile(
          [...frameTimes].sort((a, b) => a - b),
          95,
        );
        const medianFPS = round(1000 / medianFrameTime, 1);

        resolve({
          medianFPS,
          medianFrameTime: round(medianFrameTime, 2),
          p95FrameTime: round(p95FrameTime, 2),
          totalFrames: frameTimes.length,
        });
        return;
      }

      // Record frame time
      const frameTime = now - lastTime;
      frameTimes.push(frameTime);
      lastTime = now;

      // Simulate additional CPU work (stress mode).
      // Burns BEFORE the scroll update so the library's rendering
      // competes for the remaining frame budget — just like in a
      // real app where other components consume CPU time.
      if (stressMs > 0) burnCpu(stressMs);

      // Update scroll position (bidirectional)
      scrollPos += SCROLL_SPEED_PX_PER_FRAME * direction;

      if (scrollPos >= maxScroll) {
        scrollPos = maxScroll;
        direction = -1; // Reverse direction
      } else if (scrollPos <= 0) {
        scrollPos = 0;
        direction = 1; // Forward direction
      }

      viewport.scrollTop = scrollPos;

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

// =============================================================================
// Helper: Retry memory measurement
// =============================================================================

/**
 * Measure memory usage with multiple attempts for reliability.
 *
 * A single `measureMemoryDelta()` call can return null when GC reclaims
 * stale garbage during the snapshot window, producing a negative delta.
 * Running multiple attempts and taking the median of valid readings
 * dramatically reduces the chance of reporting "—" to the user.
 *
 * The last attempt's instance is kept alive (not destroyed) so Phase 3
 * (scroll) can reuse it directly.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - Benchmark container
 * @param {() => Promise<*>} opts.createFn - Creates and returns a component instance
 * @param {(instance: *) => Promise<void>} opts.destroyFn - Destroys a component instance
 * @param {Function} opts.onStatus - Status callback
 * @param {string} opts.label - Library name for status messages
 * @param {number} [opts.attempts=MEMORY_ATTEMPTS] - Max measurement attempts
 * @returns {Promise<{memoryUsed: number|null, instance: *}>}
 */
const measureMemoryWithRetries = async ({
  container,
  createFn,
  destroyFn,
  onStatus,
  label,
  attempts = MEMORY_ATTEMPTS,
}) => {
  const validDeltas = [];
  let instance = null;

  for (let i = 0; i < attempts; i++) {
    // Destroy previous attempt's instance before retrying
    if (instance) {
      await destroyFn(instance);
      instance = null;
    }
    container.innerHTML = "";

    onStatus(
      attempts > 1
        ? `Testing ${label} - measuring memory (${i + 1}/${attempts})...`
        : `Testing ${label} - measuring memory...`,
    );

    let inst;
    const delta = await measureMemoryDelta(async () => {
      inst = await createFn();
      await waitFrames(3);
    });

    instance = inst;

    if (delta !== null) {
      validDeltas.push(delta);
    }
  }

  const memoryUsed =
    validDeltas.length > 0 ? bytesToMB(median(validDeltas)) : null;

  // instance is still mounted — caller uses it for Phase 3 (scroll)
  return { memoryUsed, instance };
};

// =============================================================================
// Benchmark: vlist (baseline)
// =============================================================================

/**
 * Benchmark vlist performance (used as baseline in all comparisons).
 *
 * Three isolated phases:
 *   1. TIMING  — render iterations with performance.mark/measure
 *   2. MEMORY  — up to MEMORY_ATTEMPTS isolated measurements (median)
 *   3. SCROLL  — FPS and P95 frame time
 *
 * @param {HTMLElement} container - Container element
 * @param {number} itemCount - Number of items to render
 * @param {Function} onStatus - Status callback
 * @param {number} [stressMs=0] - CPU burn per frame during scroll (simulates app workload)
 * @returns {Promise<{library: string, renderTime: number, memoryUsed: number|null, scrollFPS: number, p95FrameTime: number}>}
 */
export const benchmarkVList = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  onStatus("Testing vlist - preparing...");

  // Generate minimal items array (just indices, very fast)
  const items = Array.from({ length: itemCount }, (_, i) => i);

  // ── Phase 1: TIMING ────────────────────────────────────────────────────
  // Measure render time across multiple iterations using performance.mark/measure.
  // No memory measurement here — iterations create/destroy garbage that would
  // pollute heap snapshots.

  const renderTimes = [];

  // Hide container during measurements to prevent visual glitches
  const originalVisibility = container.style.visibility;
  container.style.visibility = "hidden";

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const { duration, result: tempList } = await measureDuration(
      `vlist-render-${i}`,
      async () => {
        const list = vlist({
          container,
          item: {
            height: ITEM_HEIGHT,
            template: benchmarkTemplate,
          },
        }).build();

        list.setItems(items);
        await nextFrame();
        return list;
      },
    );

    renderTimes.push(duration);

    // Destroy the instance — it was only for timing
    tempList.destroy();
    container.innerHTML = "";
  }

  // Restore visibility
  container.style.visibility = originalVisibility;

  // ── Phase 2: MEMORY ────────────────────────────────────────────────────
  // Up to MEMORY_ATTEMPTS isolated measurements. settleHeap() inside each
  // attempt flushes garbage before the baseline snapshot. The median of
  // valid readings is used; null only when ALL attempts fail.

  const { memoryUsed, instance: list } = await measureMemoryWithRetries({
    container,
    createFn: () => {
      const l = vlist({
        container,
        item: {
          height: ITEM_HEIGHT,
          template: benchmarkTemplate,
        },
      }).build();

      l.setItems(items);
      return l;
    },
    destroyFn: (l) => l.destroy(),
    onStatus,
    label: "vlist",
  });

  // ── Phase 3: SCROLL ────────────────────────────────────────────────────
  // Uses the instance from the last memory attempt (still mounted).

  onStatus(
    stressMs > 0
      ? `Testing vlist - scrolling (stress ${stressMs}ms)...`
      : "Testing vlist - scrolling...",
  );
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
    stressMs,
  );

  // Cleanup
  if (list) list.destroy();
  container.innerHTML = "";

  return {
    library: "vlist",
    renderTime: round(median(renderTimes), 2),
    memoryUsed,
    scrollFPS: scrollMetrics.medianFPS,
    p95FrameTime: scrollMetrics.p95FrameTime,
  };
};

// =============================================================================
// Generic Library Benchmark
// =============================================================================

/**
 * Generic benchmark wrapper for any library.
 *
 * Three isolated phases:
 *   1. TIMING  — render iterations with performance.mark/measure
 *   2. MEMORY  — up to MEMORY_ATTEMPTS isolated measurements (median)
 *   3. SCROLL  — FPS and P95 frame time
 *
 * @param {Object} config - Benchmark configuration
 * @param {string} config.libraryName - Name of the library
 * @param {HTMLElement} config.container - Container element
 * @param {number} config.itemCount - Number of items to render
 * @param {Function} config.onStatus - Status callback
 * @param {Function} config.createComponent - Function that creates and mounts the component
 * @param {Function} config.destroyComponent - Function that destroys/unmounts the component
 * @param {number} [config.stressMs=0] - CPU burn per frame during scroll
 * @returns {Promise<Object>} Benchmark results
 */
export const benchmarkLibrary = async (config) => {
  const {
    libraryName,
    container,
    itemCount,
    onStatus,
    createComponent,
    destroyComponent,
    stressMs = 0,
  } = config;

  // ── Phase 1: TIMING ────────────────────────────────────────────────────

  onStatus(`Testing ${libraryName} - preparing...`);

  const renderTimes = [];

  // Hide container during measurements to prevent visual glitches
  const originalVisibility = container.style.visibility;
  container.style.visibility = "hidden";

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const { duration, result: instance } = await measureDuration(
      `${libraryName}-render-${i}`,
      async () => {
        const inst = await createComponent(container, itemCount);
        await nextFrame();
        return inst;
      },
    );

    renderTimes.push(duration);

    // Destroy — this instance was only for timing
    await destroyComponent(instance);
  }

  // Restore visibility
  container.style.visibility = originalVisibility;

  // ── Phase 2: MEMORY ────────────────────────────────────────────────────
  // Up to MEMORY_ATTEMPTS isolated measurements. settleHeap() inside each
  // attempt flushes garbage before the baseline snapshot. The median of
  // valid readings is used; null only when ALL attempts fail.

  const { memoryUsed, instance } = await measureMemoryWithRetries({
    container,
    createFn: () => createComponent(container, itemCount),
    destroyFn: destroyComponent,
    onStatus,
    label: libraryName,
  });

  // ── Phase 3: SCROLL ────────────────────────────────────────────────────
  // Uses the instance from the last memory attempt (still mounted).

  onStatus(
    stressMs > 0
      ? `Testing ${libraryName} - scrolling (stress ${stressMs}ms)...`
      : `Testing ${libraryName} - scrolling...`,
  );
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
    stressMs,
  );

  // Cleanup
  await destroyComponent(instance);
  container.innerHTML = "";

  return {
    library: libraryName,
    renderTime: round(median(renderTimes), 2),
    memoryUsed,
    scrollFPS: scrollMetrics.medianFPS,
    p95FrameTime: scrollMetrics.p95FrameTime,
  };
};

// =============================================================================
// Metrics Calculation
// =============================================================================

/**
 * Calculate comparison metrics between vlist and another library.
 * Returns array of metric objects for display.
 *
 * Handles null/unavailable memory gracefully — if either library's memory
 * measurement was unreliable (negative delta, API unavailable), the memory
 * comparison section is omitted entirely rather than showing misleading data.
 *
 * @param {Object} vlistResults - vlist benchmark results
 * @param {Object} libResults - Library benchmark results
 * @param {string} libraryName - Name of the library being compared
 * @param {Function} rateLower - Rating function for lower-is-better metrics
 * @param {Function} rateHigher - Rating function for higher-is-better metrics
 * @returns {Array} Array of metric objects
 */
export const calculateComparisonMetrics = (
  vlistResults,
  libResults,
  libraryName,
  rateLower,
  rateHigher,
) => {
  const metrics = [];

  // Render Time Comparison
  if (vlistResults.renderTime && libResults.renderTime) {
    const diff = vlistResults.renderTime - libResults.renderTime;
    const pct = round((diff / libResults.renderTime) * 100, 1);

    metrics.push({
      label: "vlist Render Time",
      value: vlistResults.renderTime,
      unit: "ms",
      better: "lower",
      rating: rateLower(vlistResults.renderTime, 30, 50),
    });

    metrics.push({
      label: `${libraryName} Render Time`,
      value: libResults.renderTime,
      unit: "ms",
      better: "lower",
      rating: rateLower(libResults.renderTime, 30, 50),
    });

    metrics.push({
      label: "Render Time Difference",
      value: pct,
      unit: "%",
      better: "lower",
      rating: pct < 0 ? "good" : pct < 20 ? "ok" : "bad",
      meta: pct < 0 ? "vlist is faster" : `${libraryName} is faster`,
    });
  }

  // Memory Comparison
  // Only shown when BOTH measurements are valid (non-null, positive).
  // If either is null the measurement was unreliable and we skip entirely
  // rather than displaying misleading data.
  if (
    vlistResults.memoryUsed != null &&
    vlistResults.memoryUsed > 0 &&
    libResults.memoryUsed != null &&
    libResults.memoryUsed > 0
  ) {
    const diff = vlistResults.memoryUsed - libResults.memoryUsed;
    const pct = round((diff / libResults.memoryUsed) * 100, 1);

    metrics.push({
      label: "vlist Memory Usage",
      value: vlistResults.memoryUsed,
      unit: "MB",
      better: "lower",
      rating: rateLower(vlistResults.memoryUsed, 30, 50),
    });

    metrics.push({
      label: `${libraryName} Memory Usage`,
      value: libResults.memoryUsed,
      unit: "MB",
      better: "lower",
      rating: rateLower(libResults.memoryUsed, 30, 50),
    });

    metrics.push({
      label: "Memory Difference",
      value: pct,
      unit: "%",
      better: "lower",
      rating: pct < 0 ? "good" : pct < 20 ? "ok" : "bad",
      meta: pct < 0 ? "vlist uses less" : `${libraryName} uses less`,
    });
  } else {
    // At least one measurement was unreliable — show individual values where
    // available, and a note row explaining why the comparison can't be computed.
    // Uses `displayValue` to override the numeric rendering with "—" for
    // unavailable measurements.

    const vlistMem = vlistResults.memoryUsed;
    const libMem = libResults.memoryUsed;
    const vlistValid = vlistMem != null && vlistMem > 0;
    const libValid = libMem != null && libMem > 0;

    metrics.push({
      label: "vlist Memory Usage",
      value: vlistValid ? vlistMem : 0,
      unit: vlistValid ? "MB" : "",
      better: "lower",
      rating: vlistValid ? rateLower(vlistMem, 30, 50) : undefined,
      displayValue: vlistValid ? undefined : "—",
      meta: vlistValid ? undefined : "GC artifact — measurement discarded",
    });

    metrics.push({
      label: `${libraryName} Memory Usage`,
      value: libValid ? libMem : 0,
      unit: libValid ? "MB" : "",
      better: "lower",
      rating: libValid ? rateLower(libMem, 30, 50) : undefined,
      displayValue: libValid ? undefined : "—",
      meta: libValid ? undefined : "GC artifact — measurement discarded",
    });

    metrics.push({
      label: "Memory Difference",
      value: 0,
      unit: "",
      better: "lower",
      rating: "ok",
      displayValue: "—",
      meta: "Retry or launch Chrome with --enable-precise-memory-info",
    });
  }

  // Scroll FPS Comparison
  if (vlistResults.scrollFPS && libResults.scrollFPS) {
    const diff = vlistResults.scrollFPS - libResults.scrollFPS;
    const pct = round((diff / libResults.scrollFPS) * 100, 1);

    metrics.push({
      label: "vlist Scroll FPS",
      value: vlistResults.scrollFPS,
      unit: "fps",
      better: "higher",
      rating: rateHigher(vlistResults.scrollFPS, 55, 50),
    });

    metrics.push({
      label: `${libraryName} Scroll FPS`,
      value: libResults.scrollFPS,
      unit: "fps",
      better: "higher",
      rating: rateHigher(libResults.scrollFPS, 55, 50),
    });

    metrics.push({
      label: "FPS Difference",
      value: pct,
      unit: "%",
      better: "higher",
      rating: pct > 0 ? "good" : pct > -5 ? "ok" : "bad",
      meta: pct > 0 ? "vlist is smoother" : `${libraryName} is smoother`,
    });
  }

  // P95 Frame Time Comparison
  if (vlistResults.p95FrameTime && libResults.p95FrameTime) {
    metrics.push({
      label: "vlist P95 Frame Time",
      value: vlistResults.p95FrameTime,
      unit: "ms",
      better: "lower",
      rating: rateLower(vlistResults.p95FrameTime, 20, 30),
    });

    metrics.push({
      label: `${libraryName} P95 Frame Time`,
      value: libResults.p95FrameTime,
      unit: "ms",
      better: "lower",
      rating: rateLower(libResults.p95FrameTime, 20, 30),
    });
  }

  // Add error metric if library failed
  if (libResults.error) {
    metrics.push({
      label: `${libraryName} Error`,
      value: 0,
      unit: "",
      better: "lower",
      rating: "bad",
      meta: libResults.error,
    });
  }

  return metrics;
};

// =============================================================================
// Randomized Comparison Runner
// =============================================================================

/**
 * Run a comparison benchmark with randomized execution order.
 *
 * Flips a coin to decide whether vlist or the competitor runs first,
 * eliminating two systematic biases:
 *   1. GC from the first runner bleeding into the second's memory phase
 *   2. JIT warmth differences between first and second runner
 *
 * A `tryGC()` + `waitFrames(5)` barrier is always inserted between the
 * two runs regardless of order.
 *
 * Appends an informational "Execution Order" row to the returned metrics
 * so reviewers can see which library ran first in each run.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - Benchmark container element
 * @param {number} opts.itemCount - Number of items to render
 * @param {Function} opts.onStatus - Status callback
 * @param {number} [opts.stressMs=0] - CPU burn per frame during scroll
 * @param {string} opts.libraryName - Display name of the competitor library
 * @param {Function} opts.benchmarkCompetitor - async (container, itemCount, onStatus, stressMs) => results
 * @param {Function} opts.rateLower - Rating function for lower-is-better metrics
 * @param {Function} opts.rateHigher - Rating function for higher-is-better metrics
 * @returns {Promise<Array>} Array of metric objects from calculateComparisonMetrics
 */
export const runComparison = async ({
  container,
  itemCount,
  onStatus,
  stressMs = 0,
  libraryName,
  benchmarkCompetitor,
  rateLower: rateLowerFn,
  rateHigher: rateHigherFn,
}) => {
  onStatus("Preparing benchmark...");

  const vlistFirst = Math.random() < 0.5;
  const firstRunner = vlistFirst ? "vlist" : libraryName;

  let vlistResults;
  let libResults;

  const runVList = async () => {
    return benchmarkVList(container, itemCount, onStatus, stressMs);
  };

  const runCompetitor = async () => {
    try {
      return await benchmarkCompetitor(
        container,
        itemCount,
        onStatus,
        stressMs,
      );
    } catch (err) {
      console.warn(`[comparison] ${libraryName} test failed:`, err);
      return {
        library: libraryName,
        renderTime: null,
        memoryUsed: null,
        scrollFPS: null,
        p95FrameTime: null,
        error: err.message,
      };
    }
  };

  if (vlistFirst) {
    vlistResults = await runVList();
    await tryGC();
    await waitFrames(5);
    libResults = await runCompetitor();
  } else {
    libResults = await runCompetitor();
    await tryGC();
    await waitFrames(5);
    vlistResults = await runVList();
  }

  const metrics = calculateComparisonMetrics(
    vlistResults,
    libResults,
    libraryName,
    rateLowerFn,
    rateHigherFn,
  );

  // Append execution order note for transparency
  metrics.push({
    label: "Execution Order",
    value: 0,
    unit: "",
    better: "none",
    rating: "info",
    displayValue: "",
    meta: `${firstRunner} ran first (randomized to reduce ordering bias)`,
  });

  return metrics;
};
