// benchmarks/suites/scroll/solidjs/suite.js — Scroll FPS Benchmark (SolidJS)
//
// Thin wrapper around the shared engine scroll measurement.
// Defines the vlist create/destroy lifecycle, calls engine functions,
// and formats results with rating thresholds.
//
// Uses the core vlist library directly (no SolidJS runtime in benchmarks).

import { vlist } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  waitFrames,
  tryGC,
  rateHigher,
  rateLower,
} from "../../../runner.js";
import {
  ITEM_HEIGHT,
  SCROLL_DURATION_MS,
  BASE_SCROLL_SPEED,
  PREFLIGHT_DURATION_MS,
  WAKEUP_DURATION_MS,
  THROTTLE_WARNING_FPS,
} from "../../../engine/constants.js";
import { findViewport } from "../../../engine/viewport.js";
import {
  createRefreshRateDriver,
  wakeUpDisplay,
  measureRawRAFRate,
  measureScrollRun,
  computeScrollStats,
} from "../../../engine/scroll.js";

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "scroll-solidjs",
  name: "Scroll FPS (SolidJS)",
  description: `Sustained programmatic scrolling for ${SCROLL_DURATION_MS / 1000}s — measures rendering throughput`,
  icon: "📜",
  hasScrollSpeed: true,

  run: async ({
    itemCount,
    container,
    onStatus,
    scrollSpeed = BASE_SCROLL_SPEED,
  }) => {
    const items = generateItems(itemCount);

    // =====================================================================
    // Phase 0: Start the canvas refresh rate driver
    // =====================================================================
    const refreshDriver = createRefreshRateDriver();

    // =====================================================================
    // Phase 1: Wake up the display
    // =====================================================================
    onStatus("Waking up display...");
    await wakeUpDisplay(container, WAKEUP_DURATION_MS);

    // =====================================================================
    // Phase 2: Pre-flight rAF rate check (with canvas driver active)
    // =====================================================================
    onStatus("Checking rAF rate...");
    const rawRate = await measureRawRAFRate(PREFLIGHT_DURATION_MS);

    const isThrottled = rawRate < THROTTLE_WARNING_FPS;

    // =====================================================================
    // Phase 3: Warmup — short scroll to let JIT optimize
    // =====================================================================
    onStatus("Warming up...");
    {
      const warmupItems = generateItems(Math.min(itemCount, 10_000));
      container.innerHTML = "";
      const warmupInstance = vlist({
        container,
        items: warmupItems,
        item: {
          height: ITEM_HEIGHT,
          template: benchmarkTemplate,
        },
      }).build();

      await waitFrames(15);

      const vp = findViewport(container);
      if (vp) {
        const warmupStart = performance.now();
        let pos = 0;
        await new Promise((resolve) => {
          const tick = () => {
            const now = performance.now();
            if (now - warmupStart > 500) {
              resolve();
              return;
            }
            pos += 200;
            vp.scrollTop = pos;
            setTimeout(tick, 0);
          };
          setTimeout(tick, 0);
        });
      }

      warmupInstance.destroy();
      container.innerHTML = "";
      await tryGC();
    }

    // =====================================================================
    // Phase 4: Create vlist and measure scroll performance
    // =====================================================================
    container.innerHTML = "";
    const instance = vlist({
      container,
      items,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    }).build();
    await waitFrames(10);

    const viewport = findViewport(container);

    const speedLabel = `${scrollSpeed / 1000} px/ms`;
    onStatus(`Scrolling at ${speedLabel} for ${SCROLL_DURATION_MS / 1000}s...`);

    const runResult = await measureScrollRun({
      viewport,
      durationMs: SCROLL_DURATION_MS,
      speedPxPerSec: scrollSpeed,
      onProgress: (progress) => {
        const remaining = Math.ceil(
          (1 - progress) * (SCROLL_DURATION_MS / 1000),
        );
        onStatus(`Scrolling at ${speedLabel}... ${remaining}s remaining`);
      },
    });

    // Stop the canvas driver now that measurement is complete
    refreshDriver.stop();

    // Clean up
    instance.destroy();
    container.innerHTML = "";
    await tryGC();

    // =====================================================================
    // Phase 5: Compute stats
    // =====================================================================
    const { avgFps, droppedPct, avgWorkMs, p95WorkMs, estimatedMaxFps } =
      computeScrollStats(runResult, SCROLL_DURATION_MS);

    const { totalFrames } = runResult;

    // =====================================================================
    // Phase 6: Build result metrics
    // =====================================================================
    const metrics = [
      {
        label: "Avg FPS",
        value: avgFps,
        unit: "fps",
        better: "higher",
        rating: isThrottled
          ? rateHigher(avgFps, rawRate * 0.95, rawRate * 0.8)
          : rateHigher(avgFps, 55, 40),
      },
      ...(droppedPct > 0
        ? [
            {
              label: "Dropped",
              value: droppedPct,
              unit: "%",
              better: "lower",
              rating: rateLower(droppedPct, 5, 15),
            },
          ]
        : []),
      {
        label: "Frame budget",
        value: avgWorkMs,
        unit: "ms",
        better: "lower",
        rating: rateLower(avgWorkMs, 4, 10),
      },
      {
        label: "Budget p95",
        value: p95WorkMs,
        unit: "ms",
        better: "lower",
        rating: rateLower(p95WorkMs, 8, 16),
      },
      {
        label: "Total frames",
        value: totalFrames,
        unit: "",
        better: "higher",
      },
    ];

    if (isThrottled) {
      metrics.push(
        {
          label: "Est. throughput",
          value: Math.min(estimatedMaxFps, 999),
          unit: estimatedMaxFps > 999 ? "+fps" : "fps",
          better: "higher",
          rating: rateHigher(estimatedMaxFps, 120, 60),
        },
        {
          label: "⚠️ rAF throttled (external screen? power saving?)",
          value: rawRate,
          unit: "fps",
          better: "higher",
          rating: "bad",
        },
      );
    }

    return metrics;
  },
});
