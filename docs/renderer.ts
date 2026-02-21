// docs/renderer.ts
// Server-side renderer for documentation pages.
// Assembles shell template + sidebar + parsed markdown into full HTML pages.

const SITE = "https://vlist.dev";

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { Marked, type Tokens } from "marked";

// =============================================================================
// Sidebar & Overview Configuration
// =============================================================================

export interface DocItem {
  slug: string;
  name: string;
  desc: string;
}

export interface DocGroup {
  label: string;
  items: DocItem[];
}

export const DOC_GROUPS: DocGroup[] = [
  {
    label: "API Reference",
    items: [
      {
        slug: "api/reference",
        name: "Reference",
        desc: "Complete API — config, methods, events, types",
      },
      {
        slug: "api/types",
        name: "Types",
        desc: "TypeScript type definitions",
      },
      {
        slug: "api/events",
        name: "Events",
        desc: "Event system",
      },
    ],
  },
  {
    label: "Plugins",
    items: [
      {
        slug: "plugins/README",
        name: "Overview",
        desc: "All plugins with examples and costs",
      },
      {
        slug: "plugins/grid",
        name: "Grid",
        desc: "2D grid layout (withGrid)",
      },
      {
        slug: "plugins/sections",
        name: "Sections",
        desc: "Grouped lists with headers (withSections)",
      },
      {
        slug: "plugins/async",
        name: "Async",
        desc: "Lazy data loading (withAsync)",
      },
      {
        slug: "plugins/selection",
        name: "Selection",
        desc: "Item selection & keyboard nav (withSelection)",
      },
      {
        slug: "plugins/scale",
        name: "Scale",
        desc: "1M+ items (withScale)",
      },
      {
        slug: "plugins/scrollbar",
        name: "Scrollbar",
        desc: "Custom scrollbar UI (withScrollbar)",
      },
      {
        slug: "plugins/page",
        name: "Page",
        desc: "Document scrolling (withPage)",
      },
      {
        slug: "plugins/snapshots",
        name: "Snapshots",
        desc: "Scroll save/restore (withSnapshots)",
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        slug: "resources/benchmarks",
        name: "Benchmarks",
        desc: "Performance metrics and live suites",
      },
      {
        slug: "resources/bundle-size",
        name: "Bundle Size",
        desc: "Bundle analysis and optimization",
      },
      {
        slug: "resources/testing",
        name: "Testing",
        desc: "Test suite and patterns",
      },
      // {
      //   slug: "resources/known-issues",
      //   name: "Known Issues",
      //   desc: "Current limitations and workarounds",
      // },
    ],
  },
  {
    label: "Internals",
    items: [
      {
        slug: "internals/source-structure",
        name: "Source Structure",
        desc: "Complete source code map",
      },
      {
        slug: "internals/rendering",
        name: "Rendering",
        desc: "DOM rendering and virtualization",
      },
      {
        slug: "internals/context",
        name: "Context",
        desc: "BuilderContext and plugin system",
      },
      {
        slug: "internals/handlers",
        name: "Handlers",
        desc: "Event handler registration",
      },
      {
        slug: "internals/constants",
        name: "Constants",
        desc: "Default configuration values",
      },
    ],
  },
];

// Flat set of valid slugs for quick lookup
const VALID_SLUGS: Set<string> = new Set();
for (const group of DOC_GROUPS) {
  for (const item of group.items) {
    VALID_SLUGS.add(item.slug);
  }
}

// =============================================================================
// Overview Card Grid Configuration
// =============================================================================

// Separate from DOC_GROUPS because the overview page shows a curated subset
// with descriptions, and omits items that don't have card descriptions (Overview,
// Examples, Variable Heights).

interface OverviewSection {
  label: string;
  cards: { slug: string; name: string; desc: string }[];
}

