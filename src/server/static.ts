// src/server/static.ts
// Static file serving: MIME types, file reading, path resolution.

import { existsSync, statSync, readFileSync } from "fs";
import { join, extname, resolve } from "path";
import { ROOT, VLIST_ROOT } from "./config";

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
// File Serving
// =============================================================================

/**
 * Serve a file from an absolute path.
 * Returns null if the file doesn't exist or is a directory without index.html.
 */
export const serveFile = (filePath: string): Response | null => {
  if (!existsSync(filePath)) return null;

  const stat = statSync(filePath);

  // Serve index.html for directories
  if (stat.isDirectory()) {
    const indexPath = join(filePath, "index.html");
    if (existsSync(indexPath)) {
      filePath = indexPath;
    } else {
      return null;
    }
  }

  try {
    const content = readFileSync(filePath);
    return new Response(content, {
      headers: {
        "Content-Type": getMimeType(filePath),
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return null;
  }
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

  return serveFile(filePath);
};

/**
 * Serve a file from a resolved package directory.
 * Maps a URL subpath to a file within the package root.
 */
export const serveFromPackage = (
  packageRoot: string | null,
  subpath: string,
): Response | null => {
  if (!packageRoot) return null;

  const filePath = resolve(join(packageRoot, subpath));

  // Security: prevent traversal outside the package
  if (!filePath.startsWith(packageRoot)) {
    return new Response("Forbidden", { status: 403 });
  }

  return serveFile(filePath);
};

// =============================================================================
// Route Mapping
// =============================================================================

/**
 * Map a URL pathname to the correct file source.
 *
 * Priority:
 *   1. /dist/examples/* → project root dist/examples/ (examples build output)
 *   2. /dist/*          → vlist package dist/
 *   3. /docs/*.md       → raw markdown files
 *   4. /*               → project root (landing, static assets, styles)
 */
export const resolveStatic = (pathname: string): Response | null => {
  // /dist/examples/* → project root dist/examples directory
  if (pathname.startsWith("/dist/examples/")) {
    return serveStatic(pathname);
  }

  // /dist/* → vlist package dist directory
  if (pathname.startsWith("/dist/")) {
    return serveFromPackage(VLIST_ROOT, pathname);
  }

  // /docs/*.md → serve raw markdown
  if (pathname.startsWith("/docs/") && pathname.endsWith(".md")) {
    return serveStatic(pathname);
  }

  // Everything else — serve from project root
  return serveStatic(pathname);
};
