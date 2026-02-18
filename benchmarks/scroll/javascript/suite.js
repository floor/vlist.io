// benchmarks/suites/scroll.js — Scroll FPS Benchmark
//
// Measures sustained scroll performance by programmatically scrolling
// a vlist at a constant rate for 5 seconds. Tracks frame times to
// compute min/avg/max FPS and count dropped frames.
//
// KEY DESIGN: Scroll driving is DECOUPLED from paint counting.
//
//   - Scroll driver: a tight setTimeout(0) loop that advances scrollTop
//     at a constant px/s rate using performance.now() wall-clock time.
//     This runs ~250–1000x/sec regardless of display refresh rate.
//
//   - Paint counter: a parallel requestAnimationFrame loop that purely
//     records when the browser paints. It does NOT drive scroll.
//
//   - Canvas refresh driver: a 1px canvas drawn every rAF frame signals
//     Chrome / macOS ProMotion that the compositor is active and needs
//     full refresh rate. This is the strongest known JS-level hint.
//
//   - Frame budget measurement: each rAF callback forces a synchronous
//     layout read (offsetHeight) to flush vlist's pending DOM mutations.
//     The time this takes IS vlist's per-frame rendering cost. From this
//     we derive an "estimated throughput" that's independent of display Hz.
//
// This decoupling solves the 30fps cap problem: Chrome/macOS sometimes
// throttle rAF for programmatic scroll (no user gesture, ProMotion
// dynamic refresh, power saving, etc.). With the old approach, rAF
// throttling meant BOTH slower scroll speed AND lower frame counts.
// Now scroll speed is always constant, and rAF correctly measures
// the actual paint rate — plus we report estimated throughput even
// when the display is throttled.

import { vlist } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  waitFrames,
  tryGC,
  round,
  percentile,
  rateHigher,
  rateLower,
} from "../../runner.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const SCROLL_DURATION_MS = 5_000;
const SCROLL_SPEED_PX_PER_SEC = 7_200; // Constant scroll speed (~120px/frame at 60fps)
const PREFLIGHT_DURATION_MS = 1_000; // 1s rAF rate check before real benchmark
const WAKEUP_DURATION_MS = 500; // 0.5s to engage compositor before measuring
const THROTTLE_WARNING_FPS = 50; // Below this we warn about rAF throttling

// =============================================================================
// Canvas Refresh Rate Driver
// =============================================================================

/**
 * Create a 1×1 canvas that draws every rAF frame.
 *
 * This is the strongest JS-level signal to Chrome / macOS ProMotion that
 * the page needs high-frequency rendering. The compositor sees an actively
 * drawn <canvas> and promotes the page to full refresh rate. Game engines
 * and animation libraries use this technique.
 *
 * The canvas is nearly invisible (1px, 1% opacity) and positioned fixed
 * so it doesn't affect layout or scroll.
 *
 * @returns {{ stop: () => void }}
 */
const createRefreshRateDriver = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;" +
    "opacity:0.01;pointer-events:none;z-index:99999;";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let running = true;
  let toggle = false;

  const draw = () => {
    if (!running) {
      canvas.remove();
      return;
    }
    // Alternate between two nearly-identical colors — the change is
    // invisible to the eye but forces the compositor to treat this as
    // actively-animated content every single frame.
    toggle = !toggle;
    ctx.fillStyle = toggle ? "#010101" : "#010100";
    ctx.fillRect(0, 0, 1, 1);
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);

  return {
    stop: () => {
      running = false;
    },
  };
};

