// benchmarks/renderer.ts
// Server-side renderer for benchmark pages.
// Assembles shell template + sidebar + page content into full HTML pages.

import { readFileSync } from "fs";
import { join, resolve } from "path";

// =============================================================================
// Benchmark Configuration
// =============================================================================

export interface BenchItem {
  slug: string;
  name: string;
  icon: string;
  desc: string;
}

export interface BenchGroup {
  label: string;
  items: BenchItem[];
}

export const BENCH_GROUPS: BenchGroup[] = [
  {
    label: "Suites",
    items: [
      {
        slug: "render",
        name: "Initial Render",
        icon: "⚡",
        desc: "Time to create a vlist and paint the first frame",
      },
      {
        slug: "scroll",
        name: "Scroll FPS",
        icon: "📊",
        desc: "Sustained scroll performance and frame budget",
      },
      {
        slug: "memory",
        name: "Memory",
        icon: "🧠",
        desc: "Heap usage baseline, after render, and after scroll",
      },
      {
        slug: "scrollto",
        name: "ScrollTo",
        icon: "🎯",
        desc: "Latency of smooth scrollToIndex() animations",
      },
    ],
  },
  {
    label: "Comparisons",
    items: [
      {
        slug: "bundle",
        name: "Bundle Size",
        icon: "📦",
        desc: "Minified and gzipped sizes across virtual list libraries",
      },
      {
        slug: "features",
        name: "Features",
        icon: "⚖️",
        desc: "Feature coverage across popular virtual list libraries",
      },
    ],
  },
];

// Flat lookup for quick access
const ALL_ITEMS: Map<string, BenchItem> = new Map();
for (const group of BENCH_GROUPS) {
  for (const item of group.items) {
    ALL_ITEMS.set(item.slug, item);
  }
}

// =============================================================================
// Paths
// =============================================================================

const BENCH_DIR = resolve("./benchmarks");
const SHELL_PATH = join(BENCH_DIR, "shell.html");

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
// Sidebar Generation
// =============================================================================

function buildSidebar(activeSlug: string | null): string {
  const lines: string[] = [];

  // Overview link (standalone, no group label)
  const overviewActive = activeSlug === null ? " sidebar__link--active" : "";
  lines.push(`<div class="sidebar__group">`);
  lines.push(
    `  <a href="/benchmarks/" class="sidebar__link${overviewActive}">Overview</a>`,
  );
  lines.push(`</div>`);

  for (const group of BENCH_GROUPS) {
    lines.push(`<div class="sidebar__group">`);
    lines.push(`  <div class="sidebar__label">${group.label}</div>`);
    for (const item of group.items) {
      const active = item.slug === activeSlug ? " sidebar__link--active" : "";
      lines.push(
        `  <a href="/benchmarks/${item.slug}" class="sidebar__link${active}">${item.name}</a>`,
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
  lines.push(`  <h1 class="overview__title">Benchmarks</h1>`);
  lines.push(
    `  <p class="overview__tagline">Live performance measurements running in your browser. Each benchmark creates a real vlist instance, scrolls it programmatically, and measures actual frame times, render latency, and memory usage.</p>`,
  );

  for (const group of BENCH_GROUPS) {
    lines.push(`  <div class="overview__section">`);
    lines.push(`    <div class="overview__section-title">${group.label}</div>`);
    lines.push(`    <div class="overview__grid">`);
    for (const item of group.items) {
      lines.push(
        `      <a href="/benchmarks/${item.slug}" class="overview__card">`,
      );
      lines.push(`        <div class="overview__card-icon">${item.icon}</div>`);
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

// =============================================================================
// Page Assembly
// =============================================================================

function assemblePage(
  slug: string | null,
  item: BenchItem | null,
  content: string,
  page: string,
): string {
  const shell = loadShell();

  const title = item ? `vlist — ${item.name} Benchmark` : "vlist — Benchmarks";

  const description = item
    ? `vlist ${item.name.toLowerCase()} benchmark — ${item.desc}`
    : "vlist performance benchmarks — scroll FPS, initial render, memory stability, and bundle size comparisons.";

  const sidebar = buildSidebar(slug);

  // Only load the benchmark script on interactive pages (not overview)
  const extraBody =
    page !== "overview"
      ? `<script type="module" src="/benchmarks/dist/script.js"></script>`
      : "";

  return shell
    .replace("{{TITLE}}", title)
    .replace("{{DESCRIPTION}}", description)
    .replace("{{SIDEBAR}}", sidebar)
    .replace("{{CONTENT}}", content)
    .replace("{{PAGE}}", page)
    .replace("{{EXTRA_BODY}}", extraBody);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a benchmarks page.
 *
 * @param slug - Benchmark slug (e.g. "render", "scroll", "bundle") or null for overview.
 * @returns A Response with the full HTML page, or null if the benchmark doesn't exist.
 */
export function renderBenchmarkPage(slug: string | null): Response | null {
  // Overview page
  if (slug === null) {
    const content = buildOverviewContent();
    const html = assemblePage(null, null, content, "overview");
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Check the slug exists in our config
  const item = ALL_ITEMS.get(slug);
  if (!item) return null;

  // Interactive pages render an empty content area — script.js builds the UI
  const html = assemblePage(slug, item, "", slug);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
