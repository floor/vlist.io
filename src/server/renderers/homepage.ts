// src/server/renderers/homepage.ts
// Homepage renderer using Eta template

import { Eta } from "eta";
import { resolve } from "path";
import { readFileSync } from "fs";
import { SITE } from "./config";
import { VLIST_ROOT } from "../config";

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  label: string;
  href: string;
  external: boolean;
  key?: string;
}

// =============================================================================
// Eta Configuration
// =============================================================================

const eta = new Eta({
  cache: true,
  rmWhitespace: true,
  autoEscape: false,
  useWith: false,
  varName: "it",
});

// =============================================================================
// Template & Navigation Loading
// =============================================================================

let templateCache: string | null = null;
let navCache: NavItem[] | null = null;
let versionCache: string | null = null;

function loadTemplate(): string {
  if (!templateCache) {
    const templatePath = resolve("src/server/shells/homepage.eta");
    templateCache = readFileSync(templatePath, "utf-8");
  }
  return templateCache;
}

function loadNavigation(): NavItem[] {
  if (!navCache) {
    const navPath = resolve("src/server/config/navigation.json");
    const navData = readFileSync(navPath, "utf-8");
    navCache = JSON.parse(navData);
  }
  return navCache!;
}

function loadVersion(): string {
  if (!versionCache && VLIST_ROOT) {
    try {
      const pkgPath = resolve(VLIST_ROOT, "package.json");
      const pkgData = readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgData);
      versionCache = pkg.version || "1.0.0";
    } catch {
      versionCache = "1.0.0";
    }
  }
  return versionCache || "1.0.0";
}

// =============================================================================
// Homepage Renderer
// =============================================================================

/**
 * Render the homepage
 */
export function renderHomepage(): Response {
  const template = loadTemplate();
  const html = eta.renderString(template, {
    title: "VList — Virtual List for the Web",
    description:
      "VList — a lightweight, high-performance virtual list for the web. Zero dependencies, infinite scroll, selection, grid layout, and more.",
    canonicalUrl: SITE,
    version: loadVersion(),
    navItems: loadNavigation(),
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/**
 * Clear homepage cache (for development)
 */
export function clearCache(): void {
  templateCache = null;
  navCache = null;
  versionCache = null;
}
