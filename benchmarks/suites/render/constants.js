// benchmarks/render/constants.js — Shared Constants for Render Benchmarks
//
// Constants used across all render benchmark variants (JavaScript, React, Vue, Svelte).
// Ensures consistent methodology across all framework adapters.

/**
 * Height of each item in pixels.
 * Fixed height for consistent, fair comparison across frameworks.
 */
export const ITEM_HEIGHT = 48;

/**
 * Number of warmup iterations before measurement.
 * Warms up JIT compiler and stabilizes performance.
 */
export const WARMUP_ITERATIONS = 2;

/**
 * Number of iterations to measure for final results.
 * Median value is reported to eliminate outliers.
 */
export const MEASURE_ITERATIONS = 7;
