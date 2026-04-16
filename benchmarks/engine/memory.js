// engine/memory.js — Unified Memory Measurement
//
// Two measurement modes:
//
//   1. measureMemoryProfile() — Full 3-phase measurement (suite mode)
//      baseline → after render → after 10s scroll → compute deltas
//      Reveals memory leaks via scroll delta.
//
//   2. measureMemoryWithRetries() — Retry-based delta (comparison mode)
//      Up to N isolated create/destroy attempts, median of valid deltas.
//      More reliable for cross-library comparison where GC noise is higher.
//
// Both modes use the same underlying heap measurement APIs.

import {
  nextFrame,
  waitFrames,
  tryGC,
  settleHeap,
  getHeapUsed,
  measureMemoryDelta,
  bytesToMB,
  median,
} from "../runner.js";
import { findViewport } from "./viewport.js";
import {
  MEMORY_SCROLL_DURATION_MS,
  MEMORY_SCROLL_SPEED_PX_PER_FRAME,
  MEMORY_SETTLE_FRAMES,
  MEMORY_ATTEMPTS,
} from "./constants.js";

// =============================================================================
// Helper: Scroll a viewport for a given duration (rAF-based)
// =============================================================================

/**
 * Scroll a viewport for a duration, bouncing at top/bottom.
 * Uses rAF loop with per-frame pixel increments.
 *
 * @param {Element} viewport - The scrollable element
 * @param {number} durationMs - How long to scroll
 * @param {number} speedPxPerFrame - Pixels to advance per rAF frame
 * @param {(progress: number) => void} [onProgress] - Progress callback (0-1)
 * @returns {Promise<void>}
 */
