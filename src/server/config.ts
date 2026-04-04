// src/server/config.ts
// Server-wide constants and package resolution.

import { existsSync, realpathSync } from "fs";
import { join, resolve } from "path";

/** True when NODE_ENV is explicitly set to "production". */
export const IS_PROD = process.env.NODE_ENV === "production";

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

export const VLIST_ROOT = resolvePackagePath("@floor/vlist");
