// benchmarks/memory/react/suite.js — Memory Benchmark (React)
//
// Measures JS heap usage at three points:
//   1. Baseline — before vlist is created
//   2. After render — immediately after createVList + first paint
//   3. After scroll — after 10 seconds of sustained scrolling
//
// The delta between (2) and (3) reveals memory leaks.
// Chrome-only (requires performance.memory API).

import { createRoot } from "react-dom/client";
import { useVList } from "vlist-react";
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
} from "../../../runner.js";
import {
  ITEM_HEIGHT,
  SCROLL_DURATION_MS,
  SCROLL_SPEED_PX_PER_FRAME,
  SETTLE_FRAMES,
} from "../constants.js";

// =============================================================================
// React Component
// =============================================================================

function BenchmarkList({ items }) {
  const { containerRef } = useVList({
    items,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
  });

  return <div ref={containerRef} />;
}

// =============================================================================
// Helpers
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

const scrollFor = (viewport, durationMs, onProgress) => {
  return new Promise((resolve) => {
    let startTime = 0;
    let scrollPos = viewport.scrollTop || 0;
    let direction = 1;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    let lastProgressUpdate = 0;

    const tick = (timestamp) => {
      if (startTime === 0) {
        startTime = timestamp;
        requestAnimationFrame(tick);
        return;
      }

      const elapsed = timestamp - startTime;

      if (elapsed >= durationMs) {
        if (onProgress) onProgress(1);
        resolve();
        return;
      }

      // Update progress every ~100ms to avoid excessive callback calls
      if (onProgress && elapsed - lastProgressUpdate > 100) {
        const progress = elapsed / durationMs;
        onProgress(progress);
        lastProgressUpdate = elapsed;
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
  id: "memory-react",
  name: "Memory (React)",
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

    const root = createRoot(container);
    root.render(<BenchmarkList items={items} />);

    // Let the render settle and GC stabilize
    await waitFrames(SETTLE_FRAMES);
    await waitFrames(5); // React needs extra frames
    await tryGC();
    await waitFrames(SETTLE_FRAMES);

    const afterRender = getHeapUsed();

    // ── Step 3: Scroll for the full duration and measure ─────────────────
    const viewport = findViewport(container);

    if (!viewport) {
      root.unmount();
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element");
    }

    onStatus(`Scrolling for ${SCROLL_DURATION_MS / 1000}s...`);
    await scrollFor(viewport, SCROLL_DURATION_MS, (progress) => {
      const remaining = Math.ceil((1 - progress) * (SCROLL_DURATION_MS / 1000));
      onStatus(`Scrolling... ${remaining}s remaining`);
    });

    // Let GC settle after scrolling
    await waitFrames(SETTLE_FRAMES);
    await tryGC();
    await waitFrames(SETTLE_FRAMES);

    const afterScroll = getHeapUsed();

    // ── Clean up ─────────────────────────────────────────────────────────
    root.unmount();
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

    // Thresholds adjusted for React overhead (more lenient)
    const scrollLeakGood = itemCount <= 100_000 ? 1.5 : 4;
    const scrollLeakOk = itemCount <= 100_000 ? 6 : 12;

    // Render heap thresholds (MB) - more lenient for React
    const renderGood =
      itemCount <= 10_000 ? 8 : itemCount <= 100_000 ? 20 : 100;
    const renderOk = itemCount <= 10_000 ? 20 : itemCount <= 100_000 ? 50 : 250;

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
