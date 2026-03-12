// benchmarks/history-utils.js — Pure utility functions for the history page.
//
// Extracted from history.js so they can be independently tested.
// All functions here are side-effect-free and DOM-independent.

// =============================================================================
// Display Names
// =============================================================================

/** Friendly display names for comparison suite IDs */
export const SUITE_DISPLAY_NAMES = {
  "react-window": "react-window",
  "react-virtuoso": "react-virtuoso",
  "tanstack-virtual": "TanStack Virtual",
  virtua: "Virtua",
  "vue-virtual-scroller": "vue-virtual-scroller",
  solidjs: "SolidJS",
  "legend-list": "Legend List",
  clusterize: "Clusterize.js",
};

// =============================================================================
// Rating & Meta Derivation
// =============================================================================

/**
 * Derive a color rating from the metric label, better direction, and value.
 * Returns "good" | "ok" | "bad" | "info" | null.
 */
export function deriveRating(label, better, value) {
  const lbl = label.toLowerCase();

  // Difference rows — color by whether vlist wins
  if (lbl.includes("difference")) {
    if (better === "lower")
      return value < 0 ? "good" : value === 0 ? "ok" : "bad";
    if (better === "higher")
      return value > 0 ? "good" : value === 0 ? "ok" : "bad";
    return null;
  }

  // Render time
  if (lbl.includes("render time"))
    return value < 30 ? "good" : value < 50 ? "ok" : "bad";
  // Memory
  if (lbl.includes("memory"))
    return value < 5 ? "good" : value < 30 ? "ok" : "bad";
  // FPS
  if (lbl.includes("fps"))
    return value >= 55 ? "good" : value >= 50 ? "ok" : "bad";
  // P95 frame time
  if (lbl.includes("p95") || lbl.includes("frame time"))
    return value < 20 ? "good" : value < 30 ? "ok" : "bad";
  // Execution order / info
  if (lbl === "execution order") return "info";

  return null;
}

/**
 * Derive a contextual meta note for difference rows.
 * Returns a string like "vlist is faster" or null.
 */
export function deriveMeta(label, better, value, suiteId) {
  const lbl = label.toLowerCase();
  const name = SUITE_DISPLAY_NAMES[suiteId] || suiteId;

  if (lbl.includes("render time difference")) {
    if (value === 0) return null;
    return value < 0 ? "vlist is faster" : `${name} is faster`;
  }
  if (lbl.includes("memory difference")) {
    if (value === 0) return null;
    return value < 0 ? "vlist uses less" : `${name} uses less`;
  }
  if (lbl.includes("fps difference")) {
    if (value === 0) return null;
    return value > 0 ? "vlist is smoother" : `${name} is smoother`;
  }
  return null;
}

// =============================================================================
// Confidence
// =============================================================================

/**
 * Return a confidence label and CSS class based on sample count.
 * @returns {{ text: string, cls: string }}
 */
export function confidenceLabel(sampleCount) {
  if (sampleCount >= 20) return { text: "High confidence", cls: "good" };
  if (sampleCount >= 5) return { text: "Moderate confidence", cls: "ok" };
  return { text: "Low confidence", cls: "low" };
}

// =============================================================================
// Value Formatting
// =============================================================================

/**
 * Format a metric value with appropriate precision for its unit.
 * @param {number|null} value
 * @param {string} unit
 * @returns {string}
 */
export function formatMetricValue(value, unit) {
  if (value == null) return "—";
  // Percentages
  if (unit === "%")
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  // Memory (MB) — 2 decimal places
  if (unit === "MB")
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  // Time (ms) — 1 decimal place
  if (unit === "ms")
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  // FPS — 1 decimal place
  if (unit === "fps")
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  // Default
  return value.toLocaleString();
}

// =============================================================================
// Chart Helpers
// =============================================================================

/** Round a number to the given decimal places */
export function round(v, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

/**
 * Generate nice tick values for a numeric axis.
 * @param {number} min
 * @param {number} max
 * @param {number} targetTicks
 * @returns {number[]}
 */
export function niceScale(min, max, targetTicks) {
  const range = max - min;
  if (range <= 0) return [min];

  const roughStep = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceStep;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  const ticks = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.01; v += niceStep) {
    ticks.push(round(v, 4));
  }
  return ticks;
}

/**
 * Generate evenly-spaced date ticks between two timestamps.
 * @param {number} minMs
 * @param {number} maxMs
 * @param {number} count
 * @returns {number[]}
 */
export function niceDateTicks(minMs, maxMs, count) {
  const range = maxMs - minMs;
  if (range <= 0) return [minMs];

  const step = range / (count - 1);
  const ticks = [];
  for (let i = 0; i < count; i++) {
    ticks.push(Math.round(minMs + step * i));
  }
  return ticks;
}

/**
 * Format a tick value — remove trailing zeros, use "k" suffix for thousands.
 * @param {number} v
 * @returns {string}
 */
export function formatTickValue(v) {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, "");
}
