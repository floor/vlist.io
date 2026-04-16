// engine/scroll.js — Unified scroll measurement engine
//
// Single source of truth for scroll performance measurement, used by
// both suite benchmarks and library comparisons.
//
// Architecture — three parallel loops:
//
//   1. SCROLL DRIVER (setTimeout loop)
//      Advances scrollTop at a constant px/s rate using wall-clock time.
//      Runs ~250–1000×/sec, completely independent of display refresh rate.
//
//   2. PAINT COUNTER (rAF loop)
//      Registered before scroll starts → runs first in each rAF batch.
//      Records inter-frame intervals for FPS / jitter analysis.
//      Optional stress burn simulates competing CPU workload.
//
//   3. FRAME COST PROBE (scroll-event → rAF)
//      Scheduled AFTER the library's own scroll handler rAF, so it fires
//      after the library has done its DOM mutations. Measures JS callback
//      work + forced layout cost per frame.
//
// This decoupling solves the 30fps cap problem: Chrome/macOS sometimes
// throttle rAF for programmatic scroll (no user gesture, ProMotion
// dynamic refresh, power saving). With this design, scroll speed is
// always constant regardless of rAF delivery rate.

import {
  waitFrames,
  burnCpu,
  round,
  median,
  percentile,
} from "../runner.js";

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
export const createRefreshRateDriver = () => {
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
    // Alternate between two nearly-identical colors — invisible to the
    // eye but forces the compositor to treat this as actively-animated
    // content every single frame.
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
// Display Wake-Up
// =============================================================================

/**
 * Try to "wake up" Chrome / macOS ProMotion into delivering full-rate rAF.
 *
 * Combines multiple compositor-engagement strategies:
 *   1. Visible element with will-change:transform mutated every rAF
 *   2. Web Animations API animation to signal compositor activity
 *
 * Should be used in combination with createRefreshRateDriver() for
 * maximum effectiveness.
 *
 * @param {HTMLElement} container - A visible, on-screen element
 * @param {number} durationMs
 * @returns {Promise<void>}
 */
export const wakeUpDisplay = (container, durationMs) => {
  return new Promise((resolve) => {
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
      // animate() not supported — fine, rAF thrashing below still helps
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

// =============================================================================
// Pre-Flight rAF Rate Measurement
// =============================================================================

/**
 * Measure the browser's actual rAF frame rate for a short duration.
 * Detects Chrome throttling (power saving, ProMotion, etc.) BEFORE
 * running the real benchmark.
 *
 * @param {number} durationMs
 * @returns {Promise<number>} measured FPS
 */
export const measureRawRAFRate = (durationMs) => {
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
// Core: Single scroll run measurement
// =============================================================================

/**
 * @typedef {Object} ScrollRunResult
 * @property {number[]} frameTimes - Inter-frame intervals (ms) from rAF paint counter
 * @property {number[]} frameWorkTimes - Per-frame rendering cost (JS callbacks + forced layout) in ms
 * @property {number} totalFrames - Number of frames recorded
 * @property {number} scrollDriverRate - setTimeout ticks per second (diagnostic)
 * @property {number} medianFPS - Median FPS derived from frame times
 * @property {number} medianFrameTime - Median inter-frame interval (ms)
 * @property {number} p95FrameTime - 95th percentile inter-frame interval (ms)
 */

/**
 * Measure scroll performance using the 3-loop architecture.
 *
 * This is THE scroll measurement function used by both suites and comparisons.
 * All three loops (paint counter, frame cost probe, scroll driver) run in
 * parallel for the specified duration.
 *
 * @param {Object} opts
 * @param {Element|null} opts.viewport - The scrollable element (null returns zero metrics)
 * @param {number} opts.durationMs - How long to scroll
 * @param {number} opts.speedPxPerSec - Scroll speed in pixels per second
 * @param {number} [opts.stressMs=0] - CPU burn per frame (simulates app workload)
 * @param {(progress: number) => void} [opts.onProgress] - Progress callback (0-1)
 * @returns {Promise<ScrollRunResult>}
 */
export const measureScrollRun = async ({
  viewport,
  durationMs,
  speedPxPerSec,
  stressMs = 0,
  onProgress,
}) => {
  // Guard: if no viewport, return zero metrics instead of crashing
  if (!viewport) {
    return {
      frameTimes: [],
      frameWorkTimes: [],
      totalFrames: 0,
      scrollDriverRate: 0,
      medianFPS: 0,
      medianFrameTime: 0,
      p95FrameTime: 0,
    };
  }

  const maxScroll = viewport.scrollHeight - viewport.clientHeight;

  return new Promise((resolve) => {
    // -----------------------------------------------------------------
    // Shared state
    // -----------------------------------------------------------------
    const frameTimes = [];
    const frameWorkTimes = [];
    let running = true;
    let scrollDriverTicks = 0;
    let lastProgressUpdate = 0;

    // -----------------------------------------------------------------
    // Loop 1 — Paint counter (rAF)
    //
    // Registered FIRST so it runs before the library's handler in each
    // rAF batch. Pure timing — records when frames are delivered.
    // Stress burns happen here so the library's rendering competes
    // for the remaining frame budget.
    // -----------------------------------------------------------------
    let lastPaintTime = 0;

    const paintTick = (timestamp) => {
      if (!running) return;

      if (lastPaintTime > 0) {
        frameTimes.push(timestamp - lastPaintTime);
      }
      lastPaintTime = timestamp;

      // Simulate additional CPU work (stress mode)
      if (stressMs > 0) burnCpu(stressMs);

      requestAnimationFrame(paintTick);
    };

    // -----------------------------------------------------------------
    // Loop 3 — Frame cost probe (scroll event → rAF)
    //
    // Registered on the viewport AFTER the library's listeners, so
    // this scroll listener fires after the library's. When it schedules
    // a rAF, that callback runs AFTER the library's rafThrottle callback
    // in the same frame batch. This means:
    //   - The library has already done its DOM mutations
    //   - performance.now() − timestamp = total JS work in this frame
    //   - offsetHeight forces synchronous layout on the dirty DOM
    //
    // Uses a rafThrottle pattern (one rAF per frame) to avoid
    // scheduling redundant callbacks from ~250 scroll events/sec.
    // -----------------------------------------------------------------
    let costProbeFrameId = null;

    const onScrollForCostProbe = () => {
      if (!running) return;

      if (costProbeFrameId === null) {
        costProbeFrameId = requestAnimationFrame((timestamp) => {
          costProbeFrameId = null;
          if (!running) return;

          // JS callback work done in this frame before us
          const afterCallbacks = performance.now();
          const jsWorkMs = afterCallbacks - timestamp;

          // Force synchronous layout to measure the cost of processing
          // the library's DOM mutations
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

    // -----------------------------------------------------------------
    // Loop 2 — Scroll driver (setTimeout)
    //
    // Advances scrollTop at constant px/s using wall-clock time.
    // setTimeout(0) fires ~4ms apart in Chrome, giving ~250 scroll
    // updates/sec — much smoother than 60fps rAF, especially at
    // slow scroll speeds where rAF would produce visible stepping.
    // -----------------------------------------------------------------
    const scrollStartTime = performance.now();
    let scrollPos = 0;
    let scrollDirection = 1;
    let lastScrollTime = scrollStartTime;

    const scrollTick = () => {
      if (!running) return;

      const now = performance.now();
      const elapsed = now - scrollStartTime;

      // Check if we've run long enough
      if (elapsed >= durationMs) {
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

        // Compute derived stats from frame times
        const sortedFrameTimes = [...frameTimes].sort((a, b) => a - b);
        const medFrameTime = frameTimes.length > 0 ? median(frameTimes) : 0;
        const p95Frame =
          sortedFrameTimes.length > 0
            ? percentile(sortedFrameTimes, 95)
            : 0;
        const medFPS = medFrameTime > 0 ? round(1000 / medFrameTime, 1) : 0;

        resolve({
          frameTimes,
          frameWorkTimes,
          totalFrames: frameTimes.length,
          scrollDriverRate: driverRate,
          medianFPS: medFPS,
          medianFrameTime: round(medFrameTime, 2),
          p95FrameTime: round(p95Frame, 2),
        });
        return;
      }

      // Update progress every ~100ms
      if (onProgress && elapsed - lastProgressUpdate > 100) {
        onProgress(elapsed / durationMs);
        lastProgressUpdate = elapsed;
      }

      // Advance scroll position based on real elapsed time (NOT per-frame)
      const dt = now - lastScrollTime;
      lastScrollTime = now;
      scrollDriverTicks++;

      const pxDelta = (speedPxPerSec * dt) / 1000;
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
      // giving us ~250 scroll updates/sec
      setTimeout(scrollTick, 0);
    };

    // Start all loops
    requestAnimationFrame(paintTick);
    setTimeout(scrollTick, 0);
  });
};

// =============================================================================
// Stats Helpers
// =============================================================================

/**
 * Compute comprehensive scroll statistics from raw frame data.
 *
 * This is a convenience function for suites that need detailed stats
 * beyond what measureScrollRun() includes in its return value.
 *
 * @param {Object} rawData - Result from measureScrollRun()
 * @param {number[]} rawData.frameTimes
 * @param {number[]} rawData.frameWorkTimes
 * @param {number} rawData.totalFrames
 * @param {number} durationMs - Intended measurement duration
 * @returns {{
 *   avgFps: number,
 *   medianFps: number,
 *   droppedPct: number,
 *   droppedFrames: number,
 *   avgWorkMs: number,
 *   p95WorkMs: number,
 *   estimatedMaxFps: number,
 *   medianFrameTime: number,
 * }}
 */
export const computeScrollStats = (
  { frameTimes, frameWorkTimes, totalFrames },
  durationMs,
) => {
  const sortedTimes = [...frameTimes].sort((a, b) => a - b);

  // FPS from total frame count / actual elapsed time
  const actualDurationSec = frameTimes.reduce((s, t) => s + t, 0) / 1000;
  const avgFps = round(
    totalFrames / (actualDurationSec || durationMs / 1000),
    1,
  );

  // Median FPS from frame intervals
  const medianFrameTime =
    sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 16.67;
  const medianFps =
    medianFrameTime > 0 ? round(1000 / medianFrameTime, 1) : 0;

  // Dropped frames — anything > 50% over the median
  const droppedThreshold = medianFrameTime * 1.5;
  const droppedFrames = frameTimes.filter(
    (dt) => dt > droppedThreshold,
  ).length;
  const droppedPct = totalFrames > 0
    ? round((droppedFrames / totalFrames) * 100, 1)
    : 0;

  // Frame budget (per-frame rendering cost)
  const sortedWork = [...frameWorkTimes].sort((a, b) => a - b);
  const avgWorkMs =
    sortedWork.length > 0
      ? round(
          sortedWork.reduce((s, t) => s + t, 0) / sortedWork.length,
          2,
        )
      : 0;
  const p95WorkMs =
    sortedWork.length > 0
      ? round(percentile(sortedWork, 95), 2)
      : 0;

  // Estimated throughput (independent of display Hz)
  const estimatedMaxFps =
    p95WorkMs > 0.05
      ? round(Math.min(1000 / p95WorkMs, 10_000), 0)
      : 10_000;

  return {
    avgFps,
    medianFps,
    droppedPct,
    droppedFrames,
    avgWorkMs,
    p95WorkMs,
    estimatedMaxFps,
    medianFrameTime,
  };
};
