// engine/constants.js — Single source of truth for all benchmark constants
//
// Both suites (vlist across frameworks) and comparisons (vlist vs competitors)
// import from here so they always use the exact same methodology.

// =============================================================================
// Shared
// =============================================================================

/** Height of each item in pixels. Fixed for consistent, fair comparison. */
export const ITEM_HEIGHT = 48;

// =============================================================================
// Render
// =============================================================================

/** Warmup iterations before measurement. Warms JIT compiler. */
export const RENDER_WARMUP_ITERATIONS = 2;

/** Measured iterations. Median is reported to eliminate outliers. */
export const RENDER_MEASURE_ITERATIONS = 7;

// =============================================================================
// Scroll
// =============================================================================

/** Base scroll speed in px/s. 1× = ~2.5 items/frame at 60fps (48px items). */
export const BASE_SCROLL_SPEED = 7200;

/** Default scroll duration per speed in ms. */
export const SCROLL_DURATION_MS = 5000;

/**
 * Scroll speed presets for suite benchmarks (user-selectable).
 *
 * - 1× (7200 px/s): Normal browsing — ~2.5 items/frame at 60fps.
 * - 2× (14400 px/s): Fast flick — ~5 items/frame at 60fps.
 * - 10× (72000 px/s): Stress test — ~25 items/frame at 60fps.
 */
export const SUITE_SCROLL_SPEEDS = [
  { id: "normal", label: "1×", pxPerSec: 7200 },
  { id: "fast", label: "2×", pxPerSec: 14400 },
  { id: "extreme", label: "10×", pxPerSec: 72000 },
];

/**
 * Scroll speed presets for comparison benchmarks (all run automatically).
 *
 * Each library is tested at all 7 speeds. Progressive speeds build a
 * complete scroll performance profile, exposing performance cliffs
 * invisible at any single speed.
 *
 * - 0.1× (720 px/s):   Barely moving — pure baseline overhead
 * - 0.25× (1800 px/s):  Gentle browsing — minimal recycling
 * - 0.5× (3600 px/s):   Casual scrolling
 * - 1× (7200 px/s):     Normal scroll speed
 * - 2× (14400 px/s):    Fast flick — aggressive touch/wheel
 * - 3× (21600 px/s):    Aggressive scroll
 * - 5× (36000 px/s):    Stress test — heavy DOM churn
 */
const scrollSpeed = (id, multiplier) => {
  const pxPerSec = BASE_SCROLL_SPEED * multiplier;
  return {
    id,
    label: `${pxPerSec.toLocaleString()} px/s`,
    pxPerSec,
  };
};

export const COMPARISON_SCROLL_SPEEDS = [
  scrollSpeed("crawl", 0.1),
  scrollSpeed("gentle", 0.25),
  scrollSpeed("slow", 0.5),
  scrollSpeed("normal", 1),
  scrollSpeed("fast", 2),
  scrollSpeed("aggressive", 3),
  scrollSpeed("extreme", 5),
];

/** Duration per speed in comparison benchmarks (shorter since there are 7 speeds). */
export const COMPARISON_SCROLL_DURATION_MS = 2000;

/** Preflight duration to measure rAF delivery rate before benchmark. */
export const PREFLIGHT_DURATION_MS = 1000;

/** Warmup duration to engage compositor before measuring. */
export const WAKEUP_DURATION_MS = 500;

/** FPS threshold below which we warn about rAF throttling. */
export const THROTTLE_WARNING_FPS = 50;

/** Default overscan for vlist in comparisons (explicit for fairness). */
export const VLIST_OVERSCAN = 5;

// =============================================================================
// Memory
// =============================================================================

/** Duration to scroll during memory leak detection (10 seconds). */
export const MEMORY_SCROLL_DURATION_MS = 10_000;

/** Scroll speed in px per rAF frame during memory tests. */
export const MEMORY_SCROLL_SPEED_PX_PER_FRAME = 100;

/** Frames to wait for memory/GC to settle. */
export const MEMORY_SETTLE_FRAMES = 20;

/** Max memory measurement attempts (median of valid readings). */
export const MEMORY_ATTEMPTS = 10;

// =============================================================================
// ScrollTo
// =============================================================================

/** Warmup jumps before measurement. */
export const SCROLLTO_WARMUP_JUMPS = 2;

/** Measured jumps. Median is reported. */
export const SCROLLTO_MEASURE_JUMPS = 7;

/** Max time to wait for scroll to settle at target position. */
export const SCROLLTO_SETTLE_TIMEOUT_MS = 5_000;

/** Consecutive stable frames to consider scroll settled. */
export const SCROLLTO_SETTLE_FRAMES = 5;
