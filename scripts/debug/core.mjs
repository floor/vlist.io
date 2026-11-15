/**
 * debug/core — Browser launch & Chrome discovery.
 *
 * Low-level primitives. Most scripts should use runner.mjs instead.
 */

import puppeteer from "puppeteer-core";
import { existsSync } from "fs";

// =============================================================================
// Defaults
// =============================================================================

export const DEFAULTS = {
  base: process.env.VLIST_BASE || (process.env.PORT ? `http://localhost:${process.env.PORT}` : "http://localhost:3338"),
  screenshotDir: "/tmp/vlist-debug",
  width: 1200,
  height: 800,
  settle: 1000,
  prefix: "vlist",
  headless: true,
};

// =============================================================================
// Chrome discovery
// =============================================================================

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

export function findChrome(override) {
  if (override) return override;
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) return process.env.PUPPETEER_EXECUTABLE_PATH;
  for (const p of CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `Chrome not found. Searched:\n${CHROME_PATHS.join("\n")}\nPass { chrome: "/path" } to override.`,
  );
}

// =============================================================================
// Browser lifecycle
// =============================================================================

export async function launchBrowser(opts = {}) {
  const { headless = DEFAULTS.headless, chrome, windowPosition = "100,100" } = opts;
  const executablePath = findChrome(chrome);
  console.log(`[browser] Using Chrome executable: ${executablePath}`);
  const args = [
    ...(process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] : []),
  ];
  if (!headless && windowPosition) args.push(`--window-position=${windowPosition}`);
  return puppeteer.launch({
    headless,
    executablePath: findChrome(chrome),
    args,
  });
}

/**
 * Abort every request that does not stay on the test server, so a test never
 * waits on a host outside this machine.
 *
 * `/examples/carousel` preloads 24 picsum.photos images before its page is
 * "loaded". When that host stalls, `goto(..., { waitUntil: "networkidle2" })`
 * waits the full 30 s and the whole Browser job fails on an outside outage.
 * Aborted requests finish at once, so the page settles and keeps its slides —
 * which is what these tests are about. `base`'s host counts as local, along
 * with localhost / 127.0.0.1 / ::1; data:, blob: and about: URLs pass.
 *
 * Returns the Set of hosts it blocked, so a caller can report them.
 * Pass `{ allowExternal: true }` to openPage for a capture that needs the real
 * third-party assets.
 */
export async function blockForeignRequests(page, base) {
  const local = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  try {
    local.add(new URL(base).hostname);
  } catch {}
  const blocked = new Set();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (/^(data|blob|about):/.test(url)) {
      req.continue().catch(() => {});
      return;
    }
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {}
    if (host && local.has(host)) {
      req.continue().catch(() => {});
      return;
    }
    blocked.add(host || url);
    req.abort().catch(() => {});
  });
  return blocked;
}

export async function openPage(browser, path, opts = {}) {
  const {
    width = DEFAULTS.width,
    height = DEFAULTS.height,
    base = DEFAULTS.base,
    settle = DEFAULTS.settle,
    prefix = DEFAULTS.prefix,
    waitFor,
    allowExternal = false,
  } = opts;

  const page = await browser.newPage();
  await page.setViewport({ width, height });
  // Keep the page off outside hosts by default; see blockForeignRequests.
  const blocked = allowExternal ? new Set() : await blockForeignRequests(page, base);

  const logs = [];
  page.on("console", (msg) => logs.push(msg.text()));

  const selector = waitFor || `.${prefix}-viewport`;
  await page.goto(`${base}${path}`, { waitUntil: "networkidle2" });
  await page.waitForSelector(selector);
  if (settle > 0) await delay(settle);

  return { page, logs, blocked };
}

// =============================================================================
// Utilities
// =============================================================================

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function selectors(prefix = "vlist") {
  return {
    viewport: `.${prefix}-viewport`,
    content: `.${prefix}-content`,
    item: `.${prefix}-item`,
    scrollbar: `.${prefix}-scrollbar`,
    thumb: `.${prefix}-scrollbar__thumb`,
  };
}

/**
 * Parse CLI flags: --key=value or --flag (boolean true).
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq > 0) {
      const key = arg.slice(2, eq);
      const val = arg.slice(eq + 1);
      args[key] = isNaN(Number(val)) ? val : Number(val);
    } else {
      args[arg.slice(2)] = true;
    }
  }
  return args;
}
