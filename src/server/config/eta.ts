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
 * Eta configuration options
 */
const etaConfig = {
  // Use template caching for better performance (Eta handles this internally)
  cache: true,

  // Remove whitespace for smaller HTML
  rmWhitespace: true,

  // Don't escape HTML by default (we control the content)
  // Use <%~ %> for unescaped output, <%= %> for escaped output
  autoEscape: false,

  // Don't use 'with' statement (better performance and TypeScript compatibility)
  useWith: false,

  // Template data accessible via 'it'
  varName: "it",
};

/**
 * Render a template string with Eta
 *
 * Uses Eta's internal caching when the same template is rendered multiple times.
 * Since cache: true is set, Eta will automatically cache compiled templates.
 *
 * @param template - HTML template with Eta syntax
 * @param data - Template data object (accessed via `it` in template)
 * @returns Rendered HTML string
 */
export function render(template: string, data: TemplateData): string {
  // Create a new Eta instance for this render
  // Eta will handle caching internally based on the template string
  const eta = new Eta(etaConfig);
  return eta.renderString(template, data);
}
