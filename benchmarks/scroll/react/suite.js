// benchmarks/scroll/react/suite.js — Scroll FPS Benchmark (React)
//
// Measures sustained scroll performance by programmatically scrolling
// a vlist at a constant rate for 5 seconds. Tracks frame times to
// compute min/avg/max FPS and count dropped frames.
//
// Uses React's useVList hook with the same scroll measurement architecture
// as the JavaScript variant.

import { createRoot } from "react-dom/client";
import { useVList } from "vlist/react";
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
const SCROLL_SPEED_PX_PER_SEC = 7_200;
const PREFLIGHT_DURATION_MS = 1_000;
const WAKEUP_DURATION_MS = 500;
const THROTTLE_WARNING_FPS = 50;

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
// Canvas Refresh Rate Driver
// =============================================================================

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

const measureScrollFPS = async (container, items) => {
  container.innerHTML = "";
  await waitFrames(2);

  const root = createRoot(container);
  root.render(<BenchmarkList items={items} />);

  await waitFrames(10);
  await waitFrames(5); // React needs extra frames to settle

  const viewport = findViewport(container);

  if (!viewport) {
    root.unmount();
    throw new Error("Could not find vlist viewport element");
  }

  const maxScroll = viewport.scrollHeight - viewport.clientHeight;

  return new Promise((resolve) => {
    const frameTimes = [];
    const frameWorkTimes = [];
    let running = true;
    let scrollDriverTicks = 0;

    let lastPaintTime = 0;

    const paintTick = (timestamp) => {
      if (!running) return;

      if (lastPaintTime > 0) {
        frameTimes.push(timestamp - lastPaintTime);
      }
      lastPaintTime = timestamp;

      requestAnimationFrame(paintTick);
    };

    let costProbeFrameId = null;

    const onScrollForCostProbe = () => {
      if (!running) return;

      if (costProbeFrameId === null) {
        costProbeFrameId = requestAnimationFrame((timestamp) => {
          costProbeFrameId = null;
          if (!running) return;

          const afterCallbacks = performance.now();
          const jsWorkMs = afterCallbacks - timestamp;

          void viewport.offsetHeight;
          const afterLayout = performance.now();
          const layoutMs = afterLayout - afterCallbacks;

          frameWorkTimes.push(jsWorkMs + layoutMs);
        });
      }
    };

    viewport.addEventListener("scroll", onScrollForCostProbe, {
      passive: true,
    });

    const scrollStartTime = performance.now();
    let scrollPos = 0;
    let scrollDirection = 1;
    let lastScrollTime = scrollStartTime;

    const scrollTick = () => {
      if (!running) return;

      const now = performance.now();
      const elapsed = now - scrollStartTime;

      if (elapsed >= SCROLL_DURATION_MS) {
        running = false;

        viewport.removeEventListener("scroll", onScrollForCostProbe);
        if (costProbeFrameId !== null) {
          cancelAnimationFrame(costProbeFrameId);
        }

        const driverRate = round(scrollDriverTicks / (elapsed / 1000), 0);

        root.unmount();
        container.innerHTML = "";

        resolve({
          frameTimes,
          frameWorkTimes,
          totalFrames: frameTimes.length,
          scrollDriverRate: driverRate,
        });
        return;
      }

      const dt = now - lastScrollTime;
      lastScrollTime = now;
      scrollDriverTicks++;

      const pxDelta = (SCROLL_SPEED_PX_PER_SEC * dt) / 1000;
      scrollPos += pxDelta * scrollDirection;

      if (scrollPos >= maxScroll) {
        scrollPos = maxScroll;
        scrollDirection = -1;
      } else if (scrollPos <= 0) {
        scrollPos = 0;
        scrollDirection = 1;
      }

      viewport.scrollTop = scrollPos;

      setTimeout(scrollTick, 0);
    };

    requestAnimationFrame(paintTick);
    setTimeout(scrollTick, 0);
  });
};

// =============================================================================
// Pre-flight helpers
// =============================================================================

const wakeUpDisplay = (container, durationMs) => {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.style.cssText =
      "width:100%;height:100%;position:absolute;top:0;left:0;" +
      "background:transparent;will-change:transform;";
    container.appendChild(el);

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
      // animate() not supported
    }

    const startTime = performance.now();
    let toggle = false;

    const tick = () => {
      if (performance.now() - startTime >= durationMs) {
        el.remove();
        resolve();
        return;
      }

      toggle = !toggle;
      el.style.transform = toggle ? "translateY(1px)" : "translateY(0px)";

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

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
  id: "scroll-react",
  name: "Scroll FPS (React)",
  description: `Sustained programmatic scrolling for ${SCROLL_DURATION_MS / 1000}s — measures rendering throughput`,
  icon: "📜",

  run: async ({ itemCount, container, onStatus }) => {
    const items = generateItems(itemCount);

    const refreshDriver = createRefreshRateDriver();

    onStatus("Waking up display...");
    await wakeUpDisplay(container, WAKEUP_DURATION_MS);

    onStatus("Checking rAF rate...");
    const rawRate = await measureRawRAFRate(PREFLIGHT_DURATION_MS);

    const isThrottled = rawRate < THROTTLE_WARNING_FPS;

    onStatus("Warming up...");
    {
      const warmupItems = generateItems(Math.min(itemCount, 10_000));
      container.innerHTML = "";
      const warmupRoot = createRoot(container);
      warmupRoot.render(<BenchmarkList items={warmupItems} />);
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

      warmupRoot.unmount();
      container.innerHTML = "";
      await tryGC();
    }

    onStatus(`Scrolling for ${SCROLL_DURATION_MS / 1000}s...`);
    const { frameTimes, frameWorkTimes, totalFrames, scrollDriverRate } =
      await measureScrollFPS(container, items);

    refreshDriver.stop();

    await tryGC();

    const sortedTimes = [...frameTimes].sort((a, b) => a - b);

    const actualDurationSec = frameTimes.reduce((s, t) => s + t, 0) / 1000;
    const avgFps = round(
      totalFrames / (actualDurationSec || SCROLL_DURATION_MS / 1000),
      1,
    );

    const medianFrameTime =
      sortedTimes[Math.floor(sortedTimes.length / 2)] || 16.67;
    const droppedThreshold = medianFrameTime * 1.5;
    const droppedFrames = frameTimes.filter(
      (dt) => dt > droppedThreshold,
    ).length;
    const droppedPct = round((droppedFrames / totalFrames) * 100, 1);

    const sortedWork = [...frameWorkTimes].sort((a, b) => a - b);
    const avgWorkMs =
      sortedWork.length > 0
        ? round(sortedWork.reduce((s, t) => s + t, 0) / sortedWork.length, 2)
        : 0;
    const p95WorkMs =
      sortedWork.length > 0 ? round(percentile(sortedWork, 95), 2) : 0;

    const estimatedMaxFps =
      p95WorkMs > 0.05 ? round(Math.min(1000 / p95WorkMs, 10_000), 0) : 10_000;

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
        rating: rateLower(avgWorkMs, 5, 12),
      },
      {
        label: "Budget p95",
        value: p95WorkMs,
        unit: "ms",
        better: "lower",
        rating: rateLower(p95WorkMs, 10, 20),
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
