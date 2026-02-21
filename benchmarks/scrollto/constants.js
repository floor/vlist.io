// benchmarks/scrollto/constants.js — Shared Constants for ScrollTo Benchmarks
//
// Constants used across all scrollTo benchmark variants (JavaScript, React, Vue, Svelte).
// Ensures consistent methodology across all framework adapters.

/**
 * Height of each item in pixels.
 * Fixed height for consistent, fair comparison across frameworks.
 */
export const ITEM_HEIGHT = 48;

/**
 * Number of warmup jumps before measurement.
 * Warms up animation engine and stabilizes performance.
 */
export const WARMUP_JUMPS = 2;

/**
 * Number of scrollToIndex jumps to measure for final results.
 * Median value is reported to eliminate outliers.
 */
export const MEASURE_JUMPS = 7;

/**
 * Maximum time to wait for scroll to settle at target position.
 * Prevents infinite waiting if animation fails.
 */
export const SETTLE_TIMEOUT_MS = 5_000;

/**
 * Number of consecutive frames with stable scrollTop to consider scroll settled.
 * Ensures animation is truly complete, not just paused.
 */
export const SETTLE_FRAMES = 5;
