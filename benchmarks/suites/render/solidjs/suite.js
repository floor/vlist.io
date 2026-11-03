// Initial Render for the SolidJS page. The existing suite calls the vlist entry
// directly, without the Solid runtime. Synthetic sets scroll.mode the same way.

import { createVList } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";
import { loadSynthetic, withScrollMode } from "../../../engine/synthetic.js";

function defineMode(mode) {
  defineSuite({
    id: mode === "synthetic" ? "render-synthetic-solidjs" : "render-solidjs",
    name: "Initial Render (SolidJS)",
    description: "Time from vlist creation to first painted frame",
    icon: "⚡",
    run: async ({ itemCount, container, onStatus, intensity }) => {
      if (mode === "synthetic") await loadSynthetic();
      const items = generateItems(itemCount);
      const result = await measureRenderPerformance({
        container,
        createFn: async (target) => createVList(withScrollMode({
          container: target,
          items,
          item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        }, mode)),
        destroyFn: (instance) => instance.destroy(),
        label: mode === "synthetic" ? "vlist-solidjs-synthetic" : "vlist-solidjs",
        onStatus,
        hideContainer: false,
        ...(intensity?.renderIterations && { measureIterations: intensity.renderIterations }),
      });
      const goodThreshold = itemCount <= 10_000 ? 5 : itemCount <= 100_000 ? 10 : 50;
      const okThreshold = itemCount <= 10_000 ? 15 : itemCount <= 100_000 ? 30 : 120;
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
