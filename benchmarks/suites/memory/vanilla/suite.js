// benchmarks/suites/memory/vanilla/suite.js — Memory Benchmark (Vanilla)
//
// Thin wrapper around engine/memory.js measureMemoryProfile.
// Defines the vlist create/destroy lifecycle and formats results with ratings.

import { createVList } from "vlist";
import { createVList as createSynthetic } from "vlist/synthetic";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  round,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureMemoryProfile, scrollWithSetter } from "../../../engine/memory.js";
import { findViewport } from "../../../engine/viewport.js";

const formatMemoryMetrics = (itemCount, result) => {
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

  const { renderDeltaMB, scrollDeltaMB, afterRenderMB, totalDeltaMB } = result;
  const scrollLeakGood = itemCount <= 100_000 ? 1 : 3;
  const scrollLeakOk = itemCount <= 100_000 ? 5 : 10;
  const renderGood = itemCount <= 10_000 ? 5 : itemCount <= 100_000 ? 15 : 80;
  const renderOk = itemCount <= 10_000 ? 15 : itemCount <= 100_000 ? 40 : 200;

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
      rating: rateLower(Math.abs(scrollDeltaMB), scrollLeakGood, scrollLeakOk),
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
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "memory-vanilla",
  name: "Memory (Vanilla)",
  description:
    "Heap usage after render and after 10s of scrolling — reveals leaks and GC pressure",
  icon: "🧠",

  run: async ({ itemCount, container, onStatus, intensity }) => {
    const items = generateItems(itemCount);

    const result = await measureMemoryProfile({
      container,
      createFn: async () => {
        const list = createVList({
          container,
          item: {
            height: ITEM_HEIGHT,
            template: benchmarkTemplate,
          },
          items,
        });
        return { instance: list };
      },
      destroyFn: (list) => list.destroy(),
      onStatus,
      ...(intensity?.memoryScrollMs && { scrollDurationMs: intensity.memoryScrollMs }),
    });

    return formatMemoryMetrics(itemCount, result);
  },
});

// Heap of the synthetic entry. The scroll phase goes through ctx.scroll.to:
// writing scrollTop does not move a synthetic list, so it would measure a
// list sitting still.
if (__BENCH_HAS_SYNTHETIC__) defineSuite({
  id: "memory-synthetic",
  name: "Memory (Synthetic)",
  description:
    "Heap of the synthetic entry after render and after scrolling its position setter",
  icon: "🧠",

  run: async ({ itemCount, container, onStatus, intensity }) => {
    const items = generateItems(itemCount);
    let write;

    const result = await measureMemoryProfile({
      container,
      createFn: async () => {
        const instance = createSynthetic({
          container,
          item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
          items,
        }, [{
          name: "benchmark-memory-scroll",
          setup(ctx) { write = (position) => ctx.scroll.to(position); },
        }]);
        return { instance };
      },
      destroyFn: (instance) => instance.destroy(),
      scrollFn: (durationMs, speedPxPerFrame, onProgress) => {
        const viewport = findViewport(container);
        const content = container.querySelector(".vlist-content");
        return scrollWithSetter({
          max: items.length * ITEM_HEIGHT - viewport.clientHeight,
          set(position) {
            write(position);
            if (viewport.scrollTop !== 0 || content.scrollTop !== 0) {
              throw new Error("Synthetic memory scroll moved a native main-axis scroll offset");
            }
          },
        }, durationMs, speedPxPerFrame, onProgress);
      },
      onStatus,
      ...(intensity?.memoryScrollMs && { scrollDurationMs: intensity.memoryScrollMs }),
    });

    return formatMemoryMetrics(itemCount, result);
  },
});
