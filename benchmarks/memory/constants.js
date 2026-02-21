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
 * Long enough to trigger any potential memory leaks.
 */
export const SCROLL_DURATION_MS = 10000;

/**
 * Scroll speed in pixels per second.
 * Constant rate ensures reproducible results.
 */
export const SCROLL_SPEED_PX_PER_SEC = 10000;

/**
 * Number of frames to wait for GC to stabilize.
 * Ensures memory measurements are accurate.
 */
export const GC_WAIT_FRAMES = 5;

/**
 * Overscan count for virtual rendering.
 * Number of items to render beyond visible viewport.
 */
export const OVERSCAN = 5;
