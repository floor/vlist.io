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
    label: "Examples",
    items: [
      {
        slug: "basic",
        name: "Basic",
        desc: "Minimal vanilla JS — one function call, zero boilerplate",
      },
      {
        slug: "controls",
        name: "Controls",
        desc: "Selection, navigation, scroll events — full API exploration",
      },
      {
        slug: "core",
        name: "Core (7KB)",
        desc: "Lightweight build — 83% smaller, same result",
      },
      {
        slug: "grid",
        name: "Grid",
        desc: "Virtualized photo gallery with real images",
      },
      {
        slug: "selection",
        name: "Selection",
        desc: "Single & multi-select with keyboard navigation",
        mtrl: true,
      },
      {
        slug: "sticky-headers",
        name: "Sticky Headers",
        desc: "A–Z contact list with sticky section headers",
      },
      {
        slug: "variable-heights",
        name: "Variable Heights",
        desc: "Chat feed with DOM-measured item heights",
      },
      {
        slug: "reverse-chat",
        name: "Reverse Chat",
        desc: "Chat UI — reverse mode, prepend history, auto-scroll",
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
      {
        slug: "scroll-restore",
        name: "Scroll Restore",
        desc: "Save & restore scroll position across navigations",
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
  {
    label: "Builder",
    items: [
      {
        slug: "builder/basic",
        name: "Basic",
        desc: "Minimal builder — one plugin, zero boilerplate",
      },
      {
        slug: "builder/controls",
        name: "Controls",
        desc: "Selection, navigation, scroll events — full builder integration",
      },
      {
        slug: "builder/large-list",
        name: "Large List",
        desc: "1–5M items with withCompression + withScrollbar plugins",
      },
      {
        slug: "builder/photo-album",
        name: "Photo Album",
        desc: "Grid gallery with withGrid + withScrollbar plugins",
      },
      {
        slug: "builder/chat",
        name: "Chat",
        desc: "Reverse-mode chat UI with withScrollbar plugin",
      },
    ],
  },
  {
    label: "React",
    items: [
      {
        slug: "react/basic",
        name: "Basic",
        desc: "Minimal useVList hook — 10K items, one hook, zero boilerplate",
      },
      {
        slug: "react/controls",
        name: "Controls",
        desc: "Selection, navigation, scroll events — full React integration",
      },
    ],
  },
  {
    label: "Vue",
    items: [
      {
        slug: "vue/basic",
        name: "Basic",
        desc: "Minimal useVList composable — 10K items, one composable, zero boilerplate",
      },
      {
        slug: "vue/controls",
        name: "Controls",
        desc: "Selection, navigation, scroll events — full Vue integration",
      },
    ],
  },
  {
    label: "Svelte",
    items: [
      {
        slug: "svelte/basic",
        name: "Basic",
        desc: "Minimal vlist action — no Svelte runtime needed, just a function",
      },
      {
        slug: "svelte/controls",
        name: "Controls",
        desc: "Selection, navigation, scroll events — full action integration",
      },
    ],
  },
  {
    label: "mtrl",
    items: [],
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
    { name: "script.tsx", id: "tsx", lang: "typescript" },
    { name: "script.jsx", id: "jsx", lang: "javascript" },
    { name: "script.js", id: "js", lang: "javascript" },
    { name: "styles.css", id: "css", lang: "css" },
    { name: "content.html", id: "html", lang: "xml" },
  ];

  // Only include the first script entry point found (tsx > jsx > js)
  let scriptFound = false;

  const sources: SourceFile[] = [];
  for (const f of files) {
    // Skip additional script variants if we already found one
    const isScript = f.id === "tsx" || f.id === "jsx" || f.id === "js";
    if (isScript && scriptFound) continue;

    const filePath = join(dir, f.name);
    if (existsSync(filePath)) {
      const code = readFileSync(filePath, "utf-8").trim();
      if (code.length > 0) {
        sources.push({ label: f.name, id: f.id, lang: f.lang, code });
        if (isScript) scriptFound = true;
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
    if (group.items.length === 0) {
      lines.push(
        `  <span class="sidebar__link sidebar__link--soon">Coming soon</span>`,
      );
    } else {
      for (const item of group.items) {
        const active = item.slug === activeSlug ? " sidebar__link--active" : "";
        lines.push(
          `  <a href="/sandbox/${item.slug}" class="sidebar__link${active}">${item.name}</a>`,
        );
      }
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
    if (group.items.length === 0) {
      sections.push(`      <div class="overview__card overview__card--soon">`);
      sections.push(
        `        <div class="overview__card-title">Coming soon</div>`,
      );
      sections.push(
        `        <div class="overview__card-desc">Framework adapter examples are in development.</div>`,
      );
      sections.push(`      </div>`);
    } else {
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
