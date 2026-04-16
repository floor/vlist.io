// benchmarks/comparison/shared.js — Shared Comparison Utilities
//
// Common functions and constants used across all library comparison benchmarks.
// Eliminates code duplication and ensures consistent methodology.
//
// Measurement functions are imported from the shared engine modules so that
// comparison benchmarks use the exact same methodology as suite benchmarks.

import { vlist } from "vlist";
import {
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  round,
  median,
  ITEM_NAMES,
  ITEM_BADGES,
} from "../runner.js";

// Engine modules — single source of truth for measurement methodology
import { findViewport } from "../engine/viewport.js";
import { measureRenderPerformance } from "../engine/render.js";
import { measureScrollRun } from "../engine/scroll.js";
import { measureMemoryWithRetries } from "../engine/memory.js";
import {
  ITEM_HEIGHT,
  VLIST_OVERSCAN,
  RENDER_WARMUP_ITERATIONS,
  RENDER_MEASURE_ITERATIONS,
  MEMORY_ATTEMPTS,
  BASE_SCROLL_SPEED,
  COMPARISON_SCROLL_SPEEDS,
  COMPARISON_SCROLL_DURATION_MS,
} from "../engine/constants.js";

// =============================================================================
// Re-exports — public API consumed by comparison benchmark files
// =============================================================================

// Utilities from runner.js
export { tryGC, waitFrames };

// Item data arrays for comparison suite renderers (React, Vue, Solid)
export { ITEM_NAMES, ITEM_BADGES };

// Viewport detection from engine
export { findViewport };

// Constants from engine (re-exported under both engine names and legacy names)
export {
  ITEM_HEIGHT,
  VLIST_OVERSCAN,
  BASE_SCROLL_SPEED,
  COMPARISON_SCROLL_SPEEDS,
};
export { MEMORY_ATTEMPTS };

// Legacy aliases — some comparison files may use the old names
export const MEASURE_ITERATIONS = RENDER_MEASURE_ITERATIONS;
export const SCROLL_DURATION_MS = COMPARISON_SCROLL_DURATION_MS;

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

/**
 * Generate realistic item HTML as a string (for Clusterize.js).
 * Faster than creating DOM elements and serializing with outerHTML.
 *
 * @param {number} index - Item index
 * @returns {string} HTML string
 */
export const generateRealisticItemHTML = (index) => {
  const n = ITEM_NAMES[index % ITEM_NAMES.length];
  const n2 = ITEM_NAMES[(index + 3) % ITEM_NAMES.length];
  const badge = ITEM_BADGES[index % ITEM_BADGES.length];
  const time = `${(index % 59) + 1}m`;

  return `<div class="bench-item" style="height: 48px;">
  <div class="bench-item__avatar">${n[0]}${n2[0]}</div>
  <div class="bench-item__content">
    <div class="bench-item__title">${n} — Item ${index}</div>
    <div class="bench-item__sub">Lorem ipsum dolor sit amet</div>
  </div>
  <div class="bench-item__meta">
    <span class="bench-item__badge">${badge}</span>
    <span class="bench-item__time">${time}</span>
  </div>
</div>`;
};

// =============================================================================
// Benchmark: vlist (baseline)
// =============================================================================

/**
 * Benchmark vlist performance (used as baseline in all comparisons).
 *
 * Three isolated phases:
 *   1. TIMING  — warmup + measured render iterations via engine/render.js
 *   2. MEMORY  — retry-based measurement via engine/memory.js
 *   3. SCROLL  — 3-loop architecture via engine/scroll.js
 *
 * @param {HTMLElement} container - Container element
 * @param {number} itemCount - Number of items to render
 * @param {Function} onStatus - Status callback
 * @param {number} [stressMs=0] - CPU burn per frame during scroll (simulates app workload)
 * @returns {Promise<{library: string, renderTime: number, memoryUsed: number|null, scrollResults: Array}>}
 */
