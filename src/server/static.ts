// src/server/static.ts
// Static file serving: MIME types, file reading, path resolution, cache headers.

import { existsSync, statSync } from "fs";
import { join, extname, resolve } from "path";
import { ROOT, VLIST_ROOT, IS_PROD } from "./config";
import { CACHE_IMMUTABLE, CACHE_STATIC, CACHE_NOCACHE } from "./cache";

// =============================================================================
// Dev Mode: vlist source CSS
// =============================================================================

/** In dev mode, resolve vlist CSS from src/styles/ (readable) instead of dist/ (minified).
 *  VLIST_ROOT points to the package root (follows symlinks), so src/styles/ is directly under it. */
const VLIST_SRC_STYLES = (() => {
  if (IS_PROD || !VLIST_ROOT) return null;
  const candidate = resolve(VLIST_ROOT, "src/styles");
  return existsSync(candidate) ? candidate : null;
})();

/** Map dist CSS filenames → source filenames (identical names). */
const DEV_CSS_MAP: Record<string, string> = {
  "vlist.css": "vlist.css",
  "vlist-table.css": "vlist-table.css",
  "vlist-extras.css": "vlist-extras.css",
};

// =============================================================================
// MIME Types
// =============================================================================

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".ts": "application/typescript; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

export const getMimeType = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
};

// =============================================================================
// Cache-Control
// =============================================================================

/**
 * Determine the Cache-Control header for a given URL pathname.
 *
 * Immutable (1 year, hashed filenames):
 *   - /dist/*            — bundled JS/CSS build output (examples, benchmarks, vlist)
 *   - Fonts (.woff, .woff2, .ttf)
 *   - /favicon.ico
 *
 * Static (7 days, non-hashed but deploy-only):
 *   - /styles/*          — shared CSS (shell, ui, content, syntax, tokens)
 *
 * No-cache (revalidate every time):
 *   - Everything else (HTML, markdown, source .ts/.js, images)
 */
function getCacheControl(pathname: string): string {
  // Build output directories (contain pre-compressed .br/.gz siblings)
  if (/\/dist\//.test(pathname)) return CACHE_IMMUTABLE;

  // Fonts rarely change
  const ext = extname(pathname).toLowerCase();
  if (ext === ".woff" || ext === ".woff2" || ext === ".ttf") {
    return CACHE_IMMUTABLE;
  }

  // Favicon
  if (pathname === "/favicon.ico") return CACHE_IMMUTABLE;

  // Non-hashed static assets that only change on deploy
  if (pathname.startsWith("/styles/")) return CACHE_STATIC;

  return CACHE_NOCACHE;
}

// =============================================================================
// File Serving
// =============================================================================

/**
 * Serve a file from an absolute path.
 * Returns null if the file doesn't exist or is a directory without index.html.
 *
 * @param filePath - Absolute filesystem path
 * @param pathname - Original URL pathname (used for cache-control decisions)
 */
export const serveFile = (
  filePath: string,
  pathname: string,
): Response | null => {
  if (!existsSync(filePath)) return null;

  const stat = statSync(filePath);

  // Serve index.html for directories
  if (stat.isDirectory()) {
    const indexPath = join(filePath, "index.html");
    if (!existsSync(indexPath)) return null;
    filePath = indexPath;
  }

  // Bun.file() is lazy — no disk read until the Response is consumed.
  // Bun uses sendfile(2) to transfer directly from fd to socket (zero-copy).
  const file = Bun.file(filePath);

  return new Response(file, {
    headers: {
      "Content-Type": getMimeType(filePath),
      "Cache-Control": getCacheControl(pathname),
    },
  });
};

/**
 * Serve a static file relative to the project root.
 * Includes directory traversal protection.
 */
export const serveStatic = (pathname: string): Response | null => {
  const filePath = resolve(join(ROOT, pathname));

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    return new Response("Forbidden", { status: 403 });
  }

  return serveFile(filePath, pathname);
};

/**
 * Serve a file from a resolved package directory.
 * Maps a URL subpath to a file within the package root.
 */
export const serveFromPackage = (
  packageRoot: string | null,
  subpath: string,
  pathname: string,
): Response | null => {
  if (!packageRoot) return null;

  const filePath = resolve(join(packageRoot, subpath));

  // Security: prevent traversal outside the package
  if (!filePath.startsWith(packageRoot)) {
    return new Response("Forbidden", { status: 403 });
  }

  return serveFile(filePath, pathname);
};

// =============================================================================
// Route Mapping
// =============================================================================

/**
 * Map a URL pathname to the correct file source.
 *
 * Priority:
 *   1. /dist/examples/*    → project root dist/examples/ (examples build output)
 *   2. /dist/benchmarks/*  → project root dist/benchmarks/ (benchmarks build output)
 *   3. /dist/*             → vlist package dist/
 *   4. /docs/*.md          → raw markdown files
 *   5. /*                  → project root (landing, static assets, styles)
 */
export const resolveStatic = (pathname: string): Response | null => {
  // /dist/examples/* → project root dist/examples directory
  if (pathname.startsWith("/dist/examples/")) {
    return serveStatic(pathname);
  }

  // /dist/benchmarks/* → project root dist/benchmarks directory
  if (pathname.startsWith("/dist/benchmarks/")) {
    return serveStatic(pathname);
  }

  // /dist/vlist*.css → in dev mode, serve from src/styles/ (readable)
  if (VLIST_SRC_STYLES && pathname.startsWith("/dist/")) {
    const filename = pathname.slice("/dist/".length);
    if (filename in DEV_CSS_MAP) {
      const srcPath = join(VLIST_SRC_STYLES, DEV_CSS_MAP[filename]);
      if (existsSync(srcPath)) {
        return serveFile(srcPath, pathname);
      }
    }
  }

  // /dist/* → vlist package dist directory
  if (pathname.startsWith("/dist/")) {
    return serveFromPackage(VLIST_ROOT, pathname, pathname);
  }

  // /docs/*.md → serve raw markdown
  if (pathname.startsWith("/docs/") && pathname.endsWith(".md")) {
    return serveStatic(pathname);
  }

  // Everything else — serve from project root
  return serveStatic(pathname);
};
