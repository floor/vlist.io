# Server Architecture

> How vlist.dev renders pages server-side: renderers, shells, navigation, and styles.

vlist.dev is a Bun HTTP server with no framework. Every page is assembled at request
time from HTML shell templates, navigation data, and content — then served as a
complete HTML response.

## Overview

`server.ts` is a 40-line entry point. All logic lives in `src/server/`:

```
src/server/
├── config.ts            — PORT, ROOT, SITE, VLIST_ROOT
├── compression.ts       — compressResponse + LRU cache
├── static.ts            — getMimeType, serveFile, resolveStatic
├── sitemap.ts           — renderSitemap, renderRobots, gitLastmod, LASTMOD
├── router.ts            — handleRequest + section resolvers
├── renderers/
│   ├── config.ts        — re-exports SITE from ../config
│   ├── content.ts       — unified renderer for docs + tutorials
│   ├── examples.ts      — renderer for examples (variants, source tabs)
│   ├── benchmarks.ts    — renderer for benchmarks (interactive suites)
│   └── index.ts         — barrel exports
└── shells/
    ├── content.html     — shared shell for docs + tutorials
    ├── examples.html    — shell for examples
    └── benchmarks.html  — shell for benchmarks
```

Navigation data and content live alongside their section:

```
docs/
├── navigation.json      — sidebar groups + items
├── overview.json        — curated overview cards (different from nav)
└── **/*.md

tutorials/
├── navigation.json
└── *.md

examples/
├── navigation.json
└── [example folders]/

benchmarks/
├── navigation.json
└── [benchmark files]/
```

CSS lives in `styles/` and is served directly:

```
styles/
├── shell.css            — layout chrome (header, sidebar, TOC, overview cards)
├── content.css          — markdown body, code blocks, tables, syntax highlighting
├── api.css              — API reference page overrides
└── examples.css         — examples overview page only
```

---

## Request Routing

`router.ts` exports a single `handleRequest` function. Every section has a named
resolver that returns `Response | null`. The first non-null response wins:

```typescript
const response =
  routeSystem(pathname)            ??   // /sitemap.xml, /robots.txt
  (await routeApi(req))            ??   // /api/*
  resolveExamples(pathname, url)   ??   // /examples/*
  resolveDocs(pathname)            ??   // /docs/*
  resolveTutorials(pathname)       ??   // /tutorials/*
  resolveBenchmarks(pathname, url) ??   // /benchmarks/*
  resolveStatic(pathname)          ??   // everything else (files, assets)
  new Response("Not Found", { status: 404 });
```

Each resolver follows the same pattern — overview on exact path, slug match via regex,
`null` if no match:

```typescript
function resolveDocs(pathname: string): Response | null {
  if (pathname === "/docs" || pathname === "/docs/") return renderDocsPage(null);
  const match = pathname.match(/^\/docs\/([a-zA-Z0-9/_-]+?)(\.md)?\/?$/);
  if (match) return renderDocsPage(match[1]);
  return null;
}
```

**Adding a new section** is two steps: add a resolver function, then drop it into
the `??` chain.

---

## Renderers

### Unified content renderer

Docs and tutorials share a single renderer factory in `src/server/renderers/content.ts`.
The factory takes a `ContentConfig` and returns a `render()` function and helpers.

```typescript
const docsRenderer = createContentRenderer({
  contentDir: "./docs",
  urlPrefix: "/docs",
  sectionName: "Docs",
  titleSuffix: "VList docs",
  defaultTitle: "VList — Docs",
  defaultDescription: "...",
  overviewTitle: "Documentation",
  overviewTagline: "...",
  overviewSectionsPath: "overview.json", // optional: separate overview cards
});
```

Each renderer instance maintains its own cache (shell, navigation, overview sections,
valid slugs) that is populated lazily on first request and shared across all subsequent
requests in the same process.

**Request flow:**

1. `render(slug)` is called from `router.ts`
2. Navigation is loaded from `navigation.json` (cached)
3. Slug is validated against the navigation
4. Markdown file is read and parsed with a `Marked` instance configured for the slug
5. TOC, prev/next links, and sidebar are assembled
6. Shell template is loaded (cached) and all `{{PLACEHOLDERS}}` replaced
7. A `Response` is returned with `Content-Type: text/html`

**Adding a new content section** (e.g. `/guides/`):

```typescript
export const guidesRenderer = createContentRenderer({
  contentDir: "./guides",
  urlPrefix: "/guides",
  sectionName: "Guides",
  titleSuffix: "VList Guides",
  defaultTitle: "VList — Guides",
  defaultDescription: "...",
  overviewTitle: "Guides",
  overviewTagline: "...",
});
```

Export `renderGuidesPage` from the renderer, add a `resolveGuides` function in
`router.ts`, and drop it into the `??` chain. The shell, sidebar, TOC, and prev/next
navigation come for free.

### Examples renderer

`src/server/renderers/examples.ts` handles multi-variant examples
(JavaScript, React, Vue, Svelte). It detects available variants by checking
for `script.js`, `script.jsx`, or `script.tsx` inside
`examples/{slug}/{variant}/`. Source code tabs are built server-side and
injected into the page.

