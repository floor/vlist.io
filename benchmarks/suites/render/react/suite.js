// Initial Render for React. Synthetic passes factory from vlist/synthetic.

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useVList } from "vlist-react";
import { createVList as createSynthetic } from "vlist/synthetic";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

function BenchmarkList({ items, target, factory }) {
  const { containerRef } = useVList({
    items,
    item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
    ...(factory ? { factory } : {}),
  });
  containerRef.current = target;
  return null;
}

function defineMode(mode) {
  defineSuite({
    id: mode === "synthetic" ? "render-synthetic-react" : "render-react",
    name: "Initial Render (React)",
    description: "Time from useVList() hook to first painted frame",
    icon: "⚡",
    run: async ({ itemCount, container, onStatus, intensity }) => {
      const items = generateItems(itemCount);
      const factory = mode === "synthetic" ? createSynthetic : undefined;
      const result = await measureRenderPerformance({
        container,
        createFn: async (target) => {
          const root = createRoot(target);
          flushSync(() => {
            root.render(<BenchmarkList items={items} target={target} factory={factory} />);
          });
          return root;
        },
        destroyFn: (root) => root.unmount(),
        label: mode === "synthetic" ? "vlist-react-synthetic" : "vlist-react",
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
