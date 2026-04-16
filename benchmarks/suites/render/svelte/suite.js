// benchmarks/suites/render/svelte/suite.js — Initial Render Benchmark (Svelte)
//
// Thin wrapper around engine/render.js measureRenderPerformance.
// Defines the vlist-svelte action create/destroy lifecycle and formats results with rating thresholds.

import { vlist } from "vlist-svelte";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

defineSuite({
  id: "render-svelte",
  name: "Initial Render (Svelte)",
  description: "Time from vlist() action to first painted frame",
  icon: "⚡",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    const result = await measureRenderPerformance({
      container,
      createFn: async (c) => {
        return vlist(c, {
          config: {
            item: {
              height: ITEM_HEIGHT,
              template: benchmarkTemplate,
            },
            items,
          },
        });
      },
      destroyFn: (action) => {
        if (action && action.destroy) {
          action.destroy();
        }
      },
      label: "vlist-svelte",
      onStatus,
    });

    // Rating thresholds depend on item count
    // Includes ~16ms of rAF overhead at 60fps
    const goodThreshold =
      itemCount <= 10_000 ? 20 : itemCount <= 100_000 ? 30 : 80;
    const okThreshold =
      itemCount <= 10_000 ? 40 : itemCount <= 100_000 ? 60 : 200;

    return [
      {
        label: "Median",
        value: result.median,
        unit: "ms",
        better: "lower",
        rating: rateLower(result.median, goodThreshold, okThreshold),
      },
      {
        label: "Min",
        value: result.min,
        unit: "ms",
        better: "lower",
        rating: rateLower(result.min, goodThreshold, okThreshold),
      },
      {
        label: "p95",
        value: result.p95,
        unit: "ms",
        better: "lower",
        rating: rateLower(result.p95, goodThreshold * 1.5, okThreshold * 1.5),
      },
    ];
  },
});
