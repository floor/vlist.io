/**
 * bench-suite — Run the vlist.io benchmark suite via Puppeteer.
 *
 * Opens each benchmark page, clicks Run, waits for completion,
 * extracts results. Results are auto-stored in SQLite by the page.
 *
 * Usage:
 *   bun scripts/debug/tests/bench-suite.mjs                        # all 4 suites, vanilla
 *   bun scripts/debug/tests/bench-suite.mjs --suite=render         # single suite
 *   bun scripts/debug/tests/bench-suite.mjs --suite=scroll,memory  # multiple suites
 *   bun scripts/debug/tests/bench-suite.mjs --variant=react        # framework variant
 *   bun scripts/debug/tests/bench-suite.mjs --items=100000         # 100K items
 *   bun scripts/debug/tests/bench-suite.mjs --headless=false       # visible browser
 *   bun scripts/debug/tests/bench-suite.mjs --base=http://...      # custom URL
 */

console.warn("\n⚠️  DEPRECATED: bench-suite.mjs is deprecated.");
console.warn("   Use 'bun run bench:ci' (vlist.io) or 'bun run bench' (vlist.v2) instead.");
console.warn("   See: https://github.com/floor/vlist/discussions/81\n");

import { findChrome, parseArgs, delay } from "../core.mjs";
import puppeteer from "puppeteer-core";

const SUITES = ["render", "scroll", "memory", "scrollto"];
const ITEM_COUNTS = { 10000: "10K", 100000: "100K", 1000000: "1M" };
const DEFAULT_BASE = "http://localhost:3338";

const TIMEOUTS = {
  render: 120_000,
  scroll: 180_000,
  memory: 180_000,
  scrollto: 120_000,
};

async function runSuite(opts) {
  const {
    base = DEFAULT_BASE,
    suite,
    variant = "vanilla",
    items = 10_000,
    headless = true,
  } = opts;

  const suiteId = `${suite}-${variant}`;
  const url = `${base}/benchmarks/${suite}?variant=${variant}`;
  const timeout = TIMEOUTS[suite] || 120_000;

  const browser = await puppeteer.launch({
    headless,
    executablePath: findChrome(),
    args: ["--enable-precise-memory-info"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15_000 });

    await page.waitForSelector("#bench-run", { timeout: 10_000 });

    if (items !== 10_000) {
      const label = ITEM_COUNTS[items];
      if (!label) throw new Error(`Unsupported item count: ${items}`);
      const clicked = await page.evaluate((lbl) => {
        const btns = document.querySelectorAll("#bench-sizes .ui-segmented__btn");
        for (const btn of btns) {
          if (btn.textContent.trim() === lbl) { btn.click(); return true; }
        }
        return false;
      }, label);
      if (!clicked) throw new Error(`Item count button "${label}" not found`);
      await delay(300);
    }

    await page.click("#bench-run");

    await page.waitForFunction(
      (sId) => {
        const el = document.querySelector(`#status-${sId}`);
        return el && el.textContent.includes("Final results");
      },
      { timeout },
      suiteId,
    );

    await delay(500);

    const metrics = await page.evaluate((sId) => {
      const container = document.querySelector(`#metrics-${sId}`);
      if (!container) return { success: false, error: "no metrics container" };

      const items = container.querySelectorAll(".bench-metric");
      if (items.length === 0) {
        const error = container.querySelector(".bench-suite__error");
        if (error) return { success: false, error: error.textContent };
        return { success: false, error: "no metrics rendered" };
      }

      const results = [];
      items.forEach((el) => {
        const label = el.querySelector(".bench-metric__label")?.textContent?.trim();
        const valueText = el.querySelector(".bench-metric__value")?.textContent?.trim();
        const unit = el.querySelector(".bench-metric__unit")?.textContent?.trim();
        const value = parseFloat(valueText?.replace(/[^0-9.\-]/g, "") || "0");
        const rating = Array.from(el.classList)
          .find((c) => c.startsWith("bench-metric--"))
          ?.replace("bench-metric--", "") || null;
        results.push({ label, value, unit, rating });
      });

      return { success: true, metrics: results };
    }, suiteId);

    return metrics;
  } finally {
    await browser.close();
  }
}

function printResults(suiteId, result) {
  if (!result.success) {
    console.log(`  ERROR: ${result.error}`);
    return;
  }
  console.log(`  ${"Metric".padEnd(24)} ${"Value".padStart(10)}  ${"Unit".padEnd(6)}  Rating`);
  console.log("  " + "─".repeat(56));
  for (const m of result.metrics) {
    const val = typeof m.value === "number" ? m.value.toFixed(2) : String(m.value);
    console.log(`  ${(m.label || "").padEnd(24)} ${val.padStart(10)}  ${(m.unit || "").padEnd(6)}  ${m.rating || ""}`);
  }
}

// =============================================================================
// Main
// =============================================================================

const args = parseArgs();
const variant = args.variant || "vanilla";
const items = args.items || 10_000;
const headless = args.headless !== false;
const base = args.base || DEFAULT_BASE;
const suiteFilter = args.suite ? args.suite.split(",") : SUITES;

const suitesToRun = suiteFilter.filter((s) => SUITES.includes(s));
if (suitesToRun.length === 0) {
  console.error(`Invalid suite(s): ${args.suite}. Valid: ${SUITES.join(", ")}`);
  process.exit(1);
}

console.log("═══════════════════════════════════════════════");
console.log("  Benchmark Suite (Puppeteer)");
console.log("═══════════════════════════════════════════════");
console.log(`  suites:  ${suitesToRun.join(", ")}`);
console.log(`  variant: ${variant}   items: ${items.toLocaleString()}`);
console.log(`  base:    ${base}`);
console.log();

const allResults = {};

for (const suite of suitesToRun) {
  const suiteId = `${suite}-${variant}`;
  console.log(`\n── ${suiteId} ──`);

  try {
    const result = await runSuite({ base, suite, variant, items, headless });
    allResults[suiteId] = result;
    printResults(suiteId, result);
    if (result.success) {
      console.log("  → stored in SQLite");
    }
  } catch (err) {
    console.log(`  → ERROR: ${err.message}`);
    allResults[suiteId] = { success: false, error: err.message };
  }
}

// Summary
console.log("\n═══════════════════════════════════════════════");
console.log("  SUMMARY");
console.log("═══════════════════════════════════════════════");
for (const [suiteId, result] of Object.entries(allResults)) {
  const status = result.success ? "✓" : "✗";
  const detail = result.success
    ? result.metrics.map((m) => `${m.label}=${m.value.toFixed(1)}${m.unit || ""}`).join("  ")
    : result.error;
  console.log(`  ${status} ${suiteId}: ${detail}`);
}
console.log();
