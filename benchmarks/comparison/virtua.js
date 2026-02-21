// benchmarks/comparison/virtua.js — Virtua Comparison Benchmark
//
// Compares vlist against virtua side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
//
// This benchmark helps users make informed decisions by showing
// real performance differences between libraries.

import { vlist } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  getHeapUsed,
  bytesToMB,
  round,
  median,
  percentile,
  rateLower,
  rateHigher,
} from "../runner.js";

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
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const MEASURE_ITERATIONS = 5;
const SCROLL_DURATION_MS = 5000;
const SCROLL_SPEED_PX_PER_FRAME = 100;

// =============================================================================
// Helper: Find scrollable viewport
// =============================================================================

const findViewport = (container) => {
  const vp = container.querySelector(".vlist-viewport");
  if (vp) return vp;

  for (const child of container.children) {
    const style = getComputedStyle(child);
    if (
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll"
    ) {
      return child;
    }
  }

  return container.firstElementChild;
};

// =============================================================================
// Helper: Scroll measurement
// =============================================================================

/**
 * Scroll and measure frame times.
 * Returns median FPS and frame time percentiles.
 */
const measureScrollPerformance = async (viewport, durationMs) => {
  const frameTimes = [];
  let lastTime = performance.now();
  let scrollPos = 0;
  let direction = 1;
  const maxScroll = viewport.scrollHeight - viewport.clientHeight;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;

      if (elapsed >= durationMs) {
        // Calculate FPS from frame times
        const medianFrameTime = median(frameTimes);
        const p95FrameTime = percentile(
          [...frameTimes].sort((a, b) => a - b),
          95,
        );
        const medianFPS = round(1000 / medianFrameTime, 1);

        resolve({
          medianFPS,
          medianFrameTime: round(medianFrameTime, 2),
          p95FrameTime: round(p95FrameTime, 2),
          totalFrames: frameTimes.length,
        });
        return;
      }

      // Record frame time
      const frameTime = now - lastTime;
      frameTimes.push(frameTime);
      lastTime = now;

      // Update scroll position
      scrollPos += SCROLL_SPEED_PX_PER_FRAME * direction;

      if (scrollPos >= maxScroll) {
        scrollPos = maxScroll;
        direction = -1;
      } else if (scrollPos <= 0) {
        scrollPos = 0;
        direction = 1;
      }

      viewport.scrollTop = scrollPos;

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

// =============================================================================
// Benchmark: vlist
// =============================================================================

/**
 * Benchmark vlist performance.
 */
const benchmarkVList = async (container, items, onStatus) => {
  onStatus("Testing vlist - preparing...");

  // Measure memory before
  await tryGC();
  const memBefore = getHeapUsed();

  // Measure render time
  const renderTimes = [];

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const start = performance.now();

    const list = vlist({
      container,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    }).build();

    list.setItems(items);

    await nextFrame();
    const renderTime = performance.now() - start;
    renderTimes.push(renderTime);

    list.destroy();
  }

  // Create final instance for memory and scroll testing
  container.innerHTML = "";
  await tryGC();

  onStatus("Testing vlist - rendering...");

  const list = vlist({
    container,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
  }).build();

  list.setItems(items);

  await waitFrames(3);

  // Measure memory after render
  await tryGC();
  const memAfter = getHeapUsed();

  // Find viewport and measure scroll performance
  onStatus("Testing vlist - scrolling...");
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
  );

  // Cleanup
  list.destroy();
  container.innerHTML = "";

  return {
    library: "vlist",
    renderTime: round(median(renderTimes), 2),
    memoryUsed: memAfter && memBefore ? bytesToMB(memAfter - memBefore) : null,
    scrollFPS: scrollMetrics.medianFPS,
    p95FrameTime: scrollMetrics.p95FrameTime,
  };
};

// =============================================================================
// Benchmark: Virtua
// =============================================================================

/**
 * Benchmark Virtua performance.
 */
const benchmarkVirtua = async (container, items, onStatus) => {
  onStatus("Testing Virtua - preparing...");

  // Ensure libraries are loaded
  const loaded = await loadReactLibraries();
  if (!loaded) {
    throw new Error("Virtua is not available");
  }

  // Measure memory before
  await tryGC();
  const memBefore = getHeapUsed();

  // React component using Virtua
  const VirtualList = ({ items, height }) => {
    return React.createElement(
      VirtuaVirtualizer,
      {
        style: { height: `${height}px` },
      },
      items.map((item, index) =>
        React.createElement(
          "div",
          {
            key: index,
            className: "bench-item",
            style: { height: `${ITEM_HEIGHT}px` },
          },
          index,
        ),
      ),
    );
  };

  // Measure render time
  const renderTimes = [];

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const start = performance.now();

    const listComponent = React.createElement(VirtualList, {
      items,
      height: container.clientHeight || 600,
    });

    const root = ReactDOM.createRoot(container);
    root.render(listComponent);

    await nextFrame();
    const renderTime = performance.now() - start;
    renderTimes.push(renderTime);

    root.unmount();
  }

  // Create final instance for memory and scroll testing
  container.innerHTML = "";
  await tryGC();

  onStatus("Testing Virtua - rendering...");

  const listComponent = React.createElement(VirtualList, {
    items,
    height: container.clientHeight || 600,
  });

  const root = ReactDOM.createRoot(container);
  root.render(listComponent);

  await waitFrames(3);

  // Measure memory after render
  await tryGC();
  const memAfter = getHeapUsed();

  // Find viewport and measure scroll performance
  onStatus("Testing Virtua - scrolling...");
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
  );

  // Cleanup
  root.unmount();
  container.innerHTML = "";

  return {
    library: "Virtua",
    renderTime: round(median(renderTimes), 2),
    memoryUsed: memAfter && memBefore ? bytesToMB(memAfter - memBefore) : null,
    scrollFPS: scrollMetrics.medianFPS,
    p95FrameTime: scrollMetrics.p95FrameTime,
  };
};

