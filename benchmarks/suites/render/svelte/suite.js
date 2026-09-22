// Initial Render for Svelte. Synthetic passes factory from vlist/synthetic.

import { vlist } from "vlist-svelte";
import { createVList as createSynthetic } from "vlist/synthetic";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

function defineMode(mode) {
  defineSuite({
    id: mode === "synthetic" ? "render-synthetic-svelte" : "render-svelte",
    name: "Initial Render (Svelte)",
    description: "Time from vlist() action to first painted frame",
    icon: "⚡",
    run: async ({ itemCount, container, onStatus, intensity }) => {
      const items = generateItems(itemCount);
      const result = await measureRenderPerformance({
        container,
        createFn: async (target) => vlist(target, {
          config: {
            item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
            items,
            ...(mode === "synthetic" ? { factory: createSynthetic } : {}),
          },
        }),
        destroyFn: (action) => action?.destroy?.(),
        label: mode === "synthetic" ? "vlist-svelte-synthetic" : "vlist-svelte",
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
