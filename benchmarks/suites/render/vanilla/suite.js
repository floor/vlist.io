// benchmarks/suites/render/vanilla/suite.js — Initial Render Benchmark
//
// Thin wrapper around engine/render.js measureRenderPerformance.
// Defines the vlist create/destroy lifecycle and formats results with rating thresholds.

import { createVList } from "vlist";
import { createVList as createSynthetic } from "vlist/synthetic";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

const formatRenderMetrics = (itemCount, result) => {
  const goodThreshold = itemCount <= 10_000 ? 5 : itemCount <= 100_000 ? 10 : 50;
  const okThreshold = itemCount <= 10_000 ? 15 : itemCount <= 100_000 ? 30 : 120;
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
};

const defineRenderSuite = (id, name, description, label, create) => {
  defineSuite({
    id,
    name,
    description,
    icon: "⚡",
    run: async ({ itemCount, container, onStatus, intensity }) => {
      const items = generateItems(itemCount);
      const result = await measureRenderPerformance({
        container,
        createFn: async (target) => create(target, items),
        destroyFn: (list) => list.destroy(),
        label,
        onStatus,
        hideContainer: false,
        ...(intensity?.renderIterations && { measureIterations: intensity.renderIterations }),
      });
      return formatRenderMetrics(itemCount, result);
    },
  });
};

defineRenderSuite(
  "render-vanilla",
  "Initial Render (Vanilla)",
  "JS execution time of vlist() initial render",
  "vlist-vanilla",
  (container, items) => createVList({
    container,
    item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
    items,
  }),
);

if (__BENCH_HAS_SYNTHETIC__) defineRenderSuite(
  "render-synthetic",
  "Initial Render (Synthetic)",
  "JS execution time of the synthetic entry's initial render",
  "vlist-synthetic",
  (container, items) => createSynthetic({
    container,
    item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
    items,
  }),
);
