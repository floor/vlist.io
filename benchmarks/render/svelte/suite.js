// benchmarks/render/svelte/suite.js — Initial Render Benchmark (Svelte)
//
// Measures how long it takes to create a vlist with Svelte's vlist action
// and render the first frame. Runs multiple iterations and reports median, min, and p95.

import { vlist } from "vlist-svelte";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  round,
  median,
  percentile,
  rateLower,
} from "../../runner.js";
import {
  ITEM_HEIGHT,
  WARMUP_ITERATIONS,
  MEASURE_ITERATIONS,
} from "../constants.js";

// =============================================================================
// Core measurement
// =============================================================================

/**
 * Run a single render measurement with Svelte action.
 * Calls vlist action directly, waits for first paint, then destroys.
 *
 * @param {HTMLElement} container
 * @param {Array<{id: number}>} items
 * @returns {Promise<number>} render time in ms
 */
const measureRender = async (container, items) => {
  // Clear container
  container.innerHTML = "";

  // Let the container settle before measuring
  await nextFrame();

  const start = performance.now();

  // Create vlist action directly (no Svelte runtime needed)
  const action = vlist(container, {
    config: {
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
      items,
    },
  });

  // Wait for the browser to commit the paint (single frame)
  await nextFrame();

  const elapsed = performance.now() - start;

  // Clean up
  if (action && action.destroy) {
    action.destroy();
  }
  container.innerHTML = "";

  return elapsed;
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "render-svelte",
  name: "Initial Render (Svelte)",
  description: "Time from vlist() action to first painted frame",
  icon: "⚡",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    // Warmup — let the JIT optimize
    onStatus("Warming up...");
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      await measureRender(container, items);
      await tryGC();
    }

    // Measure
    onStatus("Measuring...");
    const times = [];

    for (let i = 0; i < MEASURE_ITERATIONS; i++) {
      onStatus(`Iteration ${i + 1}/${MEASURE_ITERATIONS}`);

      await tryGC();
      const time = await measureRender(container, items);
      times.push(time);

      // Short pause between iterations
      await waitFrames(5);
    }

    // Compute stats
    const sorted = [...times].sort((a, b) => a - b);
    const med = round(median(times), 2);
    const min = round(sorted[0], 2);
    const p95 = round(percentile(sorted, 95), 2);

    // Rating thresholds (similar to vanilla JS)
    const goodThreshold =
      itemCount <= 10_000 ? 20 : itemCount <= 100_000 ? 30 : 80;
    const okThreshold =
      itemCount <= 10_000 ? 40 : itemCount <= 100_000 ? 60 : 200;

    return [
      {
        label: "Median",
        value: med,
        unit: "ms",
        better: "lower",
        rating: rateLower(med, goodThreshold, okThreshold),
      },
      {
        label: "Min",
        value: min,
        unit: "ms",
        better: "lower",
        rating: rateLower(min, goodThreshold, okThreshold),
      },
      {
        label: "p95",
        value: p95,
        unit: "ms",
        better: "lower",
        rating: rateLower(p95, goodThreshold * 1.5, okThreshold * 1.5),
      },
    ];
  },
});
