/**
 * memory-bench — Run memory benchmarks via Puppeteer (fresh V8 per run).
 *
 * Each run launches a new browser, eliminating V8 code cache interference.
 *
 * Usage:
 *   bun scripts/debug/tests/memory-bench.mjs                     # v2 vanilla, 10K
 *   bun scripts/debug/tests/memory-bench.mjs --variant=react      # v2 react
 *   bun scripts/debug/tests/memory-bench.mjs --items=100000       # 100K items
 *   bun scripts/debug/tests/memory-bench.mjs --runs=3             # 3 runs, show median
 *   bun scripts/debug/tests/memory-bench.mjs --compare            # v1 vs v2
 *   bun scripts/debug/tests/memory-bench.mjs --base=http://...    # custom URL
 */

import { findChrome, parseArgs, delay } from "../core.mjs";
import puppeteer from "puppeteer-core";

const VARIANTS = ["vanilla", "react", "vue", "svelte", "solidjs"];
const ITEM_BUTTONS = { 10000: "10K", 100000: "100K", 1000000: "1M" };
const BENCHMARK_TIMEOUT = 60_000;

const V2_BASE = "http://localhost:3338";
const V1_BASE = "http://localhost:3340";

// =============================================================================
// Single benchmark run
// =============================================================================

async function runMemoryBenchmark(opts = {}) {
  const {
    base = V2_BASE,
    variant = "vanilla",
    items = 10_000,
    headless = true,
  } = opts;

  const variantPath = variant === "vanilla" ? "" : `/${variant}`;
  const url = `${base}/benchmarks/memory${variantPath}`;

  const browser = await puppeteer.launch({
    headless,
    executablePath: findChrome(),
    args: ["--enable-precise-memory-info"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15_000 });

    // Select item count if not default 10K
    if (items !== 10_000) {
      const label = ITEM_BUTTONS[items];
      if (!label) throw new Error(`Unsupported item count: ${items}`);
      await page.evaluate((lbl) => {
        const btns = document.querySelectorAll(".ui-segmented__btn");
        for (const btn of btns) {
          if (btn.textContent.trim() === lbl) { btn.click(); return; }
        }
      }, label);
      await delay(200);
    }

    // Click Run
    await page.click("#bench-run");

    // Wait for "Final results" status text
    await page.waitForFunction(
      () => {
        const status = document.querySelector(".bench-suite__status");
        return status && status.textContent.includes("Final results");
      },
      { timeout: BENCHMARK_TIMEOUT },
    );

    // Extract metrics
    const metrics = await page.evaluate(() => {
      const result = {};
      const rows = document.querySelectorAll(".bench-metric");
      for (const row of rows) {
        const label = row.querySelector(".bench-metric__label")?.textContent?.trim();
        const valueEl = row.querySelector(".bench-metric__value");
        if (!label || !valueEl) continue;
        const text = valueEl.textContent.replace(/[^\d.\-]/g, "").trim();
        result[label] = parseFloat(text);
      }
      return result;
    });

    return metrics;
  } finally {
    await browser.close();
  }
}

// =============================================================================
// Multi-run with median
// =============================================================================

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runMultiple(opts, runs) {
  const allResults = [];

  for (let i = 0; i < runs; i++) {
    if (runs > 1) process.stdout.write(`  run ${i + 1}/${runs}...`);
    const metrics = await runMemoryBenchmark(opts);
    allResults.push(metrics);
    if (runs > 1) {
      const ar = metrics["After render"];
      const sd = metrics["Scroll delta"];
      console.log(` render=${ar} MB  scroll=${sd} MB`);
    }
  }

  if (runs === 1) return allResults[0];

  // Compute median of each metric
  const keys = Object.keys(allResults[0]);
  const medians = {};
  for (const key of keys) {
    medians[key] = median(allResults.map((r) => r[key]).filter((v) => !isNaN(v)));
  }
  return medians;
}

// =============================================================================
// Output
// =============================================================================

function printResults(label, metrics) {
  console.log(`\n  ${label}`);
  console.log("  " + "─".repeat(40));
  for (const [key, value] of Object.entries(metrics)) {
    const unit = key === "Total heap" ? "MB" : "MB";
    const padded = key.padEnd(20);
    const val = typeof value === "number" ? value.toFixed(2) : String(value);
    console.log(`  ${padded} ${val.padStart(8)} ${unit}`);
  }
}

function printComparison(v1, v2) {
  console.log("\n  v1 (1.9.x) vs v2 (2.0.0)");
  console.log("  " + "─".repeat(52));
  console.log(`  ${"Metric".padEnd(20)} ${"v1".padStart(8)}   ${"v2".padStart(8)}   ${"diff".padStart(8)}`);
  console.log("  " + "─".repeat(52));

  const keys = Object.keys(v2);
  for (const key of keys) {
    const a = v1[key];
    const b = v2[key];
    if (a == null || b == null) continue;
    const diff = b - a;
    const sign = diff > 0 ? "+" : "";
    console.log(
      `  ${key.padEnd(20)} ${a.toFixed(2).padStart(8)}   ${b.toFixed(2).padStart(8)}   ${(sign + diff.toFixed(2)).padStart(8)}`,
    );
  }
}

// =============================================================================
// Main
// =============================================================================

const args = parseArgs();
const variant = args.variant || "vanilla";
const items = args.items || 10_000;
const runs = args.runs || 1;
const compare = args.compare || false;
const headless = args.headless !== false;

console.log("═══════════════════════════════════════════════");
console.log("  Memory Benchmark (Puppeteer)");
console.log("═══════════════════════════════════════════════");
console.log(`  variant: ${variant}  items: ${items.toLocaleString()}  runs: ${runs}`);

if (compare) {
  console.log("\n── v1 ──");
  const v1 = await runMultiple({ base: V1_BASE, variant, items, headless }, runs);

  console.log("\n── v2 ──");
  const v2 = await runMultiple({ base: V2_BASE, variant, items, headless }, runs);

  printComparison(v1, v2);
} else {
  const base = args.base || V2_BASE;
  console.log(`  base: ${base}\n`);
  const metrics = await runMultiple({ base, variant, items, headless }, runs);
  printResults(`${variant} — ${items.toLocaleString()} items`, metrics);
}

console.log();
