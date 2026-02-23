// benchmarks/comparison/solidjs.js — SolidJS Comparison Benchmark
//
// Compares vlist against TanStack Virtual (SolidJS) side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
//
// This benchmark helps users make informed decisions by showing
// real performance differences between libraries.

import { defineSuite, rateLower, rateHigher } from "../runner.js";
import {
  ITEM_HEIGHT,
  benchmarkVList,
  benchmarkLibrary,
  calculateComparisonMetrics,
  tryGC,
  waitFrames,
} from "./shared.js";

// Dynamic imports for SolidJS libraries (loaded on demand)
let solidJs;
let solidWeb;
let tanstackSolidVirtual;

/**
 * Lazy load SolidJS and TanStack Virtual.
 * Returns false if loading fails (libraries not available).
 */
const loadSolidLibraries = async () => {
  try {
    if (!solidJs) {
      solidJs = await import("solid-js");
      solidWeb = await import("solid-js/web");

      // Import @tanstack/solid-virtual from local node_modules
      tanstackSolidVirtual = await import("@tanstack/solid-virtual");
    }
    return true;
  } catch (err) {
    console.error("[solidjs] Failed to load SolidJS libraries:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: TanStack Virtual (SolidJS)
// =============================================================================

/**
 * Benchmark TanStack Virtual (SolidJS) performance.
 */
const benchmarkTanStackSolid = async (container, itemCount, onStatus) => {
  // Ensure libraries are loaded
  const loaded = await loadSolidLibraries();
  if (!loaded) {
    throw new Error("@tanstack/solid-virtual is not available");
  }

  const { For, createEffect } = solidJs;
  const { render, insert } = solidWeb;
  const { createVirtualizer } = tanstackSolidVirtual;

  return benchmarkLibrary({
    libraryName: "TanStack Virtual (SolidJS)",
    container,
    itemCount,
    onStatus,
    createComponent: async (container, itemCount) => {
      let scrollElement;
      let dispose;

      const VirtualList = () => {
        // Only pass the count (no items array needed)
        const virtualizer = createVirtualizer({
          count: itemCount,
          getScrollElement: () => scrollElement,
          estimateSize: () => ITEM_HEIGHT,
          overscan: 5,
        });

        const el = document.createElement("div");
        el.style.height = "100%";
        el.style.width = "100%";
        el.style.overflow = "auto";
        scrollElement = el;

        const inner = document.createElement("div");
        inner.style.position = "relative";
        inner.style.width = "100%";

        createEffect(() => {
          inner.style.height = `${virtualizer.getTotalSize()}px`;
        });

        insert(
          inner,
          (() => {
            return For({
              get each() {
                return virtualizer.getVirtualItems();
              },
              children: (virtualItem) => {
                const itemEl = document.createElement("div");
                itemEl.className = "bench-item";
                itemEl.style.position = "absolute";
                itemEl.style.top = "0";
                itemEl.style.left = "0";
                itemEl.style.width = "100%";

                createEffect(() => {
                  itemEl.style.height = `${virtualItem.size}px`;
                  itemEl.style.transform = `translateY(${virtualItem.start}px)`;
                  itemEl.textContent = String(virtualItem.index);
                });

                return itemEl;
              },
            });
          })(),
        );

        el.appendChild(inner);
        return el;
      };

      dispose = render(VirtualList, container);
      return dispose;
    },
    destroyComponent: async (dispose) => {
      dispose();
    },
  });
};

// =============================================================================
// Suite Definition
// =============================================================================

defineSuite({
  id: "solidjs",
  name: "SolidJS Comparison",
  description:
    "Compare vlist vs TanStack Virtual (SolidJS) performance side-by-side",
  icon: "🔷",

  run: async ({ itemCount, container, onStatus }) => {
    onStatus("Preparing benchmark...");

    // Benchmark vlist (no pre-generated items needed)
    const vlistResults = await benchmarkVList(container, itemCount, onStatus);
    await tryGC();
    await waitFrames(5);

    // Benchmark TanStack Virtual (SolidJS)
    let solidResults;
    try {
      solidResults = await benchmarkTanStackSolid(
        container,
        itemCount,
        onStatus,
      );
    } catch (err) {
      console.warn("[solidjs] TanStack Virtual (SolidJS) test failed:", err);
      solidResults = {
        library: "TanStack Virtual (SolidJS)",
        renderTime: null,
        memoryUsed: null,
        scrollFPS: null,
        p95FrameTime: null,
        error: err.message,
      };
    }

    // Calculate comparison metrics
    return calculateComparisonMetrics(
      vlistResults,
      solidResults,
      "TanStack Virtual (SolidJS)",
      rateLower,
      rateHigher,
    );
  },
});
