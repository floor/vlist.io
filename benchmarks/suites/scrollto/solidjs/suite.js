// benchmarks/scrollto/solidjs/suite.js — scrollToIndex Benchmark (SolidJS)
//
// Measures the latency of scrollToIndex() with smooth animation.
// Tests scrolling to random positions across the list and measures
// the time until the scroll settles at the target position.
//
// Uses the core vlist library directly (no SolidJS runtime in benchmarks).

import { vlist } from "vlist";
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
} from "../../../runner.js";
import {
  ITEM_HEIGHT,
  WARMUP_JUMPS,
  MEASURE_JUMPS,
  SETTLE_TIMEOUT_MS,
  SETTLE_FRAMES,
} from "../constants.js";

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

const waitForScrollSettle = (viewport, timeoutMs) => {
  return new Promise((resolve) => {
    const start = performance.now();
    let lastScrollTop = viewport.scrollTop;
    let stableFrames = 0;

    const check = () => {
      const elapsed = performance.now() - start;

      if (elapsed > timeoutMs) {
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

const generateTargets = (totalItems, count) => {
  const targets = [];
  const step = Math.floor(totalItems / (count + 1));

  for (let i = 1; i <= count; i++) {
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
  id: "scrollto-solidjs",
  name: "scrollToIndex (SolidJS)",
  description:
    "Latency of smooth scrollToIndex() — time from call to scroll settled",
  icon: "🎯",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    container.innerHTML = "";

    const instance = vlist({
      container,
      items,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    }).build();

    // Let initial render settle
    await waitFrames(10);

    const viewport = findViewport(container);

    if (!viewport) {
      instance.destroy();
      container.innerHTML = "";
      throw new Error("Could not find vlist viewport element");
    }

    // ── Warmup ─────────────────────────────────────────────────────────
    onStatus("Warming up...");
    const warmupTargets = generateTargets(itemCount, WARMUP_JUMPS);

    for (const target of warmupTargets) {
      instance.scrollToIndex(target, "center");
      await waitForScrollSettle(viewport, SETTLE_TIMEOUT_MS);
      await waitFrames(5);
    }

    // Reset to top before measuring
    instance.scrollToIndex(0, "start");
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

      await waitFrames(3);

      const start = performance.now();
      instance.scrollToIndex(target, "center");
      const settleTime = await waitForScrollSettle(viewport, SETTLE_TIMEOUT_MS);
      times.push(settleTime);

      await waitFrames(5);
    }

    // Clean up
    instance.destroy();
    container.innerHTML = "";
    await tryGC();

    // ── Compute stats ──────────────────────────────────────────────────
    const sorted = [...times].sort((a, b) => a - b);
    const med = round(median(times), 1);
    const min = round(sorted[0], 1);
    const max = round(sorted[sorted.length - 1], 1);
    const p95 = round(percentile(sorted, 95), 1);

    // Thresholds similar to JavaScript (no framework overhead)
    const goodThreshold = itemCount <= 100_000 ? 400 : 600;
    const okThreshold = itemCount <= 100_000 ? 900 : 1300;

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
