#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import config from "./config.json" with { type: "json" };

const root = resolve(import.meta.dirname, "../..");
const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
  if (match) args.set(match[1], match[2] ?? "true");
}

const currentPath = resolve(root, args.get("current") ?? "benchmarks/results/latest.json");
const baselinePath = args.get("baseline")
  ? resolve(root, args.get("baseline"))
  : null;
const outputPath = resolve(root, args.get("output") ?? "benchmarks/results/comparison.md");

const readJSON = async (path) => JSON.parse(await readFile(path, "utf-8"));
const metricKey = (result, metric) => `${result.suiteId}:${result.itemCount}:${metric.label}`;

const current = await readJSON(currentPath);
const baseline = baselinePath ? await readJSON(baselinePath) : null;

const baselineMetrics = new Map();
if (baseline) {
  for (const result of baseline.results ?? []) {
    for (const metric of result.metrics ?? []) {
      baselineMetrics.set(metricKey(result, metric), metric);
    }
  }
}

const rows = [];
const regressions = [];

for (const result of current.results ?? []) {
  if (!result.success) {
    rows.push([result.suiteId, result.itemCount, "Error", result.error ?? "failed", "", ""]);
    regressions.push(`${result.suiteId}/${result.itemCount} failed: ${result.error ?? "unknown error"}`);
    continue;
  }

  for (const metric of result.metrics ?? []) {
    const previous = baselineMetrics.get(metricKey(result, metric));
    const budget = config.budgets?.[result.suiteId]?.[metric.label];
    let change = "";
    let status = "";

    if (previous && Number.isFinite(previous.value) && previous.value !== 0) {
      const delta = metric.value - previous.value;
      const pct = (delta / previous.value) * 100;
      change = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

      if (budget?.maxRegressionPct !== undefined) {
        const regressionPct = metric.better === "higher" ? -pct : pct;
        if (regressionPct > budget.maxRegressionPct) {
          status = "regression";
          regressions.push(`${result.suiteId}/${metric.label}: ${change}`);
        }
      }

      if (budget?.maxRegressionAbs !== undefined) {
        const regressionAbs = metric.better === "higher" ? -delta : delta;
        if (regressionAbs > budget.maxRegressionAbs) {
          status = "regression";
          regressions.push(`${result.suiteId}/${metric.label}: ${delta.toFixed(2)} ${metric.unit}`);
        }
      }
    }

    rows.push([
      result.suiteId,
      result.itemCount,
      metric.label,
      `${metric.value} ${metric.unit ?? ""}`,
      change,
      status || metric.rating || "",
    ]);
  }
}

const lines = [
  "# vlist Performance Comparison",
  "",
  `Current: ${current.generatedAt ?? currentPath}`,
  baseline ? `Baseline: ${baseline.generatedAt ?? baselinePath}` : "Baseline: not provided",
  "",
  "| Suite | Items | Metric | Current | Change | Status |",
  "| --- | ---: | --- | ---: | ---: | --- |",
  ...rows.map((row) => `| ${row.join(" | ")} |`),
  "",
];

if (regressions.length) {
  lines.push("## Potential Regressions", "");
  for (const item of regressions) lines.push(`- ${item}`);
  lines.push("");
} else {
  lines.push("No budget regressions detected.", "");
}

await writeFile(outputPath, lines.join("\n"));
console.log(`Wrote ${outputPath}`);
