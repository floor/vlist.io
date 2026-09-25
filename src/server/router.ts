// src/server/router.ts
// Main request router — orchestrates all route handlers.
//
// Phase 4: URL is parsed once and passed to sub-routers. Sync routes
// (homepage, docs, tutorials, examples, benchmarks, static) return a plain
// Response — no Promise allocation. Only the API path goes async.

import { routeApi } from "../api/router";
import {
  renderDocsPage,
  renderDocsV1Page,
  renderDocsV2Page,
  renderTutorialPage,
  renderTutorialV1Page,
  renderTutorialV2Page,
  renderBlogPage,
  renderExamplesPage,
  renderBenchmarkPage,
  getDocSlugSets,
} from "./renderers";
import { renderHomepage } from "./renderers/homepage";
import { resolveExperiment } from "./renderers/experiments";
import { resolveStatic } from "./static";
import { compressResponse } from "./compression";
import { renderSitemap, renderRobots } from "./sitemap";
import { V1_TO_V2_DOCS, V1_TO_V2_TUTORIALS } from "./version-map";
import { versionUrl, type DocSection } from "./versions";

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

/** Archived documentation versions, each served from its own folder. */
const ARCHIVE_ROUTES: readonly { base: string; render: (slug: string | null) => Response }[] = [
  { base: "/docs/v1", render: renderDocsV1Page },
  { base: "/docs/v2", render: renderDocsV2Page },
  { base: "/tutorials/v1", render: renderTutorialV1Page },
  { base: "/tutorials/v2", render: renderTutorialV2Page },
];

const ARCHIVE_SLUG_RE = /^([a-zA-Z0-9/_-]+?)(\.md)?\/?$/;

function resolveArchivedDocs(pathname: string): Response | null {
  for (const route of ARCHIVE_ROUTES) {
    if (pathname === route.base || pathname === `${route.base}/`) {
      return route.render(null);
    }
    if (!pathname.startsWith(`${route.base}/`)) continue;
    const match = pathname.slice(route.base.length + 1).match(ARCHIVE_SLUG_RE);
    return match ? route.render(match[1] as string) : null;
  }
  return null;
}

/** A page removed from the current docs but kept in the v2 archive redirects to its copy. */
function archivedRedirect(section: DocSection, slug: string): Response | null {
  const slugs = getDocSlugSets(section);
  if (slugs.v3.has(slug) || !slugs.v2.has(slug)) return null;
  return new Response(null, {
    status: 301,
    headers: { Location: versionUrl(section, "v2", slug) },
  });
}

const DOCS_REDIRECTS: Record<string, string> = {
  "/docs/plugins/async": "/docs/plugins/data",
};
for (const [v1Slug, v2Slug] of Object.entries(V1_TO_V2_DOCS)) {
  if (v1Slug !== v2Slug) {
    DOCS_REDIRECTS[`/docs/${v1Slug}`] = `/docs/${v2Slug}`;
  }
}

const TUTORIAL_REDIRECTS: Record<string, string> = {};
for (const [v1Slug, v2Slug] of Object.entries(V1_TO_V2_TUTORIALS)) {
  if (v1Slug !== v2Slug) {
    TUTORIAL_REDIRECTS[`/tutorials/${v1Slug}`] = `/tutorials/${v2Slug}`;
  }
}

function resolveDocs(pathname: string): Response | null {
  const normalized = pathname.replace(/\/+$/, "");
  const redirect = DOCS_REDIRECTS[normalized];
  if (redirect) {
    return new Response(null, { status: 301, headers: { Location: redirect } });
  }
  if (pathname === "/docs" || pathname === "/docs/") {
    return renderDocsPage(null);
  }
  const match = pathname.match(/^\/docs\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/);
  if (match) return archivedRedirect("/docs", match[1] as string) ?? renderDocsPage(match[1] as string);
  return null;
}

function resolveTutorials(pathname: string): Response | null {
  const normalized = pathname.replace(/\/+$/, "");
  const redirect = TUTORIAL_REDIRECTS[normalized];
  if (redirect) {
    return new Response(null, { status: 301, headers: { Location: redirect } });
  }
  if (pathname === "/tutorials" || pathname === "/tutorials/") {
    return renderTutorialPage(null);
  }
  const match = pathname.match(/^\/tutorials\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/);
  if (match) return archivedRedirect("/tutorials", match[1] as string) ?? renderTutorialPage(match[1] as string);
  return null;
}

function resolveBlog(pathname: string): Response | null {
  if (pathname === "/blog" || pathname === "/blog/") {
    return renderBlogPage(null);
  }
  const match = pathname.match(/^\/blog\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/);
  if (match) return renderBlogPage(match[1]);
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

  // Keep relative module/comparison links valid, including the selected axis.
  if (pathname === "/experiments/synthetic" || pathname === "/experiments/synthetic/native") {
    return new Response(null, {
      status: 308,
      headers: { Location: `${pathname}/${url.search}` },
    });
  }

  // ── Sync routes (no Promise allocation) ──
  const syncResponse =
    routeSystem(pathname) ??
    resolveExperiment(pathname) ??
    resolveHomepage(pathname) ??
    resolveExamples(pathname, url) ??
    resolveArchivedDocs(pathname) ??
    resolveDocs(pathname) ??
    resolveTutorials(pathname) ??
    resolveBlog(pathname) ??
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