export const benchmarkVList = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  onStatus("Testing vlist - preparing...");

  // Generate minimal items array with id property (required by vlist dev check)
  const items = Array.from({ length: itemCount }, (_, i) => ({ id: i }));

  // ── Phase 1: TIMING ────────────────────────────────────────────────────
  // Uses the unified engine: 2 warmup + 7 measured iterations, median reported.
  // No memory measurement here — iterations create/destroy garbage that would
  // pollute heap snapshots.

  const renderResult = await measureRenderPerformance({
    container,
    createFn: async (c) => {
      return vlist({
        container: c,
        overscan: VLIST_OVERSCAN,
        item: {
          height: ITEM_HEIGHT,
          template: benchmarkTemplate,
        },
        items,
      }).build();
    },
    destroyFn: (list) => list.destroy(),
    label: "vlist",
    onStatus: (msg) => onStatus(`Testing vlist - ${msg.toLowerCase()}`),
  });

  // ── Phase 2: MEMORY ────────────────────────────────────────────────────
  // Up to MEMORY_ATTEMPTS isolated measurements. The median of valid
  // readings is used; null only when ALL attempts fail.
  // The last attempt's instance is kept alive for Phase 3 (scroll).

  const { memoryUsedMB, instance: list } = await measureMemoryWithRetries({
    container,
    createFn: () => {
      return vlist({
        container,
        overscan: VLIST_OVERSCAN,
        item: {
          height: ITEM_HEIGHT,
          template: benchmarkTemplate,
        },
        items,
      }).build();
    },
    destroyFn: (l) => l.destroy(),
    onStatus,
    label: "vlist",
  });

  // ── Phase 3: SCROLL ────────────────────────────────────────────────────
  // Uses the instance from the last memory attempt (still mounted).
  // Tests at all COMPARISON_SCROLL_SPEEDS to expose performance cliffs.
  // Uses the 3-loop architecture from engine/scroll.js.

  const viewport = findViewport(container);
  const scrollResults = [];

  if (!viewport) {
    console.warn(
      "[benchmarkVList] No scrollable viewport found — scroll metrics will be zero",
    );
  }

  for (const speed of COMPARISON_SCROLL_SPEEDS) {
    const stressLabel = stressMs > 0 ? ` (stress ${stressMs}ms)` : "";
    onStatus(`Testing vlist - scrolling ${speed.label}${stressLabel}...`);

    // Reset scroll position between speed runs
    if (viewport) viewport.scrollTop = 0;
    await nextFrame();

    const scrollMetrics = await measureScrollRun({
      viewport,
      durationMs: COMPARISON_SCROLL_DURATION_MS,
      speedPxPerSec: speed.pxPerSec,
      stressMs,
    });

    scrollResults.push({
      speed,
      medianFPS: scrollMetrics.medianFPS,
      p95FrameTime: scrollMetrics.p95FrameTime,
    });
  }

  // Cleanup
  if (list) list.destroy();
  container.innerHTML = "";

  return {
    library: "vlist",
    renderTime: renderResult.median,
    memoryUsed: memoryUsedMB,
    scrollResults,
  };
};

// =============================================================================
// Generic Library Benchmark
// =============================================================================

