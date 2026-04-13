# Translation Integration Blueprint — vlist.io

> Plan for adding multi-language support to vlist.io, reusing the translation system built for Radiooooo.

---

## Motivation

vlist.io traffic is growing across US, UK, France, Switzerland, and Finland. Localized content ranks in local search results — a French developer searching "liste virtuelle javascript" won't find us today. Translating the site unlocks organic traffic from non-English searches.

---

## Current State

### vlist.io Architecture

| Aspect | Detail |
|--------|--------|
| **Runtime** | Bun HTTP server (`Bun.serve()`) |
| **Templating** | Eta (`.eta` templates) |
| **Content** | Markdown files rendered via `marked` at request time |
| **Routing** | Regex-based router in `router.ts` |
| **i18n** | None — `<html lang="en">` hardcoded everywhere |

### Content Surface

| Type | Count | Source |
|------|-------|--------|
| Homepage | 1 | `homepage.eta` |
| Docs | ~28 pages | Markdown in `docs/` |
| Tutorials | 6 pages | Markdown in `tutorials/` |
| Examples | 18 pages | HTML + JS in `examples/` |
| UI strings | ~50 | Hardcoded in TypeScript renderers |
| **Total** | **~53 pages + UI strings** | |

### Radiooooo Translation System

| Aspect | Detail |
|--------|--------|
| **Runtime** | Bun (TypeScript) |
| **AI Engine** | Claude API (Anthropic) |
| **Languages** | 63 supported |
| **Modules** | `nested-objects` (key-value), `array-objects`, `array-arrays` |
| **Features** | Git-based change detection, batch API calls, context files for quality, progress bars |
| **Repo** | `radiooooo/translations` |

---

## What to Translate

### Phase 1 — Homepage + UI Shell

The highest-impact, lowest-effort starting point.

- **Homepage** (`homepage.eta`) — hero text, feature descriptions, CTAs
- **Shell** (`base.html`) — navigation, footer, meta tags
- **UI strings** — sidebar labels, section names, prev/next links, search placeholder

Estimated: ~100–150 strings.

### Phase 2 — Documentation

The bulk of the content. 28 markdown pages, ~20,000 lines.

- Getting started guide
- Feature docs (grid, masonry, groups, table, etc.)
- API reference
- Internals

### Phase 3 — Tutorials

6 tutorial pages with code examples. Code blocks stay in English; prose gets translated.

### Not Translated

- **Examples** — code is code, UI labels are minimal
- **Benchmarks** — data-heavy, numbers are universal
- **Archive/refactoring docs** — internal, not user-facing
- **Code blocks in docs** — always English (variable names, API calls)

---

## Translation Data Formats

### UI Strings — `nested-objects` module (reuse as-is)

Extract hardcoded strings from TypeScript renderers into JSON:

```json
{
  "nav": {
    "docs": "Documentation",
    "tutorials": "Tutorials",
    "examples": "Examples",
    "benchmarks": "Benchmarks"
  },
  "footer": {
    "license": "MIT License",
    "github": "View on GitHub"
  },
  "docs": {
    "onThisPage": "On this page",
    "prevPage": "Previous",
    "nextPage": "Next",
    "editOnGithub": "Edit on GitHub"
  }
}
```

This maps directly to Radiooooo's `interface` translation type. The `nested-objects` module handles it without modification.

### Markdown Content — New `markdown` module needed

Docs and tutorials are full markdown files. Two approaches:

#### Option A: Translate Whole Files

- Send the entire markdown file to Claude with instructions to preserve structure
- Output: parallel translated markdown files
- Pros: simple, preserves formatting naturally
- Cons: expensive per API call, harder to detect partial changes

#### Option B: Extract Translatable Segments

- Parse markdown into segments (headings, paragraphs, list items)
- Translate segments individually
- Reassemble into translated markdown
- Pros: granular change detection, cheaper incremental updates
- Cons: complex parsing, risk of breaking markdown structure

**Recommendation: Option A for initial implementation.** Markdown files change infrequently. When a doc page changes, retranslate the whole file. Claude handles markdown preservation well. Option B can be explored later if API costs become a concern.

### Context File — `contexts/vlist-docs.ts`

A context file specific to vlist.io that guides translation quality:

