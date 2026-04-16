// src/server/search.ts
// Full-text search index for vlist.io site content.
// Built once at server startup from markdown files and navigation metadata.
//
// Indexes four content sections:
//   - Docs:       markdown files in ./docs/ with navigation from docs/navigation.json
//   - Tutorials:  markdown files in ./tutorials/ with navigation from tutorials/navigation.json
//   - Examples:   metadata-only from examples/navigation.json (name + desc + features)
//   - Benchmarks: metadata-only from benchmarks/navigation.json (name + desc)
//
// Exports:
//   searchSite(query, limit?)  → ranked search results with snippets
//   getSearchIndex()           → serialized JSON for potential client-side use

import { readFileSync } from "fs";
import { join, resolve } from "path";
import MiniSearch from "minisearch";

// =============================================================================
// Types
// =============================================================================

/** Shape of a single item in any navigation group. */
interface NavItem {
  slug: string;
  name: string;
  desc: string;
  features?: string[];
  icon?: string;
}

/** Shape of a navigation group (shared across all sections). */
interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Document shape stored in the MiniSearch index. */
interface IndexDocument {
  id: string;
  title: string;
  section: string;
  group: string;
  description: string;
  body: string;
  url: string;
  keywords: string;
}

/** Shape returned by searchSite(). */
export interface SearchResult {
  title: string;
  url: string;
  section: string;
  group: string;
  description: string;
  snippet: string;
}

// =============================================================================
// Constants
// =============================================================================

const ROOT = resolve(".");

const SECTION_DOCS = "Docs";
const SECTION_TUTORIALS = "Tutorials";
const SECTION_EXAMPLES = "Examples";
const SECTION_BENCHMARKS = "Benchmarks";

/** Default number of results to return. */
const DEFAULT_LIMIT = 10;

/** Target length for body snippets (characters). */
const SNIPPET_LENGTH = 120;

// =============================================================================
// Markdown → plain text
// =============================================================================

/**
 * Strip markdown syntax to produce indexable plain text.
 *
 * Handles (in order):
 *  1. Fenced code blocks (```...```)
 *  2. Inline code (`...`)
 *  3. HTML tags
 *  4. Images ![alt](url)
 *  5. Links [text](url) → keep text
 *  6. Heading markers (# … ######)
 *  7. Bold/italic markers (* _ ~)
 *  8. Blockquote markers (>)
 *  9. Horizontal rules (---, ***, ___)
 * 10. Collapse excessive whitespace
 */
