// src/server/config.ts
// Server-wide constants and package resolution.

import { existsSync, realpathSync, readFileSync } from "fs";
import { join, resolve } from "path";

/** True when running on production/staging servers (Linux + NODE_ENV=production).
 *  On macOS (local dev), always false — even with NODE_ENV=production from pm2. */
export const IS_PROD = process.env.NODE_ENV === "production" && process.platform !== "darwin";

export const PORT = parseInt(process.env.PORT || "3338", 10);
export const ROOT = resolve(".");
export const SITE = "https://vlist.io";

// =============================================================================
// Package Resolution
// =============================================================================

/**
 * Resolve a package root from node_modules.
 * Follows symlinks (bun uses symlinks for file: dependencies).
 */
function resolvePackagePath(packageName: string): string | null {
  const candidate = join(ROOT, "node_modules", packageName);
  if (!existsSync(candidate)) return null;
  try {
    return realpathSync(candidate);
  } catch {
    return null;
  }
}

export const VLIST_ROOT = resolvePackagePath("vlist");

/** vlist package version — used as cache-buster for library CSS. */
export const VLIST_VERSION = (() => {
  if (!VLIST_ROOT) return "0.0.0";
  try {
    const pkg = JSON.parse(
      readFileSync(join(VLIST_ROOT, "package.json"), "utf-8"),
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

/** vlist.io site version — used as cache-buster for example JS/CSS. */
export const SITE_VERSION = (() => {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

/**
 * The deploy's git commit, short. Example and benchmark bundles are served
 * `immutable` for a year under a `?v=` key; keyed on SITE_VERSION alone, a
 * bundle rebuilt by a push to `next` stayed invisible on any phone that had
 * visited the page before, until the site version moved (2026-09-25: the
 * phone-pass card was re-run twice against a stale bundle). The deploy
 * script checks out the commit with git, so the commit is on the server.
 */
export const BUILD_ID = (() => {
  try {
    const out = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], { cwd: ROOT });
    const sha = out.stdout.toString().trim();
    return /^[0-9a-f]{7,}$/.test(sha) ? sha : "";
  } catch {
    return "";
  }
})();

/** Cache key for built example and benchmark assets: site version plus the deploy's commit. */
export const ASSET_VERSION = BUILD_ID ? `${SITE_VERSION}-${BUILD_ID}` : SITE_VERSION;
