// benchmarks/renderer.ts
// Server-side renderer for benchmark pages.
// Assembles shell template + sidebar + page content into full HTML pages.

const SITE = "https://vlist.dev";

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
        desc: "Time to create a VList and paint the first frame",
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
      {
        slug: "comparison",
        name: "Performance Comparison",
        icon: "⚔️",
        desc: "Head-to-head performance: vlist vs react-window",
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
// Variant Support
// =============================================================================

type Variant = "javascript" | "react" | "vue" | "svelte";

// Variant labels are now in script.js (client-side)

/** Benchmarks that have variant-based structure */
const VARIANT_BENCHMARKS: Record<string, Variant[]> = {
  render: ["javascript", "react", "vue", "svelte"],
  scroll: ["javascript", "react", "vue", "svelte"],
  memory: ["javascript", "react", "vue", "svelte"],
  scrollto: ["javascript", "react", "vue", "svelte"],
};

/** Parse variant from query string (e.g., ?variant=react) */
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

/** Check which variants exist for a benchmark */
function detectVariants(slug: string): Variant[] {
  return VARIANT_BENCHMARKS[slug] || [];
}

/**
 * Build the variant switcher UI for benchmarks that have multiple variants.
 */
function buildVariantSwitcher(
  slug: string,
  activeVariant: Variant,
  queryString: string,
): string {
  const variants = detectVariants(slug);

  // If no variants exist, don't show the switcher
  if (variants.length === 0) return "";

  const VARIANT_LABELS: Record<Variant, string> = {
    javascript: "JavaScript",
    react: "React",
    vue: "Vue",
    svelte: "Svelte",
  };

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

  for (const group of BENCH_GROUPS) {
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

/**
 * Render a benchmarks page.
 *
 * @param slug - Benchmark slug (e.g. "render", "scroll", "bundle") or null for overview.
 * @param url - Full request URL for parsing query params
 * @returns A Response with the full HTML page, or null if the benchmark doesn't exist.
 */
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
  const item = ALL_ITEMS.get(slug);
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
