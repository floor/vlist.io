// sandbox/renderer.ts
// Server-side renderer for sandbox pages.
// Assembles shell template + sidebar + example content into full HTML pages.

const SITE = "https://vlist.dev";

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// =============================================================================
// HTML Escaping
// =============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =============================================================================
// Example Configuration
// =============================================================================

export interface ExampleItem {
  slug: string;
  name: string;
  desc: string;
  mtrl?: boolean;
}

export interface ExampleGroup {
  label: string;
  items: ExampleItem[];
}

export const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    label: "Core",
    items: [
      {
        slug: "basic",
        name: "Basic",
        desc: "Pure vanilla JS — 10K items, no dependencies",
      },
      {
        slug: "core",
        name: "Core (7KB)",
        desc: "Lightweight build — 83% smaller, same result",
      },
    ],
  },
  {
    label: "Layouts",
    items: [
      {
        slug: "grid",
        name: "Grid",
        desc: "Virtualized photo gallery with real images",
      },
      {
        slug: "horizontal",
        name: "Horizontal",
        desc: "Horizontal carousel with 10K cards",
      },
      {
        slug: "window-scroll",
        name: "Window Scroll",
        desc: "Document-level scrolling — no inner scrollbar",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        slug: "variable-heights",
        name: "Variable Heights",
        desc: "Chat feed with DOM-measured item heights",
      },
      {
        slug: "infinite-scroll",
        name: "Infinite Scroll",
        desc: "Async loading with simulated API calls",
        mtrl: true,
      },
      {
        slug: "million-items",
        name: "Million Items",
        desc: "1–5M items with compression and FPS monitoring",
        mtrl: true,
      },
    ],
  },
  {
    label: "Patterns",
    items: [
      {
        slug: "selection",
        name: "Selection",
        desc: "Single & multi-select with keyboard navigation",
        mtrl: true,
      },
      {
        slug: "reverse-chat",
        name: "Reverse Chat",
        desc: "Chat UI — reverse mode, prepend history, auto-scroll",
      },
      {
        slug: "sticky-headers",
        name: "Sticky Headers",
        desc: "A–Z contact list with sticky section headers",
      },
      {
        slug: "scroll-restore",
        name: "Scroll Restore",
        desc: "Save & restore scroll position across navigations",
      },
    ],
  },
  {
    label: "Advanced",
    items: [
      {
        slug: "velocity-loading",
        name: "Velocity Loading",
        desc: "Smart loading — skips when scrolling fast",
        mtrl: true,
      },
      {
        slug: "wizard-nav",
        name: "Wizard Nav",
        desc: "Button-only navigation, wheel disabled",
      },
    ],
  },
];

// Flat lookup for quick access
const ALL_EXAMPLES: Map<string, ExampleItem> = new Map();
for (const group of EXAMPLE_GROUPS) {
  for (const item of group.items) {
    ALL_EXAMPLES.set(item.slug, item);
  }
}

// =============================================================================
// Paths
// =============================================================================

const SANDBOX_DIR = resolve("./sandbox");
const SHELL_PATH = join(SANDBOX_DIR, "shell.html");

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
// Source Code Tabs
// =============================================================================

interface SourceFile {
  label: string;
  id: string;
  lang: string;
  code: string;
}

/**
 * Read source files for an example and build a tabbed code viewer.
 * Reads script.js, styles.css, and content.html from the example directory.
 */