### Benchmarks renderer

`src/server/renderers/benchmarks.ts` renders benchmark pages.
Interactive suites load their JavaScript client-side via `{{EXTRA_BODY}}`.
The variant switcher (JS / React / Vue / Svelte) is server-rendered;
the actual benchmark UI is built by `benchmarks/dist/script.js` at runtime.

---

## Shells

All shell templates live in `src/server/shells/`. They are static HTML files with
`{{PLACEHOLDER}}` tokens replaced at render time.

### Shared placeholders (all shells)

| Placeholder | Content |
|---|---|
| `{{TITLE}}` | `<title>` and Open Graph title |
| `{{DESCRIPTION}}` | Meta description and Open Graph description |
| `{{URL}}` | Canonical URL |
| `{{SIDEBAR}}` | Rendered sidebar navigation HTML |
| `{{CONTENT}}` | Main page content HTML |

### content.html placeholders

| Placeholder | Content |
|---|---|
| `{{SECTION}}` | Header breadcrumb label (e.g. "Docs" or "Tutorials") |
| `{{TOC}}` | Table of contents for the current page (empty string if none) |
| `{{PREVNEXT}}` | Prev/next navigation — injected inside `{{CONTENT}}` |

The active header nav link is resolved **client-side** by matching
`window.location.pathname` against each nav link's `href`. This is what
allows a single shell to serve both docs and tutorials without a
per-section hardcoded `class="active"`.

### examples.html placeholders

| Placeholder | Content |
|---|---|
| `{{EXTRA_HEAD}}` | Per-example `<link>` tags for vlist CSS and variant CSS |
| `{{EXTRA_BODY}}` | Per-example `<script>` tag loading the compiled example bundle |
| `{{MAIN_CLASS}}` | Optional CSS class added to `<main>` |

### benchmarks.html placeholders

| Placeholder | Content |
|---|---|
| `{{PAGE}}` | Benchmark slug added as `data-page` on `<main>` (used by script.js) |
| `{{EXTRA_BODY}}` | `<script>` tag for `benchmarks/dist/script.js` (suite pages only) |

---

## Navigation JSON

Every section has a `navigation.json` file that drives both the sidebar and
the list of valid slugs. The format is an array of groups, each with an array of items:

```json
[
  {
    "label": "Group Label",
    "items": [
      { "slug": "page-slug", "name": "Page Name", "desc": "Short description" }
    ]
  }
]
```

The `slug` maps directly to a markdown file (`{contentDir}/{slug}.md`) and
to the URL (`{urlPrefix}/{slug}`). The `desc` is used as the meta description
for individual pages and as the card text on the overview page.

**Docs also has `overview.json`** — a separately curated grid of cards shown
on `/docs/`. This allows the overview to highlight different items or use
different descriptions than the sidebar. When `overviewSectionsPath` is omitted
from the config, the overview grid is generated from `navigation.json` directly.

---

## CSS Layers

Three CSS files are served for content pages (docs + tutorials):

| File | Purpose | Loaded by |
|---|---|---|
| `styles/shell.css` | Header, sidebar, TOC, overview cards, layout | All shells |
| `styles/content.css` | Markdown body, code blocks, tables, `.hljs-*` | `content.html` shell only |
| Per-section files | Section-specific source CSS, compiled to `dist/` | Build step |

`styles/shell.css` and `styles/content.css` are served **directly** — no build step,
no minification. They are small enough that the overhead does not matter, and keeping
them plain makes them easy to edit.

The per-section source CSS files (`examples/styles.css`, `benchmarks/styles.css`) are
**not** served directly. They are compiled and minified into `dist/` by each section's
dedicated `build.ts` script. They are intentionally kept in their section folders
alongside their build tooling rather than in `styles/`.

---

## Compression

All responses pass through `compressResponse` in `src/server/compression.ts`.
It prefers brotli over gzip and uses an LRU cache (keyed by pathname + content hash)
to avoid re-compressing identical content on subsequent requests. Responses smaller
than 1 KB and already-compressed content types are passed through unchanged.

---

## Sitemap

`/sitemap.xml` is generated dynamically at startup in `src/server/sitemap.ts`.
Each URL's `<lastmod>` date comes from `git log -1 --date=short` against the
file(s) that actually produce that page's content:

| URL pattern | Files tracked |
|---|---|
| `/docs/` | `docs/navigation.json` + `docs/overview.json` + `src/server/shells/content.html` + `styles/content.css` |
| `/docs/{slug}` | `docs/{slug}.md` |
| `/tutorials/` | `tutorials/navigation.json` + `src/server/shells/content.html` + `styles/content.css` |
| `/tutorials/{slug}` | `tutorials/{slug}.md` |
| `/examples/` | `examples/navigation.json` |
| `/examples/{slug}` | `examples/{slug}/` (whole directory, covers variants) |
| `/benchmarks/` | `benchmarks/navigation.json` |
| `/benchmarks/{slug}` | Suite-specific files per slug (see `BENCH_FILE_MAP` in `sitemap.ts`) |

If `git log` returns nothing (new file not yet committed), the date falls back to
today's date (`FALLBACK_DATE`). The map is built once at server startup and reused
for all requests.