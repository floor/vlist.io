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
 * Number of scroll positions to test.
 * Random positions are selected across the list height.
 */
export const TEST_POSITIONS = 10;

/**
 * Duration to wait for smooth scroll animation to complete.
 * Long enough for the animation to settle at target position.
 */
export const SETTLE_DURATION_MS = 1000;

/**
 * Threshold for considering scroll "settled" (pixels).
 * If scroll position changes less than this, it's considered complete.
 */
export const SETTLE_THRESHOLD_PX = 1;

/**
 * Overscan count for virtual rendering.
 * Number of items to render beyond visible viewport.
 */
export const OVERSCAN = 5;
