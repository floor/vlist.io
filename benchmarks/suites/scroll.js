// benchmarks/suites/scroll.js — Scroll FPS Benchmark
//
// Measures sustained scroll performance by programmatically scrolling
// a vlist at a constant rate for 5 seconds. Tracks frame times to
// compute min/avg/max FPS and count dropped frames.

import { createVList } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  round,
  percentile,
  rateHigher,
  rateLower,
} from "../runner.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const SCROLL_DURATION_MS = 5_000;
const SCROLL_SPEED_PX_PER_FRAME = 120; // ~7200 px/s at 60fps — fast sustained scroll

// =============================================================================
// Core measurement
// =============================================================================

/**
 * Find the scrollable viewport element inside a vlist container.
 * Tries the known class name first, then falls back to the first child
 * that has overflow scrolling.
 *
 * @param {HTMLElement} container
 * @returns {Element|null}
 */
const findViewport = (container) => {
  // Primary: vlist uses .vlist-viewport
  const vp = container.querySelector(".vlist-viewport");
  if (vp) return vp;

  // Fallback: first child with scrollable overflow
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

/**
 * Programmatically scroll a vlist at constant speed and measure frame times.
 *
 * @param {HTMLElement} container
 * @param {Array<{id: number}>} items
 * @returns {Promise<{frameTimes: number[], totalFrames: number}>}
 */
const measureScrollFPS = async (container, items) => {
  container.innerHTML = "";

  const list = createVList({
    container,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
    items,
  });

  // Let the initial render settle
  await waitFrames(10);

  // Get the scrollable element
  const viewport = findViewport(container);

  if (!viewport) {
    list.destroy();
    throw new Error("Could not find vlist viewport element");
  }

  // Calculate max scroll
  const maxScroll = viewport.scrollHeight - viewport.clientHeight;

  return new Promise((resolve) => {
    const frameTimes = [];
    let lastFrameTime = 0;
    let startTime = 0;
    let scrollPos = 0;
    let scrollDirection = 1; // 1 = down, -1 = up

    const tick = (timestamp) => {
      if (startTime === 0) {
        startTime = timestamp;
        lastFrameTime = timestamp;
        requestAnimationFrame(tick);
        return;
      }

      const elapsed = timestamp - startTime;
      const frameDelta = timestamp - lastFrameTime;

      // Record frame time
      frameTimes.push(frameDelta);

      lastFrameTime = timestamp;

      // Check if we've run long enough
      if (elapsed >= SCROLL_DURATION_MS) {
        list.destroy();
        container.innerHTML = "";
        resolve({
          frameTimes,
          totalFrames: frameTimes.length,
        });
        return;
      }

      // Advance scroll position — bounce at top/bottom
      scrollPos += SCROLL_SPEED_PX_PER_FRAME * scrollDirection;

      if (scrollPos >= maxScroll) {
        scrollPos = maxScroll;
        scrollDirection = -1;
      } else if (scrollPos <= 0) {
        scrollPos = 0;
        scrollDirection = 1;
      }

      viewport.scrollTop = scrollPos;

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "scroll",
  name: "Scroll FPS",
  description: `Sustained programmatic scrolling for ${SCROLL_DURATION_MS / 1000}s — measures rendering throughput`,
  icon: "📜",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    // Warmup — one short scroll to let JIT optimize
    onStatus("Warming up...");
    {
      const warmupItems = generateItems(Math.min(itemCount, 10_000));
      container.innerHTML = "";
      const warmupList = createVList({
        container,
        item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        items: warmupItems,
      });
      await waitFrames(10);

      const vp = findViewport(container);
      if (vp) {
        // Quick scroll through
        for (let i = 0; i < 30; i++) {
          vp.scrollTop = i * 200;
          await nextFrame();
        }
      }

      warmupList.destroy();
      container.innerHTML = "";
      await tryGC();
    }

    // Measure
    onStatus(`Scrolling for ${SCROLL_DURATION_MS / 1000}s...`);
    const { frameTimes, totalFrames } = await measureScrollFPS(
      container,
      items,
    );

    await tryGC();

    // Compute FPS stats from frame times
    // FPS = 1000 / frameDelta for each frame
    const fpsValues = frameTimes.map((dt) => (dt > 0 ? 1000 / dt : 60));
    const sortedFps = [...fpsValues].sort((a, b) => a - b);
    const sortedTimes = [...frameTimes].sort((a, b) => a - b);

    const avgFps = round(totalFrames / (SCROLL_DURATION_MS / 1000), 1);
    const minFps = round(sortedFps.length > 0 ? sortedFps[0] : 0, 1);
    const p5Fps = round(percentile(sortedFps, 5), 1); // 5th percentile = worst frames
    const maxFrameTime = round(
      sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
      1,
    );

    // Adaptive dropped frame threshold: anything > 50% over the median frame time
    // This correctly identifies outlier frames regardless of whether display is 60hz or 120hz
    const medianFrameTime =
      sortedTimes[Math.floor(sortedTimes.length / 2)] || 16.67;
    const droppedThreshold = medianFrameTime * 1.5;
    const droppedFrames = frameTimes.filter(
      (dt) => dt > droppedThreshold,
    ).length;
    const droppedPct = round((droppedFrames / totalFrames) * 100, 1);

    return [
      {
        label: "Avg FPS",
        value: avgFps,
        unit: "fps",
        better: "higher",
        rating: rateHigher(avgFps, 55, 40),
      },
      {
        label: "p5 FPS",
        value: p5Fps,
        unit: "fps",
        better: "higher",
        rating: rateHigher(p5Fps, 45, 30),
      },
      {
        label: "Min FPS",
        value: minFps,
        unit: "fps",
        better: "higher",
        rating: rateHigher(minFps, 30, 15),
      },
      {
        label: "Worst frame",
        value: maxFrameTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(maxFrameTime, 25, 50),
      },
      {
        label: "Dropped",
        value: droppedPct,
        unit: "%",
        better: "lower",
        rating: rateLower(droppedPct, 5, 15),
      },
      {
        label: "Total frames",
        value: totalFrames,
        unit: "",
        better: "higher",
      },
    ];
  },
});
