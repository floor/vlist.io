// benchmarks/memory/constants.js — Shared Constants for Memory Benchmarks
//
// Constants used across all memory benchmark variants (JavaScript, React, Vue, Svelte).
// Ensures consistent methodology across all framework adapters.

/**
 * Height of each item in pixels.
 * Fixed height for consistent, fair comparison across frameworks.
 */
export const ITEM_HEIGHT = 48;

/**
 * Duration to scroll before measuring final memory state.
 * Long enough to trigger any potential memory leaks (10 seconds).
 */
export const SCROLL_DURATION_MS = 10_000;

/**
 * Scroll speed in pixels per frame.
 * Constant rate ensures reproducible results.
 */
export const SCROLL_SPEED_PX_PER_FRAME = 100;

/**
 * Number of frames to wait after scrolling completes.
 * Allows memory to settle before final measurement.
 */
export const SETTLE_FRAMES = 20;
