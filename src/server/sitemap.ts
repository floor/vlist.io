// src/server/sitemap.ts
// Sitemap, robots.txt, and git-based lastmod dates.
//
// Phase 5: Uses a single batched git command to resolve all file modification
// dates at startup (~25ms) instead of ~40 individual execSync calls (~1.3s).

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ROOT, SITE } from "./config";
import { CACHE_META } from "./cache";
import { V1_TO_V2_DOCS, V1_TO_V2_TUTORIALS } from "./version-map";
import {
  DOC_GROUPS,
  TUTORIAL_GROUPS,
  DOC_V1_GROUPS,
  TUTORIAL_V1_GROUPS,
  BLOG_GROUPS,
  EXAMPLE_GROUPS,
  BENCH_GROUPS,
} from "./renderers";

// =============================================================================
// RFC detail pages
// =============================================================================

/**
 * RFC detail pages live in `docs/slugs.json` (the valid-slug allowlist), not in
 * `navigation.json` — so they're absent from the sidebar AND from anything driven
 * off the nav data (prev/next, sitemap). Read them here so they're indexed.
 */
function loadRfcSlugs(): string[] {
  try {
    const path = join(ROOT, "docs/slugs.json");
    if (!existsSync(path)) return [];
    const slugs = JSON.parse(readFileSync(path, "utf-8")) as string[];
    return slugs.filter((s) => s.startsWith("rfcs/RFC-"));
  } catch {
    return [];
  }
}

const RFC_SLUGS = loadRfcSlugs();

// =============================================================================
// Git-based lastmod (batched)
// =============================================================================

export const FALLBACK_DATE = new Date().toISOString().split("T")[0];

/**
 * Run a single git command that returns the most recent commit date for every
 * file in the repository. Output format is alternating date lines and filename
 * lines separated by blank lines (one group per commit).
 *
 * Since `git log` outputs in reverse chronological order, the first occurrence
 * of any file path gives us its most recent modification date.
 *
 * Returns a Map<filePath, "YYYY-MM-DD">.
 */
function batchGitLastmod(): Map<string, string> {
  const result = new Map<string, string>();
  try {
    const output = execSync(
      `git log --format="%cd" --date=short --name-only --diff-filter=ACMR HEAD`,
      { cwd: ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
    );

    // Parse output: alternating date lines and filename lines
    let currentDate = "";
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Date lines match YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        currentDate = trimmed;
        continue;
      }

      // File line — only record the first (most recent) date per file
      if (currentDate && !result.has(trimmed)) {
        result.set(trimmed, currentDate);
      }
    }
  } catch {
    // Git not available — all files get fallback date
  }

  return result;
}

/**
 * Look up the most recent date across one or more file paths.
 * Supports both exact file paths and directory prefixes (trailing `/`).
 *
 * For directory prefixes, scans all keys in the map that start with that prefix
 * and returns the most recent date among them.
 */
function resolveDate(
  allDates: Map<string, string>,
  ...filePaths: string[]
): string {
  let latest = "";

  for (const filePath of filePaths) {
    if (filePath.endsWith("/")) {
      // Directory prefix — find the most recent file under this path
      for (const [key, date] of allDates) {
        if (key.startsWith(filePath) && date > latest) {
          latest = date;
        }
      }
    } else {
      // Exact file lookup
      const date = allDates.get(filePath);
      if (date && date > latest) {
        latest = date;
      }
    }
  }

  return latest || FALLBACK_DATE;
}

// =============================================================================
// Lastmod Map
// =============================================================================

/**
 * Build a map of URL path → lastmod date at startup.
 * Runs a single git command (~25ms) instead of ~40 separate processes.
 */
