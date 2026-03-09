// src/server/config/eta.ts
// Eta template engine configuration for shell rendering

import { Eta } from "eta";
import { readFileSync } from "fs";
import { resolve } from "path";

// =============================================================================
// Types
// =============================================================================

/**
 * Navigation item for the main header menu
 */
export interface NavItem {
  label: string;
  href: string;
  external: boolean;
  key?: string; // Identifier for matching active section
}

/**
 * Template data interface for type safety across all renderers
 */
export interface TemplateData {
  // Page content
  TITLE: string;
  DESCRIPTION: string;
  URL: string;
  SECTION: string;
  SECTION_LINK: string | null;
  SECTION_KEY: string | null; // Key to match against NavItem.key for active state
  SIDEBAR: string;
  CONTENT: string;

  // Styles & scripts
  EXTRA_STYLES: string;
  EXTRA_HEAD: string;
  EXTRA_BODY: string;
  MAIN_CLASS: string;

  // SEO metadata
  OG_TYPE: string;
  OG_SITE_NAME: string | null;
  TWITTER_CARD: string;

  // Feature flags
  SEO_ENHANCED: boolean;
  HAS_IMPORTMAP: boolean;
  HAS_TOC: boolean;
  HAS_SYNTAX_HIGHLIGHTING: boolean;
  LAZY_SYNTAX_HIGHLIGHTING: boolean;
  HAS_ACTIVE_NAV: boolean;
  HAS_SOURCE_TABS: boolean;
  PAGE_ATTR: string | null;

  // TOC content
  TOC: string;

  // Navigation
  NAV_ITEMS: NavItem[];
}

// =============================================================================
// Navigation
// =============================================================================

const NAV_PATH = resolve("./src/server/config/navigation.json");
let navCache: NavItem[] | null = null;

/**
 * Load navigation items from JSON file
 */
export function loadNavigation(): NavItem[] {
  if (!navCache) {
    const raw = readFileSync(NAV_PATH, "utf-8");
    navCache = JSON.parse(raw) as NavItem[];
  }
  return navCache;
}

/**
 * Clear navigation cache (useful for hot-reload)
 */
export function clearNavigationCache(): void {
  navCache = null;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Singleton Eta instance — created once so compiled template caching persists
 * across renders. Previously a new instance was created per render() call,
 * discarding the internal cache every time.
 */
const eta = new Eta({
  cache: true,
  rmWhitespace: true,
  autoEscape: false,
  useWith: false,
  varName: "it",
});

/**
 * Render a template string with Eta
 *
 * Uses the module-level Eta instance so compiled templates are cached across
 * calls. Since cache: true is set, repeated renders of the same template
 * string skip the parse/compile step entirely.
 *
 * @param template - HTML template with Eta syntax
 * @param data - Template data object (accessed via `it` in template)
 * @returns Rendered HTML string
 */
export function render(template: string, data: TemplateData): string {
  return eta.renderString(template, data);
}