// =============================================================================
// Core measurement helpers
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
 * Programmatically scroll a vlist at constant speed and measure frame times
 * plus per-frame rendering cost.
 *
 * Architecture — three parallel loops:
 *
 *   1. SCROLL DRIVER (setTimeout loop)
 *      Advances scrollTop at SCROLL_SPEED_PX_PER_SEC using wall-clock time.
 *      Runs ~250x/sec, completely independent of display refresh rate.
 *
 *   2. PAINT COUNTER (rAF loop)
 *      Registered before scroll starts → runs first in each rAF batch.
 *      Records inter-frame intervals for FPS / jitter analysis.
 *
 *   3. FRAME COST PROBE (scroll-event → rAF, registered AFTER createVList)
 *      Because this listener is added after vlist's, its rAF is scheduled
 *      after vlist's rafThrottle rAF. In the browser's rAF batch:
 *        a) Paint counter fires  (our loop — frame interval)
 *        b) vlist's handler fires (DOM mutations: add/remove items, transforms)
 *        c) Cost probe fires     (measures work done in a+b, forces layout)
 *      This guarantees we measure AFTER vlist has dirtied the DOM.
 *
 * @param {HTMLElement} container
 * @param {Array<{id: number}>} items
 * @param {(progress: number) => void} [onProgress] - Progress callback (0-1)
 * @returns {Promise<{frameTimes: number[], frameWorkTimes: number[], totalFrames: number, scrollDriverRate: number}>}
 */
const measureScrollFPS = async (container, items, onProgress) => {
  container.innerHTML = "";

  const list = vlist({
    container,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
    items,
  }).build();

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
    // -----------------------------------------------------------------------
    // Shared state
    // -----------------------------------------------------------------------
    const frameTimes = [];
    const frameWorkTimes = [];
    let running = true;
    let scrollDriverTicks = 0;
    let lastProgressUpdate = 0;

    // -----------------------------------------------------------------------
    // Loop 1 — Paint counter (rAF)
    // Registered FIRST so it runs before vlist's handler in each frame.
    // Pure timing — records when frames are delivered to compute FPS.
    // -----------------------------------------------------------------------
    let lastPaintTime = 0;

    const paintTick = (timestamp) => {
      if (!running) return;

      if (lastPaintTime > 0) {
        frameTimes.push(timestamp - lastPaintTime);
      }
      lastPaintTime = timestamp;

      requestAnimationFrame(paintTick);
    };

    // -----------------------------------------------------------------------
    // Loop 3 — Frame cost probe (scroll event → rAF)
    //
    // Registered on the viewport AFTER vlist(), so this scroll
    // listener fires after vlist's. When it schedules a rAF, that
    // callback is guaranteed to run AFTER vlist's rafThrottle callback
    // in the same frame batch. This means:
    //   - vlist has already done its DOM mutations (innerHTML, transforms)
    //   - performance.now() − timestamp = total JS work in this frame
    //     (paint counter + vlist handler + canvas driver)
    //   - offsetHeight forces synchronous layout on vlist's dirty DOM
    //
    // We use the same rafThrottle pattern (one rAF per frame) to avoid
    // scheduling redundant callbacks from the ~250 scroll events/sec.
    // -----------------------------------------------------------------------
    let costProbeFrameId = null;

    const onScrollForCostProbe = () => {
      if (!running) return;

      if (costProbeFrameId === null) {
        costProbeFrameId = requestAnimationFrame((timestamp) => {
          costProbeFrameId = null;
          if (!running) return;

          // At this point, vlist's rAF handler has already run and
          // mutated the DOM (added/removed items, updated transforms).
          // performance.now() − timestamp captures all rAF callback
          // work in this frame that ran before us.
          const afterCallbacks = performance.now();
          const jsWorkMs = afterCallbacks - timestamp;

          // Force synchronous layout to measure the cost of processing
          // vlist's DOM mutations. This is the browser's layout engine
          // actually computing positions for the new/changed elements.
          void viewport.offsetHeight;
          const afterLayout = performance.now();
          const layoutMs = afterLayout - afterCallbacks;

          // Total frame cost = JS callback work + forced layout
          frameWorkTimes.push(jsWorkMs + layoutMs);
        });
      }
    };

    viewport.addEventListener("scroll", onScrollForCostProbe, {
      passive: true,
    });

    // -----------------------------------------------------------------------
    // Loop 2 — Scroll driver (setTimeout)
    // Advances scrollTop at constant px/s using wall-clock time.
    // -----------------------------------------------------------------------
    const scrollStartTime = performance.now();
    let scrollPos = 0;
    let scrollDirection = 1; // 1 = down, -1 = up
    let lastScrollTime = scrollStartTime;

    const scrollTick = () => {
      if (!running) return;

      const now = performance.now();
      const elapsed = now - scrollStartTime;

      // Check if we've run long enough
      if (elapsed >= SCROLL_DURATION_MS) {
        running = false;

        // Report 100% complete
        if (onProgress) onProgress(1);

        // Clean up cost probe
        viewport.removeEventListener("scroll", onScrollForCostProbe);
        if (costProbeFrameId !== null) {
          cancelAnimationFrame(costProbeFrameId);
        }

        // Compute scroll driver rate for diagnostics
        const driverRate = round(scrollDriverTicks / (elapsed / 1000), 0);

        list.destroy();
        container.innerHTML = "";

        resolve({
          frameTimes,
          frameWorkTimes,
          totalFrames: frameTimes.length,
          scrollDriverRate: driverRate,
        });
        return;
      }

      // Update progress every ~100ms to avoid excessive callback calls
      if (onProgress && elapsed - lastProgressUpdate > 100) {
        const progress = elapsed / SCROLL_DURATION_MS;
        onProgress(progress);
        lastProgressUpdate = elapsed;
      }

      // Advance scroll position based on real elapsed time (NOT per-frame)
      const dt = now - lastScrollTime;
      lastScrollTime = now;
      scrollDriverTicks++;

      const pxDelta = (SCROLL_SPEED_PX_PER_SEC * dt) / 1000;
      scrollPos += pxDelta * scrollDirection;

      // Bounce at top/bottom
      if (scrollPos >= maxScroll) {
        scrollPos = maxScroll;
        scrollDirection = -1;
      } else if (scrollPos <= 0) {
        scrollPos = 0;
        scrollDirection = 1;
      }

      viewport.scrollTop = scrollPos;

      // Schedule next tick — setTimeout(0) runs ~4ms apart in Chrome,
      // giving us ~250 scroll updates/sec. This is much faster than
      // 60fps rAF and ensures smooth, consistent scroll regardless of
      // the display's actual refresh rate.
      setTimeout(scrollTick, 0);
    };

    // Start all loops
    requestAnimationFrame(paintTick);
    setTimeout(scrollTick, 0);
  });
};

