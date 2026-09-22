// benchmarks/suites/memory/solidjs/suite.js — Memory Benchmark (SolidJS)
//
// Thin wrapper around engine/memory.js measureMemoryProfile.
// Defines the SolidJS-specific create/destroy lifecycle using createRoot +
// createVList, and formats results with rating thresholds.
//
// Chrome-only (requires performance.memory API).

import { createRoot, createSignal } from "solid-js";
import { createVList } from "vlist-solidjs";
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
import { scrollCapturePlugin } from "../../../engine/logical-scroll.js";
import { formatMemoryMetrics } from "../format.js";

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "memory-solidjs",
  name: "Memory (SolidJS)",
  description:
    "Heap usage after render and after 10s of scrolling — reveals leaks and GC pressure",
  icon: "🧠",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    const result = await measureMemoryProfile({
      container,
      createFn: async () => {
        // createRoot establishes a proper reactive ownership scope so that
        // createVList's onMount, onCleanup, and createEffect calls are correctly
        // owned and will be disposed when dispose() is called.
        let dispose;
        createRoot((d) => {
          dispose = d;

          const [config] = createSignal({
            items,
            item: {
              height: ITEM_HEIGHT,
              template: benchmarkTemplate,
            },
          });

          const { setRef } = createVList(config);

          const el = document.createElement("div");
          el.style.cssText = "height:100%;width:100%;";
          container.appendChild(el);
          setRef(el);
        });

        return { instance: dispose };
      },
      destroyFn: (dispose) => dispose(),
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

    // Thresholds similar to Svelte (action-based, minimal framework overhead)
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

if (__BENCH_HAS_SYNTHETIC__) defineSuite({
  id: "memory-synthetic-solidjs",
  name: "Memory (SolidJS)",
  description: "Heap of a synthetic list created through the SolidJS adapter, after render and after scrolling its position",
  icon: "🧠",
  run: async ({ itemCount, container, onStatus, intensity }) => {
    const items = generateItems(itemCount);
    const capture = { current: null };
    const result = await measureMemoryProfile({
      container,
      createFn: async () => {
        let dispose;
        createRoot((done) => {
          dispose = done;
          const [config] = createSignal({
            items,
            item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
            factory: createSynthetic,
            plugins: [scrollCapturePlugin((set) => { capture.current = set; })],
          });
          const { setRef } = createVList(config);
          const el = document.createElement("div");
          el.style.cssText = "height:100%;width:100%;";
          container.appendChild(el);
          setRef(el);
        });
        return { instance: dispose };
      },
      destroyFn: (dispose) => dispose(),
      scrollFn: (durationMs, speedPxPerFrame, onProgress) => {
        const viewport = findViewport(container);
        const content = container.querySelector(".vlist-content");
        return scrollWithSetter({
          max: items.length * ITEM_HEIGHT - viewport.clientHeight,
          set(position) {
            if (!capture.current) throw new Error("SolidJS list did not install the scroll writer");
            capture.current(position);
            if (viewport.scrollTop !== 0 || content.scrollTop !== 0) {
              throw new Error("Synthetic memory scroll moved a native main-axis scroll offset");
            }
          },
        }, durationMs, speedPxPerFrame, onProgress);
      },
      onStatus,
      ...(intensity?.memoryScrollMs && { scrollDurationMs: intensity.memoryScrollMs }),
    });
    return formatMemoryMetrics(result, {
      scrollLeakGood: itemCount <= 100_000 ? 1 : 3,
      scrollLeakOk: itemCount <= 100_000 ? 5 : 10,
      renderGood: itemCount <= 10_000 ? 5 : itemCount <= 100_000 ? 15 : 80,
      renderOk: itemCount <= 10_000 ? 15 : itemCount <= 100_000 ? 40 : 200,
    });
  },
});
