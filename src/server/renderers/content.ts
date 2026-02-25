// src/server/renderers/content.ts
// Unified server-side renderer for markdown content (docs + tutorials).
// Assembles shell template + sidebar + parsed markdown into full HTML pages.

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { Marked, type Tokens } from "marked";
import {
  render as renderEta,
  loadNavigation as loadHeaderNavigation,
} from "../config/eta";
import { SITE } from "./config";
import {
  loadShell as loadShellBase,
  loadNavigation as loadNavigationBase,
  getValidSlugs as getValidSlugsBase,
  clearAllCaches,
  type BaseNavGroup,
} from "./base";

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  slug: string;
  name: string;
  desc: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface OverviewCard {
  slug: string;
  name: string;
  desc: string;
}

export interface OverviewSection {
  label: string;
  cards: OverviewCard[];
}

export interface ContentConfig {
  /** Content directory path (e.g., "./docs" or "./tutorials") */
  contentDir: string;
  /** URL prefix (e.g., "/docs" or "/tutorials") */
  urlPrefix: string;
  /** Section name shown in the header breadcrumb (e.g., "Docs" or "Tutorials") */
  sectionName: string;
  /** Title suffix for individual pages (e.g., "VList docs" or "VList Tutorials") */
  titleSuffix: string;
  /** Default page title (e.g., "VList — Docs" or "VList Tutorials") */
  defaultTitle: string;
  /** Default description for overview page */
  defaultDescription: string;
  /** Overview page title */
  overviewTitle: string;
  /** Overview page tagline */
  overviewTagline: string;
  /** Optional: Use separate overview sections (for curated grids) */
  overviewSectionsPath?: string;
}

interface TocItem {
  text: string;
  slug: string;
  depth: number;
}

// =============================================================================
// Content Renderer Factory
// =============================================================================

