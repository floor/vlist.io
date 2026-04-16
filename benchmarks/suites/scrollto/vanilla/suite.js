// benchmarks/suites/scrollto/vanilla/suite.js — scrollToIndex Benchmark
//
// Thin wrapper around engine/scrollto.js measureScrollToPerformance.
// Defines the vlist create/destroy lifecycle and formats results with
// rating thresholds.

import { vlist } from "vlist";
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
// Suite
// =============================================================================

defineSuite({
  id: "scrollto-vanilla",
  name: "scrollToIndex (Vanilla)",
  description:
    "Latency of smooth scrollToIndex() — time from call to scroll settled",
  icon: "🎯",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    // ── Create vlist ───────────────────────────────────────────────────
    container.innerHTML = "";

    const list = vlist({
      container,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
      items,
    }).build();

    // Let initial render settle
    await waitFrames(10);

    const viewport = findViewport(container);

    if (!viewport) {
      list.destroy();
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element");
    }

    // ── Measure with engine ────────────────────────────────────────────
    const result = await measureScrollToPerformance({
      viewport,
      scrollToFn: (index, align) => list.scrollToIndex(index, align),
      itemCount,
      onStatus,
    });

    // ── Clean up ───────────────────────────────────────────────────────
    list.destroy();
    container.innerHTML = "";
    await tryGC();

    // ── Format results ─────────────────────────────────────────────────
    // scrollToIndex with smooth animation typically takes 200–400ms
    // for normal lists. Compression can add overhead for very large lists.
    const goodThreshold = itemCount <= 100_000 ? 400 : 600;
    const okThreshold = itemCount <= 100_000 ? 800 : 1200;

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
