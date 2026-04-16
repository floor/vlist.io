// benchmarks/suites/render/react/suite.js — Initial Render Benchmark (React)
//
// Thin wrapper around engine/render.js measureRenderPerformance.
// Defines the React create/destroy lifecycle and formats results with
// rating thresholds (slightly more lenient for React overhead).

import { createRoot } from "react-dom/client";
import { useVList } from "vlist-react";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  nextFrame,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

// =============================================================================
// React Component
// =============================================================================

function BenchmarkList({ items }) {
  const { containerRef } = useVList({
    items,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
  });

  return <div ref={containerRef} />;
}

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "render-react",
  name: "Initial Render (React)",
  description: "Time from useVList() hook to first painted frame",
  icon: "⚡",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    const result = await measureRenderPerformance({
      container,
      createFn: async (c) => {
        const root = createRoot(c);
        root.render(<BenchmarkList items={items} />);
        await nextFrame(); // React needs an extra frame to commit
        return root;
      },
      destroyFn: (root) => root.unmount(),
      label: "vlist-react",
      onStatus,
    });

    // Rating thresholds (slightly more lenient for React overhead)
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
