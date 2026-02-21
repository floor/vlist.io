// src/server/renderers/benchmarks.ts
// Server-side renderer for benchmark pages.
// Assembles shell template + sidebar + page content into full HTML pages.

import { readFileSync } from "fs";
import { join, resolve } from "path";
import { SITE } from "./config";

// =============================================================================
// Types
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

type Variant = "javascript" | "react" | "vue" | "svelte";

// =============================================================================
// Paths & Constants
// =============================================================================

const BENCH_DIR = resolve("./benchmarks");
const SHELL_PATH = join(BENCH_DIR, "shell.html");
const NAV_PATH = join(BENCH_DIR, "navigation.json");

const VARIANT_LABELS: Record<Variant, string> = {
  javascript: "JavaScript",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
};

/** Benchmarks that have variant-based structure */
const VARIANT_BENCHMARKS: Record<string, Variant[]> = {
  render: ["javascript", "react", "vue", "svelte"],
  scroll: ["javascript", "react", "vue", "svelte"],
  memory: ["javascript", "react", "vue", "svelte"],
  scrollto: ["javascript", "react", "vue", "svelte"],
};

// =============================================================================
// Cache
// =============================================================================

let shellCache: string | null = null;
let navCache: BenchGroup[] | null = null;
let allItemsCache: Map<string, BenchItem> | null = null;

function loadShell(): string {
  if (!shellCache) {
    shellCache = readFileSync(SHELL_PATH, "utf-8");
  }
  return shellCache;
}

function loadNavigation(): BenchGroup[] {
  if (!navCache) {
    const raw = readFileSync(NAV_PATH, "utf-8");
    navCache = JSON.parse(raw) as BenchGroup[];
  }
  return navCache;
}

function getAllItems(): Map<string, BenchItem> {
  if (!allItemsCache) {
    allItemsCache = new Map();
    for (const group of loadNavigation()) {
      for (const item of group.items) {
        allItemsCache.set(item.slug, item);
      }
    }
  }
  return allItemsCache;
}

export function clearCache(): void {
  shellCache = null;
  navCache = null;
  allItemsCache = null;
}

// =============================================================================
// Variant Support
// =============================================================================

function parseVariant(url: string): Variant {
  const params = new URLSearchParams(url);
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

function detectVariants(slug: string): Variant[] {
  return VARIANT_BENCHMARKS[slug] || [];
}

function buildVariantSwitcher(
  slug: string,
  activeVariant: Variant,
  queryString: string,
): string {
  const variants = detectVariants(slug);

  // If no variants exist, don't show the switcher
  if (variants.length === 0) return "";

  const lines: string[] = [];
  lines.push(`<div class="variant-switcher">`);

  // Always show all 4 variants, mark missing ones as disabled
  const allVariants: Variant[] = ["javascript", "react", "vue", "svelte"];

  for (const variant of allVariants) {
    const exists = variants.includes(variant);
    const isActive = variant === activeVariant;

    let classes = "variant-switcher__option";
    if (isActive) classes += " variant-switcher__option--active";
    if (!exists) classes += " variant-switcher__option--disabled";

    if (exists) {
      // Build URL with variant query param
      const params = new URLSearchParams(queryString);
      params.set("variant", variant);
      const url = `/benchmarks/${slug}?${params.toString()}`;
      lines.push(
        `  <a href="${url}" class="${classes}">${VARIANT_LABELS[variant]}</a>`,
      );
    } else {
      // Disabled variant (not a link)
      lines.push(
        `  <span class="${classes}">${VARIANT_LABELS[variant]}</span>`,
      );
    }
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

  // Overview link (standalone, no group label)
  const overviewActive = activeSlug === null ? " sidebar__link--active" : "";
  lines.push(`<div class="sidebar__group">`);
  lines.push(
    `  <a href="/benchmarks/${queryString}" class="sidebar__link${overviewActive}">Overview</a>`,
  );
  lines.push(`</div>`);

  for (const group of loadNavigation()) {
    lines.push(`<div class="sidebar__group">`);
    lines.push(`  <div class="sidebar__label">${group.label}</div>`);
    for (const item of group.items) {
      const active = item.slug === activeSlug ? " sidebar__link--active" : "";
      lines.push(
        `  <a href="/benchmarks/${item.slug}${queryString}" class="sidebar__link${active}">${item.name}</a>`,
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

  for (const group of loadNavigation()) {
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
  variant?: Variant,
  queryString?: string,
): string {
  const shell = loadShell();

  const title = item ? `VList — ${item.name} Benchmark` : "VList — Benchmarks";

  const description = item
    ? `VList ${item.name.toLowerCase()} benchmark — ${item.desc}`
    : "VList performance benchmarks — scroll FPS, initial render, memory stability, and bundle size comparisons.";

  const sidebar = buildSidebar(slug, variant);

  // Only load the benchmark script on interactive pages (not overview)
  const extraBody =
    page !== "overview"
      ? `<script type="module" src="/benchmarks/dist/script.js"></script>`
      : "";

  const url = slug
    ? `${SITE}/benchmarks/${slug}${queryString || ""}`
    : `${SITE}/benchmarks/`;

  return shell
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{URL}}/g, url)
    .replace("{{SIDEBAR}}", sidebar)
    .replace("{{CONTENT}}", content)
    .replace("{{PAGE}}", page)
    .replace("{{EXTRA_BODY}}", extraBody);
}

// =============================================================================
// Public API
// =============================================================================

export const BENCH_GROUPS = loadNavigation();

export function renderBenchmarkPage(
  slug: string | null,
  url?: string,
): Response | null {
  // Overview page
  if (slug === null) {
    const content = buildOverviewContent();
    const html = assemblePage(null, null, content, "overview");
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Parse variant from URL query string
  const variant = url ? parseVariant(new URL(url).search) : "javascript";
  const queryString = url ? new URL(url).search : "";

  // Check the slug exists in our config
  const item = getAllItems().get(slug);
  if (!item) return null;

  // Check if this benchmark has variants
  const variants = detectVariants(slug);
  const hasVariants = variants.length > 0;

  // Build variant switcher if this benchmark has variants
  const variantSwitcher = hasVariants
    ? buildVariantSwitcher(slug, variant, queryString)
    : "";

  // Interactive pages render variant switcher + empty content area
  // script.js will build the UI and preserve the variant switcher
  const html = assemblePage(
    slug,
    item,
    variantSwitcher,
    slug,
    hasVariants ? variant : undefined,
    queryString,
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