```typescript
const vlistDocsContext = {
  global: {
    appDescription: "Technical documentation for vlist, a high-performance virtual list library for JavaScript",
    domain: "Frontend web development, UI components, virtualization",
    audience: "Software developers",
    notes: [
      "Keep technical terms in English: virtual list, DOM, viewport, scroll, render, grid, masonry",
      "Keep API names, method names, and code identifiers in English",
      "Keep code blocks completely untranslated",
      "Translate prose, headings, descriptions, and explanatory text",
      "Preserve all markdown formatting: links, code spans, tables, admonitions",
      "Preserve all HTML tags embedded in markdown",
      "Do NOT translate URL paths or anchor links",
    ],
  },
  glossary: {
    virtualList: {
      term: "virtual list",
      translationRule: "Keep as 'virtual list' or use the established local term if one exists",
    },
    scrollbar: {
      term: "scrollbar",
      translationRule: "Use the standard OS/browser translation for the target language",
    },
    masonry: {
      term: "masonry layout",
      translationRule: "Keep 'masonry' in English — it's the established CSS/web term",
    },
    // ... more terms
  },
};
```

---

## URL Strategy

### Path-prefix routing: `/{lang}/docs/...`

```
/docs/getting-started          → English (default)
/fr/docs/getting-started       → French
/de/docs/getting-started       → German
/ja/docs/getting-started       → Japanese
```

**Why path-prefix:**
- Best for SEO — each language gets its own crawlable URL
- Standard pattern (MDN, React docs, Vue docs all use it)
- Easy to implement with the existing regex router
- Compatible with `hreflang` tags

**English stays at root** — no `/en/` prefix. This preserves all existing URLs and avoids redirects.

### Router Changes

```typescript
// Current pattern:
// /docs/:slug

// New pattern:
// /:lang?/docs/:slug
// Where :lang is optional, defaults to "en"
```

Add a middleware or route prefix that:
1. Extracts `lang` from the first path segment
2. Validates it against supported languages
3. Falls back to `"en"` if missing or invalid
4. Passes `lang` to the renderer

---

## File Structure

### Locale Files

```
vlist.io/
├── locales/
│   ├── index.json              # Language registry [code, name, nativeName]
│   ├── ui/                     # UI strings (nested-objects format)
│   │   ├── en.json
│   │   ├── fr.json
│   │   └── ...
│   └── docs/                   # Translated markdown content
│       ├── fr/
│       │   ├── getting-started.md
│       │   ├── why-vlist.md
│       │   ├── features/
│       │   │   ├── grid.md
│       │   │   └── ...
│       │   └── api/
│       │       ├── reference.md
│       │       └── ...
│       ├── de/
│       │   └── ...
│       └── ja/
│           └── ...
```

### Translation Scripts

```
vlist.io/
├── scripts/
│   ├── translate-ui.ts         # Translate UI strings (reuses nested-objects module)
│   ├── translate-docs.ts       # Translate markdown docs (new markdown module)
│   └── translate-all.ts        # Run both
```

---

## Reuse from Radiooooo Translation System

### Reuse Directly

| Component | Path | Purpose |
|-----------|------|---------|
| `nested-objects.ts` | `src/scripts/modules/` | UI string translation — works as-is |
| `translation-helpers.ts` | `src/scripts/utils/` | Claude API batching, language names |
| `progress.ts` | `src/utils/` | Terminal progress bars |
| `output.ts` | `src/utils/` | Dynamic terminal output |
| Context loader | `src/scripts/contexts/loader.ts` | Load context files |

### Adapt / Extend

| Component | Change Needed |
|-----------|--------------|
| `translation-config.ts` | Add vlist.io data types (`ui`, `docs`) |
| `translate.ts` | Add CLI entry point for vlist.io |

### Build New

| Component | Purpose |
|-----------|---------|
| `markdown` module | Translate full markdown files preserving structure |
| `contexts/vlist-docs.ts` | Translation context for technical docs |
| Router middleware | Language detection and routing |
| Language switcher | UI component for switching languages |
| `hreflang` generator | SEO tags for alternate language pages |

---

## Integration Approach

### Option 1: Shared Package (Recommended)

Extract the translation core from `radiooooo/translations` into a shared package:

```
@floor/translate/
├── src/
│   ├── modules/
│   │   ├── nested-objects.ts
│   │   ├── array-objects.ts
│   │   ├── array-arrays.ts
│   │   └── markdown.ts          # New
│   ├── utils/
│   │   ├── translation-helpers.ts
│   │   ├── progress.ts
│   │   └── output.ts
│   └── contexts/
│       └── loader.ts
├── package.json
└── tsconfig.json
```

Both `radiooooo/translations` and `vlist.io` depend on `@floor/translate`. Each project provides its own:
- `translation-config.ts` (data types and structure)
- `contexts/*.ts` (domain-specific translation guidance)
- `locales/` (translation files)

**Pros:** Single source of truth, improvements benefit both projects.
**Cons:** Initial extraction effort, versioning overhead.

### Option 2: Copy and Adapt

Copy the relevant modules into `vlist.io/scripts/` and adapt them. Simpler to start, diverges over time.

### Option 3: Monorepo Dependency

If both projects move to a monorepo, use workspace dependencies. Unlikely near-term.

