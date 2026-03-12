// benchmarks/comparison/react-virtuoso.js — react-virtuoso Comparison Benchmark
//
// Compares vlist against react-virtuoso side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
//
// react-virtuoso is a feature-rich React virtualization library (~16 KB gzip)
// with auto-height measurement, grouped lists, reverse mode, and table support.
// It uses a probe-based approach for initial item height detection.
//
// Execution order is randomized per run to eliminate GC bleed-through
// and JIT warmth bias. See docs/benchmarks/comparison-audit.md Priority 3.
//
// This benchmark helps users make informed decisions by showing
// real performance differences between libraries.

import { defineSuite, rateLower, rateHigher } from "../runner.js";
import {
  ITEM_HEIGHT,
  benchmarkLibrary,
  runComparison,
  createRealisticReactChildren,
} from "./shared.js";

// Dynamic imports for React libraries (loaded on demand)
let React;
let ReactDOM;
let Virtuoso;

/**
 * Lazy load React and react-virtuoso.
 * Returns false if loading fails (libraries not available).
 */
const loadReactLibraries = async () => {
  try {
    if (!React) {
      React = await import("react");
      const ReactDOMClient = await import("react-dom/client");
      ReactDOM = ReactDOMClient;

      // Import react-virtuoso from local node_modules (via import map)
      const reactVirtuoso = await import("react-virtuoso");
      Virtuoso = reactVirtuoso.Virtuoso;
    }
    return true;
  } catch (err) {
    console.error("[react-virtuoso] Failed to load React libraries:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: react-virtuoso
// =============================================================================

/**
 * Benchmark react-virtuoso performance.
 *
 * Uses the <Virtuoso> component with fixedItemHeight to match the fixed-height
 * scenario used by all other benchmarks. Without fixedItemHeight, Virtuoso
 * renders a "probe" item first to detect heights, which would unfairly penalize
 * its render time. Setting defaultItemHeight + fixedItemHeight gives Virtuoso
 * its best-case performance path.
 */
const benchmarkReactVirtuoso = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  // Ensure libraries are loaded
  const loaded = await loadReactLibraries();
  if (!loaded) {
    throw new Error("react-virtuoso is not available");
  }

  // itemContent callback — renders the realistic template shared across
  // all React-based benchmarks (avatar + content + metadata)
  const itemContent = (index) => {
    return React.createElement(
      "div",
      { className: "bench-item", style: { height: `${ITEM_HEIGHT}px` } },
      ...createRealisticReactChildren(React, index),
    );
  };

  return benchmarkLibrary({
    libraryName: "react-virtuoso",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      const height = container.clientHeight || 600;

      const listComponent = React.createElement(Virtuoso, {
        totalCount: itemCount,
        itemContent,
        defaultItemHeight: ITEM_HEIGHT,
        fixedItemHeight: ITEM_HEIGHT,
        overscan: { main: 5 * ITEM_HEIGHT, reverse: 5 * ITEM_HEIGHT },
        style: { height: `${height}px`, width: "100%" },
      });

      const root = ReactDOM.createRoot(container);
      root.render(listComponent);
      return root;
    },
    destroyComponent: async (root) => {
      root.unmount();
    },
  });
};

// =============================================================================
// Suite Definition
// =============================================================================

defineSuite({
  id: "react-virtuoso",
  name: "react-virtuoso Comparison",
  description: "Compare vlist vs react-virtuoso performance side-by-side",
  icon: "",
  comparison: true,

  run: async ({ itemCount, container, onStatus, stressMs = 0 }) => {
    return runComparison({
      container,
      itemCount,
      onStatus,
      stressMs,
      libraryName: "react-virtuoso",
      benchmarkCompetitor: benchmarkReactVirtuoso,
      rateLower,
      rateHigher,
    });
  },
});