export function createContentRenderer(config: ContentConfig) {
  const {
    contentDir,
    urlPrefix,
    sectionName,
    titleSuffix,
    defaultTitle,
    defaultDescription,
    overviewTitle,
    overviewTagline,
    overviewSectionsPath,
  } = config;

  const CONTENT_DIR = resolve(contentDir);
  const SHELL_PATH = resolve("./src/server/shells/base.html");
  const NAV_PATH = join(CONTENT_DIR, "navigation.json");
  const OVERVIEW_PATH = overviewSectionsPath
    ? join(CONTENT_DIR, overviewSectionsPath)
    : null;

  // Cache
  let overviewCache: OverviewSection[] | null = null;

  // ===========================================================================
  // Loaders
  // ===========================================================================

  function loadShell(): string {
    return loadShellBase(SHELL_PATH);
  }

  function loadNavigation(): NavGroup[] {
    return loadNavigationBase<NavGroup[]>(NAV_PATH);
  }

  function loadOverviewSections(): OverviewSection[] {
    if (!overviewCache) {
      if (OVERVIEW_PATH && existsSync(OVERVIEW_PATH)) {
        const raw = readFileSync(OVERVIEW_PATH, "utf-8");
        overviewCache = JSON.parse(raw) as OverviewSection[];
      } else {
        // Use navigation groups as overview sections
        overviewCache = loadNavigation()
          .filter((group) => group.label)
          .map((group) => ({
            label: group.label,
            cards: group.items.map((item) => ({
              slug: item.slug,
              name: item.name,
              desc: item.desc,
            })),
          }));
      }
    }
    return overviewCache;
  }

  function getValidSlugs(): Set<string> {
    return getValidSlugsBase(loadNavigation() as BaseNavGroup[]);
  }

  function clearCache(): void {
    clearAllCaches();
    overviewCache = null;
  }

  // ===========================================================================
  // Table of Contents
  // ===========================================================================

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

  // ===========================================================================
  // Markdown Parser
  // ===========================================================================

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

            href = `${urlPrefix}/${resolvedPath}${hash}`;
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

  // ===========================================================================
  // Navigation Helpers
  // ===========================================================================

  function getPrevNext(currentSlug: string | null): {
    prev: { slug: string; name: string } | null;
    next: { slug: string; name: string } | null;
  } {
    if (!currentSlug) return { prev: null, next: null };

    // Flatten all items
    const allItems: { slug: string; name: string }[] = [];
    for (const group of loadNavigation()) {
      for (const item of group.items) {
        allItems.push({ slug: item.slug, name: item.name });
      }
    }

    const currentIndex = allItems.findIndex(
      (item) => item.slug === currentSlug,
    );
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
        `  <a href="${urlPrefix}/${prev.slug}" class="doc-nav__link doc-nav__link--prev">`,
      );
      lines.push(`    <span class="doc-nav__label">← Previous</span>`);
      lines.push(`    <span class="doc-nav__title">${prev.name}</span>`);
      lines.push(`  </a>`);
    } else {
      lines.push(`  <div class="doc-nav__spacer"></div>`);
    }

    if (next) {
      lines.push(
        `  <a href="${urlPrefix}/${next.slug}" class="doc-nav__link doc-nav__link--next">`,
      );
      lines.push(`    <span class="doc-nav__label">Next →</span>`);
      lines.push(`    <span class="doc-nav__title">${next.name}</span>`);
      lines.push(`  </a>`);
    }

    lines.push(`</nav>`);
    return lines.join("\n");
  }

  // ===========================================================================
  // Sidebar Generation
  // ===========================================================================

  function buildSidebar(activeSlug: string | null): string {
    const lines: string[] = [];

    for (const group of loadNavigation()) {
      lines.push(`<div class="sidebar__group">`);
      if (group.label) {
        lines.push(`  <div class="sidebar__label">${group.label}</div>`);
      }
      for (const item of group.items) {
        const href =
          item.slug === "" ? `${urlPrefix}/` : `${urlPrefix}/${item.slug}`;
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

  // ===========================================================================
  // Overview Content Generation
  // ===========================================================================

  function buildOverviewContent(): string {
    const lines: string[] = [];

    lines.push(`<div class="overview">`);
    lines.push(`  <h1 class="overview__title">${overviewTitle}</h1>`);
    lines.push(`  <p class="overview__tagline">${overviewTagline}</p>`);

    for (const section of loadOverviewSections()) {
      lines.push(`  <div class="overview__section">`);
      lines.push(
        `    <div class="overview__section-title">${section.label}</div>`,
      );
      lines.push(`    <div class="overview__grid">`);
      for (const card of section.cards) {
        lines.push(
          `      <a href="${urlPrefix}/${card.slug}" class="overview__card">`,
        );
        lines.push(
          `        <div class="overview__card-title">${card.name}</div>`,
        );
        lines.push(
          `        <div class="overview__card-desc">${card.desc}</div>`,
        );
        lines.push(`      </a>`);
      }
      lines.push(`    </div>`);
      lines.push(`  </div>`);
    }

    lines.push(`</div>`);
    return lines.join("\n");
  }

  // ===========================================================================
  // Title Extraction
  // ===========================================================================

  function extractTitle(html: string): string | null {
    const match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    if (!match) return null;
    // Strip HTML tags (anchor links, code, etc.) and the trailing #
    return match[1]
      .replace(/<[^>]*>/g, "")
      .replace(/#$/, "")
      .trim();
  }

  // ===========================================================================
  // Page Assembly
  // ===========================================================================

  function assemblePage(
    slug: string | null,
    content: string,
    title: string,
    description: string,
    toc: string = "",
  ): string {
    const shell = loadShell();
    const url = slug ? `${SITE}${urlPrefix}/${slug}` : `${SITE}${urlPrefix}/`;

    return renderEta(shell, {
      // Page content
      TITLE: title,
      DESCRIPTION: description,
      URL: url,
      SECTION: sectionName,
      SECTION_LINK: `${urlPrefix}/`,
      SECTION_KEY: urlPrefix === "/docs" ? "docs" : "tutorials",
      SIDEBAR: buildSidebar(slug),
      CONTENT: content + buildPrevNext(slug),

      // Styles & scripts
      EXTRA_STYLES: '<link rel="stylesheet" href="/styles/content.css" />',
      EXTRA_HEAD: "",
      EXTRA_BODY: "",
      MAIN_CLASS: "",

      // SEO metadata
      OG_TYPE: "article",
      OG_SITE_NAME: "VList",
      TWITTER_CARD: "summary_large_image",

      // Feature flags
      SEO_ENHANCED: true,
      HAS_IMPORTMAP: false,
      HAS_TOC: !!toc,
      HAS_SYNTAX_HIGHLIGHTING: true,
      HAS_ACTIVE_NAV: false,
      HAS_SOURCE_TABS: false,
      PAGE_ATTR: null,

      // TOC content
      TOC: toc,

      // Navigation
      NAV_ITEMS: loadHeaderNavigation(),
    });
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  function render(slug: string | null): Response | null {
    // Overview page
    if (slug === null) {
      const content = buildOverviewContent();
      const html = assemblePage(
        null,
        content,
        defaultTitle,
        defaultDescription,
      );
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Validate slug exists in our config
    if (!getValidSlugs().has(slug)) return null;

    // Resolve markdown file path
    const mdFile = slug === "" ? "README.md" : `${slug}.md`;
    const mdPath = join(CONTENT_DIR, mdFile);
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
    const title = h1Title ? `${h1Title} — ${titleSuffix}` : defaultTitle;

    // Find description from navigation
    const navItem = loadNavigation()
      .flatMap((g) => g.items)
      .find((i) => i.slug === slug);
    const description = navItem?.desc || defaultDescription;

    const html = assemblePage(slug, content, title, description, tocHtml);

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return {
    render,
    clearCache,
    loadNavigation,
  };
}

// =============================================================================
// Pre-configured Renderers
// =============================================================================

export const docsRenderer = createContentRenderer({
  contentDir: "./docs",
  urlPrefix: "/docs",
  sectionName: "Docs",
  titleSuffix: "VList docs",
  defaultTitle: "VList — Docs",
  defaultDescription:
    "VList documentation — API reference, configuration, events, methods, styling, and more.",
  overviewTitle: "Documentation",
  overviewTagline:
    'Reference documentation for the vlist virtual list library. For learning content, see <a href="/tutorials">Tutorials</a>.',
  overviewSectionsPath: "overview.json",
});

export const tutorialsRenderer = createContentRenderer({
  contentDir: "./tutorials",
  urlPrefix: "/tutorials",
  sectionName: "Tutorials",
  titleSuffix: "VList Tutorials",
  defaultTitle: "Tutorials — VList",
  defaultDescription: "Step-by-step tutorials to learn vlist",
  overviewTitle: "VList Tutorials",
  overviewTagline:
    "Step-by-step guides to learn vlist from beginner to advanced.",
});

// Convenience exports for backward compatibility
export const DOC_GROUPS = docsRenderer.loadNavigation();
export const TUTORIAL_GROUPS = tutorialsRenderer.loadNavigation();

export function renderDocsPage(slug: string | null): Response | null {
  return docsRenderer.render(slug);
}

export function renderTutorialPage(slug: string | null): Response {
  const response = tutorialsRenderer.render(slug);
  if (!response) {
    return new Response("Tutorial not found", { status: 404 });
  }
  return response;
}

export function clearDocsCache(): void {
  docsRenderer.clearCache();
}

export function clearTutorialsCache(): void {
  tutorialsRenderer.clearCache();
}
