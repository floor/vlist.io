// src/server/router.ts
// Main request router — orchestrates all route handlers.

import { routeApi } from "../api/router";
import {
  renderDocsPage,
  renderTutorialPage,
  renderExamplesPage,
  renderBenchmarkPage,
} from "./renderers";
import { resolveStatic } from "./static";
import { compressResponse } from "./compression";
import { renderSitemap, renderRobots } from "./sitemap";

// =============================================================================
// Examples Routing
// =============================================================================

/**
 * Match examples routes and render pages server-side.
 *
 * - /examples or /examples/        → overview page
 * - /examples/<slug>               → example page (server-rendered with shell)
 * - /examples/<slug>/              → same (trailing slash)
 * - /examples/<slug>/dist/*        → falls through (static assets)
 */
function resolveExamples(pathname: string, url: string): Response | null {
  if (pathname === "/examples" || pathname === "/examples/") {
    return renderExamplesPage(null, url);
  }

  const match = pathname.match(
    /^\/examples\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)\/?$/,
  );
  if (match) {
    const slug = match[1];
    const rendered = renderExamplesPage(slug, url);
    if (rendered) return rendered;
    // Unknown slug — fall through to static file serving
  }

  return null;
}

// =============================================================================
// Request Handler
// =============================================================================

export async function handleRequest(req: Request): Promise<Response> {
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

  // 3. Examples pages (server-rendered)
  if (!response) {
    response = resolveExamples(pathname, req.url);
  }

  // 4. Docs pages (server-rendered)
  if (!response && (pathname === "/docs" || pathname === "/docs/")) {
    response = renderDocsPage(null);
  } else if (!response) {
    const docsMatch = pathname.match(/^\/docs\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/);
    if (docsMatch) {
      response = renderDocsPage(docsMatch[1]);
    }
  }

  // 5. Tutorials pages (server-rendered)
  if (!response && (pathname === "/tutorials" || pathname === "/tutorials/")) {
    response = renderTutorialPage(null);
  } else if (!response) {
    const tutorialsMatch = pathname.match(
      /^\/tutorials\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/,
    );
    if (tutorialsMatch) {
      response = renderTutorialPage(tutorialsMatch[1]);
    }
  }

  // 6. Benchmark pages (server-rendered)
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

  // 7. Static files (with package resolution)
  if (!response) {
    response = resolveStatic(pathname);
  }

  // 8. 404 fallback
  if (!response) {
    response = new Response("Not Found", { status: 404 });
  }

  return compressResponse(response, acceptEncoding, pathname);
}
