// benchmarks/suites/scrollto.js — scrollToIndex Benchmark
//
// Measures the latency of scrollToIndex() with smooth animation.
// Tests scrolling to random positions across the list and measures
// the time until the scroll settles at the target position.

import { createVList } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  round,
  median,
  percentile,
  rateLower,
} from "../../runner.js";

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
const WARMUP_JUMPS = 2;
const MEASURE_JUMPS = 7;
const SETTLE_TIMEOUT_MS = 5_000; // Max time to wait for scroll to settle
const SETTLE_FRAMES = 5; // Frames with stable scrollTop = settled

// =============================================================================
// Core measurement
// =============================================================================

/**
 * Wait for scrollTop to stabilize after a scrollToIndex call.
 * "Stabilized" = scrollTop hasn't changed for SETTLE_FRAMES consecutive frames.
 *
 * @param {Element} viewport - The scrollable element
 * @param {number} timeoutMs - Max time to wait
 * @returns {Promise<number>} time in ms from call to settled
 */
const waitForScrollSettle = (viewport, timeoutMs) => {
  return new Promise((resolve) => {
    const start = performance.now();
    let lastScrollTop = viewport.scrollTop;
    let stableFrames = 0;

    const check = () => {
      const elapsed = performance.now() - start;

      if (elapsed > timeoutMs) {
        // Timed out — return whatever we have
        resolve(elapsed);
        return;
      }

      const currentScrollTop = viewport.scrollTop;

      if (Math.abs(currentScrollTop - lastScrollTop) < 1) {
        stableFrames++;
      } else {
        stableFrames = 0;
      }

      lastScrollTop = currentScrollTop;

      if (stableFrames >= SETTLE_FRAMES) {
        resolve(performance.now() - start);
        return;
      }

      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
};

/**
 * Generate deterministic but spread-out target indices for scrollToIndex.
 * Ensures we test jumps across different parts of the list.
 *
 * @param {number} totalItems
 * @param {number} count - Number of targets to generate
 * @returns {number[]}
 */
const generateTargets = (totalItems, count) => {
  const targets = [];
  // Use a simple LCG-style spread to get well-distributed indices
  // Avoid index 0 and the very last index (trivial cases)
  const step = Math.floor(totalItems / (count + 1));

  for (let i = 1; i <= count; i++) {
    // Alternate between first half and second half for varied jump distances
    const base = i % 2 === 0 ? step * i : totalItems - step * i;
    const clamped = Math.max(1, Math.min(totalItems - 2, base));
    targets.push(clamped);
  }

  return targets;
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "scrollto-javascript",
  name: "scrollToIndex (JavaScript)",
  description:
    "Latency of smooth scrollToIndex() — time from call to scroll settled",
  icon: "🎯",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    container.innerHTML = "";

    const list = createVList({
      container,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
      items,
    });

    // Let initial render settle
    await waitFrames(10);

    const viewport = findViewport(container);

    if (!viewport) {
      list.destroy();
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element");
    }

    // ── Warmup ─────────────────────────────────────────────────────────
    onStatus("Warming up...");
    const warmupTargets = generateTargets(itemCount, WARMUP_JUMPS);

    for (const target of warmupTargets) {
      list.scrollToIndex(target, "center");
      await waitForScrollSettle(viewport, SETTLE_TIMEOUT_MS);
      await waitFrames(5);
    }

    // Reset to top before measuring
    list.scrollToIndex(0, "start");
    await waitForScrollSettle(viewport, SETTLE_TIMEOUT_MS);
    await tryGC();
    await waitFrames(10);

    // ── Measure ────────────────────────────────────────────────────────
    const targets = generateTargets(itemCount, MEASURE_JUMPS);
    const times = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      onStatus(
        `Jump ${i + 1}/${targets.length} → index ${target.toLocaleString()}`,
      );

      // Ensure we start from a stable position
      await waitFrames(3);

      const start = performance.now();
      list.scrollToIndex(target, "center");
      const settleTime = await waitForScrollSettle(viewport, SETTLE_TIMEOUT_MS);
      times.push(settleTime);

      // Small pause between jumps
      await waitFrames(5);
    }

    // Clean up
    list.destroy();
    container.innerHTML = "";
    await tryGC();

    // ── Compute stats ──────────────────────────────────────────────────
    const sorted = [...times].sort((a, b) => a - b);
    const med = round(median(times), 1);
    const min = round(sorted[0], 1);
    const max = round(sorted[sorted.length - 1], 1);
    const p95 = round(percentile(sorted, 95), 1);

    // scrollToIndex with smooth animation typically takes 200–400ms
    // for normal lists. Compression can add overhead for very large lists.
    const goodThreshold = itemCount <= 100_000 ? 400 : 600;
    const okThreshold = itemCount <= 100_000 ? 800 : 1200;

    return [
      {
        label: "Median",
        value: med,
        unit: "ms",
        better: "lower",
        rating: rateLower(med, goodThreshold, okThreshold),
      },
      {
        label: "Min",
        value: min,
        unit: "ms",
        better: "lower",
        rating: rateLower(min, goodThreshold, okThreshold),
      },
      {
        label: "p95",
        value: p95,
        unit: "ms",
        better: "lower",
        rating: rateLower(p95, goodThreshold * 1.5, okThreshold * 1.5),
      },
      {
        label: "Max",
        value: max,
        unit: "ms",
        better: "lower",
        rating: rateLower(max, goodThreshold * 2, okThreshold * 2),
      },
    ];
  },
});
