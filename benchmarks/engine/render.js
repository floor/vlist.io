// engine/render.js — Unified Render Measurement
//
// Measures initial render performance: time from component creation to first
// painted frame. Used identically by both suites and comparisons.
//
// Pipeline:
//   1. Warmup iterations (JIT optimization, no measurement)
//   2. Measured iterations with GC between each
//   3. Returns raw times + computed stats (median, min, p95)

import {
  nextFrame,
  waitFrames,
  tryGC,
  measureDuration,
  round,
  median,
  percentile,
} from "../runner.js";

import {
  RENDER_WARMUP_ITERATIONS,
  RENDER_MEASURE_ITERATIONS,
} from "./constants.js";

// =============================================================================
// Single render measurement
// =============================================================================

/**
 * Run a single render measurement.
 * Creates a component, waits for first paint, measures the duration,
 * then destroys the component.
 *
 * Uses `performance.mark/measure` for DevTools integration.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - Parent element
 * @param {(container: HTMLElement) => Promise<*>} opts.createFn - Creates and renders component, returns instance
 * @param {(instance: *) => Promise<void>|void} opts.destroyFn - Destroys component instance
 * @param {string} [opts.label="render"] - Label for performance.mark entries
 * @param {number} [opts.iteration=0] - Iteration number (for mark uniqueness)
 * @returns {Promise<number>} Render time in ms
 */
export const measureSingleRender = async ({
  container,
  createFn,
  destroyFn,
  label = "render",
  iteration = 0,
}) => {
  // Clear container
  container.innerHTML = "";

  // Let the container settle before measuring
  await nextFrame();

  const { duration, result: instance } = await measureDuration(
    `${label}-${iteration}`,
    async () => {
      const inst = await createFn(container);
      await nextFrame();
      return inst;
    },
  );

  // Clean up
  await destroyFn(instance);
  container.innerHTML = "";

  return duration;
};

// =============================================================================
// Full render benchmark pipeline
// =============================================================================

/**
 * Run the complete render benchmark: warmup + measured iterations.
 *
 * This is the single source of truth for render measurement methodology.
 * Both suites and comparisons call this function to ensure identical results.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - Parent element
 * @param {(container: HTMLElement) => Promise<*>} opts.createFn - Creates and renders component, returns instance
 * @param {(instance: *) => Promise<void>|void} opts.destroyFn - Destroys component instance
 * @param {string} [opts.label="render"] - Label for performance entries and status messages
 * @param {number} [opts.warmupIterations=RENDER_WARMUP_ITERATIONS] - Warmup count
 * @param {number} [opts.measureIterations=RENDER_MEASURE_ITERATIONS] - Measurement count
 * @param {(message: string) => void} [opts.onStatus] - Status update callback
 * @param {boolean} [opts.hideContainer=true] - Hide container during measurement to prevent visual glitches
 * @returns {Promise<RenderResult>}
 */

/**
 * @typedef {Object} RenderResult
 * @property {number[]} times - All measured render times (ms)
 * @property {number} median - Median render time (ms)
 * @property {number} min - Minimum render time (ms)
 * @property {number} p95 - 95th percentile render time (ms)
 */

export const measureRenderPerformance = async ({
  container,
  createFn,
  destroyFn,
  label = "render",
  warmupIterations = RENDER_WARMUP_ITERATIONS,
  measureIterations = RENDER_MEASURE_ITERATIONS,
  onStatus,
  hideContainer = true,
}) => {
  // Hide container during measurements to prevent visual glitches
  let originalVisibility;
  if (hideContainer) {
    originalVisibility = container.style.visibility;
    container.style.visibility = "hidden";
  }

  // ── Phase 1: Warmup — let the JIT optimize ──────────────────────────
  if (warmupIterations > 0) {
    onStatus?.("Warming up...");
    for (let i = 0; i < warmupIterations; i++) {
      await measureSingleRender({
        container,
        createFn,
        destroyFn,
        label: `${label}-warmup`,
        iteration: i,
      });
      await tryGC();
    }
  }

  // ── Phase 2: Measure ────────────────────────────────────────────────
  onStatus?.("Measuring...");
  const times = [];

  for (let i = 0; i < measureIterations; i++) {
    onStatus?.(`Iteration ${i + 1}/${measureIterations}`);

    await tryGC();

    const time = await measureSingleRender({
      container,
      createFn,
      destroyFn,
      label,
      iteration: i,
    });

    times.push(time);

    // Short pause between iterations
    await waitFrames(5);
  }

  // Restore visibility
  if (hideContainer) {
    container.style.visibility = originalVisibility;
  }

  // ── Compute stats ───────────────────────────────────────────────────
  const sorted = [...times].sort((a, b) => a - b);
  const med = round(median(times), 2);
  const min = round(sorted[0], 2);
  const p95 = round(percentile(sorted, 95), 2);

  return {
    times,
    median: med,
    min,
    p95,
  };
};
