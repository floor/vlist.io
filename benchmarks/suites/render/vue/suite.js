// Initial Render for Vue. Synthetic passes factory from vlist/synthetic.

import { createApp } from "vue";
import { useVList } from "vlist-vue";
import { createVList as createSynthetic } from "vlist/synthetic";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

const BenchmarkList = {
  props: { items: Array, target: Object, factory: Function },
  setup(props) {
    const { containerRef } = useVList({
      items: props.items,
      item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
      ...(props.factory ? { factory: props.factory } : {}),
    });
    containerRef.value = props.target;
    return () => null;
  },
};

function defineMode(mode) {
  defineSuite({
    id: mode === "synthetic" ? "render-synthetic-vue" : "render-vue",
    name: "Initial Render (Vue)",
    description: "Time from useVList() composable to first painted frame",
    icon: "⚡",
    run: async ({ itemCount, container, onStatus, intensity }) => {
      const items = generateItems(itemCount);
      const factory = mode === "synthetic" ? createSynthetic : undefined;
      const result = await measureRenderPerformance({
        container,
        createFn: async (target) => {
          const app = createApp(BenchmarkList, { items, target, factory });
          app.mount(target);
          return app;
        },
        destroyFn: (app) => app.unmount(),
        label: mode === "synthetic" ? "vlist-vue-synthetic" : "vlist-vue",
        onStatus,
        hideContainer: false,
        ...(intensity?.renderIterations && { measureIterations: intensity.renderIterations }),
      });
      const goodThreshold = itemCount <= 10_000 ? 10 : itemCount <= 100_000 ? 20 : 80;
      const okThreshold = itemCount <= 10_000 ? 30 : itemCount <= 100_000 ? 50 : 180;
      return [
        { label: "Median", value: result.median, unit: "ms", better: "lower", rating: rateLower(result.median, goodThreshold, okThreshold) },
        { label: "Min", value: result.min, unit: "ms", better: "lower", rating: rateLower(result.min, goodThreshold, okThreshold) },
        { label: "p95", value: result.p95, unit: "ms", better: "lower", rating: rateLower(result.p95, goodThreshold * 1.5, okThreshold * 1.5) },
      ];
    },
  });
}

defineMode("native");
if (__BENCH_HAS_SYNTHETIC__) defineMode("synthetic");
