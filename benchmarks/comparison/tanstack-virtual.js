// benchmarks/comparison/tanstack-virtual.js — TanStack Virtual Comparison Benchmark
//
// Compares vlist against @tanstack/react-virtual side-by-side:
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
} from "./shared.js";

// Dynamic imports for React libraries (loaded on demand)
let React;
let ReactDOM;
let useVirtualizer;

/**
 * Lazy load React and @tanstack/react-virtual.
 * Returns false if loading fails (libraries not available).
 */
const loadReactLibraries = async () => {
  try {
    if (!React) {
      React = await import("react");
      const ReactDOMClient = await import("react-dom/client");
      ReactDOM = ReactDOMClient;

      // Import @tanstack/react-virtual from local node_modules (via import map)
      const tanstackVirtual = await import("@tanstack/react-virtual");
      useVirtualizer = tanstackVirtual.useVirtualizer;
    }
    return true;
  } catch (err) {
    console.error("[tanstack-virtual] Failed to load React libraries:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: TanStack Virtual
// =============================================================================

/**
 * Benchmark TanStack Virtual performance.
 */
const benchmarkTanStackVirtual = async (container, itemCount, onStatus) => {
  // Ensure libraries are loaded
  const loaded = await loadReactLibraries();
  if (!loaded) {
    throw new Error("TanStack Virtual is not available");
  }

  // React component using TanStack Virtual
  const VirtualList = ({ itemCount, height }) => {
    const parentRef = React.useRef(null);

    const virtualizer = useVirtualizer({
      count: itemCount,
      getScrollElement: () => parentRef.current,
      estimateSize: () => ITEM_HEIGHT,
      overscan: 5,
    });

    return React.createElement(
      "div",
      {
        ref: parentRef,
        style: {
          height: `${height}px`,
          overflow: "auto",
          width: "100%",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          },
        },
        virtualizer.getVirtualItems().map((virtualRow) =>
          React.createElement(
            "div",
            {
              key: virtualRow.index,
              className: "bench-item",
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              },
            },
            virtualRow.index,
          ),
        ),
      ),
    );
  };

  return benchmarkLibrary({
    libraryName: "TanStack Virtual",
    container,
    itemCount,
    onStatus,
    createComponent: async (container, itemCount) => {
      const listComponent = React.createElement(VirtualList, {
        itemCount,
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
  id: "tanstack-virtual",
  name: "TanStack Virtual Comparison",
  description: "Compare vlist vs TanStack Virtual performance side-by-side",
  icon: "⚔️",

  run: async ({ itemCount, container, onStatus }) => {
    onStatus("Preparing benchmark...");

    // Benchmark vlist (no pre-generated items needed)
    const vlistResults = await benchmarkVList(container, itemCount, onStatus);

    // Benchmark TanStack Virtual
    let tanstackResults;
    try {
      tanstackResults = await benchmarkTanStackVirtual(
        container,
        itemCount,
        onStatus,
      );
    } catch (err) {
      console.warn("[tanstack-virtual] TanStack Virtual test failed:", err);
      tanstackResults = {
        library: "TanStack Virtual",
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
      tanstackResults,
      "TanStack Virtual",
      rateLower,
      rateHigher,
    );
  },
});
