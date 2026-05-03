// benchmarks/suites/scrollto/react/suite.js — scrollToIndex Benchmark (React)
//
// Thin wrapper around engine/scrollto.js measureScrollToPerformance.
// Defines the React create/destroy lifecycle and formats results with
// rating thresholds (more lenient for React overhead).

import { createRoot } from "react-dom/client";
import { useVList } from "vlist-react";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  waitFrames,
  tryGC,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { findViewport } from "../../../engine/viewport.js";
import { measureScrollToPerformance } from "../../../engine/scrollto.js";

// =============================================================================
// React Component
// =============================================================================

let listApiRef = null;

function BenchmarkList({ items, target }) {
  const vlistApi = useVList({
    items,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
  });

  vlistApi.containerRef.current = target;
  listApiRef = vlistApi;

  return null;
}

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "scrollto-react",
  name: "scrollToIndex (React)",
  description:
    "Latency of smooth scrollToIndex() — time from call to scroll settled",
  icon: "🎯",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    // ── Create React component ─────────────────────────────────────────
    container.innerHTML = "";
    listApiRef = null;

    const root = createRoot(container);
    root.render(<BenchmarkList items={items} target={container} />);

    // Let initial render settle — React needs extra frames
    await waitFrames(15);

    const viewport = findViewport(container);

    if (!viewport || !listApiRef) {
      root.unmount();
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element or API");
    }

    const instance = listApiRef.getInstance();
    if (!instance) {
      root.unmount();
      container.innerHTML = "";
      throw new Error("Could not get vlist instance from React adapter");
    }

    // ── Measure with engine ────────────────────────────────────────────
    const result = await measureScrollToPerformance({
      viewport,
      scrollToFn: (index, align) => instance.scrollToIndex(index, align),
      itemCount,
      onStatus,
    });

    // ── Clean up ───────────────────────────────────────────────────────
    root.unmount();
    container.innerHTML = "";
    listApiRef = null;
    await tryGC();

    // ── Format results ─────────────────────────────────────────────────
    // Thresholds adjusted for React overhead (more lenient)
    const goodThreshold = itemCount <= 100_000 ? 500 : 700;
    const okThreshold = itemCount <= 100_000 ? 1000 : 1400;

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
      {
        label: "Max",
        value: result.max,
        unit: "ms",
        better: "lower",
        rating: rateLower(result.max, goodThreshold * 2, okThreshold * 2),
      },
    ];
  },
});
