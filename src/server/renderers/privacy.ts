// src/server/renderers/privacy.ts
// Privacy page renderer using Eta template

import { Eta } from "eta";
import { resolve } from "path";
import { readFileSync } from "fs";

import { SITE, IS_PROD } from "./config";
import { htmlHeaders } from "../cache";

// Search dialog partial — shared with base.html via config/eta.ts
const SEARCH_HTML = readFileSync(
  resolve("src/server/shells/search.html"),
  "utf-8",
);

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
let pageCache: string | null = null;

function loadTemplate(): string {
  if (!templateCache || !IS_PROD) {
    templateCache = readFileSync(
      resolve("src/server/shells/privacy.eta"),
      "utf-8",
    );
  }
  return templateCache;
}

function loadNavigation(): NavItem[] {
  if (!navCache) {
    const navPath = resolve("src/server/config/navigation.json");
    navCache = JSON.parse(readFileSync(navPath, "utf-8")) as NavItem[];
  }
  return navCache!;
}

// =============================================================================
// Privacy Renderer
// =============================================================================

/**
 * Render the privacy page — outside the sections, without a sidebar.
 */
export function renderPrivacy(): Response {
  // In dev, always re-render so changes are picked up without restarting
  if (!pageCache || !IS_PROD) {
    pageCache = eta.renderString(loadTemplate(), {
      title: "vlist — Privacy",
      description:
        "How vlist.io counts visits, what it keeps in your browser, and how to reach us.",
      canonicalUrl: `${SITE}/privacy/`,
      navItems: loadNavigation(),
      SEARCH_HTML,
    });
  }

  return new Response(pageCache, {
    headers: htmlHeaders(),
  });
}
