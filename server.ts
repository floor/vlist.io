// server.ts
// vlist.dev — Main Bun HTTP server (Bun runtime)
//
// Serves:
//   /api/*                        → API routes (users, etc.)
//   /sandbox/                     → Sandbox overview (server-rendered)
//   /sandbox/<slug>               → Sandbox example (server-rendered)
//   /sandbox/<slug>/*             → Sandbox static assets (JS, CSS bundles)
//   /docs/*                       → Documentation (markdown files)
//   /benchmarks/*                 → Benchmarks (server-rendered)
//   /sitemap.xml                  → Dynamic sitemap
//   /dist/*                       → vlist library assets (CSS, JS)
//   /                             → Landing page

import { routeApi } from "./src/api/router";
import { renderSandboxPage, EXAMPLE_GROUPS } from "./sandbox/renderer";
import { renderDocsPage, DOC_GROUPS } from "./docs/renderer";
import { renderBenchmarkPage, BENCH_GROUPS } from "./benchmarks/renderer";
import { existsSync, statSync, readFileSync, realpathSync } from "fs";
import { execSync } from "child_process";
import { join, extname, resolve } from "path";
import { gzipSync, brotliCompressSync } from "zlib";
import { createHash } from "crypto";

const PORT = parseInt(process.env.PORT || "3338", 10);
const ROOT = resolve(".");
const SITE = "https://vlist.dev";

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
// Compression Cache
// =============================================================================

interface CachedCompression {
  br?: Buffer;
  gzip?: Buffer;
  timestamp: number;
}

// Simple LRU cache for compressed responses
const compressionCache = new Map<string, CachedCompression>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 60000; // 1 minute

/**
 * Generate cache key from pathname and content hash
 */
const getCacheKey = (pathname: string, contentHash: string): string => {
  return `${pathname}:${contentHash}`;
};

/**
 * Evict old entries when cache is full (simple LRU)
 */
const evictOldCache = (): void => {
  if (compressionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = compressionCache.keys().next().value;
    if (oldestKey) {
      compressionCache.delete(oldestKey);
    }
  }
};

// =============================================================================
// Compression
// =============================================================================

/**
 * Check if a content type should be compressed
 */
const shouldCompress = (contentType: string): boolean => {
  return (
    contentType.includes("text/") ||
    contentType.includes("application/javascript") ||
    contentType.includes("application/json") ||
    contentType.includes("application/xml") ||
    contentType.includes("image/svg")
  );
};

/**
 * Compress response based on Accept-Encoding header
 * Prefers brotli over gzip for better compression
 * Uses LRU cache to avoid re-compressing
 */
