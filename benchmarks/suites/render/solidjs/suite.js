// benchmarks/suites/render/solidjs/suite.js — Initial Render Benchmark (SolidJS)
//
// Thin wrapper around engine/render.js measureRenderPerformance.
// Uses the core vlist library directly (no SolidJS runtime in benchmarks).
// Defines the vlist create/destroy lifecycle and formats results with rating thresholds.

import { vlist } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

defineSuite({
  id: "render-solidjs",
  name: "Initial Render (SolidJS)",
  description: "Time from vlist creation to first painted frame",
  icon: "⚡",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    const result = await measureRenderPerformance({
      container,
      createFn: async (c) => {
        return vlist({
          container: c,
          items,
          item: {
            height: ITEM_HEIGHT,
            template: benchmarkTemplate,
          },
        }).build();
      },
      destroyFn: (instance) => instance.destroy(),
      label: "vlist-solidjs",
      onStatus,
      hideContainer: false,
    });

    // Rating thresholds (similar to vanilla JavaScript - no framework overhead in benchmarks)
    const goodThreshold =
      itemCount <= 10_000 ? 15 : itemCount <= 100_000 ? 30 : 80;
    const okThreshold =
      itemCount <= 10_000 ? 40 : itemCount <= 100_000 ? 65 : 200;

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
