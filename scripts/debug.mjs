/**
 * Backward-compatible shim — re-exports from debug/ modules.
 *
 * Old usage still works:
 *   import { debug, run } from "./scripts/debug.mjs";
 *
 * New code should import from debug/ directly:
 *   import { run, suite } from "./scripts/debug/runner.mjs";
 *   import { createSession } from "./scripts/debug/session.mjs";
 */

export { run, suite, delay, parseArgs, selectors } from "./debug/runner.mjs";
export { createSession } from "./debug/session.mjs";
export { launchBrowser, openPage, findChrome } from "./debug/core.mjs";

import { launchBrowser, openPage } from "./debug/core.mjs";
import { createSession } from "./debug/session.mjs";

export async function debug(path, opts = {}) {
  const browser = await launchBrowser(opts);
  const { page, logs } = await openPage(browser, path, opts);
  return createSession(page, browser, { ...opts, logs });
}