// =============================================================================
// Pre-flight: wake up the display and measure rAF delivery rate
// =============================================================================

/**
 * Try to "wake up" Chrome / macOS ProMotion into delivering full-rate rAF.
 *
 * Combines multiple compositor-engagement strategies:
 *   1. Visible element with will-change:transform mutated every rAF
 *   2. Web Animations API animation to signal compositor activity
 *   3. Canvas refresh rate driver (started separately, runs for entire benchmark)
 *
 * @param {HTMLElement} container - A visible, on-screen element
 * @param {number} durationMs
 * @returns {Promise<void>}
 */
const wakeUpDisplay = (container, durationMs) => {
  return new Promise((resolve) => {
    // Create a visible element to thrash
    const el = document.createElement("div");
    el.style.cssText =
      "width:100%;height:100%;position:absolute;top:0;left:0;" +
      "background:transparent;will-change:transform;";
    container.appendChild(el);

    // Start a CSS animation to engage the compositor
    try {
      el.animate(
        [
          { transform: "translateY(0px)", opacity: 1 },
          { transform: "translateY(1px)", opacity: 0.99 },
        ],
        {
          duration: durationMs,
          iterations: 1,
          easing: "linear",
        },
      );
    } catch {
      // animate() not supported — fine, we still do the rAF thrashing below
    }

    const startTime = performance.now();
    let toggle = false;

    const tick = () => {
      if (performance.now() - startTime >= durationMs) {
        el.remove();
        resolve();
        return;
      }

      // Rapid visible mutations to force rendering pipeline activity
      toggle = !toggle;
      el.style.transform = toggle ? "translateY(1px)" : "translateY(0px)";

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

/**
 * Measure the browser's actual rAF frame rate for a short duration.
 * This detects Chrome throttling (power saving, ProMotion, etc.)
 * BEFORE running the real benchmark.
 *
 * @param {number} durationMs
 * @returns {Promise<number>} measured FPS
 */
const measureRawRAFRate = (durationMs) => {
  return new Promise((resolve) => {
    let frames = 0;
    let startTime = 0;

    const tick = (timestamp) => {
      if (startTime === 0) {
        startTime = timestamp;
        frames = 0;
        requestAnimationFrame(tick);
        return;
      }

      frames++;

      if (timestamp - startTime >= durationMs) {
        const elapsed = timestamp - startTime;
        resolve(round(frames / (elapsed / 1000), 1));
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

// =============================================================================
// Suite
// =============================================================================

defineSuite({
  id: "scroll-javascript",
  name: "Scroll FPS (JavaScript)",
  description: `Sustained programmatic scrolling for ${SCROLL_DURATION_MS / 1000}s — measures rendering throughput`,
  icon: "📜",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    // =====================================================================
    // Phase 0: Start the canvas refresh rate driver
    // =====================================================================
    // A 1px canvas drawing every rAF is the strongest JS-level signal to
    // Chrome / macOS ProMotion that the page needs high-frequency rendering.
    // Keep it alive for the ENTIRE benchmark duration.
    const refreshDriver = createRefreshRateDriver();

    // =====================================================================
    // Phase 1: Wake up the display
    // =====================================================================
    // macOS ProMotion and Chrome power-saving can throttle rAF to 30fps
    // for "low priority" content. Thrashing the compositor with visible
    // mutations, animations, AND the canvas driver signals that high-
    // frequency updates are needed, coaxing the display into full refresh.
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
      const warmupList = vlist({
        container,
        item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        items: warmupItems,
      }).build();
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
    // Phase 4: Measure
    // =====================================================================
    onStatus(`Scrolling for ${SCROLL_DURATION_MS / 1000}s...`);
    const { frameTimes, frameWorkTimes, totalFrames, scrollDriverRate } =
      await measureScrollFPS(container, items, (progress) => {
        const remaining = Math.ceil(
          (1 - progress) * (SCROLL_DURATION_MS / 1000),
        );
        onStatus(`Scrolling... ${remaining}s remaining`);
      });

    // Stop the canvas driver now that measurement is complete
    refreshDriver.stop();

    await tryGC();

    // =====================================================================
    // Phase 5: Compute stats
    // =====================================================================

    // -- FPS stats from frame intervals --
    const sortedTimes = [...frameTimes].sort((a, b) => a - b);

    const actualDurationSec = frameTimes.reduce((s, t) => s + t, 0) / 1000;
    const avgFps = round(
      totalFrames / (actualDurationSec || SCROLL_DURATION_MS / 1000),
      1,
    );

    // Adaptive dropped frame threshold: anything > 50% over the median
    const medianFrameTime =
      sortedTimes[Math.floor(sortedTimes.length / 2)] || 16.67;
    const droppedThreshold = medianFrameTime * 1.5;
    const droppedFrames = frameTimes.filter(
      (dt) => dt > droppedThreshold,
    ).length;
    const droppedPct = round((droppedFrames / totalFrames) * 100, 1);

    // -- Frame budget stats from per-frame rendering cost --
    const sortedWork = [...frameWorkTimes].sort((a, b) => a - b);
    const avgWorkMs =
      sortedWork.length > 0
        ? round(sortedWork.reduce((s, t) => s + t, 0) / sortedWork.length, 2)
        : 0;
    const p95WorkMs =
      sortedWork.length > 0 ? round(percentile(sortedWork, 95), 2) : 0;

    // Estimated throughput: how fast COULD vlist render if the display
    // weren't the bottleneck? Based on the per-frame layout cost.
    // Use p95 work time for a conservative estimate.
    // Clamp to a reasonable range (cap at display rate if not throttled).
    const estimatedMaxFps =
      p95WorkMs > 0.05 ? round(Math.min(1000 / p95WorkMs, 10_000), 0) : 10_000;

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
    // The throughput is the headline metric in this case — it reflects
    // vlist's actual rendering capability independent of the display Hz.
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