const OVERVIEW_SECTIONS: OverviewSection[] = [
  {
    label: "API Reference",
    cards: [
      {
        slug: "api/reference",
        name: "Reference",
        desc: "Complete API — config, methods, events, types",
      },
      {
        slug: "api/types",
        name: "Types",
        desc: "TypeScript type definitions",
      },
      {
        slug: "api/events",
        name: "Events",
        desc: "Event system",
      },
    ],
  },
  {
    label: "Plugins",
    cards: [
      {
        slug: "plugins/README",
        name: "Overview",
        desc: "All 8 plugins with examples, costs, and compatibility",
      },
      {
        slug: "plugins/grid",
        name: "Grid",
        desc: "2D grid layout with virtualized rows",
      },
      {
        slug: "plugins/sections",
        name: "Sections",
        desc: "Grouped lists with sticky or inline headers",
      },
      {
        slug: "plugins/async",
        name: "Async",
        desc: "Async data loading with lazy loading and placeholders",
      },
      {
        slug: "plugins/selection",
        name: "Selection",
        desc: "Single &amp; multi-select with keyboard navigation",
      },
      {
        slug: "plugins/scale",
        name: "Scale",
        desc: "Handle 1M+ items with automatic scroll compression",
      },
      {
        slug: "plugins/scrollbar",
        name: "Scrollbar",
        desc: "Custom scrollbar UI with auto-hide and smooth dragging",
      },
      {
        slug: "plugins/page",
        name: "Page",
        desc: "Document-level scrolling with native browser scrollbar",
      },
      {
        slug: "plugins/snapshots",
        name: "Snapshots",
        desc: "Save and restore scroll position for SPA navigation",
      },
    ],
  },
  {
    label: "Resources",
    cards: [
      {
        slug: "resources/benchmarks",
        name: "Benchmarks",
        desc: "Live performance suites — FPS, render time, memory",
      },
      {
        slug: "resources/bundle-size",
        name: "Bundle Size",
        desc: "Bundle analysis and tree-shaking optimization",
      },
      {
        slug: "resources/testing",
        name: "Testing",
        desc: "1,181 tests passing, 4,540 assertions",
      },
      {
        slug: "resources/known-issues",
        name: "Known Issues",
        desc: "Current limitations and workarounds",
      },
      {
        slug: "resources/examples",
        name: "Examples",
        desc: "Interactive example documentation",
      },
    ],
  },
  {
    label: "Internals",
    cards: [
      {
        slug: "internals/source-structure",
        name: "Source Structure",
        desc: "Complete source code map",
      },
      {
        slug: "internals/rendering",
        name: "Rendering",
        desc: "DOM rendering and virtualization",
      },
      {
        slug: "internals/context",
        name: "Context",
        desc: "BuilderContext and plugin system",
      },
    ],
  },
];

// =============================================================================
// Paths
// =============================================================================

const DOCS_DIR = resolve("./docs");
const SHELL_PATH = join(DOCS_DIR, "shell.html");
const INDEX_FILE = "README.md";

// =============================================================================
// Template Loading
// =============================================================================

let shellCache: string | null = null;

function loadShell(): string {
  if (!shellCache) {
    shellCache = readFileSync(SHELL_PATH, "utf-8");
  }
  return shellCache;
}

/** Clear the cached template (call when files change in dev) */
export function clearCache(): void {
  shellCache = null;
}

// =============================================================================
// Table of Contents
// =============================================================================

interface TocItem {
  text: string;
  slug: string;
  depth: number;
}

/**
 * Extract headings (H2 only) from parsed HTML for table of contents.
 * Skips H1 (page title) and H3+ (too detailed).
 */
function extractToc(html: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex =
    /<h2[^>]*id="([^"]+)"[^>]*>(.*?)<a class="anchor"[^>]*>.*?<\/a><\/h2>/g;

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const slug = match[1];
    const htmlText = match[2];
    // Strip HTML tags from heading text
    const text = htmlText.replace(/<[^>]*>/g, "").trim();

    toc.push({ text, slug, depth: 2 });
  }

  return toc;
}

/**
 * Build table of contents HTML for the right sidebar.
 */
function buildToc(tocItems: TocItem[]): string {
  if (tocItems.length === 0) return "";

  const lines: string[] = [];
  lines.push(`<nav class="toc">`);
  lines.push(`  <div class="toc__title">On this page</div>`);
  lines.push(`  <ul class="toc__list">`);

  for (const item of tocItems) {
    lines.push(`    <li class="toc__item">`);
    lines.push(
      `      <a href="#${item.slug}" class="toc__link">${item.text}</a>`,
    );
    lines.push(`    </li>`);
  }

  lines.push(`  </ul>`);
  lines.push(`</nav>`);

  return lines.join("\n");
}

