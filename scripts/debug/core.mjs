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
  base: "http://localhost:3338",
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
  const args = [];
  if (!headless && windowPosition) args.push(`--window-position=${windowPosition}`);
  return puppeteer.launch({
    headless,
    executablePath: findChrome(chrome),
    args,
  });
}

export async function openPage(browser, path, opts = {}) {
  const {
    width = DEFAULTS.width,
    height = DEFAULTS.height,
    base = DEFAULTS.base,
    settle = DEFAULTS.settle,
    prefix = DEFAULTS.prefix,
    waitFor,
  } = opts;

  const page = await browser.newPage();
  await page.setViewport({ width, height });

  const logs = [];
  page.on("console", (msg) => logs.push(msg.text()));

  const selector = waitFor || `.${prefix}-viewport`;
  await page.goto(`${base}${path}`, { waitUntil: "networkidle2" });
  await page.waitForSelector(selector);
  if (settle > 0) await delay(settle);

  return { page, logs };
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
