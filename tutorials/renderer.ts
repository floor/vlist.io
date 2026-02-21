/**
 * Tutorials Renderer
 * Server-side rendering for tutorial pages
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Marked, Tokens } from "marked";

const SITE = "https://vlist.dev";

// Tutorial navigation structure
interface TutorialItem {
  slug: string;
  name: string;
  desc: string;
}

interface TutorialGroup {
  label: string;
  items: TutorialItem[];
}

export const TUTORIAL_GROUPS: TutorialGroup[] = [
  {
    label: "Getting Started",
    items: [
      {
        slug: "quick-start",
        name: "Quick Start",
        desc: "Get started in under 5 minutes",
      },
      {
        slug: "getting-started",
        name: "Getting Started",
        desc: "Complete guide to installation and configuration",
      },
      {
        slug: "builder-pattern",
        name: "Builder Pattern",
        desc: "Understanding the plugin system",
      },
    ],
  },
  {
    label: "Building Features",
    items: [
      {
        slug: "chat-interface",
        name: "Chat Interface",
        desc: "Create a messaging UI with reverse mode",
      },
    ],
  },
  {
    label: "Advanced Topics",
    items: [
      {
        slug: "accessibility",
        name: "Accessibility",
        desc: "WAI-ARIA and keyboard navigation",
      },
      {
        slug: "mobile",
        name: "Mobile",
        desc: "Touch interactions and mobile optimization",
      },
      {
        slug: "optimization",
        name: "Optimization",
        desc: "Performance tuning and best practices",
      },
      {
        slug: "styling",
        name: "Styling",
        desc: "CSS customization, tokens, and theming",
      },
    ],
  },
];

// Flat set of valid slugs
const VALID_SLUGS: Set<string> = new Set();
for (const group of TUTORIAL_GROUPS) {
  for (const item of group.items) {
    VALID_SLUGS.add(item.slug);
  }
}

const TUTORIALS_DIR = resolve("./tutorials");
const SHELL_PATH = join(TUTORIALS_DIR, "shell.html");
const INDEX_FILE = join(TUTORIALS_DIR, "index.md");

// Cache the shell template
let shellCache: string | null = null;

function loadShell(): string {
  if (!shellCache) {
    shellCache = readFileSync(SHELL_PATH, "utf-8");
  }
  return shellCache;
}

export function clearCache(): void {
  shellCache = null;
}

// Extract table of contents from markdown
interface TocItem {
  depth: number;
  text: string;
  slug: string;
}

function extractToc(markdown: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /^(#{2})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const slug = match[2]
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    const htmlText = match[2].replace(/`([^`]+)`/g, "<code>$1</code>");
    const text = htmlText;

    toc.push({
      depth: 2,
      text,
      slug,
    });
  }
  return toc;
}

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

          href = `/tutorials/${resolvedPath}${hash}`;
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
  for (const group of TUTORIAL_GROUPS) {
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
      `  <a href="/tutorials/${prev.slug}" class="doc-nav__link doc-nav__link--prev">`,
    );
    lines.push(`    <span class="doc-nav__label">← Previous</span>`);
    lines.push(`    <span class="doc-nav__title">${prev.name}</span>`);
    lines.push(`  </a>`);
  } else {
    lines.push(`  <div class="doc-nav__spacer"></div>`);
  }

  if (next) {
    lines.push(
      `  <a href="/tutorials/${next.slug}" class="doc-nav__link doc-nav__link--next">`,
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

// Build sidebar navigation
function buildSidebar(activeSlug: string | null): string {
  const lines: string[] = [];

  for (const group of TUTORIAL_GROUPS) {
    lines.push(`<div class="sidebar__group">`);
    lines.push(`  <div class="sidebar__label">${group.label}</div>`);
    for (const item of group.items) {
      const href = `/tutorials/${item.slug}`;
      const matchSlug = item.slug;
      const active = activeSlug === matchSlug ? " sidebar__link--active" : "";
      lines.push(
        `  <a href="${href}" class="sidebar__link${active}">${item.name}</a>`,
      );
    }
    lines.push(`</div>`);
  }

  return lines.join("\n");
}

// Build overview page content
function buildOverviewContent(): string {
  const lines: string[] = [];

  lines.push(`<div class="overview">`);
  lines.push(`  <h1 class="overview__title">VList Tutorials</h1>`);
  lines.push(
    `  <p class="overview__tagline">Step-by-step guides to learn vlist from beginner to advanced.</p>`,
  );

  for (const group of TUTORIAL_GROUPS) {
    lines.push(`  <div class="overview__section">`);
    lines.push(`    <div class="overview__section-title">${group.label}</div>`);
    lines.push(`    <div class="overview__grid">`);
    for (const item of group.items) {
      lines.push(
        `      <a href="/tutorials/${item.slug}" class="overview__card">`,
      );
      lines.push(
        `        <div class="overview__card-title">${item.name}</div>`,
      );
      lines.push(`        <div class="overview__card-desc">${item.desc}</div>`);
      lines.push(`      </a>`);
    }
    lines.push(`    </div>`);
    lines.push(`  </div>`);
  }

  lines.push(`</div>`);
  return lines.join("\n");
}

// Extract first H1 as page title
function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

// Assemble full page
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
  const url = slug ? `${SITE}/tutorials/${slug}` : `${SITE}/tutorials/`;

  return shell
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{URL}}/g, url)
    .replace("{{SIDEBAR}}", sidebar)
    .replace("{{CONTENT}}", content)
    .replace("{{TOC}}", toc)
    .replace("{{PREVNEXT}}", prevNext);
}

// Main render function
export function renderTutorialPage(slug: string | null): Response {
  // Index page
  if (!slug) {
    const content = buildOverviewContent();
    const html = assemblePage(
      null,
      content,
      "Tutorials — VList",
      "Step-by-step tutorials to learn vlist",
    );

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  // Validate slug
  if (!VALID_SLUGS.has(slug)) {
    return new Response("Tutorial not found", { status: 404 });
  }

  // Render tutorial page
  const mdFile = `${slug}.md`;
  const mdPath = join(TUTORIALS_DIR, mdFile);

  if (!existsSync(mdPath)) {
    return new Response("Tutorial not found", { status: 404 });
  }

  const mdSource = readFileSync(mdPath, "utf-8");
  const marked = createMarkedInstance(slug);
  const parsedHtml = marked.parse(mdSource);

  // Extract TOC
  const tocItems = extractToc(mdSource);
  const tocHtml = buildToc(tocItems);

  // Build prev/next navigation
  const prevNextHtml = buildPrevNext(slug);

  // Wrap in .md container with prev/next at bottom
  const content = `<div class="md">${parsedHtml}${prevNextHtml}</div>`;

  // Extract title
  const h1Title = extractTitle(mdSource);
  const title = h1Title ? `${h1Title} — VList Tutorials` : "VList Tutorials";
  const description =
    TUTORIAL_GROUPS.flatMap((g) => g.items).find((i) => i.slug === slug)
      ?.desc || "Learn vlist";

  const html = assemblePage(slug, content, title, description, tocHtml);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