function buildLastmodMap(): Map<string, string> {
  const allDates = batchGitLastmod();
  const map = new Map<string, string>();

  // Landing
  map.set("/", resolveDate(allDates, "src/server/shells/homepage.eta"));

  // Docs overview → both navigation and overview cards, plus shared shell
  map.set(
    "/docs/",
    resolveDate(
      allDates,
      "docs/navigation.json",
      "docs/overview.json",
      "src/server/shells/content.html",
      "styles/content.css",
    ),
  );

  // Docs pages → markdown files
  for (const group of DOC_GROUPS) {
    for (const item of group.items) {
      if (item.slug === "") continue;
      const file = `docs/${item.slug}.md`;
      map.set(`/docs/${item.slug}`, resolveDate(allDates, file));
    }
  }

  // RFC detail pages (from slugs.json, not navigation.json) → markdown files
  for (const slug of RFC_SLUGS) {
    map.set(`/docs/${slug}`, resolveDate(allDates, `docs/${slug}.md`));
  }

  // Docs v1 overview
  map.set(
    "/docs/v1/",
    resolveDate(
      allDates,
      "docs/v1/navigation.json",
      "docs/v1/overview.json",
      "src/server/shells/content.html",
      "styles/content.css",
    ),
  );

  // Docs v1 pages
  for (const group of DOC_V1_GROUPS) {
    for (const item of group.items) {
      if (item.slug === "") continue;
      const file = `docs/v1/${item.slug}.md`;
      map.set(`/docs/v1/${item.slug}`, resolveDate(allDates, file));
    }
  }

  // Tutorials overview → navigation config, plus shared shell
  map.set(
    "/tutorials/",
    resolveDate(
      allDates,
      "tutorials/navigation.json",
      "src/server/shells/content.html",
      "styles/content.css",
    ),
  );

  // Tutorials pages → markdown files
  for (const group of TUTORIAL_GROUPS) {
    for (const item of group.items) {
      const file = `tutorials/${item.slug}.md`;
      map.set(`/tutorials/${item.slug}`, resolveDate(allDates, file));
    }
  }

  // Tutorials v1 overview
  map.set(
    "/tutorials/v1/",
    resolveDate(
      allDates,
      "tutorials/v1/navigation.json",
      "src/server/shells/content.html",
      "styles/content.css",
    ),
  );

  // Tutorials v1 pages
  for (const group of TUTORIAL_V1_GROUPS) {
    for (const item of group.items) {
      const file = `tutorials/v1/${item.slug}.md`;
      map.set(`/tutorials/v1/${item.slug}`, resolveDate(allDates, file));
    }
  }

  // Blog overview
  map.set(
    "/blog/",
    resolveDate(
      allDates,
      "blog/navigation.json",
      "src/server/shells/content.html",
      "styles/content.css",
    ),
  );

  // Blog pages → markdown files
  for (const group of BLOG_GROUPS) {
    for (const item of group.items) {
      const file = `blog/${item.slug}.md`;
      map.set(`/blog/${item.slug}`, resolveDate(allDates, file));
    }
  }

  // Examples overview → navigation config
  map.set("/examples/", resolveDate(allDates, "examples/navigation.json"));

  // Examples pages → use directory prefix so all variants are included
  for (const group of EXAMPLE_GROUPS) {
    for (const item of group.items) {
      const dir = `examples/${item.slug}/`;
      map.set(`/examples/${item.slug}`, resolveDate(allDates, dir));
    }
  }

  // Benchmarks overview → navigation config
  map.set("/benchmarks/", resolveDate(allDates, "benchmarks/navigation.json"));

  // Benchmark pages → specific suite/comparison files per slug
  const BENCH_FILE_MAP: Record<string, string[]> = {
    render: ["benchmarks/suites/render/"],
    scroll: ["benchmarks/suites/scroll/"],
    memory: ["benchmarks/suites/memory/"],
    scrollto: ["benchmarks/suites/scrollto/"],
    "react-window": ["benchmarks/comparison/react-window.js"],
    "react-virtuoso": ["benchmarks/comparison/react-virtuoso.js"],
    "tanstack-virtual": ["benchmarks/comparison/tanstack-virtual.js"],
    virtua: ["benchmarks/comparison/virtua.js"],
    "vue-virtual-scroller": ["benchmarks/comparison/vue-virtual-scroller.js"],
    "legend-list": ["benchmarks/comparison/legend-list.js"],
    bundle: ["benchmarks/script.js"],
    features: ["benchmarks/script.js"],
    comparisons: ["benchmarks/script.js"],
    "performance-comparison": ["benchmarks/script.js"],
  };

  for (const group of BENCH_GROUPS) {
    for (const item of group.items) {
      const files = BENCH_FILE_MAP[item.slug] ?? ["benchmarks/script.js"];
      map.set(`/benchmarks/${item.slug}`, resolveDate(allDates, ...files));
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

  // RFC detail pages — reachable via slugs.json but absent from the nav groups
  for (const slug of RFC_SLUGS) {
    urls.push({ loc: `/docs/${slug}`, priority: "0.6" });
  }

  // Docs v1 — pages with a v2 equivalent get lower priority (canonical points to v2)
  urls.push({ loc: "/docs/v1/", priority: "0.5" });
  for (const group of DOC_V1_GROUPS) {
    for (const item of group.items) {
      if (item.slug === "") continue;
      const hasV2 = item.slug in V1_TO_V2_DOCS;
      urls.push({ loc: `/docs/v1/${item.slug}`, priority: hasV2 ? "0.3" : "0.4" });
    }
  }

  // Tutorials
  urls.push({ loc: "/tutorials/", priority: "0.9" });
  for (const group of TUTORIAL_GROUPS) {
    for (const item of group.items) {
      urls.push({ loc: `/tutorials/${item.slug}`, priority: "0.7" });
    }
  }

  // Tutorials v1 — pages with a v2 equivalent get lower priority
  urls.push({ loc: "/tutorials/v1/", priority: "0.5" });
  for (const group of TUTORIAL_V1_GROUPS) {
    for (const item of group.items) {
      const hasV2 = item.slug in V1_TO_V2_TUTORIALS;
      urls.push({ loc: `/tutorials/v1/${item.slug}`, priority: hasV2 ? "0.3" : "0.4" });
    }
  }

  // Blog
  urls.push({ loc: "/blog/", priority: "0.8" });
  for (const group of BLOG_GROUPS) {
    for (const item of group.items) {
      urls.push({ loc: `/blog/${item.slug}`, priority: "0.6" });
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
      const isV1 = u.loc.includes("/v1/") || u.loc.endsWith("/v1");
    const changefreq = isV1
        ? "yearly"
        : u.priority === "1.0"
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
      "Cache-Control": CACHE_META,
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
      "Cache-Control": CACHE_META,
    },
  });
}
