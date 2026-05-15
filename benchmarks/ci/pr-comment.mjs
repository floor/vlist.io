#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
  if (match) args.set(match[1], match[2] ?? "true");
}

const latestPath = resolve(root, args.get("latest") ?? "benchmarks/results/latest.json");
const summaryPath = resolve(root, args.get("summary") ?? "benchmarks/results/summary.md");
const comparisonPath = resolve(root, args.get("comparison") ?? "benchmarks/results/comparison.md");
const outputPath = resolve(root, args.get("output") ?? "benchmarks/results/pr-comment.md");

const readText = async (path) => (existsSync(path) ? readFile(path, "utf-8") : "");
const readJSON = async (path) =>
  existsSync(path) ? JSON.parse(await readFile(path, "utf-8")) : null;

const stripTitle = (markdown) =>
  markdown
    .split("\n")
    .filter((line, index) => !(index === 0 && line.startsWith("# ")))
    .join("\n")
    .trim();

const latest = await readJSON(latestPath);
const summary = await readText(summaryPath);
const comparison = await readText(comparisonPath);
const metadata = latest?.metadata ?? {};

const hasRegression = /## Potential Regressions/.test(comparison);
const hasFailures = (latest?.results ?? []).some((result) => !result.success);
const status = hasRegression || hasFailures ? "Needs attention" : "No budget regressions";
const statusIcon = hasRegression || hasFailures ? "⚠️" : "✅";

const runUrl =
  process.env.GITHUB_SERVER_URL &&
  process.env.GITHUB_REPOSITORY &&
  process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

const lines = [
  "<!-- vlist-perf-comment -->",
  `## ${statusIcon} vlist performance smoke`,
  "",
  `**Status:** ${status}`,
  latest?.environment?.vlistVersion
    ? `**vlist:** ${latest.environment.vlistVersion}`
    : null,
  latest?.generatedAt ? `**Generated:** ${latest.generatedAt}` : null,
  metadata.vlistRepository || metadata.vlistRef
    ? `**Benchmarked vlist:** ${metadata.vlistRepository ?? "floor/vlist"}@${metadata.vlistRef ?? "unknown"}`
    : null,
  metadata.sourceRepository
    ? `**Source:** ${metadata.sourceRepository}${metadata.sourcePrNumber ? `#${metadata.sourcePrNumber}` : ""}`
    : null,
  runUrl ? `**Workflow:** [View run](${runUrl})` : null,
  "",
  "> CI performance checks are currently non-blocking while benchmark noise is being observed.",
  "",
].filter(Boolean);

if (comparison.trim()) {
  lines.push("<details open>", "<summary>Baseline comparison</summary>", "");
  lines.push(stripTitle(comparison));
  lines.push("", "</details>", "");
} else if (summary.trim()) {
  lines.push("<details open>", "<summary>Benchmark summary</summary>", "");
  lines.push(stripTitle(summary));
  lines.push("", "</details>", "");
} else {
  lines.push("No benchmark summary was produced for this run.", "");
}

lines.push(
  "Artifacts include `latest.json`, `summary.md`, `comparison.md`, and `data/benchmarks.db` when available.",
  "",
);

await writeFile(outputPath, lines.join("\n"));
console.log(`Wrote ${outputPath}`);