/**
 * Generic benchmark wrapper for any library.
 *
 * Three isolated phases:
 *   1. TIMING  — warmup + measured render iterations via engine/render.js
 *   2. MEMORY  — retry-based measurement via engine/memory.js
 *   3. SCROLL  — 3-loop architecture via engine/scroll.js
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
  // Uses the unified engine: 2 warmup + 7 measured iterations, median reported.

  onStatus(`Testing ${libraryName} - preparing...`);

  const renderResult = await measureRenderPerformance({
    container,
    createFn: (c) => createComponent(c, itemCount),
    destroyFn: destroyComponent,
    label: libraryName,
    onStatus: (msg) =>
      onStatus(`Testing ${libraryName} - ${msg.toLowerCase()}`),
  });

  // ── Phase 2: MEMORY ────────────────────────────────────────────────────
  // Up to MEMORY_ATTEMPTS isolated measurements. The median of valid
  // readings is used; null only when ALL attempts fail.
  // The last attempt's instance is kept alive for Phase 3 (scroll).

  const { memoryUsedMB, instance } = await measureMemoryWithRetries({
    container,
    createFn: () => createComponent(container, itemCount),
    destroyFn: destroyComponent,
    onStatus,
    label: libraryName,
  });

  // ── Phase 3: SCROLL ────────────────────────────────────────────────────
  // Uses the instance from the last memory attempt (still mounted).
  // Tests at all COMPARISON_SCROLL_SPEEDS to expose performance cliffs.
  // Uses the 3-loop architecture from engine/scroll.js.

  const viewport = findViewport(container);

  if (!viewport) {
    console.warn(
      `[benchmarkLibrary] No scrollable viewport found for ${libraryName} — scroll metrics will be zero`,
    );
  }

  // Scroll nudge: some libraries (e.g. Virtua) keep items visibility:hidden
  // until a scroll event triggers their internal measurement/layout pass.
  // A tiny scroll-and-back forces them to materialize visible items.
  if (viewport) {
    viewport.scrollTop = 1;
    await nextFrame();
    viewport.scrollTop = 0;
    await nextFrame();
  }

  const scrollResults = [];

  for (const speed of COMPARISON_SCROLL_SPEEDS) {
    const stressLabel = stressMs > 0 ? ` (stress ${stressMs}ms)` : "";
    onStatus(
      `Testing ${libraryName} - scrolling ${speed.label}${stressLabel}...`,
    );

    // Reset scroll position between speed runs
    if (viewport) viewport.scrollTop = 0;
    await nextFrame();

    const scrollMetrics = await measureScrollRun({
      viewport,
      durationMs: COMPARISON_SCROLL_DURATION_MS,
      speedPxPerSec: speed.pxPerSec,
      stressMs,
    });

    scrollResults.push({
      speed,
      medianFPS: scrollMetrics.medianFPS,
      p95FrameTime: scrollMetrics.p95FrameTime,
    });
  }

  // Cleanup
  await destroyComponent(instance);
  container.innerHTML = "";

  return {
    library: libraryName,
    renderTime: renderResult.median,
    memoryUsed: memoryUsedMB,
    scrollResults,
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
      meta:
        pct === 0
          ? undefined
          : pct < 0
            ? "vlist is faster"
            : `${libraryName} is faster`,
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
      meta:
        pct === 0
          ? undefined
          : pct < 0
            ? "vlist uses less"
            : `${libraryName} uses less`,
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

  // Scroll FPS Comparison — average across all speeds
  const vlistScroll = vlistResults.scrollResults || [];
  const libScroll = libResults.scrollResults || [];

  if (vlistScroll.length > 0 && libScroll.length > 0) {
    // Collect valid FPS and P95 values from all speed runs
    const vlistFPSValues = vlistScroll.map((r) => r.medianFPS).filter(Boolean);
    const libFPSValues = libScroll.map((r) => r.medianFPS).filter(Boolean);
    const vlistP95Values = vlistScroll
      .map((r) => r.p95FrameTime)
      .filter(Boolean);
    const libP95Values = libScroll.map((r) => r.p95FrameTime).filter(Boolean);

    // Average FPS across speeds
    const avgFn = (arr) =>
      arr.length > 0
        ? round(arr.reduce((a, b) => a + b, 0) / arr.length, 1)
        : null;

    const vlistAvgFPS = avgFn(vlistFPSValues);
    const libAvgFPS = avgFn(libFPSValues);
    const vlistAvgP95 = avgFn(vlistP95Values);
    const libAvgP95 = avgFn(libP95Values);

    // FPS
    if (vlistAvgFPS && libAvgFPS) {
      const diff = vlistAvgFPS - libAvgFPS;
      const pct = round((diff / libAvgFPS) * 100, 1);

      metrics.push({
        label: "vlist Scroll FPS",
        value: vlistAvgFPS,
        unit: "fps",
        better: "higher",
        rating: rateHigher(vlistAvgFPS, 55, 50),
      });

      metrics.push({
        label: `${libraryName} Scroll FPS`,
        value: libAvgFPS,
        unit: "fps",
        better: "higher",
        rating: rateHigher(libAvgFPS, 55, 50),
      });

      metrics.push({
        label: "FPS Difference",
        value: pct,
        unit: "%",
        better: "higher",
        rating: pct > 0 ? "good" : pct > -5 ? "ok" : "bad",
        meta:
          pct === 0
            ? undefined
            : pct > 0
              ? "vlist is smoother"
              : `${libraryName} is smoother`,
      });
    }

    // P95 Frame Time
    if (vlistAvgP95 && libAvgP95) {
      metrics.push({
        label: "vlist P95 Frame Time",
        value: vlistAvgP95,
        unit: "ms",
        better: "lower",
        rating: rateLower(vlistAvgP95, 20, 30),
      });

      metrics.push({
        label: `${libraryName} P95 Frame Time`,
        value: libAvgP95,
        unit: "ms",
        better: "lower",
        rating: rateLower(libAvgP95, 20, 30),
      });
    }
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
        scrollResults: [],
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
