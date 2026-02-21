// examples/renderer.ts
// Server-side renderer for examples pages.
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
}

export interface ExampleGroup {
  label: string;
  items: ExampleItem[];
}

export const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    label: "Getting Started",
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
    ],
  },
  {
    label: "Grid Plugin",
    items: [
      {
        slug: "grid/photo-album",
        name: "Photo Album",
        desc: "Grid gallery with withGrid + withScrollbar — 4 frameworks",
      },
      {
        slug: "grid/file-browser",
        name: "File Browser",
        desc: "Finder-like file browser with grid/list views — real filesystem API",
      },
    ],
  },
  {
    label: "Data Plugin",
    items: [
      {
        slug: "data/large-list",
        name: "Large List (Scale)",
        desc: "100K–5M items with withScale — 4 frameworks",
      },
      {
        slug: "data/velocity-loading",
        name: "Velocity Loading",
        desc: "Smart loading — skips when scrolling fast",
      },
    ],
  },
  {
    label: "Horizontal",
    items: [
      {
        slug: "horizontal/basic",
        name: "Basic Horizontal",
        desc: "Horizontal carousel with 10K cards — 4 frameworks",
      },
    ],
  },
  {
    label: "Groups Plugin",
    items: [
      {
        slug: "groups/sticky-headers",
        name: "Sticky Headers",
        desc: "A–Z contact list with sticky section headers",
      },
    ],
  },
  {
    label: "Other Plugins",
    items: [
      {
        slug: "scroll-restore",
        name: "Snapshots (Scroll Restore)",
        desc: "Save & restore scroll position across navigations",
      },
      {
        slug: "window-scroll",
        name: "Window (Page Scroll)",
        desc: "Document-level scrolling — no inner scrollbar",
      },
    ],
  },
  {
    label: "Advanced Examples",
    items: [
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
        slug: "wizard-nav",
        name: "Wizard Navigation",
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
// Variant Support
// =============================================================================

type Variant = "javascript" | "react" | "vue" | "svelte";

const VARIANT_LABELS: Record<Variant, string> = {
  javascript: "JavaScript",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
};

/** Parse variant from query string (e.g., ?variant=react) */
function parseVariant(url: string): Variant {
  const params = new URL(url, "http://localhost").searchParams;
  const variant = params.get("variant");
  if (
    variant === "javascript" ||
    variant === "react" ||
    variant === "vue" ||
    variant === "svelte"
  ) {
    return variant;
  }
  return "javascript"; // default
}

/** Check which variants exist for an example */
function detectVariants(slug: string): Variant[] {
  const variants: Variant[] = [];
  const exampleDir = join(EXAMPLES_DIR, slug);

  for (const variant of ["javascript", "react", "vue", "svelte"] as Variant[]) {
    const variantDir = join(exampleDir, variant);
    if (existsSync(variantDir)) {
      // Check if it has at least a script file
      const hasScript =
        existsSync(join(variantDir, "script.js")) ||
        existsSync(join(variantDir, "script.jsx")) ||
        existsSync(join(variantDir, "script.tsx"));
      if (hasScript) {
        variants.push(variant);
      }
    }
  }

  return variants;
}

// =============================================================================
// Paths
// =============================================================================

const EXAMPLES_DIR = resolve("./examples");
const SHELL_PATH = join(EXAMPLES_DIR, "shell.html");

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
function buildSourceTabs(slug: string, variant?: Variant): string {
  // If variant is provided, look in the variant subdirectory
  const dir = variant
    ? join(EXAMPLES_DIR, slug, variant)
    : join(EXAMPLES_DIR, slug);

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

  // When using variants, also include shared files from the example root
  // directory (e.g. shared.js, styles.css) that aren't in the variant folder
  if (variant) {
    const rootDir = join(EXAMPLES_DIR, slug);
    const foundNames = new Set(sources.map((s) => s.label));

    const sharedFiles: { name: string; id: string; lang: string }[] = [
      { name: "shared.ts", id: "shared-ts", lang: "typescript" },
      { name: "shared.js", id: "shared-js", lang: "javascript" },
      { name: "styles.css", id: "css", lang: "css" },
    ];

    for (const f of sharedFiles) {
      // Skip if a file with same name was already found in the variant dir
      if (foundNames.has(f.name)) continue;

      const filePath = join(rootDir, f.name);
      if (existsSync(filePath)) {
        const code = readFileSync(filePath, "utf-8").trim();
        if (code.length > 0) {
          sources.push({ label: f.name, id: f.id, lang: f.lang, code });
          foundNames.add(f.name);
        }
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
// Variant Switcher
// =============================================================================

/**
 * Build the variant switcher UI for examples that have multiple variants.
 * Shows tabs for JavaScript, React, Vue, and Svelte when those variants exist.
 */
function buildVariantSwitcher(
  slug: string,
  activeVariant: Variant,
  queryString: string,
): string {
  const variants = detectVariants(slug);

  // If only one variant exists, don't show the switcher
  if (variants.length <= 1) return "";

  const lines: string[] = [];
  lines.push(`<div class="variant-switcher">`);

  for (const variant of variants) {
    const activeClass =
      variant === activeVariant ? " variant-switcher__option--active" : "";
    // Build URL with variant query param, preserving other params if any
    const params = new URLSearchParams(queryString);
    params.set("variant", variant);
    const url = `/examples/${slug}?${params.toString()}`;

    lines.push(
      `  <a href="${url}" class="variant-switcher__option${activeClass}">${VARIANT_LABELS[variant]}</a>`,
    );
  }

  lines.push(`</div>`);
  return lines.join("\n");
}

// =============================================================================
// Sidebar Generation
// =============================================================================

function buildSidebar(activeSlug: string | null, variant?: Variant): string {
  const lines: string[] = [];

  // Build query string to preserve variant across navigation
  const queryString =
    variant && variant !== "javascript" ? `?variant=${variant}` : "";

  // Overview link
  const overviewActive = activeSlug === null ? " sidebar__link--active" : "";
  lines.push(`<div class="sidebar__group">`);
  lines.push(
    `  <a href="/examples/${queryString}" class="sidebar__link${overviewActive}">Overview</a>`,
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
          `  <a href="/examples/${item.slug}${queryString}" class="sidebar__link${active}">${item.name}</a>`,
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
  sections.push(`  <h1 class="overview__title">Examples</h1>`);
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
          `      <a href="/examples/${item.slug}" class="overview__card">`,
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
  variant?: Variant,
): string {
  if (!slug || !example) return "";

  const tags: string[] = [];

  // vlist styles — always needed for examples
  tags.push(`<link rel="stylesheet" href="/dist/vlist.css" />`);

  // Shared example styles (at example root, optional)
  // e.g., /dist/examples/grid/photo-album/styles.css
  // This allows variants to share common styles without duplication
  // Only add if file exists to avoid 404s in network tab
  const sharedCssPath = resolve(join("dist", "examples", slug, "styles.css"));
  if (existsSync(sharedCssPath)) {
    tags.push(
      `<link rel="stylesheet" href="/dist/examples/${slug}/styles.css" />`,
    );
  }

  // Variant-specific styles (optional overrides)
  // e.g., /dist/examples/grid/photo-album/react/styles.css
  // Loaded after shared styles to allow variant-specific customization
  // Only add if file exists to avoid 404s in network tab
  if (variant) {
    const variantCssPath = resolve(
      join("dist", "examples", slug, variant, "styles.css"),
    );
    if (existsSync(variantCssPath)) {
      tags.push(
        `<link rel="stylesheet" href="/dist/examples/${slug}/${variant}/styles.css" />`,
      );
    }
  }

  return tags.join("\n    ");
}

function buildExtraBody(
  slug: string | null,
  example: ExampleItem | null,
  variant?: Variant,
): string {
  if (!slug || !example) return "";

  // Script path — check variant subdirectory first
  const scriptPath = variant
    ? `/dist/examples/${slug}/${variant}/script.js`
    : `/dist/examples/${slug}/script.js`;

  return `<script type="module" src="${scriptPath}"></script>`;
}

// =============================================================================
// Page Assembly
// =============================================================================

function assemblePage(
  slug: string | null,
  example: ExampleItem | null,
  content: string,
  variant?: Variant,
  queryString?: string,
): string {
  const shell = loadShell();

  const title = example ? `VList — ${example.name}` : "VList — Examples";

  const description = example
    ? `VList ${example.name.toLowerCase()} example — ${example.desc}`
    : "Interactive examples for the VList virtual list library — from basic lists to million-item stress tests.";

  const sidebar = buildSidebar(slug, variant);
  const extraHead = buildExtraHead(slug, example, variant);
  const extraBody = buildExtraBody(slug, example, variant);
  const mainClass = "";

  const url = slug
    ? `${SITE}/examples/${slug}${queryString || ""}`
    : `${SITE}/examples/`;

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
 * Render a examples page.
 *
 * @param slug - Example slug (e.g. "basic", "grid") or null for the overview.
 * @param url - Full request URL for parsing query params
 * @returns A Response with the full HTML page, or null if the example doesn't exist.
 */
export function renderExamplesPage(
  slug: string | null,
  url?: string,
): Response | null {
  // Overview page
  if (slug === null) {
    const content = buildOverviewContent();
    const html = assemblePage(null, null, content);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Parse variant from URL query string
  const variant = url ? parseVariant(url) : "javascript";
  const queryString = url ? new URL(url, "http://localhost").search : "";

  // Example page — check it exists in our config
  const example = ALL_EXAMPLES.get(slug);
  if (!example) return null;

  // Check if this example has variants (new structure)
  const variants = detectVariants(slug);
  const hasVariants = variants.length > 0;

  // Determine paths based on whether variants exist
  let contentPath: string;

  if (hasVariants) {
    // New structure: examples/{example}/{variant}/
    if (!variants.includes(variant)) {
      // Requested variant doesn't exist, use first available
      const firstVariant = variants[0];
      contentPath = join(EXAMPLES_DIR, slug, firstVariant, "content.html");
    } else {
      contentPath = join(EXAMPLES_DIR, slug, variant, "content.html");
    }
  } else {
    // Old structure: examples/{example}/ (backward compatibility)
    contentPath = join(EXAMPLES_DIR, slug, "content.html");
  }

  if (!existsSync(contentPath)) return null;

  const content = readFileSync(contentPath, "utf-8");

  // Build variant switcher if this example has variants
  const variantSwitcher = hasVariants
    ? buildVariantSwitcher(slug, variant, queryString)
    : "";

  // Build source tabs for the selected variant
  const sourceTabs = hasVariants
    ? buildSourceTabs(slug, variant)
    : buildSourceTabs(slug);

  const html = assemblePage(
    slug,
    example,
    variantSwitcher + content + sourceTabs,
    hasVariants ? variant : undefined,
    queryString,
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
