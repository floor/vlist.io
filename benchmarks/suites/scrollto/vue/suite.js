// benchmarks/suites/scrollto/vue/suite.js — scrollToIndex Benchmark (Vue)
//
// Thin wrapper around engine/scrollto.js measureScrollToPerformance.
// Defines the Vue useVList create/destroy lifecycle and formats results
// with rating thresholds.

import { createApp } from "vue";
import { useVList } from "vlist-vue";
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
// Vue Component
// =============================================================================

let listApiRef = null;

const BenchmarkList = {
  props: {
    items: Array,
  },
  setup(props) {
    const vlistApi = useVList({
      items: props.items,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    });

    // Store API reference for external access
    listApiRef = vlistApi;

    return { containerRef: vlistApi.containerRef };
  },
  template: `<div ref="containerRef"></div>`,
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "scrollto-vue",
  name: "scrollToIndex (Vue)",
  description:
    "Latency of smooth scrollToIndex() — time from call to scroll settled",
  icon: "🎯",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    // ── Create Vue app ─────────────────────────────────────────────────
    container.innerHTML = "";
    listApiRef = null;

    const app = createApp(BenchmarkList, { items });
    app.mount(container);

    // Let initial render settle (Vue needs extra frames)
    await waitFrames(10);
    await waitFrames(5);

    const viewport = findViewport(container);

    if (!viewport || !listApiRef) {
      app.unmount();
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element or API");
    }

    const instance = listApiRef.instance.value;
    if (!instance) {
      app.unmount();
      container.innerHTML = "";
      throw new Error("Could not get vlist instance from Vue adapter");
    }

    // ── Measure with engine ────────────────────────────────────────────
    const result = await measureScrollToPerformance({
      viewport,
      scrollToFn: (index, align) => instance.scrollToIndex(index, align),
      itemCount,
      onStatus,
    });

    // ── Clean up ───────────────────────────────────────────────────────
    app.unmount();
    container.innerHTML = "";
    listApiRef = null;
    await tryGC();

    // ── Format results ─────────────────────────────────────────────────
    // Thresholds adjusted for Vue overhead (more lenient)
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
