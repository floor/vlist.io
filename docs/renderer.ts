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
        slug: "vlist",
        name: "Documentation",
        desc: "Configuration, usage, events, selection, infinite scroll, and more",
      },
      {
        slug: "accessibility",
        name: "Accessibility",
        desc: "WAI-ARIA listbox, keyboard navigation, screen readers",
      },
      {
        slug: "styles",
        name: "Styles",
        desc: "CSS tokens, variants, dark mode, and customization",
      },
      {
        slug: "optimization",
        name: "Optimization",
        desc: "Performance tuning and best practices",
      },
      {
        slug: "benchmarks",
        name: "Benchmarks",
        desc: "Live performance suites — FPS, render, memory",
      },
      {
        slug: "known-issues",
        name: "Known Issues",
        desc: "Current limitations and workarounds",
      },
    ],
  },
  {
    label: "Architecture",
    items: [
      {
        slug: "types",
        name: "Types",
        desc: "TypeScript interfaces and type definitions",
      },
      {
        slug: "constants",
        name: "Constants",
        desc: "Default values and configuration constants",
      },
      {
        slug: "context",
        name: "Context",
        desc: "Internal state container and coordination",
      },
    ],
  },
  {
    label: "Modules",
    items: [
      {
        slug: "render",
        name: "Render",
        desc: "DOM rendering, virtualization, and element pooling",
      },
      {
        slug: "data",
        name: "Data",
        desc: "Sparse storage, placeholders, and async adapters",
      },
      {
        slug: "scroll",
        name: "Scroll",
        desc: "Scroll controller, custom scrollbar, and velocity",
      },
      {
        slug: "selection",
        name: "Selection",
        desc: "Single & multi-select state management",
      },
      {
        slug: "events",
        name: "Events",
        desc: "Type-safe event emitter system",
      },
      {
        slug: "compression",
        name: "Compression",
        desc: "Handling 1M+ items with scroll compression",
      },
    ],
  },
  {
    label: "API",
    items: [
      {
        slug: "methods",
        name: "Methods",
        desc: "Public API — data, scroll, selection, lifecycle",
      },
      {
        slug: "handlers",
        name: "Handlers",
        desc: "Scroll, click, and keyboard event handlers",
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        slug: "sandbox",
        name: "Sandbox",
        desc: "",
      },
      {
        slug: "prompt-variable-heights",
        name: "Variable Heights",
        desc: "",
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
        slug: "vlist",
        name: "Documentation",
        desc: "Configuration, usage, events, selection, infinite scroll, and more",
      },
      {
        slug: "styles",
        name: "Styles",
        desc: "CSS tokens, variants, dark mode, and customization",
      },
      {
        slug: "optimization",
        name: "Optimization",
        desc: "Performance tuning and best practices",
      },
      {
        slug: "compression",
        name: "Compression",
        desc: "Handling 1M+ items with scroll compression",
      },
      {
        slug: "accessibility",
        name: "Accessibility",
        desc: "WAI-ARIA listbox, keyboard navigation, screen readers",
      },
      {
        slug: "benchmarks",
        name: "Benchmarks",
        desc: "Live performance suites — FPS, render, memory",
      },
      {
        slug: "known-issues",
        name: "Known Issues",
        desc: "Current limitations and workarounds",
      },
    ],
  },
  {
    label: "Architecture",
    cards: [
      {
        slug: "types",
        name: "Types",
        desc: "TypeScript interfaces and type definitions",
      },
      {
        slug: "constants",
        name: "Constants",
        desc: "Default values and configuration constants",
      },
      {
        slug: "context",
        name: "Context",
        desc: "Internal state container and coordination",
      },
    ],
  },
  {
    label: "Modules",
    cards: [
      {
        slug: "render",
        name: "Render",
        desc: "DOM rendering, virtualization, and element pooling",
      },
      {
        slug: "data",
        name: "Data",
        desc: "Sparse storage, placeholders, and async adapters",
      },
      {
        slug: "scroll",
        name: "Scroll",
        desc: "Scroll controller, custom scrollbar, and velocity",
      },
      {
        slug: "selection",
        name: "Selection",
        desc: "Single &amp; multi-select state management",
      },
      {
        slug: "events",
        name: "Events",
        desc: "Type-safe event emitter system",
      },
    ],
  },
  {
    label: "API",
    cards: [
      {
        slug: "methods",
        name: "Methods",
        desc: "Public API — data, scroll, selection, lifecycle",
      },
      {
        slug: "handlers",
        name: "Handlers",
        desc: "Scroll, click, and keyboard event handlers",
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

  lines.push(`<div class="index">`);
  lines.push(`  <h1 class="index__title">Documentation</h1>`);
  lines.push(
    `  <p class="index__tagline">API reference, configuration, events, methods, styling, and internals for the vlist virtual list library.</p>`,
  );

  for (const section of OVERVIEW_SECTIONS) {
    lines.push(`  <div class="index__section">`);
    lines.push(`    <div class="index__section-title">${section.label}</div>`);
    lines.push(`    <div class="index__grid">`);
    for (const card of section.cards) {
      lines.push(`      <a href="/docs/${card.slug}" class="index__card">`);
      lines.push(`        <div class="index__card-title">${card.name}</div>`);
      lines.push(`        <div class="index__card-desc">${card.desc}</div>`);
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
