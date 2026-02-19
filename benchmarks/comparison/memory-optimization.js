// benchmarks/comparison/memory-optimization.js — Memory Optimization Comparison
//
// Compares memory usage between:
// 1. Baseline (default config: copyOnInit: true, enableItemById: true)
// 2. Optimized (copyOnInit: false, enableItemById: false)
//
// Shows the actual memory savings from the optimization flags.

import { vlist } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  waitFrames,
  tryGC,
  getHeapUsed,
  bytesToMB,
  round,
} from "../runner.js";

// =============================================================================
// Helpers
// =============================================================================

const ITEM_HEIGHT = 48;
const SETTLE_FRAMES = 20;

/**
 * Measure memory after creating and rendering a vlist
 * @param {HTMLElement} container
 * @param {number} itemCount
 * @param {object} config - Additional config (copyOnInit, enableItemById)
 * @returns {Promise<{baseline: number, afterRender: number, deltaMB: number}>}
 */
const measureMemory = async (container, itemCount, config = {}) => {
  const items = generateItems(itemCount);

  // Clear and measure baseline
  container.innerHTML = "";
  await tryGC();
  await waitFrames(SETTLE_FRAMES);
  const baseline = getHeapUsed();

  // Create vlist with specified config
  const list = vlist({
    container,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
    items,
    ...config,
  }).build();

  // Let render settle and GC stabilize
  await waitFrames(SETTLE_FRAMES);
  await tryGC();
  await waitFrames(SETTLE_FRAMES);

  const afterRender = getHeapUsed();
  const deltaMB = bytesToMB(afterRender - baseline);

  // Cleanup
  list.destroy();
  container.innerHTML = "";
  await tryGC();

  return { baseline, afterRender, deltaMB };
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "memory-optimization-comparison",
  name: "Memory Optimization Impact",
  description:
    "Compare baseline vs optimized config to measure memory savings from copyOnInit and enableItemById flags",
  icon: "⚖️",

  run: async ({ itemCount, container, onStatus }) => {
    // Check API availability
    const testHeap = getHeapUsed();
    if (testHeap === null) {
      return [
        {
          label: "Status",
          value: 0,
          unit: "",
          better: "lower",
          rating: "ok",
          _note:
            "performance.memory unavailable — use Chrome with --enable-precise-memory-info",
        },
      ];
    }

    // ── Test 1: Baseline (default config) ────────────────────────────────
    onStatus("Testing baseline config...");
    const baselineResult = await measureMemory(container, itemCount, {
      copyOnInit: true, // Default: copy array
      enableItemById: true, // Default: build id→index Map
    });

    // ── Test 2: Optimized (memory-efficient config) ──────────────────────
    onStatus("Testing optimized config...");
    const optimizedResult = await measureMemory(container, itemCount, {
      copyOnInit: false, // Don't copy array
      enableItemById: false, // Don't build Map
    });

    // ── Compute comparison metrics ────────────────────────────────────────
    const savings = baselineResult.deltaMB - optimizedResult.deltaMB;
    const savingsPercent = (savings / baselineResult.deltaMB) * 100;

    // Rating based on savings percentage
    let savingsRating = "bad";
    if (savingsPercent >= 50) savingsRating = "good";
    else if (savingsPercent >= 25) savingsRating = "ok";

    return [
      {
        label: "Baseline memory",
        value: round(baselineResult.deltaMB, 2),
        unit: "MB",
        better: "lower",
        rating: "ok",
      },
      {
        label: "Optimized memory",
        value: round(optimizedResult.deltaMB, 2),
        unit: "MB",
        better: "lower",
        rating: optimizedResult.deltaMB < baselineResult.deltaMB ? "good" : "bad",
      },
      {
        label: "Memory saved",
        value: round(savings, 2),
        unit: "MB",
        better: "higher",
        rating: savingsRating,
      },
      {
        label: "Reduction",
        value: round(savingsPercent, 1),
        unit: "%",
        better: "higher",
        rating: savingsRating,
      },
      {
        label: "Config changes",
        value: 0,
        unit: "",
        better: "lower",
        rating: "ok",
        _note: "copyOnInit: false, enableItemById: false",
      },
    ];
  },
});
