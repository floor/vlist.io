// benchmarks/comparison/legend-list.js — Legend List Comparison Benchmark
//
// Compares vlist against @legendapp/list (Legend List) side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
//
// Legend List v3 (3.0.0-beta.40) provides a dedicated React DOM entry
// point (@legendapp/list/react) that renders plain div elements — no
// react-native-web dependency required.
//
// Execution order is randomized per run to eliminate GC bleed-through
// and JIT warmth bias. See docs/benchmarks/comparison-audit.md Priority 3.
//
// This benchmark helps users make informed decisions by showing
// real performance differences between libraries.

import { defineSuite, rateLower, rateHigher } from "../runner.js";
import {
  ITEM_HEIGHT,
  ITEM_NAMES,
  ITEM_BADGES,
  benchmarkLibrary,
  runComparison,
} from "./shared.js";

// Dynamic imports for React + Legend List (loaded on demand)
let React;
let ReactDOM;
let LegendList;

/**
 * Lazy load React and @legendapp/list/react (pure DOM build).
 * Returns false if loading fails (libraries not available).
 */
const loadLibraries = async () => {
  try {
    if (!React) {
      React = await import("react");
      const ReactDOMClient = await import("react-dom/client");
      ReactDOM = ReactDOMClient;

      // v3 React DOM entry point — no react-native-web needed
      const legendListModule = await import("@legendapp/list/react");
      LegendList = legendListModule.LegendList;
    }
    return true;
  } catch (err) {
    console.error("[legend-list] Failed to load libraries:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: Legend List
// =============================================================================

/**
 * Benchmark Legend List performance.
 *
 * renderItem uses plain React DOM elements (div/span) — identical to the
 * structure used by react-window, TanStack Virtual, and Virtua benchmarks —
 * so that we measure the library's virtualization overhead fairly.
 */
const benchmarkLegendList = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  // Ensure libraries are loaded
  const loaded = await loadLibraries();
  if (!loaded) {
    throw new Error("Legend List is not available");
  }

  // Pre-generate data array
  const generateData = (count) =>
    Array.from({ length: count }, (_, i) => ({
      id: String(i),
      index: i,
    }));

  // renderItem using plain DOM elements — same structure as all other
  // React-based benchmarks (avatar + content + meta)
  const renderItem = ({ item }) => {
    const i = item.index;
    const n = ITEM_NAMES[i % ITEM_NAMES.length];
    const n2 = ITEM_NAMES[(i + 3) % ITEM_NAMES.length];

    return React.createElement(
      "div",
      {
        className: "bench-item",
        style: { height: `${ITEM_HEIGHT}px` },
      },
      React.createElement(
        "div",
        { className: "bench-item__avatar" },
        `${n[0]}${n2[0]}`,
      ),
      React.createElement(
        "div",
        { className: "bench-item__content" },
        React.createElement(
          "div",
          { className: "bench-item__title" },
          `${n} — Item ${i}`,
        ),
        React.createElement(
          "div",
          { className: "bench-item__sub" },
          "Lorem ipsum dolor sit amet",
        ),
      ),
      React.createElement(
        "div",
        { className: "bench-item__meta" },
        React.createElement(
          "span",
          { className: "bench-item__badge" },
          ITEM_BADGES[i % ITEM_BADGES.length],
        ),
        React.createElement(
          "span",
          { className: "bench-item__time" },
          `${(i % 59) + 1}m`,
        ),
      ),
    );
  };

  return benchmarkLibrary({
    libraryName: "Legend List",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      const data = generateData(itemCount);
      const height = container.clientHeight || 600;

      // Wrap in a plain div with fixed height — LegendList measures its
      // parent to determine the viewport size.
      const listComponent = React.createElement(
        "div",
        { style: { height: `${height}px`, width: "100%", overflow: "hidden" } },
        React.createElement(LegendList, {
          data,
          renderItem,
          keyExtractor: (item) => item.id,
          estimatedItemSize: ITEM_HEIGHT,
          getFixedItemSize: () => ITEM_HEIGHT,
          estimatedListSize: { width: container.clientWidth || 800, height },
          style: { height: "100%" },
          recycleItems: true,
          drawDistance: 250,
          initialContainerPoolRatio: 1,
          waitForInitialLayout: false,
          maintainVisibleContentPosition: false,
        }),
      );

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
  id: "legend-list",
  name: "Legend List Comparison",
  description: "Compare vlist vs Legend List performance side-by-side",
  icon: "",
  comparison: true,

  run: async ({ itemCount, container, onStatus, stressMs = 0 }) => {
    return runComparison({
      container,
      itemCount,
      onStatus,
      stressMs,
      libraryName: "Legend List",
      benchmarkCompetitor: benchmarkLegendList,
      rateLower,
      rateHigher,
    });
  },
});
