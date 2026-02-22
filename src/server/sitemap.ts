// src/server/sitemap.ts
// Sitemap, robots.txt, and git-based lastmod dates.

import { execSync } from "child_process";
import { ROOT, SITE } from "./config";
import {
  DOC_GROUPS,
  TUTORIAL_GROUPS,
  EXAMPLE_GROUPS,
  BENCH_GROUPS,
} from "./renderers";

// =============================================================================
// Git-based lastmod
// =============================================================================

/**
 * Get the last commit date (YYYY-MM-DD) across one or more files.
 * When multiple files are given, returns the most recent date.
 * Returns null if none of the files have git history.
 */
export function gitLastmod(...filePaths: string[]): string | null {
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

export const FALLBACK_DATE = new Date().toISOString().split("T")[0];

// =============================================================================
// Lastmod Map
// =============================================================================

/**
 * Build a map of URL path → lastmod date at startup.
 * Runs ~40 git commands once — takes under a second.
 */
function buildLastmodMap(): Map<string, string> {
  const map = new Map<string, string>();

  // Landing
  map.set("/", gitLastmod("index.html") ?? FALLBACK_DATE);

  // Docs overview → both navigation and overview cards, plus shared shell
  map.set(
    "/docs/",
    gitLastmod(
      "docs/navigation.json",
      "docs/overview.json",
      "src/server/shells/content.html",
      "styles/content.css",
    ) ?? FALLBACK_DATE,
  );

  // Docs pages → markdown files
  for (const group of DOC_GROUPS) {
    for (const item of group.items) {
      if (item.slug === "") continue;
      const file = `docs/${item.slug}.md`;
      map.set(`/docs/${item.slug}`, gitLastmod(file) ?? FALLBACK_DATE);
    }
  }

  // Tutorials overview → navigation config, plus shared shell
  map.set(
    "/tutorials/",
    gitLastmod(
      "tutorials/navigation.json",
      "src/server/shells/content.html",
      "styles/content.css",
    ) ?? FALLBACK_DATE,
  );

  // Tutorials pages → markdown files
  for (const group of TUTORIAL_GROUPS) {
    for (const item of group.items) {
      const file = `tutorials/${item.slug}.md`;
      map.set(`/tutorials/${item.slug}`, gitLastmod(file) ?? FALLBACK_DATE);
    }
  }

  // Examples overview → navigation config
  map.set(
    "/examples/",
    gitLastmod("examples/navigation.json") ?? FALLBACK_DATE,
  );

  // Examples pages → use the full directory so variants are included
  for (const group of EXAMPLE_GROUPS) {
    for (const item of group.items) {
      const dir = `examples/${item.slug}`;
      map.set(`/examples/${item.slug}`, gitLastmod(`${dir}/`) ?? FALLBACK_DATE);
    }
  }

  // Benchmarks overview → navigation config
  map.set(
    "/benchmarks/",
    gitLastmod("benchmarks/navigation.json") ?? FALLBACK_DATE,
  );

  // Benchmark pages → specific suite/comparison files per slug
  const BENCH_FILE_MAP: Record<string, string[]> = {
    render: ["benchmarks/suites/render/"],
    scroll: ["benchmarks/suites/scroll/"],
    memory: ["benchmarks/suites/memory/"],
    scrollto: ["benchmarks/suites/scrollto/"],
    "react-window": ["benchmarks/comparison/react-window.js"],
    "tanstack-virtual": ["benchmarks/comparison/tanstack-virtual.js"],
    virtua: ["benchmarks/comparison/virtua.js"],
    "vue-virtual-scroller": ["benchmarks/comparison/vue-virtual-scroller.js"],
    bundle: ["benchmarks/script.js"],
    features: ["benchmarks/script.js"],
    comparisons: ["benchmarks/script.js"],
    "performance-comparison": ["benchmarks/script.js"],
  };

  for (const group of BENCH_GROUPS) {
    for (const item of group.items) {
      const files = BENCH_FILE_MAP[item.slug] ?? ["benchmarks/script.js"];
      map.set(
        `/benchmarks/${item.slug}`,
        gitLastmod(...files) ?? FALLBACK_DATE,
      );
    }
  }

  return map;
}

export const LASTMOD = buildLastmodMap();

// =============================================================================
// Sitemap
// =============================================================================

/**
 * Build /sitemap.xml dynamically from the renderer config arrays.
 * Always in sync — add a page to any renderer and it appears here.
 */
export function renderSitemap(): Response {
  const urls: { loc: string; priority: string }[] = [];

  // Landing
  urls.push({ loc: "/", priority: "1.0" });

  // Docs
  urls.push({ loc: "/docs/", priority: "0.9" });
  for (const group of DOC_GROUPS) {
    for (const item of group.items) {
      if (item.slug === "") continue;
      urls.push({ loc: `/docs/${item.slug}`, priority: "0.7" });
    }
  }

  // Tutorials
  urls.push({ loc: "/tutorials/", priority: "0.9" });
  for (const group of TUTORIAL_GROUPS) {
    for (const item of group.items) {
      urls.push({ loc: `/tutorials/${item.slug}`, priority: "0.7" });
    }
  }

  // Examples
  urls.push({ loc: "/examples/", priority: "0.9" });
  for (const group of EXAMPLE_GROUPS) {
    for (const item of group.items) {
      urls.push({ loc: `/examples/${item.slug}`, priority: "0.6" });
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
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urls.map((u) => {
      const lastmod = LASTMOD.get(u.loc) ?? FALLBACK_DATE;
      const changefreq =
        u.priority === "1.0"
          ? "weekly"
          : u.priority === "0.9"
            ? "weekly"
            : "monthly";
      return `  <url>\n    <loc>${SITE}${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
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

export function renderRobots(): Response {
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
