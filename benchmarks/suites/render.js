// benchmarks/suites/render.js — Initial Render Benchmark
//
// Measures how long it takes to create a vlist and render the first frame.
// Runs multiple iterations and reports median, min, and p95.

import { vlist } from "vlist";
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
} from "../runner.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const WARMUP_ITERATIONS = 2;
const MEASURE_ITERATIONS = 7;

// =============================================================================
// Core measurement
// =============================================================================

/**
 * Run a single render measurement.
 * Creates a vlist, waits for first paint, then destroys it.
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

  const list = vlist({
    container,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
    items,
  }).build();

  // Wait for the browser to commit the paint (single frame)
  await nextFrame();

  const elapsed = performance.now() - start;

  // Clean up
  list.destroy();
  container.innerHTML = "";

  return elapsed;
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "render",
  name: "Initial Render",
  description: "Time from vlist() to first painted frame",
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

    // Rating thresholds depend on item count
    // Includes ~16ms of rAF overhead at 60fps
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
