// benchmarks/comparison/shared.js — Shared Comparison Utilities
//
// Common functions and constants used across all library comparison benchmarks.
// Eliminates code duplication and ensures consistent methodology.

import { vlist } from "vlist";
import {
  generateItems,
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  getHeapUsed,
  bytesToMB,
  round,
  median,
  percentile,
} from "../runner.js";

// Re-export utilities for comparison benchmarks
export { tryGC, waitFrames };

// =============================================================================
// Constants
// =============================================================================

export const ITEM_HEIGHT = 48;
export const MEASURE_ITERATIONS = 5;
export const SCROLL_DURATION_MS = 5000;
export const SCROLL_SPEED_PX_PER_FRAME = 100;

// =============================================================================
// Helper: Find scrollable viewport
// =============================================================================

/**
 * Find the scrollable viewport element in a container.
 * Tries vlist's viewport first, then looks for overflow containers.
 */
export const findViewport = (container) => {
  // Check for vlist viewport first
  const vp = container.querySelector(".vlist-viewport");
  if (vp) return vp;

  // Look for any child with overflow scrolling
  for (const child of container.children) {
    const style = getComputedStyle(child);
    if (
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll"
    ) {
      return child;
    }
  }

  // Fallback to first child
  return container.firstElementChild;
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
 * @returns {Promise<{medianFPS: number, medianFrameTime: number, p95FrameTime: number, totalFrames: number}>}
 */
export const measureScrollPerformance = async (viewport, durationMs) => {
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
// Benchmark: vlist (baseline)
// =============================================================================

/**
 * Benchmark vlist performance (used as baseline in all comparisons).
 * Measures render time, memory usage, scroll FPS, and P95 frame time.
 *
 * @param {HTMLElement} container - Container element
 * @param {number} itemCount - Number of items to render
 * @param {Function} onStatus - Status callback
 * @returns {Promise<{library: string, renderTime: number, memoryUsed: number|null, scrollFPS: number, p95FrameTime: number}>}
 */
export const benchmarkVList = async (container, itemCount, onStatus) => {
  onStatus("Testing vlist - preparing...");

  // Generate minimal items array (just indices, very fast)
  // The template only uses index, so we don't need full item objects
  const items = Array.from({ length: itemCount }, (_, i) => i);

  // Measure memory before
  await tryGC();
  const memBefore = getHeapUsed();

  // Measure render time across multiple iterations
  const renderTimes = [];

  // Hide container during measurements to prevent visual glitches
  const originalVisibility = container.style.visibility;
  container.style.visibility = "hidden";

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const start = performance.now();

    const list = vlist({
      container,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    }).build();

    list.setItems(items);

    await nextFrame();
    const renderTime = performance.now() - start;
    renderTimes.push(renderTime);

    list.destroy();
  }

  // Restore visibility
  container.style.visibility = originalVisibility;

  // Create final instance for memory and scroll testing
  container.innerHTML = "";
  await tryGC();

  onStatus("Testing vlist - rendering...");

  const list = vlist({
    container,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
  }).build();

  list.setItems(items);

  await waitFrames(3);

  // Measure memory after render
  await tryGC();
  const memAfter = getHeapUsed();

  // Find viewport and measure scroll performance
  onStatus("Testing vlist - scrolling...");
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
  );

  // Cleanup
  list.destroy();
  container.innerHTML = "";

  return {
    library: "vlist",
    renderTime: round(median(renderTimes), 2),
    memoryUsed: memAfter && memBefore ? bytesToMB(memAfter - memBefore) : null,
    scrollFPS: scrollMetrics.medianFPS,
    p95FrameTime: scrollMetrics.p95FrameTime,
  };
};

// =============================================================================
// Generic Library Benchmark
// =============================================================================

/**
 * Generic benchmark wrapper for any library.
 * Handles the standard benchmark flow: render iterations, memory measurement, scroll testing.
 *
 * @param {Object} config - Benchmark configuration
 * @param {string} config.libraryName - Name of the library
 * @param {HTMLElement} config.container - Container element
 * @param {number} config.itemCount - Number of items to render
 * @param {Function} config.onStatus - Status callback
 * @param {Function} config.createComponent - Function that creates and mounts the component
 * @param {Function} config.destroyComponent - Function that destroys/unmounts the component
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
  } = config;

  onStatus(`Testing ${libraryName} - preparing...`);

  // Measure memory before
  await tryGC();
  const memBefore = getHeapUsed();

  // Measure render time across multiple iterations
  const renderTimes = [];

  // Hide container during measurements to prevent visual glitches
  const originalVisibility = container.style.visibility;
  container.style.visibility = "hidden";

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const start = performance.now();

    // Library-specific component creation
    const instance = await createComponent(container, itemCount);

    await nextFrame();
    const renderTime = performance.now() - start;
    renderTimes.push(renderTime);

    // Library-specific cleanup
    await destroyComponent(instance);
  }

  // Restore visibility
  container.style.visibility = originalVisibility;

  // Create final instance for memory and scroll testing
  container.innerHTML = "";
  await tryGC();

  onStatus(`Testing ${libraryName} - rendering...`);

  const instance = await createComponent(container, itemCount);

  await waitFrames(3);

  // Measure memory after render
  await tryGC();
  const memAfter = getHeapUsed();

  // Find viewport and measure scroll performance
  onStatus(`Testing ${libraryName} - scrolling...`);
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
  );

  // Cleanup
  await destroyComponent(instance);
  container.innerHTML = "";

  return {
    library: libraryName,
    renderTime: round(median(renderTimes), 2),
    memoryUsed: memAfter && memBefore ? bytesToMB(memAfter - memBefore) : null,
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
  if (vlistResults.memoryUsed && libResults.memoryUsed) {
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
