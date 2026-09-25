// benchmarks/suites/scrollto/svelte/suite.js — scrollToIndex Benchmark (Svelte)
//
// Thin wrapper around engine/scrollto.js measureScrollToPerformance.
// Defines the Svelte vlist action create/destroy lifecycle and formats
// results with rating thresholds.

import { vlist } from "vlist-svelte";
import { createVList as createSynthetic } from "vlist/synthetic";
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
  id: "scrollto-svelte",
  name: "scrollToIndex (Svelte)",
  description:
    "Latency of smooth scrollToIndex() — time from call to scroll settled",
  icon: "🎯",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    // ── Create vlist via Svelte action ─────────────────────────────────
    container.innerHTML = "";

    const action = vlist(container, {
      config: {
        item: {
          height: ITEM_HEIGHT,
          template: benchmarkTemplate,
        },
        items,
      },
    });

    // Let initial render settle
    await waitFrames(10);

    const viewport = findViewport(container);

    if (!viewport || !action || !action.scrollToIndex) {
      if (action && action.destroy) {
        action.destroy();
      }
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element or API");
    }

    // ── Measure with engine ────────────────────────────────────────────
    const result = await measureScrollToPerformance({
      viewport,
      scrollToFn: (index, align) => action.scrollToIndex(index, align),
      itemCount,
      onStatus,
    });

    // ── Clean up ───────────────────────────────────────────────────────
    if (action && action.destroy) {
      action.destroy();
    }
    container.innerHTML = "";
    await tryGC();

    // ── Format results ─────────────────────────────────────────────────
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

if (__BENCH_HAS_SYNTHETIC__) defineSuite({
  id: "scrollto-synthetic-svelte",
  name: "scrollToIndex (Svelte)",
  description: "Latency of scrollToIndex() in synthetic mode, through the Svelte adapter",
  icon: "🎯",
  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);
    container.innerHTML = "";
    const action = vlist(container, {
      config: {
        item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        items,
        factory: createSynthetic,
      },
    });
    try {
      await waitFrames(10);
      const viewport = findViewport(container);
      const content = container.querySelector(".vlist-content");
      if (!viewport || !action?.scrollToIndex) throw new Error("Could not get the synthetic Svelte list");
      const result = await measureScrollToPerformance({
        viewport,
        scrollToFn: (index, align) => action.scrollToIndex(index, align),
        readPosition: () => action.getScrollPosition(),
        itemCount,
        onStatus,
      });
      if (viewport.scrollTop !== 0 || content.scrollTop !== 0) {
        throw new Error("Synthetic scrollToIndex moved a native main-axis scroll offset");
      }
      const goodThreshold = itemCount <= 100_000 ? 400 : 600;
      const okThreshold = itemCount <= 100_000 ? 800 : 1200;
      return [
        { label: "Median", value: result.median, unit: "ms", better: "lower", rating: rateLower(result.median, goodThreshold, okThreshold) },
        { label: "Min", value: result.min, unit: "ms", better: "lower", rating: rateLower(result.min, goodThreshold, okThreshold) },
        { label: "p95", value: result.p95, unit: "ms", better: "lower", rating: rateLower(result.p95, goodThreshold * 1.5, okThreshold * 1.5) },
        { label: "Max", value: result.max, unit: "ms", better: "lower", rating: rateLower(result.max, goodThreshold * 2, okThreshold * 2) },
      ];
    } finally {
      action.destroy?.();
      container.innerHTML = "";
    }
  },
});
