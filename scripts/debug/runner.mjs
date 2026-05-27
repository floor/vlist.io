/**
 * debug/runner — High-level test runner.
 *
 * Usage:
 *   import { run, suite } from "./scripts/debug/runner.mjs";
 *
 *   // Single test:
 *   await run("/examples/basic", { settle: 1000 }, async (s) => { ... });
 *
 *   // Suite:
 *   await suite([
 *     { name: "basic", path: "/examples/basic", test: async (s) => { ... } },
 *     { name: "grid",  path: "/examples/photo-album", test: async (s) => { ... } },
 *   ]);
 */

import { launchBrowser, openPage, parseArgs } from "./core.mjs";
import { createSession } from "./session.mjs";

// =============================================================================
// Single run — launch browser, run callback, always close
// =============================================================================

export async function run(path, optsOrFn, maybeFn) {
  const opts = typeof optsOrFn === "function" ? {} : optsOrFn;
  const fn = typeof optsOrFn === "function" ? optsOrFn : maybeFn;

  const browser = await launchBrowser(opts);
  const { page, logs } = await openPage(browser, path, opts);
  const session = createSession(page, browser, { ...opts, logs });

  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

// =============================================================================
// Suite — run multiple tests sequentially, collect results
// =============================================================================

/**
 * @param {Array<{ name: string, path: string, settle?: number, test: (s) => Promise<{ pass: boolean }> }>} tests
 * @param {object} [opts] Shared options (base, chrome, headless, etc.)
 */
export async function suite(tests, opts = {}) {
  const cliArgs = parseArgs();
  const filter = cliArgs.only;
  const filtered = filter
    ? tests.filter((t) => t.name.includes(filter))
    : tests;

  console.log("═══════════════════════════════════════════════");
  console.log(`  vlist debug suite — ${filtered.length} tests`);
  console.log("═══════════════════════════════════════════════\n");

  const results = [];

  for (const test of filtered) {
    console.log(`\n── ${test.name} (${test.path}) ──`);
    try {
      let result;
      await run(test.path, { settle: test.settle || 1500, ...opts }, async (s) => {
        result = await test.test(s);
      });
      const status = result?.pass ? "PASS" : "FAIL";
      console.log(`  → ${status}`);
      results.push({ name: test.name, ...result });
    } catch (err) {
      console.log(`  → ERROR: ${err.message}`);
      results.push({ name: test.name, pass: false, error: err.message });
    }
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  for (const r of results) {
    console.log(`  ${r.pass ? "✓" : "✗"} ${r.name}${r.error ? ` (${r.error})` : ""}`);
  }
  console.log(`\n  ${passed}/${results.length} passed, ${failed} failed`);

  return results;
}

// =============================================================================
// Re-export core utilities for convenience
// =============================================================================

export { delay, parseArgs, selectors } from "./core.mjs";
export { createSession } from "./session.mjs";
