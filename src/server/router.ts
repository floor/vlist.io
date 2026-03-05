// src/server/router.ts
// Main request router — orchestrates all route handlers.
//
// Phase 4: URL is parsed once and passed to sub-routers. Sync routes
// (homepage, docs, tutorials, examples, benchmarks, static) return a plain
// Response — no Promise allocation. Only the API path goes async.

import { routeApi } from "../api/router";
import {
  renderDocsPage,
  renderTutorialPage,
  renderExamplesPage,
  renderBenchmarkPage,
} from "./renderers";
import { renderHomepage } from "./renderers/homepage";
import { resolveStatic } from "./static";
import { compressResponse } from "./compression";
import { renderSitemap, renderRobots } from "./sitemap";

// =============================================================================
// Section Resolvers
// =============================================================================

function routeSystem(pathname: string): Response | null {
  if (pathname === "/sitemap.xml") return renderSitemap();
  if (pathname === "/robots.txt") return renderRobots();
  return null;
}

function resolveHomepage(pathname: string): Response | null {
  if (pathname === "/" || pathname === "") {
    return renderHomepage();
  }
  return null;
}

function resolveDocs(pathname: string): Response | null {
  if (pathname === "/docs" || pathname === "/docs/") {
    return renderDocsPage(null);
  }
  const match = pathname.match(/^\/docs\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/);
  if (match) return renderDocsPage(match[1]);
  return null;
}

function resolveTutorials(pathname: string): Response | null {
  if (pathname === "/tutorials" || pathname === "/tutorials/") {
    return renderTutorialPage(null);
  }
  const match = pathname.match(/^\/tutorials\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/);
  if (match) return renderTutorialPage(match[1]);
  return null;
}

function resolveExamples(pathname: string, url: URL): Response | null {
  if (pathname === "/examples" || pathname === "/examples/") {
    return renderExamplesPage(null, url);
  }
  const match = pathname.match(
    /^\/examples\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)\/?$/,
  );
  if (match) return renderExamplesPage(match[1], url);
  return null;
}

function resolveBenchmarks(pathname: string, url: URL): Response | null {
  if (pathname === "/benchmarks" || pathname === "/benchmarks/") {
    return renderBenchmarkPage(null, url);
  }
  const match = pathname.match(/^\/benchmarks\/([a-z0-9-]+)\/?$/);
  if (match) return renderBenchmarkPage(match[1], url);
  return null;
}

// =============================================================================
// Request Handler
// =============================================================================

/**
 * Main fetch handler for Bun.serve().
 *
 * Sync routes are tried first — no Promise is allocated for ~90% of requests
 * (homepage, docs, tutorials, examples, benchmarks, static files).
 * Only the /api/* path goes through the async branch.
 */
export function handleRequest(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  const acceptEncoding = req.headers.get("Accept-Encoding");

  // ── Sync routes (no Promise allocation) ──
  const syncResponse =
    routeSystem(pathname) ??
    resolveHomepage(pathname) ??
    resolveExamples(pathname, url) ??
    resolveDocs(pathname) ??
    resolveTutorials(pathname) ??
    resolveBenchmarks(pathname, url) ??
    resolveStatic(pathname);

  if (syncResponse)
    return compressResponse(syncResponse, acceptEncoding, pathname);

  // ── Async path (API routes only) ──
  return handleAsync(req, url, pathname, acceptEncoding);
}

async function handleAsync(
  req: Request,
  url: URL,
  pathname: string,
  acceptEncoding: string | null,
): Promise<Response> {
  const response =
    (await routeApi(req, url)) ?? new Response("Not Found", { status: 404 });
  return compressResponse(response, acceptEncoding, pathname);
}