function stripMarkdown(md: string): string {
  return (
    md
      // 1. Remove fenced code blocks (``` or ~~~, with optional language tag)
      .replace(/```[\s\S]*?```/g, "")
      .replace(/~~~[\s\S]*?~~~/g, "")
      // 2. Remove inline code
      .replace(/`[^`]+`/g, "")
      // 3. Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // 4. Remove images (keep alt text)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // 5. Replace links with their text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // 6. Remove heading markers
      .replace(/^#{1,6}\s+/gm, "")
      // 7. Remove bold/italic/strikethrough markers
      .replace(/[*_~]{1,3}/g, "")
      // 8. Remove blockquote markers
      .replace(/^\s*>\s?/gm, "")
      // 9. Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // 10. Collapse whitespace
      .replace(/\n{2,}/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim()
  );
}

// =============================================================================
// File helpers
// =============================================================================

/** Read and parse a JSON file relative to the project root. */
function readJSON<T>(relativePath: string): T {
  const absolute = join(ROOT, relativePath);
  return JSON.parse(readFileSync(absolute, "utf-8")) as T;
}

/** Read a markdown file relative to the project root, returning empty string on failure. */
function readMarkdown(relativePath: string): string {
  try {
    const absolute = join(ROOT, relativePath);
    return readFileSync(absolute, "utf-8");
  } catch {
    // File missing or unreadable — not fatal, just skip body content
    return "";
  }
}

// =============================================================================
// Index construction
// =============================================================================

/**
 * Walk a navigation file and yield IndexDocument entries.
 *
 * For docs/tutorials the markdown body is loaded and stripped.
 * For examples/benchmarks only navigation metadata is used.
 */
function buildDocuments(): IndexDocument[] {
  const documents: IndexDocument[] = [];

  // -- Docs ------------------------------------------------------------------

  const docGroups = readJSON<NavGroup[]>("docs/navigation.json");
  for (const group of docGroups) {
    const groupLabel = group.label ?? "";
    for (const item of group.items) {
      const md = readMarkdown(`docs/${item.slug}.md`);
      documents.push({
        id: `docs:${item.slug}`,
        title: item.name,
        section: SECTION_DOCS,
        group: groupLabel,
        description: item.desc,
        body: md ? stripMarkdown(md) : "",
        url: `/docs/${item.slug}`,
        keywords: "",
      });
    }
  }

  // -- Tutorials -------------------------------------------------------------

  const tutorialGroups = readJSON<NavGroup[]>("tutorials/navigation.json");
  for (const group of tutorialGroups) {
    const groupLabel = group.label ?? "";
    for (const item of group.items) {
      const md = readMarkdown(`tutorials/${item.slug}.md`);
      documents.push({
        id: `tutorials:${item.slug}`,
        title: item.name,
        section: SECTION_TUTORIALS,
        group: groupLabel,
        description: item.desc,
        body: md ? stripMarkdown(md) : "",
        url: `/tutorials/${item.slug}`,
        keywords: "",
      });
    }
  }

  // -- Examples --------------------------------------------------------------

  const exampleGroups = readJSON<NavGroup[]>("examples/navigation.json");
  for (const group of exampleGroups) {
    const groupLabel = group.label ?? "";
    for (const item of group.items) {
      documents.push({
        id: `examples:${item.slug}`,
        title: item.name,
        section: SECTION_EXAMPLES,
        group: groupLabel,
        description: item.desc,
        body: "",
        url: `/examples/${item.slug}`,
        keywords: item.features ? item.features.join(" ") : "",
      });
    }
  }

  // -- Benchmarks ------------------------------------------------------------

  const benchGroups = readJSON<NavGroup[]>("benchmarks/navigation.json");
  for (const group of benchGroups) {
    const groupLabel = group.label ?? "";
    for (const item of group.items) {
      documents.push({
        id: `benchmarks:${item.slug}`,
        title: item.name,
        section: SECTION_BENCHMARKS,
        group: groupLabel,
        description: item.desc,
        body: "",
        url: `/benchmarks/${item.slug}`,
        keywords: "",
      });
    }
  }

  return documents;
}

// =============================================================================
// MiniSearch instance (built at import time)
// =============================================================================

/** All documents fed into the index — kept around for snippet extraction. */
const allDocuments: IndexDocument[] = buildDocuments();

/** The MiniSearch index — ready for queries immediately after module load. */
const index = new MiniSearch<IndexDocument>({
  fields: ["title", "keywords", "description", "body"],
  storeFields: ["title", "url", "section", "group", "description", "body"],
  searchOptions: {
    boost: { title: 10, keywords: 5, description: 3, body: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
});

index.addAll(allDocuments);

// =============================================================================
// Serialized index cache (lazy)
// =============================================================================

let serializedCache: string | null = null;

// =============================================================================
// Snippet extraction
// =============================================================================

/**
 * Extract a ~120-character snippet from `body` centered on the first
 * occurrence of any search term. Falls back to `description` when no
 * body match is found.
 */
function extractSnippet(
  body: string,
  description: string,
  query: string,
): string {
  if (!body) return description;

  // Split query into individual terms and try to find the first match
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const bodyLower = body.toLowerCase();
  let matchIndex = -1;

  for (const term of terms) {
    const idx = bodyLower.indexOf(term);
    if (idx !== -1) {
      matchIndex = idx;
      break;
    }
  }

  // No term found in body — try prefix matching (since we use prefix search)
  if (matchIndex === -1) {
    for (const term of terms) {
      // Search for the prefix (first 3+ chars) anywhere in the body
      const prefix = term.slice(0, Math.max(3, term.length));
      const idx = bodyLower.indexOf(prefix);
      if (idx !== -1) {
        matchIndex = idx;
        break;
      }
    }
  }

  // Still nothing — fall back to description
  if (matchIndex === -1) return description;

  // Center the snippet around the match position
  const half = Math.floor(SNIPPET_LENGTH / 2);
  let start = Math.max(0, matchIndex - half);
  let end = Math.min(body.length, start + SNIPPET_LENGTH);

  // Adjust start if we're near the end of the body
  if (end - start < SNIPPET_LENGTH) {
    start = Math.max(0, end - SNIPPET_LENGTH);
  }

  // Try to break at word boundaries
  if (start > 0) {
    const spaceAfter = body.indexOf(" ", start);
    if (spaceAfter !== -1 && spaceAfter - start < 20) {
      start = spaceAfter + 1;
    }
  }
  if (end < body.length) {
    const spaceBefore = body.lastIndexOf(" ", end);
    if (spaceBefore !== -1 && end - spaceBefore < 20) {
      end = spaceBefore;
    }
  }

  let snippet = body.slice(start, end).trim();

  // Add ellipsis markers for truncation
  if (start > 0) snippet = "..." + snippet;
  if (end < body.length) snippet = snippet + "...";

  return snippet;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Search all site content and return ranked results with snippets.
 *
 * @param query  - The search query string.
 * @param limit  - Maximum number of results to return (default 10).
 * @returns        Array of SearchResult objects, ranked by relevance.
 */
export function searchSite(
  query: string,
  limit: number = DEFAULT_LIMIT,
): SearchResult[] {
  if (!query || !query.trim()) return [];

  const raw = index.search(query.trim());

  return raw.slice(0, limit).map((hit) => ({
    title: hit.title as string,
    url: hit.url as string,
    section: hit.section as string,
    group: hit.group as string,
    description: hit.description as string,
    snippet: extractSnippet(
      (hit.body as string) || "",
      (hit.description as string) || "",
      query.trim(),
    ),
  }));
}

/**
 * Return the serialized MiniSearch index as a JSON string.
 * Cached after the first call — safe to call repeatedly.
 *
 * This can be sent to the client for client-side search without
 * re-indexing. The client would call:
 *   MiniSearch.loadJSON(json, { fields: [...] })
 */
export function getSearchIndex(): string {
  if (serializedCache === null) {
    serializedCache = JSON.stringify(index);
  }
  return serializedCache;
}
