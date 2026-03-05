// src/server/sitemap.ts
// Sitemap, robots.txt, and git-based lastmod dates.
//
// Phase 5: Uses a single batched git command to resolve all file modification
// dates at startup (~25ms) instead of ~40 individual execSync calls (~1.3s).

import { execSync } from "child_process";
import { ROOT, SITE } from "./config";
import { CACHE_META } from "./cache";
import {
  DOC_GROUPS,
  TUTORIAL_GROUPS,
  EXAMPLE_GROUPS,
  BENCH_GROUPS,
} from "./renderers";

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
