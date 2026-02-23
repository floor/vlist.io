// benchmarks/comparison/virtua.js — Virtua Comparison Benchmark
//
// Compares vlist against virtua side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
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
let VirtuaVirtualizer;

/**
 * Lazy load React and virtua.
 * Returns false if loading fails (libraries not available).
 */
const loadReactLibraries = async () => {
  try {
    if (!React) {
      React = await import("react");
      const ReactDOMClient = await import("react-dom/client");
      ReactDOM = ReactDOMClient;

      // Import virtua from local node_modules (via import map)
      const virtua = await import("virtua");
      VirtuaVirtualizer = virtua.VList;
    }
    return true;
  } catch (err) {
    console.error("[virtua] Failed to load React libraries:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: Virtua
// =============================================================================

/**
 * Benchmark Virtua performance.
 */
const benchmarkVirtua = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  // Ensure libraries are loaded
  const loaded = await loadReactLibraries();
  if (!loaded) {
    throw new Error("Virtua is not available");
  }

  // React component using Virtua
  const VirtualList = ({ itemCount, height }) => {
    // Generate an array of indices for Virtua to virtualize
    const indices = React.useMemo(
      () => Array.from({ length: itemCount }, (_, i) => i),
      [itemCount],
    );

    return React.createElement(
      VirtuaVirtualizer,
      {
        style: { height: `${height}px` },
      },
      indices.map((index) =>
        React.createElement(
          "div",
          {
            key: index,
            className: "bench-item",
            style: { height: `${ITEM_HEIGHT}px` },
          },
          ...createRealisticReactChildren(React, index),
        ),
      ),
    );
  };

  return benchmarkLibrary({
    libraryName: "Virtua",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      const listComponent = React.createElement(VirtualList, {
        itemCount: itemCount,
        height: container.clientHeight || 600,
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
  id: "virtua",
  name: "Virtua Comparison",
  description: "Compare vlist vs Virtua performance side-by-side",
  icon: "⚔️",
  comparison: true,

  run: async ({ itemCount, container, onStatus, stressMs = 0 }) => {
    return runComparison({
      container,
      itemCount,
      onStatus,
      stressMs,
      libraryName: "Virtua",
      benchmarkCompetitor: benchmarkVirtua,
      rateLower,
      rateHigher,
    });
  },
});
