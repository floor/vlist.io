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
