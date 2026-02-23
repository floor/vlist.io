// benchmarks/comparison/suite.js — react-window Comparison Benchmark
//
// Compares vlist against react-window side-by-side:
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

// Dynamic imports for React libraries (loaded on demand)
let React;
let ReactDOM;
let FixedSizeList;
let VariableSizeList;

/**
 * Lazy load React and react-window.
 * Returns false if loading fails (libraries not available).
 */
const loadReactLibraries = async () => {
  try {
    if (!React) {
      React = await import("react");
      const ReactDOMClient = await import("react-dom/client");
      ReactDOM = ReactDOMClient;

      // Import react-window from local node_modules (via import map)
      const reactWindow = await import("react-window");
      FixedSizeList = reactWindow.FixedSizeList;
      VariableSizeList = reactWindow.VariableSizeList;
    }
    return true;
  } catch (err) {
    console.error("[react-window] Failed to load React libraries:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: react-window
// =============================================================================

/**
 * Benchmark react-window performance.
 */
const benchmarkReactWindow = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  // Ensure libraries are loaded
  const loaded = await loadReactLibraries();
  if (!loaded) {
    throw new Error("react-window is not available");
  }

  // React component for rendering list items
  const Row = ({ index, style }) => {
    return React.createElement(
      "div",
      { className: "bench-item", style },
      index,
    );
  };

  return benchmarkLibrary({
    libraryName: "react-window",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      const listComponent = React.createElement(FixedSizeList, {
        height: container.clientHeight || 600,
        itemCount: itemCount,
        itemSize: ITEM_HEIGHT,
        width: "100%",
        children: Row,
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
  id: "react-window",
  name: "react-window Comparison",
  description: "Compare vlist vs react-window performance side-by-side",
  icon: "⚔️",
  comparison: true,

  run: async ({ itemCount, container, onStatus, stressMs = 0 }) => {
    onStatus("Preparing benchmark...");

    // Benchmark vlist (no pre-generated items needed)
    const vlistResults = await benchmarkVList(
      container,
      itemCount,
      onStatus,
      stressMs,
    );
    await tryGC();
    await waitFrames(5);

    // Benchmark react-window
    let reactWindowResults;
    try {
      reactWindowResults = await benchmarkReactWindow(
        container,
        itemCount,
        onStatus,
        stressMs,
      );
    } catch (err) {
      console.warn("[react-window] react-window test failed:", err);
      reactWindowResults = {
        library: "react-window",
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
      reactWindowResults,
      "react-window",
      rateLower,
      rateHigher,
    );
  },
});