// =============================================================================
// Markdown Parser (configured once)
// =============================================================================

// Create a function that returns a marked instance with context-aware link resolution
function createMarkedInstance(currentSlug: string | null) {
  const marked = new Marked({
    gfm: true,
    breaks: false,
  });

  // Get current document directory for relative link resolution
  const currentDir = currentSlug
    ? currentSlug.split("/").slice(0, -1).join("/")
    : "";

  // Custom renderer — heading anchors + link rewriting
  const renderer = {
    heading({ text, depth }: Tokens.Heading): string {
      // Extract raw text for slug (strip HTML tags from the rendered inline text)
      const raw = text.replace(/<[^>]*>/g, "");
      const slug = raw
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      return `<h${depth} id="${slug}">${text} <a class="anchor" href="#${slug}">#</a></h${depth}>\n`;
    },

    link({ href, title, text }: Tokens.Link): string {
      if (href) {
        // Handle relative links: ./file.md or ../dir/file.md
        const relativeMatch = href.match(/^(\.\.?\/)(.+?)\.md(#.*)?$/);
        if (relativeMatch) {
          const prefix = relativeMatch[1]; // "./" or "../"
          const path = relativeMatch[2]; // "file" or "dir/file"
          const hash = relativeMatch[3] || ""; // "#section" or ""

          let resolvedPath: string;
          if (prefix === "./") {
            // Same directory: ./file.md
            resolvedPath = currentDir ? `${currentDir}/${path}` : path;
          } else {
            // Parent directory: ../file.md
            const parts = currentDir.split("/").filter(Boolean);
            parts.pop(); // Remove last segment (go up one level)
            resolvedPath =
              parts.length > 0 ? `${parts.join("/")}/${path}` : path;
          }

          href = `/docs/${resolvedPath}${hash}`;
        }
      }
      const titleAttr = title ? ` title="${title}"` : "";
      const external =
        href && href.startsWith("http")
          ? ' target="_blank" rel="noopener"'
          : "";
      return `<a href="${href}"${titleAttr}${external}>${text}</a>`;
    },
  };

  marked.use({ renderer });
  return marked;
}

// =============================================================================
// Navigation Helpers
// =============================================================================

function getPrevNext(currentSlug: string | null): {
  prev: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
} {
  if (!currentSlug) return { prev: null, next: null };

  // Flatten all items
  const allItems: { slug: string; name: string }[] = [];
  for (const group of DOC_GROUPS) {
    for (const item of group.items) {
      allItems.push({ slug: item.slug, name: item.name });
    }
  }

  const currentIndex = allItems.findIndex((item) => item.slug === currentSlug);
  if (currentIndex === -1) return { prev: null, next: null };

  return {
    prev: currentIndex > 0 ? allItems[currentIndex - 1] : null,
    next:
      currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null,
  };
}

function buildPrevNext(currentSlug: string | null): string {
  const { prev, next } = getPrevNext(currentSlug);
  if (!prev && !next) return "";

  const lines: string[] = [];
  lines.push(`<nav class="doc-nav">`);

  if (prev) {
    lines.push(
      `  <a href="/docs/${prev.slug}" class="doc-nav__link doc-nav__link--prev">`,
    );
    lines.push(`    <span class="doc-nav__label">← Previous</span>`);
    lines.push(`    <span class="doc-nav__title">${prev.name}</span>`);
    lines.push(`  </a>`);
  } else {
    lines.push(`  <div class="doc-nav__spacer"></div>`);
  }

  if (next) {
    lines.push(
      `  <a href="/docs/${next.slug}" class="doc-nav__link doc-nav__link--next">`,
    );
    lines.push(`    <span class="doc-nav__label">Next →</span>`);
    lines.push(`    <span class="doc-nav__title">${next.name}</span>`);
    lines.push(`  </a>`);
  }

  lines.push(`</nav>`);
  return lines.join("\n");
}

// =============================================================================
// Sidebar Generation
// =============================================================================

function buildSidebar(activeSlug: string | null): string {
  const lines: string[] = [];

  for (const group of DOC_GROUPS) {
    lines.push(`<div class="sidebar__group">`);
    lines.push(`  <div class="sidebar__label">${group.label}</div>`);
    for (const item of group.items) {
      const href = item.slug === "" ? "/docs/" : `/docs/${item.slug}`;
      const matchSlug = item.slug === "" ? null : item.slug;
      const active = activeSlug === matchSlug ? " sidebar__link--active" : "";
      lines.push(
        `  <a href="${href}" class="sidebar__link${active}">${item.name}</a>`,
      );
    }
    lines.push(`</div>`);
  }

  return lines.join("\n");
}

// =============================================================================
// Overview Content Generation
// =============================================================================

function buildOverviewContent(): string {
  const lines: string[] = [];

  lines.push(`<div class="overview">`);
  lines.push(`  <h1 class="overview__title">Documentation</h1>`);
  lines.push(
    `  <p class="overview__tagline">Reference documentation for the vlist virtual list library. For learning content, see <a href="/tutorials">Tutorials</a>.</p>`,
  );

  for (const section of OVERVIEW_SECTIONS) {
    lines.push(`  <div class="overview__section">`);
    lines.push(
      `    <div class="overview__section-title">${section.label}</div>`,
    );
    lines.push(`    <div class="overview__grid">`);
    for (const card of section.cards) {
      lines.push(`      <a href="/docs/${card.slug}" class="overview__card">`);
      lines.push(
        `        <div class="overview__card-title">${card.name}</div>`,
      );
      lines.push(`        <div class="overview__card-desc">${card.desc}</div>`);
      lines.push(`      </a>`);
    }
    lines.push(`    </div>`);
    lines.push(`  </div>`);
  }

  lines.push(`</div>`);
  return lines.join("\n");
}

// =============================================================================
// Title Extraction
// =============================================================================

/**
 * Extract the page title from parsed HTML.
 * Looks for the first <h1> and strips the anchor link + HTML tags.
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
  if (!match) return null;
  // Strip HTML tags (anchor links, code, etc.) and the trailing #
  return match[1]
    .replace(/<[^>]*>/g, "")
    .replace(/#$/, "")
    .trim();
}

// =============================================================================
// Page Assembly
// =============================================================================

function assemblePage(
  slug: string | null,
  content: string,
  title: string,
  description: string,
  toc: string = "",
): string {
  const shell = loadShell();
  const sidebar = buildSidebar(slug);
  const prevNext = buildPrevNext(slug);
  const url = slug ? `${SITE}/docs/${slug}` : `${SITE}/docs/`;

  return shell
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{URL}}/g, url)
    .replace("{{SIDEBAR}}", sidebar)
    .replace("{{CONTENT}}", content)
    .replace("{{TOC}}", toc)
    .replace("{{PREVNEXT}}", prevNext);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a docs page.
 *
 * @param slug - Doc slug (e.g. "vlist", "types") or null for the overview.
 * @returns A Response with the full HTML page, or null if the doc doesn't exist.
 */
export function renderDocsPage(slug: string | null): Response | null {
  // Overview page
  if (slug === null) {
    const content = buildOverviewContent();
    const html = assemblePage(
      null,
      content,
      "VList — Docs",
      "VList documentation — API reference, configuration, events, methods, styling, and more.",
    );
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Validate slug exists in our config
  if (!VALID_SLUGS.has(slug)) return null;

  // Resolve markdown file path
  const mdFile = slug === "" ? INDEX_FILE : `${slug}.md`;
  const mdPath = join(DOCS_DIR, mdFile);
  if (!existsSync(mdPath)) return null;

  // Read and parse markdown with context-aware link resolution
  const mdSource = readFileSync(mdPath, "utf-8");
  const marked = createMarkedInstance(slug);
  const parsedHtml = marked.parse(mdSource) as string;

  // Extract table of contents
  const tocItems = extractToc(parsedHtml);
  const tocHtml = buildToc(tocItems);

  // Build prev/next navigation
  const prevNextHtml = buildPrevNext(slug);

  // Wrap in .md container with prev/next at bottom
  const content = `<div class="md">${parsedHtml}${prevNextHtml}</div>`;

  // Extract title from first h1
  const h1Title = extractTitle(parsedHtml);
  const title = h1Title ? `${h1Title} — VList docs` : "VList — Docs";
  const description = h1Title
    ? `VList ${h1Title.toLowerCase()} — documentation and API reference.`
    : "VList documentation — API reference, configuration, events, methods, styling, and more.";

  const html = assemblePage(slug, content, title, description, tocHtml);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