const compressResponse = async (
  response: Response,
  acceptEncoding: string | null,
  pathname: string,
): Promise<Response> => {
  const contentType = response.headers.get("Content-Type") || "";

  // Only compress text-based content
  if (!shouldCompress(contentType)) {
    return response;
  }

  // Skip if already compressed or no encoding accepted
  if (!acceptEncoding || response.headers.get("Content-Encoding")) {
    return response;
  }

  try {
    // Read the response body as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Skip compression for small responses (< 1KB)
    if (buffer.length < 1024) {
      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    // Generate content hash for cache key
    const contentHash = createHash("md5").update(buffer).digest("hex");
    const cacheKey = getCacheKey(pathname, contentHash);

    // Check cache
    let cached = compressionCache.get(cacheKey);

    // Evict stale cache entries
    if (cached && Date.now() - cached.timestamp > CACHE_TTL) {
      compressionCache.delete(cacheKey);
      cached = undefined;
    }

    // Create cache entry if needed
    if (!cached) {
      evictOldCache();
      cached = { timestamp: Date.now() };
      compressionCache.set(cacheKey, cached);
    }

    const lowerEncoding = acceptEncoding.toLowerCase();
    const headers = new Headers(response.headers);
    headers.set("Vary", "Accept-Encoding");

    // Prefer brotli (better compression)
    if (lowerEncoding.includes("br")) {
      if (!cached.br) {
        cached.br = brotliCompressSync(buffer);
      }
      headers.set("Content-Encoding", "br");
      headers.set("Content-Length", cached.br.length.toString());
      return new Response(cached.br, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Fallback to gzip
    if (lowerEncoding.includes("gzip")) {
      if (!cached.gzip) {
        cached.gzip = gzipSync(buffer);
      }
      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", cached.gzip.length.toString());
      return new Response(cached.gzip, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Return uncompressed
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    // If compression fails, return original response
    console.error("Compression error:", error);
    return response;
  }
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
 *   1. /api/*                        → API router
 *   2. /sandbox/ or /sandbox/<slug>  → Server-rendered sandbox pages
 *   3. /docs/ or /docs/<slug>        → Server-rendered docs pages
 *   4. /benchmarks/ or /bench/<slug> → Server-rendered benchmark pages
 *   5. /dist/*                       → vlist package dist/
 *   6. /docs/*.md                    → raw markdown files
 *   9. /*                            → local root (landing, static assets)
 */
const resolveStatic = (pathname: string): Response | null => {
  // /dist/* → vlist package dist directory
  if (pathname.startsWith("/dist/")) {
    const subpath = pathname; // keep /dist/... as-is since vlist root contains dist/
    return serveFromPackage(VLIST_ROOT, subpath);
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
const resolveSandbox = (pathname: string, url: string): Response | null => {
  // Overview: /sandbox or /sandbox/
  if (pathname === "/sandbox" || pathname === "/sandbox/") {
    return renderSandboxPage(null, url);
  }

  // Example page: /sandbox/<slug> or /sandbox/<category>/<slug>
  const match = pathname.match(/^\/sandbox\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)\/?$/);
  if (match) {
    const slug = match[1];
    const rendered = renderSandboxPage(slug, url);
    if (rendered) return rendered;
    // Unknown slug — fall through to static file serving
  }

  return null;
};

// =============================================================================
// Git-based lastmod
// =============================================================================

/**
 * Get the last commit date (YYYY-MM-DD) across one or more files.
 * When multiple files are given, returns the most recent date.
 * Returns null if none of the files have git history.
 */
function gitLastmod(...filePaths: string[]): string | null {
  try {
    const quoted = filePaths.map((f) => `"${f}"`).join(" ");
    const date = execSync(`git log -1 --format=%cd --date=short -- ${quoted}`, {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();
    return date || null;
  } catch {
    return null;
  }
}

const FALLBACK_DATE = new Date().toISOString().split("T")[0];

/**
 * Build a map of URL path → lastmod date at startup.
 * Runs ~40 git commands once — takes under a second.
 */
function buildLastmodMap(): Map<string, string> {
  const map = new Map<string, string>();

  // Landing
  map.set("/", gitLastmod("index.html") ?? FALLBACK_DATE);

  // Docs overview → renderer config
  map.set("/docs/", gitLastmod("docs/renderer.ts") ?? FALLBACK_DATE);

  // Docs pages → markdown files
  for (const group of DOC_GROUPS) {
    for (const item of group.items) {
      if (item.slug === "") continue;
      const file = `docs/${item.slug}.md`;
      map.set(`/docs/${item.slug}`, gitLastmod(file) ?? FALLBACK_DATE);
    }
  }

  // Sandbox overview → renderer config
  map.set("/sandbox/", gitLastmod("sandbox/renderer.ts") ?? FALLBACK_DATE);

  // Sandbox examples → content + script + styles
  for (const group of EXAMPLE_GROUPS) {
    for (const item of group.items) {
      const dir = `sandbox/${item.slug}`;
      const date =
        gitLastmod(`${dir}/content.html`, `${dir}/script.js`) ?? FALLBACK_DATE;
      map.set(`/sandbox/${item.slug}`, date);
    }
  }

  // Benchmarks overview → renderer config
  map.set(
    "/benchmarks/",
    gitLastmod("benchmarks/renderer.ts") ?? FALLBACK_DATE,
  );

  // Benchmark suites → shared script + styles
  const benchScriptDate = gitLastmod("benchmarks/script.js") ?? FALLBACK_DATE;
  for (const group of BENCH_GROUPS) {
    for (const item of group.items) {
      map.set(`/benchmarks/${item.slug}`, benchScriptDate);
    }
  }

  return map;
}

const LASTMOD = buildLastmodMap();

// =============================================================================
// Sitemap
// =============================================================================

/**
 * Build /sitemap.xml dynamically from the renderer config arrays.
 * Always in sync — add a page to any renderer and it appears here.
 */
function renderSitemap(): Response {
  const urls: { loc: string; priority: string }[] = [];

  // Landing
  urls.push({ loc: "/", priority: "1.0" });

  // Docs
  urls.push({ loc: "/docs/", priority: "0.9" });
  for (const group of DOC_GROUPS) {
    for (const item of group.items) {
      if (item.slug === "") continue; // overview already added
      urls.push({ loc: `/docs/${item.slug}`, priority: "0.7" });
    }
  }

  // Sandbox
  urls.push({ loc: "/sandbox/", priority: "0.9" });
  for (const group of EXAMPLE_GROUPS) {
    for (const item of group.items) {
      urls.push({ loc: `/sandbox/${item.slug}`, priority: "0.6" });
    }
  }

  // Benchmarks
  urls.push({ loc: "/benchmarks/", priority: "0.8" });
  for (const group of BENCH_GROUPS) {
    for (const item of group.items) {
      urls.push({ loc: `/benchmarks/${item.slug}`, priority: "0.5" });
    }
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls.map((u) => {
      const lastmod = LASTMOD.get(u.loc) ?? FALLBACK_DATE;
      return `  <url>\n    <loc>${SITE}${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`;
    }),
    `</urlset>`,
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

// =============================================================================
// robots.txt
// =============================================================================

function renderRobots(): Response {
  const txt = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// =============================================================================
// Request Handler
// =============================================================================

const handleRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  const acceptEncoding = req.headers.get("Accept-Encoding");

  let response: Response | null = null;

  // 1. Sitemap & robots.txt
  if (pathname === "/sitemap.xml") {
    response = renderSitemap();
  } else if (pathname === "/robots.txt") {
    response = renderRobots();
  }
  // 2. API routes
  else {
    response = await routeApi(req);
  }

  // 3. Sandbox pages (server-rendered)
  if (!response) {
    response = resolveSandbox(pathname, req.url);
  }

  // 4. Docs pages (server-rendered)
  if (!response && (pathname === "/docs" || pathname === "/docs/")) {
    response = renderDocsPage(null);
  } else if (!response) {
    const docsMatch = pathname.match(/^\/docs\/([a-zA-Z0-9_-]+)\/?$/);
    if (docsMatch) {
      response = renderDocsPage(docsMatch[1]);
    }
  }

  // 5. Benchmark pages (server-rendered)
  if (
    !response &&
    (pathname === "/benchmarks" || pathname === "/benchmarks/")
  ) {
    response = renderBenchmarkPage(null, req.url);
  } else if (!response) {
    const benchMatch = pathname.match(/^\/benchmarks\/([a-z0-9-]+)\/?$/);
    if (benchMatch) {
      response = renderBenchmarkPage(benchMatch[1], req.url);
    }
  }

  // 6. Static files (with package resolution)
  if (!response) {
    response = resolveStatic(pathname);
  }

  // 7. 404 fallback
  if (!response) {
    response = new Response("Not Found", { status: 404 });
  }

  // Apply compression to the response
  return await compressResponse(response, acceptEncoding, pathname);
};

// =============================================================================
// Start
// =============================================================================

const packages = [
  VLIST_ROOT
    ? `  vlist:         ${VLIST_ROOT}`
    : "  vlist:         ⚠️  not found",
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
