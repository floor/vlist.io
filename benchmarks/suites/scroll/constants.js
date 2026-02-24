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
 * Available scroll speed presets for benchmarking at different intensities.
 *
 * - 1× (7200 px/s): Normal browsing pace — ~2.5 items/frame at 60fps.
 *   This is the default and matches real-world casual scrolling.
 *
 * - 2× (14400 px/s): Fast flick scroll — ~5 items/frame at 60fps.
 *   Simulates aggressive touch scrolling or fast mouse wheel.
 *
 * - 10× (72000 px/s): Stress test — ~25 items/frame at 60fps.
 *   Pushes the virtual list to its limits with extreme DOM churn.
 *
 * Each speed causes progressively more item recycling per frame,
 * exposing performance cliffs that are invisible at normal speed.
 */
export const SCROLL_SPEEDS = [
  { id: "normal", label: "1×", pxPerSec: 7200 },
  { id: "fast", label: "2×", pxPerSec: 14400 },
  { id: "extreme", label: "10×", pxPerSec: 72000 },
];

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
