// benchmarks/scroll/constants.js — Shared Constants for Scroll Benchmarks
//
// Constants used across all scroll benchmark variants (JavaScript, React, Vue, Svelte).
// Ensures consistent methodology across all framework adapters.

/**
 * Height of each item in pixels.
 * Fixed height for consistent, fair comparison across frameworks.
 */
export const ITEM_HEIGHT = 48;

/**
 * Duration of scroll test in milliseconds.
 * Long enough to measure sustained performance.
 */
export const SCROLL_DURATION_MS = 5000;

/**
 * Scroll speed in pixels per second.
 * Constant rate ensures reproducible results.
 */
export const SCROLL_SPEED_PX_PER_SEC = 10000;

/**
 * Target frame time in milliseconds (60 FPS).
 * Used to calculate dropped frames.
 */
export const TARGET_FRAME_TIME = 1000 / 60;

/**
 * Overscan count for virtual rendering.
 * Number of items to render beyond visible viewport.
 */
export const OVERSCAN = 5;
