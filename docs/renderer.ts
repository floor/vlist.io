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
    label: "Getting Started",
    items: [
      {
        slug: "",
        name: "Overview",
        desc: "",
      },
      {
        slug: "QUICKSTART",
        name: "Quick Start",
        desc: "Get started in 5 minutes with common patterns",
      },
      {
        slug: "guides/getting-started",
        name: "Documentation",
        desc: "Complete introduction, configuration, and usage",
      },
      {
        slug: "guides/builder-pattern",
        name: "Builder Pattern",
        desc: "Composable plugins — pay only for what you use",
      },
    ],
  },
  {
    label: "Guides",
    items: [
      {
        slug: "guides/accessibility",
        name: "Accessibility",
        desc: "WAI-ARIA, keyboard navigation, screen readers",
      },
      {
        slug: "guides/mobile",
        name: "Mobile",
        desc: "Touch optimization and mobile considerations",
      },
      {
        slug: "guides/optimization",
        name: "Optimization",
        desc: "Performance tuning and best practices",
      },
      {
        slug: "guides/reverse-mode",
        name: "Reverse Mode",
        desc: "Chat UI with auto-scroll and history loading",
      },
      {
        slug: "guides/styling",
        name: "Styling",
        desc: "CSS customization, tokens, variants, dark mode",
      },
    ],
  },
  {
    label: "Plugins",
    items: [
      {
        slug: "plugins/README",
        name: "Plugins Overview",
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
    label: "API Reference",
    items: [
      {
        slug: "api/methods",
        name: "Methods",
        desc: "All public methods",
      },
      {
        slug: "api/events",
        name: "Events",
        desc: "Event system and available events",
      },
      {
        slug: "api/types",
        name: "Types",
        desc: "TypeScript interfaces and definitions",
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
      {
        slug: "resources/known-issues",
        name: "Known Issues",
        desc: "Current limitations and workarounds",
      },
    ],
  },
  {
    label: "Internals",
    items: [
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
// Sandbox, Variable Heights).

interface OverviewSection {
  label: string;
  cards: { slug: string; name: string; desc: string }[];
}

const OVERVIEW_SECTIONS: OverviewSection[] = [
  {
    label: "Getting Started",
    cards: [
      {
        slug: "QUICKSTART",
        name: "Quick Start",
        desc: "Get started in 5 minutes with 7 common patterns",
      },
      {
        slug: "guides/getting-started",
        name: "Documentation",
        desc: "Complete introduction, configuration, and usage",
      },
      {
        slug: "guides/builder-pattern",
        name: "Builder Pattern",
        desc: "Composable plugins — pay only for what you use",
      },
      {
        slug: "guides/styling",
        name: "Styling",
        desc: "CSS customization, tokens, variants, dark mode",
      },
      {
        slug: "guides/accessibility",
        name: "Accessibility",
        desc: "WAI-ARIA, keyboard navigation, screen reader support",
      },
      {
        slug: "guides/optimization",
        name: "Optimization",
        desc: "Performance tuning and best practices",
      },
      {
        slug: "guides/reverse-mode",
        name: "Reverse Mode",
        desc: "Chat UI with auto-scroll and history loading",
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
    label: "API Reference",
    cards: [
      {
        slug: "api/methods",
        name: "Methods",
        desc: "All public methods — data, scroll, selection, lifecycle",
      },
      {
        slug: "api/events",
        name: "Events",
        desc: "Event system and all available events",
      },
      {
        slug: "api/types",
        name: "Types",
        desc: "TypeScript interfaces and type definitions",
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
        desc: "1,739 tests, 99.99% coverage, and testing patterns",
      },
      {
        slug: "resources/known-issues",
        name: "Known Issues",
        desc: "Current limitations and workarounds",
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
// Markdown Parser (configured once)
// =============================================================================

const marked = new Marked({
  gfm: true,
  breaks: false,
});

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
      // ./file.md → /docs/file
      // ./file.md#section → /docs/file#section
      const mdMatch = href.match(/^\.\/([a-zA-Z0-9_-]+)\.md(#.*)?$/);
      if (mdMatch) {
        href = `/docs/${mdMatch[1]}${mdMatch[2] || ""}`;
      }
    }
    const titleAttr = title ? ` title="${title}"` : "";
    const external =
      href && href.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${href}"${titleAttr}${external}>${text}</a>`;
  },
};

marked.use({ renderer });

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
    `  <p class="overview__tagline">API reference, configuration, events, methods, styling, and internals for the vlist virtual list library.</p>`,
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
): string {
  const shell = loadShell();
  const sidebar = buildSidebar(slug);
  const url = slug ? `${SITE}/docs/${slug}` : `${SITE}/docs/`;

  return shell
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{URL}}/g, url)
    .replace("{{SIDEBAR}}", sidebar)
    .replace("{{CONTENT}}", content);
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

  // Read and parse markdown
  const mdSource = readFileSync(mdPath, "utf-8");
  const parsedHtml = marked.parse(mdSource) as string;

  // Wrap in .md container
  const content = `<div class="md">${parsedHtml}</div>`;

  // Extract title from first h1
  const h1Title = extractTitle(parsedHtml);
  const title = h1Title ? `${h1Title} — VList docs` : "VList — Docs";
  const description = h1Title
    ? `VList ${h1Title.toLowerCase()} — documentation and API reference.`
    : "VList documentation — API reference, configuration, events, methods, styling, and more.";

  const html = assemblePage(slug, content, title, description);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
