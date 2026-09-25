// Shared native/synthetic scroll measurement.
// Both entries are driven by the same position write, then the rows are checked.

import {
  generateItems,
  benchmarkTemplate,
  waitFrames,
  round,
} from "../runner.js";
import { ITEM_HEIGHT, SCROLL_DURATION_MS, BASE_SCROLL_SPEED } from "./constants.js";
import { findViewport } from "./viewport.js";
import {
  createRefreshRateDriver,
  measureScrollRun,
  computeScrollStats,
  readScreenOrigin,
} from "./scroll.js";

export async function runLogicalScroll({
  container,
  itemCount,
  onStatus,
  scrollSpeed = BASE_SCROLL_SPEED,
  mode,
  createList,
  settleFrames = 10,
}) {
  const driver = createRefreshRateDriver();
  let created;
  try {
    container.innerHTML = "";
    created = await createList(container, generateItems(itemCount));
    const viewport = findViewport(container);
    const content = container.querySelector(".vlist-content");
    if (!viewport || !content) throw new Error("Logical scroll benchmark found no list");
    const source = {
      max: itemCount * ITEM_HEIGHT - viewport.clientHeight,
      set: created.set,
      get: created.get,
    };
    await waitFrames(settleFrames);
    onStatus("Warming up...");
    await measureScrollRun({ viewport, durationMs: 500, speedPxPerSec: scrollSpeed, logicalScroll: source });
    source.set(0);
    await waitFrames(5);
    const originAtRest = readScreenOrigin(content, ITEM_HEIGHT);
    source.rendered = () => originAtRest - readScreenOrigin(content, ITEM_HEIGHT);
    onStatus("Scrolling...");
    const result = await measureScrollRun({
      viewport,
      durationMs: SCROLL_DURATION_MS,
      speedPxPerSec: scrollSpeed,
      logicalScroll: source,
    });
    if (!(result.distance > 0) || !result.inputWorkTimes.length) throw new Error("Logical scroll driver did not move the list");
    if (!(result.renderedDistance > 0)) throw new Error("Rendered position did not move");
    if (result.logicalFrameMoves > 10 && result.renderedMovingFrames < result.logicalFrameMoves * 0.95) {
      throw new Error(`Rendered position missed logical movement: ${result.renderedMovingFrames} of ${result.logicalFrameMoves} frames`);
    }
    if (mode === "synthetic" && (viewport.scrollTop !== 0 || content.scrollTop !== 0)) {
      throw new Error("Synthetic benchmark moved a native main-axis scroll offset");
    }
    const { avgFps, droppedPct } = computeScrollStats(result, SCROLL_DURATION_MS);
    const samples = [...result.inputWorkTimes].sort((a, b) => a - b);
    const total = samples.reduce((sum, value) => sum + value, 0);
    return [
      { label: "Avg FPS", value: avgFps, unit: "fps", better: "higher" },
      { label: "Dropped", value: droppedPct, unit: "%", better: "lower" },
      { label: "Frame p95", value: result.p95FrameTime, unit: "ms", better: "lower" },
      { label: "Input JS mean", value: round(total / samples.length, 4), unit: "ms", better: "lower" },
      { label: "Input JS p95", value: round(samples[Math.floor((samples.length - 1) * 0.95)], 4), unit: "ms", better: "lower" },
      { label: "Input JS total", value: round(total, 2), unit: "ms", better: "lower" },
      { label: "Driver ticks", value: samples.length, unit: "", better: "higher" },
      { label: "Distance", value: round(result.distance, 1), unit: "px", better: "higher" },
      { label: "Rendered distance", value: result.renderedDistance, unit: "px", better: "higher" },
      { label: "Position lag", value: result.positionLagP95, unit: "px", better: "lower" },
    ];
  } finally {
    created?.destroy?.();
    driver.stop();
    container.innerHTML = "";
  }
}

export function scrollCapturePlugin(assign) {
  return {
    name: "benchmark-logical-input",
    setup(ctx) {
      assign((position) => ctx.scroll.to(position));
    },
  };
}
