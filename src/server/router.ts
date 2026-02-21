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
// Section Resolvers
// =============================================================================

function routeSystem(pathname: string): Response | null {
  if (pathname === "/sitemap.xml") return renderSitemap();
  if (pathname === "/robots.txt") return renderRobots();
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

function resolveExamples(pathname: string, url: string): Response | null {
  if (pathname === "/examples" || pathname === "/examples/") {
    return renderExamplesPage(null, url);
  }
  const match = pathname.match(
    /^\/examples\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)\/?$/,
  );
  if (match) return renderExamplesPage(match[1], url);
  return null;
}

function resolveBenchmarks(pathname: string, url: string): Response | null {
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

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  const acceptEncoding = req.headers.get("Accept-Encoding");

  const response =
    routeSystem(pathname) ??
    (await routeApi(req)) ??
    resolveExamples(pathname, req.url) ??
    resolveDocs(pathname) ??
    resolveTutorials(pathname) ??
    resolveBenchmarks(pathname, req.url) ??
    resolveStatic(pathname) ??
    new Response("Not Found", { status: 404 });

  return compressResponse(response, acceptEncoding, pathname);
}
