// benchmarks/suites/scroll/vanilla/suite.js — Scroll FPS Benchmark (Vanilla)
//
// Thin wrapper around the shared engine scroll measurement.
// Defines the vlist create/destroy lifecycle, calls engine functions,
// and formats results with rating thresholds.

import { createVList } from "vlist";
import { createVList as createSynthetic } from "vlist/synthetic";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  waitFrames,
  tryGC,
  round,
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
  measurePointerFlingRun,
  computeScrollStats,
} from "../../../engine/scroll.js";
import { runLogicalScroll, scrollCapturePlugin } from "../../../engine/logical-scroll.js";

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "scroll-vanilla",
  name: "Scroll FPS (Vanilla)",
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
      const warmupList = createVList({
        container,
        item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        items: warmupItems,
      });
      await waitFrames(10);

      const vp = findViewport(container);
      if (vp) {
        // Quick scroll through — use setTimeout driver like the real test
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

      warmupList.destroy();
      container.innerHTML = "";
      await tryGC();
    }

    // =====================================================================
    // Phase 4: Create vlist and measure scroll performance
    // =====================================================================
    container.innerHTML = "";
    const list = createVList({
      container,
      item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
      items,
    });
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
    list.destroy();
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

    // If display is throttled, add throughput estimate and warning.
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


// Matched public logical-position writes. These measure programmatic navigation,
// not touch sampling or fling physics. Input JS timing excludes deferred native
// rendering/layout and must not be presented as total frame/main-thread cost.
// vlist 3.0 removed `scroll.mode` and with it bounded mode, so the entry point
// is the only thing that selects the input model: `vlist` scrolls natively,
// `vlist/synthetic` does its own. The suite ids are unchanged so the recorded
// history still lines up; `scroll-logical-bounded` keeps its past results and
// simply stops gaining new ones.
for (const mode of ["native", ...(__BENCH_HAS_SYNTHETIC__ ? ["synthetic"] : [])]) {
  defineSuite({
    id: `scroll-logical-${mode}`,
    name: `Logical scroll (${mode})`,
    description: "Matched logical-position writes; FPS, frame time, and where the rows actually are",
    hasScrollSpeed: true,
    run: (ctx) => runLogicalScroll({
      ...ctx,
      mode,
      createList(container, items) {
        let write;
        const list = (mode === "synthetic" ? createSynthetic : createVList)({
          container,
          items,
          item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        }, [scrollCapturePlugin((set) => { write = set; })]);
        const viewport = findViewport(container);
        return {
          set: (position) => write(position),
          get: () => mode === "native" ? viewport.scrollTop : list.getScrollPosition(),
          destroy: () => list.destroy(),
        };
      },
    }),
  });
}


if (__BENCH_HAS_SYNTHETIC__) defineSuite({
  id: "scroll-fling-synthetic",
  name: "Pointer fling (synthetic)",
  description: "Repeated in-page pointer flings with idle recovery; browser capture is shimmed, not a trusted-touch test",
  run: async ({ itemCount, container, onStatus }) => {
    const driver = createRefreshRateDriver();
    let list;
    try {
      list = createSynthetic({ container, items: generateItems(itemCount),
        item: { height: ITEM_HEIGHT, template: benchmarkTemplate } });
      list.scrollToIndex(Math.floor(itemCount / 2));
      await waitFrames(10);
      const options = { itemHeight: ITEM_HEIGHT, viewport: findViewport(container), content: container.querySelector('.vlist-content'), getPosition: () => list.getScrollPosition() };
      onStatus('Warming pointer sampling and inertia...');
      await measurePointerFlingRun({ ...options, durationMs: 1 });
      onStatus('Measuring repeated pointer flings...');
      const result = await measurePointerFlingRun({ ...options, durationMs: SCROLL_DURATION_MS });
      const stats = computeScrollStats(result, SCROLL_DURATION_MS);
      const sorted = [...result.frameTimes].sort((a,b) => a-b);
      const average = values => values.reduce((a,b) => a+b,0) / values.length;
      return [
        { label: "Avg FPS", value: stats.avgFps, unit: "fps", better: "higher" },
        { label: "Dropped", value: stats.droppedPct, unit: "%", better: "lower" },
        { label: "Frame p95", value: round(sorted[Math.floor((sorted.length-1)*.95)],2), unit: "ms", better: "lower" },
        { label: "Frame max", value: round(Math.max(...sorted),2), unit: "ms", better: "lower" },
        { label: "Frames over 32 ms", value: sorted.filter(value => value > 32).length, unit: "", better: "lower" },
        { label: "Inertia frames per fling", value: round(average(result.inertiaFrames),1), unit: "", better: "higher" },
        { label: "Distance per fling", value: round(average(result.distances),1), unit: "px", better: "higher" },
        { label: "Logical moving frames", value: result.logicalMovingFrames, unit: "", better: "higher" },
        { label: "DOM moving frames", value: result.domMovingFrames, unit: "", better: "higher" },
        { label: "Flings", value: result.distances.length, unit: "", better: "higher" },
      ];
    } finally { list?.destroy(); driver.stop(); container.innerHTML = ""; }
  },
});
