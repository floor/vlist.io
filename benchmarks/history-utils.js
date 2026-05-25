// benchmarks/history-utils.js — Pure utility functions for history pages.
//
// Side-effect-free and DOM-independent.

// =============================================================================
// Confidence
// =============================================================================

export function confidenceLabel(sampleCount) {
  if (sampleCount >= 20) return { text: "High confidence", cls: "good" };
  if (sampleCount >= 5) return { text: "Moderate confidence", cls: "ok" };
  return { text: "Low confidence", cls: "low" };
}

// =============================================================================
// Value Formatting
// =============================================================================

export function formatMetricValue(value, unit) {
  if (value == null) return "—";
  if (unit === "%")
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (unit === "MB")
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (unit === "ms")
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  if (unit === "fps")
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  return value.toLocaleString();
}

// =============================================================================
// Chart Helpers
// =============================================================================

export function round(v, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

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

export function formatTickValue(v) {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, "");
}
