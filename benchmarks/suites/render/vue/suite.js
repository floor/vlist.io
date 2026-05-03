// benchmarks/suites/render/vue/suite.js — Initial Render Benchmark (Vue)
//
// Thin wrapper around engine/render.js measureRenderPerformance.
// Defines the Vue create/destroy lifecycle and formats results with rating thresholds.

import { createApp } from "vue";
import { useVList } from "vlist-vue";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

// =============================================================================
// Vue Component
// =============================================================================

const BenchmarkList = {
  props: {
    items: Array,
    target: Object,
  },
  setup(props) {
    const { containerRef } = useVList({
      items: props.items,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    });

    containerRef.value = props.target;

    return () => null;
  },
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

    const result = await measureRenderPerformance({
      container,
      createFn: async (c) => {
        const app = createApp(BenchmarkList, { items, target: c });
        app.mount(c);
        return app;
      },
      destroyFn: (app) => app.unmount(),
      label: "vlist-vue",
      onStatus,
      hideContainer: false,
    });

    // Rating thresholds (slightly more lenient for Vue overhead)
    const goodThreshold =
      itemCount <= 10_000 ? 25 : itemCount <= 100_000 ? 40 : 100;
    const okThreshold =
      itemCount <= 10_000 ? 50 : itemCount <= 100_000 ? 80 : 250;

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