**Recommendation:** Start with Option 2 (copy) to move fast, refactor to Option 1 when the markdown module is stable and proven.

---

## Server-Side Rendering Changes

### Content Renderer (`content.ts`)

```typescript
// Current:
const markdown = await readFile(`docs/${slug}.md`, "utf-8");

// New:
const lang = ctx.lang ?? "en";
const localizedPath = lang === "en"
  ? `docs/${slug}.md`
  : `locales/docs/${lang}/${slug}.md`;

// Fall back to English if translation doesn't exist
const path = existsSync(localizedPath) ? localizedPath : `docs/${slug}.md`;
const markdown = await readFile(path, "utf-8");
```

### Shell Template (`base.html`)

```html
<!-- Current: -->
<html lang="en">

<!-- New: -->
<html lang="<%= it.lang %>">

<!-- Add hreflang tags: -->
<% for (const l of it.languages) { %>
<link rel="alternate" hreflang="<%= l.code %>" href="<%= l.url %>" />
<% } %>
```

### UI String Loading

```typescript
// Load UI strings for the current language
const uiStrings = await loadUIStrings(lang); // from locales/ui/{lang}.json

// Pass to template
eta.render(template, { ...data, t: uiStrings, lang });
```

In templates:
```html
<!-- Current: -->
<span>On this page</span>

<!-- New: -->
<span><%= it.t.docs.onThisPage %></span>
```

---

## Language Switcher

A dropdown or segmented control in the site header:

```html
<div class="lang-switcher">
  <select onchange="switchLang(this.value)">
    <option value="en" selected>English</option>
    <option value="fr">Français</option>
    <option value="de">Deutsch</option>
  </select>
</div>
```

Switching navigates to `/{lang}/current/path`. Language preference stored in `localStorage` and a cookie for server-side detection.

---

## SEO Requirements

1. **`hreflang` tags** on every page pointing to all available translations
2. **`<html lang="xx">`** set correctly per page
3. **Canonical URLs** — each language version is its own canonical
4. **Sitemap** — include all language variants with `xhtml:link` alternates
5. **Structured data** — update `inLanguage` in JSON-LD per page
6. **No auto-redirect** — let users and crawlers access any language directly

---

## Target Languages (Phase 1)

Start with 5 languages based on current traffic + developer population:

| Language | Code | Reason |
|----------|------|--------|
| English | `en` | Default / source |
| French | `fr` | #3 traffic country, maintainer speaks it natively |
| German | `de` | Switzerland #4, large dev community |
| Japanese | `ja` | Huge frontend community, React/Vue docs are translated |
| Chinese | `zh` | Largest developer population globally |

Expand later based on traffic data.

---

## Implementation Order

```
Phase 1 — Foundation                          ~ 1-2 days
├── Extract UI strings into locales/ui/en.json
├── Create translation context file
├── Copy translation modules from radiooooo/translations
├── Translate UI strings to fr (first target)
├── Add lang parameter to router
└── Wire UI strings into templates

Phase 2 — Docs Translation                    ~ 2-3 days
├── Build markdown translation module
├── Translate getting-started.md to fr (proof of concept)
├── Add fallback logic (missing translation → English)
├── Translate remaining docs to fr
└── Add language switcher component

Phase 3 — SEO & Polish                        ~ 1 day
├── Add hreflang tags
├── Update sitemap with language variants
├── Update structured data (JSON-LD)
├── Add language detection (Accept-Language header)
└── localStorage preference persistence

Phase 4 — Scale                               ~ 1 day per language
├── Translate to de, ja, zh
├── Quality review pass
└── Monitor search traffic by language
```

---

## Open Questions

1. **Should code comments in tutorials be translated?** Leaning no — keeps code copy-pasteable.
2. **How to handle version drift?** When an English doc updates, mark translations as stale and queue retranslation.
3. **Community contributions?** Accept translation PRs, or keep it AI-only for consistency?
4. **API reference** — translate descriptions but keep method signatures in English?
5. **Shared package or copy?** Start with copy, extract later?

---

## Cost Estimate

Using Claude API (Haiku for bulk, Sonnet for context-heavy pages):

| Content | Volume | Estimated Cost |
|---------|--------|---------------|
| UI strings | ~150 keys × 4 langs | ~$0.50 |
| Docs | ~28 pages × 4 langs | ~$15-25 |
| Tutorials | 6 pages × 4 langs | ~$3-5 |
| **Total Phase 1-4** | | **~$20-30** |

Incremental updates (per doc change): < $0.10 per language.

---

## Success Metrics

- Organic search traffic from non-English queries (Google Search Console)
- Page views by language (Cloudflare Analytics)
- Bounce rate comparison: translated vs English for non-English visitors
- Time to first translation update after English doc change (< 5 minutes target)