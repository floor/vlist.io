import { round, rateLower } from "../../runner.js";

export function formatMemoryMetrics(result, limits) {
  if (!result.available) {
    return [{
      label: "Status",
      value: 0,
      unit: "",
      better: "lower",
      rating: "ok",
      _note: "performance.memory unavailable — use Chrome with --enable-precise-memory-info",
    }];
  }
  const { renderDeltaMB, scrollDeltaMB, afterRenderMB, totalDeltaMB } = result;
  return [
    { label: "After render", value: round(renderDeltaMB, 2), unit: "MB", better: "lower", rating: rateLower(renderDeltaMB, limits.renderGood, limits.renderOk) },
    { label: "Scroll delta", value: round(scrollDeltaMB, 2), unit: "MB", better: "lower", rating: rateLower(Math.abs(scrollDeltaMB), limits.scrollLeakGood, limits.scrollLeakOk) },
    { label: "Total heap", value: round(afterRenderMB, 1), unit: "MB", better: "lower" },
    { label: "Total delta", value: round(totalDeltaMB, 2), unit: "MB", better: "lower" },
  ];
}
