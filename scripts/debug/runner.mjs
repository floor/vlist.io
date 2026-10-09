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
    const result = await fn(session);
    if (result === false || result?.pass === false) {
      process.exitCode = 1;
    }
    return result;
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
        return result;
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

  if (failed > 0) {
    process.exitCode = 1;
  }

  return results;
}

// =============================================================================
// Re-export core utilities for convenience
// =============================================================================

export { delay, parseArgs, selectors } from "./core.mjs";
export { createSession } from "./session.mjs";

// =============================================================================
// CLI: test:browser suite runner
// =============================================================================

import { createServer } from "net";
import { resolve, join } from "path";

async function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolvePort(port));
    });
    srv.on("error", reject);
  });
}

export async function runBrowserSuite() {
  const root = resolve(import.meta.dir, "../..");
  const port = await getFreePort();
  const baseUrl = `http://localhost:${port}`;

  console.log(`Starting test server on port ${port}...`);
  const server = Bun.spawn(["bun", "server.ts"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdout: "ignore",
    stderr: "inherit",
  });

  const url = `${baseUrl}/`;
  const startTime = Date.now();
  let serverReady = false;
  while (Date.now() - startTime < 15000) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!serverReady) {
    server.kill();
    throw new Error(`Timed out waiting for server at ${url}`);
  }

  const tests = [
    {
      name: "carousel-snap-fling.mjs",
      file: join(root, "scripts/debug/tests/carousel-snap-fling.mjs"),
      args: [],
    },
    {
      name: "synthetic-touch.mjs",
      file: join(root, "scripts/debug/tests/synthetic-touch.mjs"),
      args: [`--base=${baseUrl}/experiments/synthetic/`],
    },
    {
      name: "tree-src-click.mjs",
      file: join(root, "scripts/debug/tests/tree-src-click.mjs"),
      args: [],
    },
  ];

  let passed = 0;
  let failed = 0;
  const skipped = 0;

  try {
    for (const test of tests) {
      const t0 = Date.now();
      const proc = Bun.spawn(["bun", test.file, ...test.args], {
        cwd: root,
        env: {
          ...process.env,
          PORT: String(port),
          VLIST_BASE: baseUrl,
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);

      const duration = ((Date.now() - t0) / 1000).toFixed(1);

      if (exitCode === 0) {
        passed++;
        console.log(`✓ ${test.name} (${duration}s)`);
      } else {
        failed++;
        console.log(`✗ ${test.name} (${duration}s)`);
        if (stdout.trim()) {
          console.log(stdout.trim().split("\n").map(l => `    ${l}`).join("\n"));
        }
        if (stderr.trim()) {
          console.error(stderr.trim().split("\n").map(l => `    ${l}`).join("\n"));
        }
      }
    }
  } finally {
    server.kill();
    await server.exited;
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  return { passed, failed, skipped };
}

if (import.meta.main) {
  const result = await runBrowserSuite();
  process.exit(result.failed > 0 ? 1 : 0);
}
