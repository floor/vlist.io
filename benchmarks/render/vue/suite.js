// benchmarks/render/vue/suite.js — Initial Render Benchmark (Vue)
//
// Measures how long it takes to create a vlist with Vue's useVList composable
// and render the first frame. Runs multiple iterations and reports median, min, and p95.

import { createApp } from "vue";
import { useVList } from "vlist-vue";
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
// Vue Component
// =============================================================================

const BenchmarkList = {
  props: {
    items: Array,
  },
  setup(props) {
    const { containerRef } = useVList({
      items: props.items,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    });

    return { containerRef };
  },
  template: `<div ref="containerRef"></div>`,
};

// =============================================================================
// Core measurement
// =============================================================================

/**
 * Run a single render measurement with Vue.
 * Creates a Vue app, mounts the component, waits for first paint, then unmounts.
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

  // Create Vue app and mount
  const app = createApp(BenchmarkList, { items });
  app.mount(container);

  // Wait for Vue to commit and browser to paint
  await nextFrame();
  await nextFrame(); // Vue may need an extra frame

  const elapsed = performance.now() - start;

  // Clean up
  app.unmount();
  container.innerHTML = "";

  return elapsed;
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "render-vue",
  name: "Initial Render (Vue)",
  description: "Time from useVList() composable to first painted frame",
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

    // Rating thresholds (slightly more lenient for Vue overhead)
    const goodThreshold =
      itemCount <= 10_000 ? 25 : itemCount <= 100_000 ? 40 : 100;
    const okThreshold =
      itemCount <= 10_000 ? 50 : itemCount <= 100_000 ? 80 : 250;

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
