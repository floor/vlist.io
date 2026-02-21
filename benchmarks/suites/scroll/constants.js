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
 * Constant rate ensures reproducible results (~120px/frame at 60fps).
 */
export const SCROLL_SPEED_PX_PER_SEC = 7200;

/**
 * Preflight duration to check rAF rate before benchmark.
 * Used to detect display throttling.
 */
export const PREFLIGHT_DURATION_MS = 1000;

/**
 * Warmup duration to engage compositor before measuring.
 * Ensures full refresh rate is active.
 */
export const WAKEUP_DURATION_MS = 500;

/**
 * FPS threshold below which we warn about rAF throttling.
 * Indicates display may be in power-saving mode.
 */
export const THROTTLE_WARNING_FPS = 50;
