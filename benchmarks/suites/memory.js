// benchmarks/suites/memory.js — Memory Benchmark
//
// Measures JS heap usage at three points:
//   1. Baseline — before vlist is created
//   2. After render — immediately after createVList + first paint
//   3. After scroll — after 10 seconds of sustained scrolling
//
// The delta between (2) and (3) reveals memory leaks.
// Chrome-only (requires performance.memory API).

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
  rateLower,
} from "../runner.js";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find the scrollable viewport element inside a vlist container.
 * @param {HTMLElement} container
 * @returns {Element|null}
 */
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
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const SCROLL_DURATION_MS = 10_000;
const SCROLL_SPEED_PX_PER_FRAME = 100;
const SETTLE_FRAMES = 20;

// =============================================================================
// Core measurement
// =============================================================================

/**
 * Scroll a viewport for a given duration, bouncing at top/bottom.
 *
 * @param {Element} viewport - The scrollable element
 * @param {number} durationMs - How long to scroll
 * @returns {Promise<void>}
 */
const scrollFor = (viewport, durationMs) => {
  return new Promise((resolve) => {
    let startTime = 0;
    let scrollPos = viewport.scrollTop || 0;
    let direction = 1;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;

    const tick = (timestamp) => {
      if (startTime === 0) {
        startTime = timestamp;
        requestAnimationFrame(tick);
        return;
      }

      if (timestamp - startTime >= durationMs) {
        resolve();
        return;
      }

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
// Suite
// =============================================================================

defineSuite({
  id: "memory",
  name: "Memory",
  description:
    "Heap usage after render and after 10s of scrolling — reveals leaks and GC pressure",
  icon: "🧠",

  run: async ({ itemCount, container, onStatus }) => {
    // Check API availability
    const testHeap = getHeapUsed();
    if (testHeap === null) {
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

    const items = generateItems(itemCount);

    // ── Step 1: Baseline ─────────────────────────────────────────────────
    onStatus("Measuring baseline...");
    container.innerHTML = "";
    await tryGC();
    await waitFrames(SETTLE_FRAMES);

    const baseline = getHeapUsed();

    // ── Step 2: Create vlist and measure after render ────────────────────
    onStatus("Creating list...");

    const list = vlist({
      container,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
      items,
    }).build();

    // Let the render settle and GC stabilize
    await waitFrames(SETTLE_FRAMES);
    await tryGC();
    await waitFrames(SETTLE_FRAMES);

    const afterRender = getHeapUsed();

    // ── Step 3: Scroll for the full duration and measure ─────────────────
    const viewport = findViewport(container);

    if (!viewport) {
      list.destroy();
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element");
    }

    onStatus(`Scrolling for ${SCROLL_DURATION_MS / 1000}s...`);
    await scrollFor(viewport, SCROLL_DURATION_MS);

    // Let GC settle after scrolling
    await waitFrames(SETTLE_FRAMES);
    await tryGC();
    await waitFrames(SETTLE_FRAMES);

    const afterScroll = getHeapUsed();

    // ── Clean up ─────────────────────────────────────────────────────────
    list.destroy();
    container.innerHTML = "";
    await tryGC();

    // ── Compute metrics ──────────────────────────────────────────────────
    const renderDelta = afterRender - baseline;
    const scrollDelta = afterScroll - afterRender;
    const totalDelta = afterScroll - baseline;

    const renderMB = bytesToMB(renderDelta);
    const scrollMB = bytesToMB(scrollDelta);
    const totalMB = bytesToMB(totalDelta);
    const afterRenderMB = bytesToMB(afterRender);

    // Thresholds scale with item count
    // For 1M items the data array alone is several MB, so thresholds are looser
    const scrollLeakGood = itemCount <= 100_000 ? 1 : 3;
    const scrollLeakOk = itemCount <= 100_000 ? 5 : 10;

    // Render heap thresholds (MB)
    const renderGood = itemCount <= 10_000 ? 5 : itemCount <= 100_000 ? 15 : 80;
    const renderOk = itemCount <= 10_000 ? 15 : itemCount <= 100_000 ? 40 : 200;

    return [
      {
        label: "After render",
        value: round(renderMB, 2),
        unit: "MB",
        better: "lower",
        rating: rateLower(renderMB, renderGood, renderOk),
      },
      {
        label: "Scroll delta",
        value: round(scrollMB, 2),
        unit: "MB",
        better: "lower",
        rating: rateLower(Math.abs(scrollMB), scrollLeakGood, scrollLeakOk),
      },
      {
        label: "Total heap",
        value: round(afterRenderMB, 1),
        unit: "MB",
        better: "lower",
      },
      {
        label: "Total delta",
        value: round(totalMB, 2),
        unit: "MB",
        better: "lower",
      },
    ];
  },
});
