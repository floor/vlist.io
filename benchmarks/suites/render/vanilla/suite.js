// benchmarks/suites/render/vanilla/suite.js — Initial Render Benchmark
//
// Thin wrapper around engine/render.js measureRenderPerformance.
// Defines the vlist create/destroy lifecycle and formats results with rating thresholds.

import { createVList } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

defineSuite({
  id: "render-vanilla",
  name: "Initial Render (Vanilla)",
  description: "JS execution time of vlist() initial render",
  icon: "⚡",

  run: async ({ itemCount, container, onStatus, intensity }) => {
    const items = generateItems(itemCount);

    const result = await measureRenderPerformance({
      container,
      createFn: async (c) => {
        return createVList({
          container: c,
          item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
          items,
        });
      },
      destroyFn: (list) => list.destroy(),
      label: "vlist-vanilla",
      onStatus,
      hideContainer: false,
      ...(intensity?.renderIterations && { measureIterations: intensity.renderIterations }),
    });

    const goodThreshold =
      itemCount <= 10_000 ? 5 : itemCount <= 100_000 ? 10 : 50;
    const okThreshold =
      itemCount <= 10_000 ? 15 : itemCount <= 100_000 ? 30 : 120;

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