// =============================================================================
// Suite Definition
// =============================================================================

defineSuite({
  id: "virtua",
  name: "Virtua Comparison",
  description: "Compare vlist vs Virtua performance side-by-side",
  icon: "⚔️",

  run: async ({ itemCount, container, onStatus }) => {
    onStatus("Preparing items...");

    const items = generateItems(itemCount);

    // Benchmark vlist
    const vlistResults = await benchmarkVList(container, items, onStatus);
    await tryGC();
    await waitFrames(5);

    // Benchmark Virtua
    let virtuaResults;
    try {
      virtuaResults = await benchmarkVirtua(container, items, onStatus);
    } catch (err) {
      console.warn("[virtua] Virtua test failed:", err);
      virtuaResults = {
        library: "Virtua",
        renderTime: null,
        memoryUsed: null,
        scrollFPS: null,
        p95FrameTime: null,
        error: err.message,
      };
    }

    // Calculate comparison percentages
    const metrics = [];

    // Render Time Comparison
    if (vlistResults.renderTime && virtuaResults.renderTime) {
      const diff = vlistResults.renderTime - virtuaResults.renderTime;
      const pct = round((diff / virtuaResults.renderTime) * 100, 1);

      metrics.push({
        label: "vlist Render Time",
        value: vlistResults.renderTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(vlistResults.renderTime, 30, 50),
      });

      metrics.push({
        label: "Virtua Render Time",
        value: virtuaResults.renderTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(virtuaResults.renderTime, 30, 50),
      });

      metrics.push({
        label: "Render Time Difference",
        value: pct,
        unit: "%",
        better: "lower",
        rating: pct < 0 ? "good" : pct < 20 ? "ok" : "bad",
        meta: pct < 0 ? "vlist is faster" : "Virtua is faster",
      });
    }

    // Memory Comparison
    if (vlistResults.memoryUsed && virtuaResults.memoryUsed) {
      const diff = vlistResults.memoryUsed - virtuaResults.memoryUsed;
      const pct = round((diff / virtuaResults.memoryUsed) * 100, 1);

      metrics.push({
        label: "vlist Memory Usage",
        value: vlistResults.memoryUsed,
        unit: "MB",
        better: "lower",
        rating: rateLower(vlistResults.memoryUsed, 30, 50),
      });

      metrics.push({
        label: "Virtua Memory Usage",
        value: virtuaResults.memoryUsed,
        unit: "MB",
        better: "lower",
        rating: rateLower(virtuaResults.memoryUsed, 30, 50),
      });

      metrics.push({
        label: "Memory Difference",
        value: pct,
        unit: "%",
        better: "lower",
        rating: pct < 0 ? "good" : pct < 20 ? "ok" : "bad",
        meta: pct < 0 ? "vlist uses less" : "Virtua uses less",
      });
    }

    // Scroll FPS Comparison
    if (vlistResults.scrollFPS && virtuaResults.scrollFPS) {
      const diff = vlistResults.scrollFPS - virtuaResults.scrollFPS;
      const pct = round((diff / virtuaResults.scrollFPS) * 100, 1);

      metrics.push({
        label: "vlist Scroll FPS",
        value: vlistResults.scrollFPS,
        unit: "fps",
        better: "higher",
        rating: rateHigher(vlistResults.scrollFPS, 55, 50),
      });

      metrics.push({
        label: "Virtua Scroll FPS",
        value: virtuaResults.scrollFPS,
        unit: "fps",
        better: "higher",
        rating: rateHigher(virtuaResults.scrollFPS, 55, 50),
      });

      metrics.push({
        label: "FPS Difference",
        value: pct,
        unit: "%",
        better: "higher",
        rating: pct > 0 ? "good" : pct > -5 ? "ok" : "bad",
        meta: pct > 0 ? "vlist is smoother" : "Virtua is smoother",
      });
    }

    // P95 Frame Time Comparison
    if (vlistResults.p95FrameTime && virtuaResults.p95FrameTime) {
      metrics.push({
        label: "vlist P95 Frame Time",
        value: vlistResults.p95FrameTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(vlistResults.p95FrameTime, 20, 30),
      });

      metrics.push({
        label: "Virtua P95 Frame Time",
        value: virtuaResults.p95FrameTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(virtuaResults.p95FrameTime, 20, 30),
      });
    }

    // Add error metric if Virtua failed
    if (virtuaResults.error) {
      metrics.push({
        label: "Virtua Error",
        value: 0,
        unit: "",
        better: "lower",
        rating: "bad",
        meta: virtuaResults.error,
      });
    }

    return metrics;
  },
});