function buildSourceTabs(slug: string): string {
  const dir = join(SANDBOX_DIR, slug);

  const files: { name: string; id: string; lang: string }[] = [
    { name: "script.js", id: "js", lang: "javascript" },
    { name: "styles.css", id: "css", lang: "css" },
    { name: "content.html", id: "html", lang: "html" },
  ];

  const sources: SourceFile[] = [];
  for (const f of files) {
    const filePath = join(dir, f.name);
    if (existsSync(filePath)) {
      const code = readFileSync(filePath, "utf-8").trim();
      if (code.length > 0) {
        sources.push({ label: f.name, id: f.id, lang: f.lang, code });
      }
    }
  }

  if (sources.length === 0) return "";

  const lines: string[] = [];
  lines.push(`<div class="source">`);
  lines.push(`  <div class="source__header">`);
  lines.push(`    <span class="source__title">Source</span>`);
  lines.push(`    <div class="source__tabs">`);
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    lines.push(
      `      <button class="source__tab" data-tab="${s.id}">${s.label}</button>`,
    );
  }
  lines.push(`    </div>`);
  lines.push(
    `    <button class="source__toggle" id="source-toggle" aria-label="Toggle source panel">`,
  );
  lines.push(
    `      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
  );
  lines.push(`        <polyline points="4 10 8 6 12 10" />`);
  lines.push(`      </svg>`);
  lines.push(`    </button>`);
  lines.push(`  </div>`);

  lines.push(`  <div class="source__body">`);
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    lines.push(`    <div class="source__panel" data-panel="${s.id}">`);
    lines.push(
      `      <pre><code class="language-${s.lang}">${escapeHtml(s.code)}</code></pre>`,
    );
    lines.push(`    </div>`);
  }
  lines.push(`  </div>`);

  lines.push(`</div>`);
  return lines.join("\n");
}

// =============================================================================
// Sidebar Generation
// =============================================================================

function buildSidebar(activeSlug: string | null): string {
  const lines: string[] = [];

  // Overview link
  const overviewActive = activeSlug === null ? " sidebar__link--active" : "";
  lines.push(`<div class="sidebar__group">`);
  lines.push(
    `  <a href="/sandbox/" class="sidebar__link${overviewActive}">Overview</a>`,
  );
  lines.push(`</div>`);

  for (const group of EXAMPLE_GROUPS) {
    lines.push(`<div class="sidebar__group">`);
    lines.push(`  <div class="sidebar__label">${group.label}</div>`);
    for (const item of group.items) {
      const active = item.slug === activeSlug ? " sidebar__link--active" : "";
      lines.push(
        `  <a href="/sandbox/${item.slug}" class="sidebar__link${active}">${item.name}</a>`,
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
  const sections: string[] = [];

  sections.push(`<div class="overview">`);
  sections.push(`  <h1 class="overview__title">Sandbox</h1>`);
  sections.push(
    `  <p class="overview__tagline">Interactive examples exploring every vlist feature — from basic lists to million-item stress tests.</p>`,
  );

  for (const group of EXAMPLE_GROUPS) {
    sections.push(`  <div class="overview__section">`);
    sections.push(
      `    <div class="overview__section-title">${group.label}</div>`,
    );
    sections.push(`    <div class="overview__grid">`);
    for (const item of group.items) {
      sections.push(
        `      <a href="/sandbox/${item.slug}" class="overview__card">`,
      );
      sections.push(
        `        <div class="overview__card-title">${item.name}</div>`,
      );
      sections.push(
        `        <div class="overview__card-desc">${item.desc}</div>`,
      );
      sections.push(`      </a>`);
    }
    sections.push(`    </div>`);
    sections.push(`  </div>`);
  }

  sections.push(`</div>`);
  return sections.join("\n");
}

// =============================================================================
// Style & Script Tag Generation
// =============================================================================

function buildExtraHead(
  slug: string | null,
  example: ExampleItem | null,
): string {
  if (!slug || !example) return "";

  const tags: string[] = [];

  // mtrl styles (for examples that use mtrl/mtrl-addons)
  if (example.mtrl) {
    tags.push(
      `<link rel="stylesheet" href="/node_modules/mtrl/dist/styles.css" />`,
    );
  }

  // vlist styles — always needed for examples
  tags.push(`<link rel="stylesheet" href="/dist/vlist.css" />`);

  // Example-specific styles
  tags.push(
    `<link rel="stylesheet" href="/sandbox/${slug}/dist/styles.css" />`,
  );

  return tags.join("\n    ");
}

function buildExtraBody(
  slug: string | null,
  example: ExampleItem | null,
): string {
  if (!slug || !example) return "";

  return `<script type="module" src="/sandbox/${slug}/dist/script.js"></script>`;
}

// =============================================================================
// Page Assembly
// =============================================================================

function assemblePage(
  slug: string | null,
  example: ExampleItem | null,
  content: string,
): string {
  const shell = loadShell();

  const title = example ? `VList — ${example.name}` : "VList — Sandbox";

  const description = example
    ? `VList ${example.name.toLowerCase()} example — ${example.desc}`
    : "Interactive examples for the VList virtual list library — from basic lists to million-item stress tests.";

  const sidebar = buildSidebar(slug);
  const extraHead = buildExtraHead(slug, example);
  const extraBody = buildExtraBody(slug, example);
  const mainClass = example?.mtrl ? " mtrl-app" : "";

  const url = slug ? `${SITE}/sandbox/${slug}` : `${SITE}/sandbox/`;

  return shell
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{URL}}/g, url)
    .replace("{{SIDEBAR}}", sidebar)
    .replace("{{CONTENT}}", content)
    .replace("{{EXTRA_HEAD}}", extraHead)
    .replace("{{EXTRA_BODY}}", extraBody)
    .replace("{{MAIN_CLASS}}", mainClass);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a sandbox page.
 *
 * @param slug - Example slug (e.g. "basic", "grid") or null for the overview.
 * @returns A Response with the full HTML page, or null if the example doesn't exist.
 */
export function renderSandboxPage(slug: string | null): Response | null {
  // Overview page
  if (slug === null) {
    const content = buildOverviewContent();
    const html = assemblePage(null, null, content);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Example page — check it exists in our config
  const example = ALL_EXAMPLES.get(slug);
  if (!example) return null;

  // Load content.html
  const contentPath = join(SANDBOX_DIR, slug, "content.html");
  if (!existsSync(contentPath)) return null;

  const content = readFileSync(contentPath, "utf-8");
  const sourceTabs = buildSourceTabs(slug);
  const html = assemblePage(slug, example, content + sourceTabs);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
