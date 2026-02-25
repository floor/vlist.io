// src/server/renderers/base.ts
// Base utilities for all renderers - common loading, caching, and sidebar logic

import { readFileSync } from "fs";
import { resolve } from "path";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for a renderer
 */
export interface RendererConfig {
  /** Path to the shell template (usually base.html) */
  shellPath: string;
  /** Path to the navigation JSON file for sidebar */
  navPath: string;
  /** Section name displayed in header */
  sectionName: string;
  /** Section key for active nav highlighting */
  sectionKey: string;
  /** Link for section breadcrumb (null if no link) */
  sectionLink: string | null;
}

/**
 * Navigation item structure (can be customized per renderer)
 */
export interface BaseNavItem {
  slug: string;
  name: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Navigation group structure
 */
export interface BaseNavGroup {
  label: string;
  items: BaseNavItem[];
}

// =============================================================================
// Shell Loading
// =============================================================================

const shellCache = new Map<string, string>();

/**
 * Load shell template with caching
 */
export function loadShell(shellPath: string): string {
  const resolvedPath = resolve(shellPath);

  if (!shellCache.has(resolvedPath)) {
    shellCache.set(resolvedPath, readFileSync(resolvedPath, "utf-8"));
  }

  return shellCache.get(resolvedPath)!;
}

/**
 * Clear shell cache (useful for development/hot-reload)
 */
export function clearShellCache(shellPath?: string): void {
  if (shellPath) {
    shellCache.delete(resolve(shellPath));
  } else {
    shellCache.clear();
  }
}

// =============================================================================
// Navigation Loading
// =============================================================================

const navCache = new Map<string, any>();

/**
 * Load navigation JSON with caching
 * Returns the parsed JSON as-is (type varies per renderer)
 */
export function loadNavigation<T = any>(navPath: string): T {
  const resolvedPath = resolve(navPath);

  if (!navCache.has(resolvedPath)) {
    const raw = readFileSync(resolvedPath, "utf-8");
    navCache.set(resolvedPath, JSON.parse(raw));
  }

  return navCache.get(resolvedPath) as T;
}

/**
 * Clear navigation cache (useful for development/hot-reload)
 */
export function clearNavCache(navPath?: string): void {
  if (navPath) {
    navCache.delete(resolve(navPath));
  } else {
    navCache.clear();
  }
}

/**
 * Clear all caches (shell + navigation)
 */
export function clearAllCaches(): void {
  shellCache.clear();
  navCache.clear();
}

// =============================================================================
// Sidebar Building
// =============================================================================

/**
 * Build sidebar HTML from navigation groups
 *
 * @param groups - Array of navigation groups
 * @param activeSlug - Currently active item slug (null for overview)
 * @param urlPrefix - Base URL for links (e.g., "/docs" or "/examples")
 * @param queryString - Optional query string to preserve (e.g., "?variant=react")
 */
export function buildSidebar(
  groups: BaseNavGroup[],
  activeSlug: string | null,
  urlPrefix: string,
  queryString: string = "",
): string {
  const lines: string[] = [];

  for (const group of groups) {
    lines.push(`<div class="sidebar__group">`);

    if (group.label) {
      lines.push(`  <div class="sidebar__label">${group.label}</div>`);
    }

    for (const item of group.items) {
      const active = item.slug === activeSlug ? " sidebar__link--active" : "";
      const href = `${urlPrefix}/${item.slug}${queryString}`;
      lines.push(
        `  <a href="${href}" class="sidebar__link${active}">${item.name}</a>`,
      );
    }

    lines.push(`</div>`);
  }

  return lines.join("\n");
}

/**
 * Build sidebar with overview link
 * Adds a separate group at the top with the overview link
 *
 * @param groups - Array of navigation groups
 * @param activeSlug - Currently active item slug (null for overview)
 * @param urlPrefix - Base URL for links
 * @param overviewLabel - Label for overview link (e.g., "Overview")
 * @param queryString - Optional query string to preserve
 */
export function buildSidebarWithOverview(
  groups: BaseNavGroup[],
  activeSlug: string | null,
  urlPrefix: string,
  overviewLabel: string = "Overview",
  queryString: string = "",
): string {
  const lines: string[] = [];

  // Overview link (standalone group)
  const overviewActive = activeSlug === null ? " sidebar__link--active" : "";
  lines.push(`<div class="sidebar__group">`);
  lines.push(
    `  <a href="${urlPrefix}/${queryString}" class="sidebar__link${overviewActive}">${overviewLabel}</a>`,
  );
  lines.push(`</div>`);

  // Regular groups
  lines.push(buildSidebar(groups, activeSlug, urlPrefix, queryString));

  return lines.join("\n");
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Get all valid slugs from navigation groups
 * Useful for validating incoming requests
 */
export function getValidSlugs(groups: BaseNavGroup[]): Set<string> {
  const slugs = new Set<string>();

  for (const group of groups) {
    for (const item of group.items) {
      slugs.add(item.slug);
    }
  }

  return slugs;
}

/**
 * Find a navigation item by slug
 */
export function findNavItem(
  groups: BaseNavGroup[],
  slug: string,
): BaseNavItem | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.slug === slug) {
        return item;
      }
    }
  }
  return null;
}
