// benchmarks/suites/render/react/suite.js — Initial Render Benchmark (React)
//
// Thin wrapper around engine/render.js measureRenderPerformance.
// Defines the React create/destroy lifecycle and formats results with
// rating thresholds (slightly more lenient for React overhead).

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useVList } from "vlist-react";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureRenderPerformance } from "../../../engine/render.js";

// =============================================================================
// React Component
// =============================================================================

function BenchmarkList({ items, target }) {
  const { containerRef } = useVList({
    items,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
  });

  containerRef.current = target;

  return null;
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
        flushSync(() => {
          root.render(<BenchmarkList items={items} target={c} />);
        });
        return root;
      },
      destroyFn: (root) => root.unmount(),
      label: "vlist-react",
      onStatus,
      hideContainer: false,
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
