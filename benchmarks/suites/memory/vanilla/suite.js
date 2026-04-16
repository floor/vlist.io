// benchmarks/suites/memory/vanilla/suite.js — Memory Benchmark (Vanilla)
//
// Thin wrapper around engine/memory.js measureMemoryProfile.
// Defines the vlist create/destroy lifecycle and formats results with ratings.

import { vlist } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  round,
  rateLower,
} from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { measureMemoryProfile } from "../../../engine/memory.js";

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "memory-vanilla",
  name: "Memory (Vanilla)",
  description:
    "Heap usage after render and after 10s of scrolling — reveals leaks and GC pressure",
  icon: "🧠",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    const result = await measureMemoryProfile({
      container,
      createFn: async () => {
        const list = vlist({
          container,
          item: {
            height: ITEM_HEIGHT,
            template: benchmarkTemplate,
          },
          items,
        }).build();
        return { instance: list };
      },
      destroyFn: (list) => list.destroy(),
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

    // Thresholds scale with item count
    // For 1M items the data array alone is several MB, so thresholds are looser
    const scrollLeakGood = itemCount <= 100_000 ? 1 : 3;
    const scrollLeakOk = itemCount <= 100_000 ? 5 : 10;

    // Render heap thresholds (MB)
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
