// benchmarks/suites/memory/react/suite.js — Memory Benchmark (React)
//
// Thin wrapper around engine/memory.js measureMemoryProfile.
// Defines the React create/destroy lifecycle and formats results with
// rating thresholds (slightly more lenient for React overhead).

import { createRoot } from "react-dom/client";
import { useVList } from "vlist-react";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  waitFrames,
  round,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureMemoryProfile } from "../../../engine/memory.js";

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
  id: "memory-react",
  name: "Memory (React)",
  description:
    "Heap usage after render and after 10s of scrolling — reveals leaks and GC pressure",
  icon: "🧠",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    const result = await measureMemoryProfile({
      container,
      createFn: async () => {
        const root = createRoot(container);
        root.render(<BenchmarkList items={items} />);
        await waitFrames(5); // React needs extra frames to settle
        return { instance: root };
      },
      destroyFn: (root) => root.unmount(),
      onStatus,
    });

    // ── Handle unavailable API ─────────────────────────────────────────
    if (!result.available) {
      return [
        {
          label: "Status",
          value: 0,
          unit: "",
          better: "lower",
          rating: "ok",
          _note:
            "performance.memory unavailable — use Chrome with --enable-precise-memory-info",
        },
      ];
    }

    // ── Format metrics ─────────────────────────────────────────────────
    const { renderDeltaMB, scrollDeltaMB, afterRenderMB, totalDeltaMB } =
      result;

    // Thresholds adjusted for React overhead (more lenient)
    const scrollLeakGood = itemCount <= 100_000 ? 1.5 : 4;
    const scrollLeakOk = itemCount <= 100_000 ? 6 : 12;

    // Render heap thresholds (MB) - more lenient for React
    const renderGood =
      itemCount <= 10_000 ? 8 : itemCount <= 100_000 ? 20 : 100;
    const renderOk = itemCount <= 10_000 ? 20 : itemCount <= 100_000 ? 50 : 250;

    return [
      {
        label: "After render",
        value: round(renderDeltaMB, 2),
        unit: "MB",
        better: "lower",
        rating: rateLower(renderDeltaMB, renderGood, renderOk),
      },
      {
        label: "Scroll delta",
        value: round(scrollDeltaMB, 2),
        unit: "MB",
        better: "lower",
        rating: rateLower(
          Math.abs(scrollDeltaMB),
          scrollLeakGood,
          scrollLeakOk,
        ),
      },
      {
        label: "Total heap",
        value: round(afterRenderMB, 1),
        unit: "MB",
        better: "lower",
      },
      {
        label: "Total delta",
        value: round(totalDeltaMB, 2),
        unit: "MB",
        better: "lower",
      },
    ];
  },
});
