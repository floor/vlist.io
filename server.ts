// server.ts
// vlist.dev — Main Bun HTTP server
//
// Serves:
//   /api/*                        → API routes (users, etc.)
//   /sandbox/                     → Sandbox overview (server-rendered)
//   /sandbox/<slug>               → Sandbox example (server-rendered)
//   /sandbox/<slug>/*             → Sandbox static assets (JS, CSS bundles)
//   /docs/*                       → Documentation (markdown files)
//   /dist/*                       → vlist library assets (CSS, JS)
//   /node_modules/mtrl/*          → mtrl library assets
//   /node_modules/mtrl-addons/*   → mtrl-addons library assets
//   /                             → Landing page

import { routeApi } from "./src/api/router";
import { renderSandboxPage } from "./sandbox/renderer";
import { renderDocsPage } from "./docs/renderer";
import { existsSync, statSync, readFileSync, realpathSync } from "fs";
import { join, extname, resolve } from "path";

const PORT = parseInt(process.env.PORT || "3338", 10);
const ROOT = resolve(".");

// =============================================================================
// Package Resolution
// =============================================================================

/**
 * Resolve a package root from node_modules.
 * Follows symlinks (bun uses symlinks for file: dependencies).
 */
const resolvePackagePath = (packageName: string): string | null => {
  const candidate = join(ROOT, "node_modules", packageName);
  if (!existsSync(candidate)) return null;
  try {
    return realpathSync(candidate);
  } catch {
    return null;
  }
};

// Resolve library paths once at startup
const VLIST_ROOT = resolvePackagePath("vlist");
const MTRL_ROOT = resolvePackagePath("mtrl");
const MTRL_ADDONS_ROOT = resolvePackagePath("mtrl-addons");

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

const getMimeType = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
};

// =============================================================================
// Static File Serving
// =============================================================================

/**
 * Serve a file from an absolute path.
 * Returns null if file doesn't exist or is a directory without index.html.
 */
const serveFile = (filePath: string): Response | null => {
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
const serveStatic = (pathname: string): Response | null => {
  const filePath = resolve(join(ROOT, pathname));

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    return new Response("Forbidden", { status: 403 });
  }

  return serveFile(filePath);
};

/**
 * Serve a file from a resolved package directory.
 * Maps URL subpath to a file within the package root.
 */
const serveFromPackage = (
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
 *   1. /api/*                       → API router
 *   2. /sandbox/ or /sandbox/<slug> → Server-rendered sandbox pages
 *   3. /dist/*                      → vlist package dist/
 *   4. /node_modules/mtrl/*         → mtrl package root
 *   5. /node_modules/mtrl-addons/*  → mtrl-addons package root
 *   6. /docs/*.md                   → raw markdown (for client fetch)
 *   7. /docs/*                      → docs shell (index.html renders md)
 *   8. /sandbox/<slug>/*            → sandbox static assets (JS, CSS)
 *   9. /*                           → local root (landing page, etc.)
 */
const resolveStatic = (pathname: string): Response | null => {
  // /dist/* → vlist package dist directory
  if (pathname.startsWith("/dist/")) {
    const subpath = pathname; // keep /dist/... as-is since vlist root contains dist/
    return serveFromPackage(VLIST_ROOT, subpath);
  }

  // /node_modules/mtrl/* → mtrl package
  if (pathname.startsWith("/node_modules/mtrl/")) {
    const subpath = pathname.replace("/node_modules/mtrl/", "/");
    return serveFromPackage(MTRL_ROOT, subpath);
  }

  // /node_modules/mtrl-addons/* → mtrl-addons package
  if (pathname.startsWith("/node_modules/mtrl-addons/")) {
    const subpath = pathname.replace("/node_modules/mtrl-addons/", "/");
    return serveFromPackage(MTRL_ADDONS_ROOT, subpath);
  }

  // /docs/*.md → serve raw markdown
  if (pathname.startsWith("/docs/") && pathname.endsWith(".md")) {
    return serveStatic(pathname);
  }

  // Everything else — serve from project root
  return serveStatic(pathname);
};

// =============================================================================
// Sandbox Routing
// =============================================================================

/**
 * Match sandbox routes and render pages server-side.
 *
 * - /sandbox or /sandbox/         → overview page
 * - /sandbox/<slug>               → example page (server-rendered with shell)
 * - /sandbox/<slug>/              → same (trailing slash)
 * - /sandbox/<slug>/dist/*        → falls through (static assets)
 */
const resolveSandbox = (pathname: string): Response | null => {
  // Overview: /sandbox or /sandbox/
  if (pathname === "/sandbox" || pathname === "/sandbox/") {
    return renderSandboxPage(null);
  }

  // Example page: /sandbox/<slug> or /sandbox/<slug>/
  const match = pathname.match(/^\/sandbox\/([a-z0-9-]+)\/?$/);
  if (match) {
    const slug = match[1];
    const rendered = renderSandboxPage(slug);
    if (rendered) return rendered;
    // Unknown slug — fall through to static file serving
  }

  return null;
};

// =============================================================================
// Request Handler
// =============================================================================

const handleRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);

  // 1. API routes
  const apiResponse = await routeApi(req);
  if (apiResponse) return apiResponse;

  // 2. Sandbox pages (server-rendered)
  const sandboxResponse = resolveSandbox(pathname);
  if (sandboxResponse) return sandboxResponse;

  // 3. Docs pages (server-rendered)
  if (pathname === "/docs" || pathname === "/docs/") {
    const rendered = renderDocsPage(null);
    if (rendered) return rendered;
  } else {
    const docsMatch = pathname.match(/^\/docs\/([a-zA-Z0-9_-]+)\/?$/);
    if (docsMatch) {
      const rendered = renderDocsPage(docsMatch[1]);
      if (rendered) return rendered;
    }
  }

  // 4. Static files (with package resolution)
  const staticResponse = resolveStatic(pathname);
  if (staticResponse) return staticResponse;

  // 5. 404
  return new Response("Not Found", { status: 404 });
};

// =============================================================================
// Start
// =============================================================================

const packages = [
  VLIST_ROOT
    ? `  vlist:         ${VLIST_ROOT}`
    : "  vlist:         ⚠️  not found",
  MTRL_ROOT
    ? `  mtrl:          ${MTRL_ROOT}`
    : "  mtrl:          ⚠️  not found",
  MTRL_ADDONS_ROOT
    ? `  mtrl-addons:   ${MTRL_ADDONS_ROOT}`
    : "  mtrl-addons:   ⚠️  not found",
];

console.log(`
  🚀  vlist.dev server

  Local:     http://localhost:${PORT}
  Sandbox:   http://localhost:${PORT}/sandbox
  API:       http://localhost:${PORT}/api
  Docs:      http://localhost:${PORT}/docs

  Packages resolved:
${packages.join("\n")}

  Press Ctrl+C to stop
`);

Bun.serve({
  port: PORT,
  fetch: handleRequest,
});