export const scrollViewport = (
  viewport,
  durationMs,
  speedPxPerFrame = MEMORY_SCROLL_SPEED_PX_PER_FRAME,
  onProgress,
) => {
  return new Promise((resolve) => {
    let startTime = 0;
    let scrollPos = viewport.scrollTop || 0;
    let direction = 1;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    let lastProgressUpdate = 0;

    const tick = (timestamp) => {
      if (startTime === 0) {
        startTime = timestamp;
        requestAnimationFrame(tick);
        return;
      }

      const elapsed = timestamp - startTime;

      if (elapsed >= durationMs) {
        if (onProgress) onProgress(1);
        resolve();
        return;
      }

      // Update progress every ~100ms to avoid excessive callback calls
      if (onProgress && elapsed - lastProgressUpdate > 100) {
        onProgress(elapsed / durationMs);
        lastProgressUpdate = elapsed;
      }

      scrollPos += speedPxPerFrame * direction;

      if (scrollPos >= maxScroll) {
        scrollPos = maxScroll;
        direction = -1;
      } else if (scrollPos <= 0) {
        scrollPos = 0;
        direction = 1;
      }

      viewport.scrollTop = scrollPos;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

// =============================================================================
// Mode 1: Full Memory Profile (suite mode)
// =============================================================================

/**
 * Full 3-phase memory measurement for detailed heap profiling.
 *
 * Measures JS heap at three points:
 *   1. Baseline — before component is created
 *   2. After render — immediately after creation + first paint
 *   3. After scroll — after sustained scrolling
 *
 * The delta between (2) and (3) reveals memory leaks.
 * Chrome-only (requires performance.memory API).
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - Container element
 * @param {() => Promise<{instance: *, viewport?: Element}>} opts.createFn
 *   Creates the component. Returns instance and optionally the viewport element.
 *   If viewport is not returned, findViewport(container) is used.
 * @param {(instance: *) => Promise<void>|void} opts.destroyFn - Destroys the component
 * @param {number} [opts.scrollDurationMs] - How long to scroll (default: 10s)
 * @param {number} [opts.scrollSpeedPxPerFrame] - Scroll speed per rAF frame
 * @param {number} [opts.settleFrames] - Frames to wait for GC to settle
 * @param {(msg: string) => void} [opts.onStatus] - Status callback
 * @param {(progress: number) => void} [opts.onProgress] - Scroll progress callback
 * @returns {Promise<MemoryProfileResult>}
 *
 * @typedef {Object} MemoryProfileResult
 * @property {boolean} available - Whether the memory API is available
 * @property {number|null} baseline - Heap bytes before creation
 * @property {number|null} afterRender - Heap bytes after render
 * @property {number|null} afterScroll - Heap bytes after scroll
 * @property {number} renderDeltaBytes - afterRender - baseline (bytes)
 * @property {number} scrollDeltaBytes - afterScroll - afterRender (bytes)
 * @property {number} totalDeltaBytes - afterScroll - baseline (bytes)
 * @property {number} renderDeltaMB - Render delta in MB
 * @property {number} scrollDeltaMB - Scroll delta in MB
 * @property {number} totalDeltaMB - Total delta in MB
 * @property {number} afterRenderMB - Absolute heap after render in MB
 */
export const measureMemoryProfile = async ({
  container,
  createFn,
  destroyFn,
  scrollDurationMs = MEMORY_SCROLL_DURATION_MS,
  scrollSpeedPxPerFrame = MEMORY_SCROLL_SPEED_PX_PER_FRAME,
  settleFrames = MEMORY_SETTLE_FRAMES,
  onStatus,
  onProgress,
}) => {
  // Check API availability
  const testHeap = getHeapUsed();
  if (testHeap === null) {
    return {
      available: false,
      baseline: null,
      afterRender: null,
      afterScroll: null,
      renderDeltaBytes: 0,
      scrollDeltaBytes: 0,
      totalDeltaBytes: 0,
      renderDeltaMB: 0,
      scrollDeltaMB: 0,
      totalDeltaMB: 0,
      afterRenderMB: 0,
    };
  }

  // ── Phase 1: Baseline ──────────────────────────────────────────────────
  if (onStatus) onStatus("Measuring baseline...");
  container.innerHTML = "";
  await tryGC();
  await waitFrames(settleFrames);

  const baseline = getHeapUsed();

  // ── Phase 2: Create component and measure after render ─────────────────
  if (onStatus) onStatus("Creating list...");

  const { instance, viewport: providedViewport } = await createFn();

  // Let the render settle and GC stabilize
  await waitFrames(settleFrames);
  await tryGC();
  await waitFrames(settleFrames);

  const afterRender = getHeapUsed();

  // ── Phase 3: Scroll and measure ────────────────────────────────────────
  const viewport = providedViewport || findViewport(container);

  if (!viewport) {
    await destroyFn(instance);
    container.innerHTML = "";
    throw new Error("Could not find scrollable viewport element");
  }

  if (onStatus) onStatus(`Scrolling for ${scrollDurationMs / 1000}s...`);
  await scrollViewport(viewport, scrollDurationMs, scrollSpeedPxPerFrame, (progress) => {
    if (onProgress) onProgress(progress);
    if (onStatus) {
      const remaining = Math.ceil((1 - progress) * (scrollDurationMs / 1000));
      onStatus(`Scrolling... ${remaining}s remaining`);
    }
  });

  // Let GC settle after scrolling
  await waitFrames(settleFrames);
  await tryGC();
  await waitFrames(settleFrames);

  const afterScroll = getHeapUsed();

  // ── Clean up ───────────────────────────────────────────────────────────
  await destroyFn(instance);
  container.innerHTML = "";
  await tryGC();

  // ── Compute metrics ────────────────────────────────────────────────────
  const renderDeltaBytes = afterRender - baseline;
  const scrollDeltaBytes = afterScroll - afterRender;
  const totalDeltaBytes = afterScroll - baseline;

  return {
    available: true,
    baseline,
    afterRender,
    afterScroll,
    renderDeltaBytes,
    scrollDeltaBytes,
    totalDeltaBytes,
    renderDeltaMB: bytesToMB(renderDeltaBytes),
    scrollDeltaMB: bytesToMB(scrollDeltaBytes),
    totalDeltaMB: bytesToMB(totalDeltaBytes),
    afterRenderMB: bytesToMB(afterRender),
  };
};

// =============================================================================
// Mode 2: Retry-Based Memory Delta (comparison mode)
// =============================================================================

/**
 * Measure memory usage with multiple attempts for reliability.
 *
 * A single measureMemoryDelta() call can return null when GC reclaims
 * stale garbage during the snapshot window, producing a negative delta.
 * Running multiple attempts and taking the median of valid readings
 * dramatically reduces the chance of reporting "—" to the user.
 *
 * The last attempt's instance is kept alive (not destroyed) so the caller
 * can reuse it for subsequent phases (e.g. scroll measurement).
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - Benchmark container
 * @param {() => Promise<*>} opts.createFn - Creates and returns a component instance
 * @param {(instance: *) => Promise<void>|void} opts.destroyFn - Destroys a component instance
 * @param {(msg: string) => void} [opts.onStatus] - Status callback
 * @param {string} [opts.label] - Library name for status messages
 * @param {number} [opts.attempts] - Max measurement attempts
 * @returns {Promise<{memoryUsedMB: number|null, instance: *}>}
 */
export const measureMemoryWithRetries = async ({
  container,
  createFn,
  destroyFn,
  onStatus,
  label = "library",
  attempts = MEMORY_ATTEMPTS,
}) => {
  const validDeltas = [];
  let instance = null;

  // Check if the memory API is available. On Firefox (and any browser without
  // performance.memory) measureMemoryDelta returns null immediately — *before*
  // calling the create callback. That means the component is never mounted,
  // leaving `instance` null and subsequent phases with an empty container.
  const hasMemoryAPI = getHeapUsed() !== null;

  if (hasMemoryAPI) {
    for (let i = 0; i < attempts; i++) {
      // Destroy previous attempt's instance before retrying
      if (instance) {
        await destroyFn(instance);
        instance = null;
      }
      container.innerHTML = "";

      if (onStatus) {
        onStatus(
          attempts > 1
            ? `Testing ${label} - measuring memory (${i + 1}/${attempts})...`
            : `Testing ${label} - measuring memory...`,
        );
      }

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
  } else {
    // No memory API — skip measurement but still create the component
    // so subsequent phases have a mounted instance to work with.
    if (onStatus) {
      onStatus(`Testing ${label} - measuring memory (not available)...`);
    }
    container.innerHTML = "";
    instance = await createFn();
    await waitFrames(3);
  }

  const memoryUsedMB =
    validDeltas.length > 0 ? bytesToMB(median(validDeltas)) : null;

  // instance is still mounted — caller can use it for subsequent phases
  return { memoryUsedMB, instance };
};
