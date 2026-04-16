// engine/scrollto.js — Unified scrollToIndex Measurement
//
// Provides the core scrollToIndex measurement used by both suites and comparisons.
// Ensures identical methodology everywhere.

import {
  nextFrame,
  waitFrames,
  tryGC,
  round,
  median,
  percentile,
} from "../runner.js";

import {
  SCROLLTO_WARMUP_JUMPS,
  SCROLLTO_MEASURE_JUMPS,
  SCROLLTO_SETTLE_TIMEOUT_MS,
  SCROLLTO_SETTLE_FRAMES,
} from "./constants.js";

// =============================================================================
// Settle Detection
// =============================================================================

/**
 * Wait for scrollTop to stabilize after a scrollToIndex call.
 * "Stabilized" = scrollTop hasn't changed for `settleFrames` consecutive rAF frames.
 *
 * @param {Element} viewport - The scrollable element
 * @param {number} [timeoutMs=SCROLLTO_SETTLE_TIMEOUT_MS] - Max time to wait
 * @param {number} [settleFrames=SCROLLTO_SETTLE_FRAMES] - Consecutive stable frames needed
 * @returns {Promise<number>} time in ms from call to settled
 */
export const waitForScrollSettle = (
  viewport,
  timeoutMs = SCROLLTO_SETTLE_TIMEOUT_MS,
  settleFrames = SCROLLTO_SETTLE_FRAMES,
) => {
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

      if (stableFrames >= settleFrames) {
        resolve(performance.now() - start);
        return;
      }

      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
};

// =============================================================================
// Target Generation
// =============================================================================

/**
 * Generate deterministic but spread-out target indices for scrollToIndex.
 * Ensures we test jumps across different parts of the list.
 * Alternates between first half and second half for varied jump distances.
 *
 * @param {number} totalItems - Total number of items in the list
 * @param {number} count - Number of targets to generate
 * @returns {number[]}
 */
export const generateTargets = (totalItems, count) => {
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
// Core Measurement
// =============================================================================

/**
 * Measure scrollToIndex performance with warmup and multiple measured jumps.
 *
 * Architecture:
 *   1. Warmup phase — JIT optimize scrollToIndex code path
 *   2. Reset to top — stable starting position
 *   3. Measure phase — timed jumps to spread-out indices, settle detection
 *
 * Returns raw times and computed stats so callers can format as they wish.
 *
 * @param {Object} opts
 * @param {Element} opts.viewport - The scrollable element
 * @param {(index: number, align: string) => void} opts.scrollToFn - scrollToIndex function
 * @param {number} opts.itemCount - Total items in the list
 * @param {number} [opts.warmupJumps=SCROLLTO_WARMUP_JUMPS] - Number of warmup jumps
 * @param {number} [opts.measureJumps=SCROLLTO_MEASURE_JUMPS] - Number of measured jumps
 * @param {number} [opts.settleTimeoutMs=SCROLLTO_SETTLE_TIMEOUT_MS] - Max settle wait
 * @param {number} [opts.settleFrames=SCROLLTO_SETTLE_FRAMES] - Frames to consider settled
 * @param {(msg: string) => void} [opts.onStatus] - Status callback
 * @returns {Promise<ScrollToResult>}
 */

/**
 * @typedef {Object} ScrollToResult
 * @property {number[]} times - Raw settle times for each measured jump (ms)
 * @property {number} median - Median settle time (ms)
 * @property {number} min - Minimum settle time (ms)
 * @property {number} max - Maximum settle time (ms)
 * @property {number} p95 - 95th percentile settle time (ms)
 */

export const measureScrollToPerformance = async ({
  viewport,
  scrollToFn,
  itemCount,
  warmupJumps = SCROLLTO_WARMUP_JUMPS,
  measureJumps = SCROLLTO_MEASURE_JUMPS,
  settleTimeoutMs = SCROLLTO_SETTLE_TIMEOUT_MS,
  settleFrames = SCROLLTO_SETTLE_FRAMES,
  onStatus,
}) => {
  // ── Warmup ─────────────────────────────────────────────────────────────
  if (onStatus) onStatus("Warming up...");
  const warmupTargets = generateTargets(itemCount, warmupJumps);

  for (const target of warmupTargets) {
    scrollToFn(target, "center");
    await waitForScrollSettle(viewport, settleTimeoutMs, settleFrames);
    await waitFrames(5);
  }

  // Reset to top before measuring
  scrollToFn(0, "start");
  await waitForScrollSettle(viewport, settleTimeoutMs, settleFrames);
  await tryGC();
  await waitFrames(10);

  // ── Measure ────────────────────────────────────────────────────────────
  const targets = generateTargets(itemCount, measureJumps);
  const times = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    if (onStatus) {
      onStatus(
        `Jump ${i + 1}/${targets.length} → index ${target.toLocaleString()}`,
      );
    }

    // Ensure we start from a stable position
    await waitFrames(3);

    const start = performance.now();
    scrollToFn(target, "center");
    const settleTime = await waitForScrollSettle(
      viewport,
      settleTimeoutMs,
      settleFrames,
    );
    times.push(settleTime);

    // Small pause between jumps
    await waitFrames(5);
  }

  // ── Compute stats ──────────────────────────────────────────────────────
  const sorted = [...times].sort((a, b) => a - b);

  return {
    times,
    median: round(median(times), 1),
    min: round(sorted[0], 1),
    max: round(sorted[sorted.length - 1], 1),
    p95: round(percentile(sorted, 95), 1),
  };
};
