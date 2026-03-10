// benchmarks/comparison/clusterize.js — Clusterize.js Comparison Benchmark
//
// Compares vlist against Clusterize.js side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
//
// Execution order is randomized per run to eliminate GC bleed-through
// and JIT warmth bias (see docs/benchmarks/comparison-audit.md Priority 3).
//
// This benchmark helps users make informed decisions by showing
// real performance differences between libraries.

import { defineSuite, rateLower, rateHigher } from "../runner.js";
import {
  ITEM_HEIGHT,
  benchmarkLibrary,
  runComparison,
  populateRealisticDOMChildren,
} from "./shared.js";

// Dynamic import for Clusterize.js (loaded on demand)
let Clusterize;

/**
 * Lazy load Clusterize.js library.
 * Returns false if loading fails (library not available).
 */
const loadClusterize = async () => {
  try {
    if (!Clusterize) {
      const module = await import("clusterize.js");
      Clusterize = module.default || module.Clusterize;
    }
    return true;
  } catch (err) {
    console.error("[clusterize] Failed to load Clusterize.js:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: Clusterize.js
// =============================================================================

/**
 * Benchmark Clusterize.js performance.
 */
const benchmarkClusterize = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  // Ensure library is loaded
  const loaded = await loadClusterize();
  if (!loaded) {
    throw new Error("Clusterize.js is not available");
  }

  return benchmarkLibrary({
    libraryName: "Clusterize.js",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      // Clusterize requires specific HTML structure:
      // - scrollArea: the scrollable container
      // - contentArea: where items are rendered
      const scrollArea = document.createElement("div");
      scrollArea.id = "clusterize-scroll-area";
      scrollArea.className = "clusterize-scroll";
      scrollArea.style.cssText = `
        height: ${container.clientHeight || 600}px;
        overflow: auto;
        width: 100%;
      `;

      const contentArea = document.createElement("div");
      contentArea.id = "clusterize-content-area";
      contentArea.className = "clusterize-content";
      scrollArea.appendChild(contentArea);
      container.appendChild(scrollArea);

      // Generate rows as HTML strings (Clusterize.js requirement)
      // Note: This approach is slower but more memory-efficient than
      // pre-generating all HTML strings, which would keep 100K strings in memory
      const rows = [];
      for (let i = 0; i < itemCount; i++) {
        // Create temporary element to build item structure
        const temp = document.createElement("div");
        temp.className = "bench-item";
        temp.style.height = `${ITEM_HEIGHT}px`;
        populateRealisticDOMChildren(temp, i);
        rows.push(temp.outerHTML);
      }

      // Initialize Clusterize
      const clusterize = new Clusterize({
        rows,
        scrollId: "clusterize-scroll-area",
        contentId: "clusterize-content-area",
        rows_in_block: 50,
        blocks_in_cluster: 4,
        tag: "div",
        show_no_data_row: false,
      });

      return {
        clusterize,
        scrollArea,
      };
    },
    destroyComponent: async (instance) => {
      if (instance && instance.clusterize) {
        instance.clusterize.destroy(true);
      }
      if (instance && instance.scrollArea && instance.scrollArea.parentNode) {
        instance.scrollArea.parentNode.removeChild(instance.scrollArea);
      }
    },
  });
};

// =============================================================================
// Suite Definition
// =============================================================================

defineSuite({
  id: "clusterize",
  name: "Clusterize.js Comparison",
  description: "Compare vlist vs Clusterize.js performance side-by-side",
  icon: "",
  comparison: true,

  run: async ({ itemCount, container, onStatus, stressMs = 0 }) => {
    return runComparison({
      container,
      itemCount,
      onStatus,
      stressMs,
      libraryName: "Clusterize.js",
      benchmarkCompetitor: benchmarkClusterize,
      rateLower,
      rateHigher,
    });
  },
});
