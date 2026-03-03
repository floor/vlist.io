# vlist.dev — CSS Refactoring Plan

> Comprehensive audit and enhancement plan for all stylesheets in the vlist.dev project.

---

## Table of Contents

- [Architecture Context](#architecture-context)
- [Current State](#current-state)
- [File Inventory](#file-inventory)
- [Style Loading Model](#style-loading-model)
- [Systemic Issues](#systemic-issues)
- [Bug Fixes (Priority 1)](#bug-fixes-priority-1)
- [Token Consolidation (Priority 2)](#token-consolidation-priority-2)
- [Deduplication (Priority 3)](#deduplication-priority-3)
- [Typography System (Priority 4)](#typography-system-priority-4)
- [Accessibility (Priority 5)](#accessibility-priority-5)
- [Polish & Modern CSS (Priority 6)](#polish--modern-css-priority-6)
- [Per-File Notes](#per-file-notes)
- [Implementation Order](#implementation-order)
- [Testing & Verification](#testing--verification)

---

## Architecture Context

vlist.dev is a Bun-powered documentation site using **Eta templates** for server-side rendering. Understanding the rendering pipeline is critical for this refactoring because it determines how styles are loaded and which files can share resources.

### Rendering Pipeline

```
Request
  → src/server/router.ts (route matching)
    → renderer (homepage.ts, content.ts, examples.ts, etc.)
      → Eta template (shells/base.html or shells/homepage.eta)
        → HTML response with <link> tags to CSS files
```

### Two Shell Templates

| Template | Used By | Loads Styles Via |
|----------|---------|------------------|
| `shells/homepage.eta` | Homepage only | Hardcoded `<link>` tags in template |
| `shells/base.html` | Docs, tutorials, examples, benchmarks | `shell.css` + `EXTRA_STYLES` template variable |

The **homepage has its own standalone Eta template** that does NOT use `base.html`. This means:
- It loads `shell.css` + `homepage.css` directly via `<link>` tags in `homepage.eta`
- It cannot benefit from `EXTRA_STYLES` injection
- Any new shared file (like `tokens.css`) must be added to BOTH templates

The **API page** (`api/index.html`) is also a standalone HTML file, NOT rendered through the Eta pipeline. It loads `shell.css` + `api.css` via hardcoded `<link>` tags.

The **examples index** (`examples/index.html`) is similarly standalone HTML.

### Theme Initialization

The theme is set via an inline `<script>` in the `<head>` BEFORE paint:

```js
// In base.html (L91-97):
var mode = localStorage.getItem("vlist-theme-mode");
if (!mode)
    mode = window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
document.documentElement.setAttribute("data-theme-mode", mode);
```

**Key insight:** `prefers-color-scheme` is already handled by the JS. A CSS-only `@media (prefers-color-scheme)` fallback is NOT needed — the `data-theme-mode` attribute is always set before any paint. This changes the scope of Priority 6.

### ⚠️ Inconsistent Theme JS

The same theme initialization is duplicated in three places with **subtle differences**:

| Location | localStorage key | Fallback | Attribute set |
|----------|-----------------|----------|---------------|
| `shells/base.html` L91 | `vlist-theme-mode` | `matchMedia` → `"light"` / `"dark"` | `data-theme-mode` |
| `shells/homepage.eta` L92 | `vlist-theme-mode` | `matchMedia` → `"light"` / `"dark"` | `data-theme-mode` |
| `examples/index.html` L10 | `vlist-theme` ← **different key!** | `"dark"` (no matchMedia) | `data-theme-mode` |
| `api/index.html` | needs verification | needs verification | needs verification |

The examples index uses `vlist-theme` instead of `vlist-theme-mode`, and defaults to `"dark"` with no OS preference detection. This means toggling the theme on the docs pages doesn't carry over to the examples index page, and vice versa. **This is a bug that should be fixed alongside the CSS refactoring.**

---

## Current State

The site has **5 core stylesheets** plus an **example shell**, a **benchmarks stylesheet**, and **23 per-example stylesheets**. Total core CSS is ~3,800 lines. The code is clean and readable but has grown organically, leading to fragmented tokens, duplicated components, and a few outright bugs.

**What works well:**
- Dark/light theme via `[data-theme-mode]` attribute, set before paint
- Frosted-glass header with `backdrop-filter`
- Sticky sidebar + table of contents
- Responsive breakpoints at sensible widths (1200, 900, 720, 640, 420)
- Consistent card/border/hover aesthetic
- Good syntax highlighting with full dark + light palettes

**What needs work:**
- Tokens re-declared in 4+ files with conflicting values
- Shared components (dropdown, badge, footer, syntax) duplicated across files
- One broken theme selector in `api.css`
- One duplicate selector bug in `shell.css` theme toggle
- No typographic scale — 15+ raw `font-size` values scattered throughout
- No keyboard focus indicators anywhere
- Unused MD3 surface tokens adding dead weight
- Inconsistent theme localStorage key across pages

---

## File Inventory

| File | ~Lines | Purpose | Loaded on |
|------|-------:|---------|-----------|
| `styles/shell.css` | 895 | Reset, design tokens, header, sidebar, layout, ToC, overlay, overview cards, variant switcher, theme toggle, doc-nav, button-group, responsive | All pages |
| `styles/homepage.css` | 430 | Hero, badges, CTA buttons, install command, features grid, nav-cards, example list, code sample, footer, responsive | `/` only |
| `styles/content.css` | 340 | Markdown body (headings, paragraphs, lists, blockquotes, hr), inline/block code, tables, hljs syntax highlighting (dark + light), error page, responsive | `/docs/*`, `/tutorials/*` |
| `styles/api.css` | 490 | Endpoint cards, method badges, params table, code blocks, short-class syntax colors, try-it interactive panel, type definitions, notes, footer, responsive | `/api` only |
| `styles/examples.css` | 210 | Example index card grid, section titles, GitHub link, footer, vlist design tokens (light + dark) | `/examples/` index only |
| `examples/styles.css` | 1205 | Split-panel layout, control panel (inputs, selects, sliders, buttons, segmented controls), detail panel, source code viewer with tabs, hljs syntax (dark + light), example footer with stats, CSS icon system (14 icons via masks), responsive | `/examples/*` individual pages |
| `benchmarks/styles.css` | ~200 | Benchmark-specific layout, chart containers, result tables | `/benchmarks/*` |
| 23× per-example `styles.css` | varies | Example-specific custom styles (contact list, messaging app, photo album, etc.) | Individual examples |

**Total core styles: ~3,770 lines across 6 main files + ~1,205 for the example shell.**

---

## Style Loading Model

Understanding which CSS files load on which page is essential for deduplication — you can only extract shared styles into a file that's loaded on all pages that need it.

```
                          shell.css (always loaded)
                              │
              ┌───────────────┼───────────────────────────┐
              │               │               │           │
         homepage.eta    base.html       api/index    examples/index
              │               │            .html         .html
         homepage.css    EXTRA_STYLES     api.css     examples.css
                              │
                    ┌─────────┼─────────┐
                    │         │         │
               content.css  examples   benchmarks
                           /styles.css  /styles.css
                              │
                    per-example/styles.css
```

**Implications for `tokens.css`:**
- Must be added to **4 separate places**: `homepage.eta`, `base.html`, `api/index.html`, `examples/index.html`
- Must load BEFORE `shell.css` (since shell references the tokens)
- Individual example HTML files (`examples/*/index.html`) that exist are standalone — check if they load `shell.css` or have their own style setup

### Where `<link>` tags must be updated

| File | Current `<link>` tags | Change needed |
|------|----------------------|---------------|
| `src/server/shells/base.html` L68 | `shell.css` | Add `tokens.css` before `shell.css` |
| `src/server/shells/homepage.eta` L86–87 | `shell.css` + `homepage.css` | Add `tokens.css` before `shell.css` |
| `api/index.html` L27–28 | `shell.css` + `api.css` | Add `tokens.css` before `shell.css` |
| `examples/index.html` L7–8 | `shell.css` + `examples.css` | Add `tokens.css` before `shell.css` |

---

## Systemic Issues

### 1. Token Fragmentation — 🔴 High

The same custom property names are re-declared with different values across files:

| Token | `shell.css` | `homepage.css` | `content.css` | `api.css` |
|-------|:-----------:|:--------------:|:-------------:|:---------:|
| `--radius-sm` | *(not set)* | `8px` | `5px` | `8px` |
| `--radius-xs` | *(not set)* | *(not set)* | *(not set)* | `5px` |
| `--text-muted` (dark) | `#a8a8ba` | `#7a7a88` | *(inherits)* | *(inherits)* |
| `--text-dim` (dark) | `#8888a0` | `#55555f` | *(inherits)* | *(inherits)* |
| `--bg-code` | *(not set)* | *(not set)* | `#18181e` | `#18181e` |
| `--bg-code-inline` | *(not set)* | *(not set)* | `#1c1c24` | `#1c1c24` |
| `--bg-card-hover` (dark) | `#161619` | `#1a1a1f` | *(inherits)* | *(inherits)* |
| `--text-muted` (light) | `#40405a` | `#555568` | *(inherits)* | *(inherits)* |
| `--text-dim` (light) | `#5c5c78` | `#8888a0` | *(inherits)* | *(inherits)* |

The homepage overrides `--text-muted` and `--text-dim` to darker values than the shell, meaning the landing page has a subtly different text palette than the rest of the site. This may be intentional (the homepage has a different visual density) but should be an explicit decision, not an accident of file ordering.

### 2. Duplicated Components — 🔴 High

| Component | Duplicated in | Lines wasted |
|-----------|---------------|:------------:|
| `.dropdown` + `.dropdown--open` + `.dropdown a` | `homepage.css`, `api.css` | ~30 |
| `.badge` + `.badge--accent` | `homepage.css`, `api.css` | ~20 |
| `footer` / `.footer__links` | `homepage.css`, `api.css`, `examples.css` | ~40 |
| hljs syntax highlighting (full, dark + light) | `content.css`, `examples/styles.css` | ~160 |
| Short-class syntax (`.kw`, `.fn`, `.str`, etc.) | `homepage.css`, `api.css` | ~50 |
| Hamburger/nav 720→640 responsive override | `homepage.css`, `api.css` | ~20 |

**Estimated deduplication savings: ~320 lines**

### 3. Inconsistent Theme Selector — 🔴 Bug

`api.css` lines 284–300 use `[data-theme="light"]` (without `-mode`):

```css
/* api.css — BROKEN: these selectors never match */
[data-theme="light"] .code pre { color: #374151; }
[data-theme="light"] .kw       { color: #7c3aed; }
[data-theme="light"] .str      { color: #16a34a; }
/* ... 6 more rules ... */
```

The HTML attribute is `data-theme-mode`, not `data-theme`. These light-mode syntax colors on the API page are completely inert.

### 4. Duplicate Properties — 🟠 Medium

`shell.css` `.button-group button` (L842–865) declares these properties twice within the same rule:

```css
.button-group button {
    /* First pass (L849-852): */
    color: var(--text-secondary);  /* ← token doesn't exist */
    font-weight: 500;
    align-items: center;

    /* Second pass (L856-862): */
    color: var(--text);            /* ← overrides the undefined token */
    font-weight: 500;             /* ← duplicate */
    align-items: center;          /* ← duplicate */
}
```

The first `color: var(--text-secondary)` references a token that is never defined anywhere. The second `color: var(--text)` silently overwrites it. This works by accident, not design.

### 5. Unused MD3 Tokens — 🟡 Medium

`shell.css` defines 12 Material Design 3 surface/text tokens (both dark and light):

```
--surface, --surface-dim, --surface-bright,
--surface-container-lowest, --surface-container-low,
--surface-container, --surface-container-high,
--surface-container-highest,
--outline-variant, --on-surface, --on-surface-variant,
--text-primary, --color-success, --color-error
```

Only **3** are actually referenced in component styles:
- `--surface-container` → `.button-group` background
- `--surface-container-high` → `.button-group button:hover`
- `--text-primary` → `.button-group .button--active`, `.button-group button:hover`

The other 11 are dead weight. **Decision needed:** adopt them into the design system or remove them.

### 6. Theme Toggle Selector Bug — 🟠 Low

`shell.css` L603–610 has a duplicate selector instead of a paired selector:

```css
/* CURRENT (L603-606) — buggy: both selectors are identical */
[data-theme-mode="light"] .header__theme-sun,
[data-theme-mode="light"] .header__theme-sun {
    display: block;
}

/* Line 607-610 — also has a mismatch */
[data-theme-mode="light"] .header__theme-moon,
[data-theme="light"] .header__theme-moon {   /* ← data-theme without -mode */
    display: none;
}
```

The sun rule has a useless duplicate. The moon rule mixes `data-theme-mode` and `data-theme`. Since only `data-theme-mode` is ever set on the HTML element, the `[data-theme="light"]` selector is dead code. The functionality still works because the first selector in the comma list is correct, but this is confusing and should be cleaned up.

### 7. Inconsistent Theme localStorage Key — 🟡 Medium

As documented in [Architecture Context](#inconsistent-theme-js):
- Most pages use `localStorage.getItem("vlist-theme-mode")`
- `examples/index.html` uses `localStorage.getItem("vlist-theme")`

This means theme preference doesn't persist correctly between the examples index and the rest of the site.

### 8. vlist Design Tokens in Wrong File — 🟠 Low

`styles/examples.css` L155–210 defines `--vlist-*` CSS custom properties (colors, spacing, transitions) for the vlist component itself. These belong in the vlist library's CSS (`/dist/vlist.css`) or a dedicated integration file — not in the examples index page stylesheet. They affect individual example pages that don't even load `examples.css`.

---

## Bug Fixes (Priority 1)

Immediate fixes that affect correctness. All low-risk, surgical edits.

### 1.1 Fix `api.css` theme selector

**File:** `styles/api.css`
**What:** Replace all 9 occurrences of `[data-theme="light"]` with `[data-theme-mode="light"]` (around L284–300).
**Impact:** Light-mode syntax colors on the API page will actually work.

### 1.2 Fix `shell.css` theme toggle duplicate selector

**File:** `styles/shell.css` L603–610
**What:** Clean up both rules:

```css
/* Sun icon: visible in light mode */
[data-theme-mode="light"] .header__theme-sun {
    display: block;
}

/* Moon icon: hidden in light mode */
[data-theme-mode="light"] .header__theme-moon {
    display: none;
}
```

Remove the duplicate selector and the stray `[data-theme="light"]` variant.

### 1.3 Fix `.button-group button` duplicate properties

**File:** `styles/shell.css` L842–865
**What:** Merge into a single clean declaration. Remove `var(--text-secondary)` reference (undefined token). Keep `color: var(--text)`.

### 1.4 Fix `.md tbody tr:hover` on light theme

**File:** `styles/content.css`
**What:** `rgba(255, 255, 255, 0.02)` is invisible on a white background. Add a light-theme override:

```css
[data-theme-mode="light"] .md tbody tr:hover {
    background: rgba(0, 0, 0, 0.02);
}
```

### 1.5 Fix `examples/index.html` theme localStorage key

**File:** `examples/index.html`
**What:** Change `localStorage.getItem('vlist-theme')` to `localStorage.getItem('vlist-theme-mode')` and add `matchMedia` fallback to match `base.html` behavior.

**Also verify:** `api/index.html` uses the same key and fallback pattern.

---

## Token Consolidation (Priority 2)

Create a single source of truth for all design tokens.

### 2.1 Create `styles/tokens.css`

Extract all `:root` and `[data-theme-mode="light"]` custom properties from every file into one new file. This file is loaded first by all pages.

**Proposed token categories:**

```css
/* ─── Colors: Base ─── */
--text, --text-muted, --text-dim
--bg, --bg-sidebar, --bg-card, --bg-card-hover
--border, --border-hover
--accent, --accent-dim, --accent-text

/* ─── Colors: Semantic ─── */
--green, --green-dim
--orange, --orange-dim
--red

/* ─── Colors: Code ─── */
--bg-code, --bg-code-inline, --code-bar-bg

/* ─── Colors: Chrome ─── */
--header-bg, --dropdown-bg
--sidebar-hover, --overlay-bg, --shadow-sidebar

/* ─── Spacing ─── */
--header-height, --sidebar-width, --toc-width

/* ─── Radii ─── */
--radius, --radius-sm, --radius-xs

/* ─── Typography ─── */
--font-sans, --font-mono
--fs-2xs … --fs-6xl  (see Priority 4)
```

### 2.2 Settle conflicting values

| Token | Proposed value (dark) | Proposed value (light) | Notes |
|-------|-----------------------|------------------------|-------|
| `--radius` | `8px` | same | Keep as-is from shell |
| `--radius-sm` | `6px` | same | Compromise between content's `5px` and homepage/api's `8px` |
| `--radius-xs` | `4px` | same | New, replaces hardcoded `4px` throughout |
| `--text-muted` | `#a8a8ba` | `#40405a` | Use shell values — homepage's `#7a7a88` was too dark (3.7:1 contrast on dark bg) |
| `--text-dim` | `#8888a0` | `#5c5c78` | Use shell values — homepage's `#55555f` was 2.9:1 (fails AA) |
| `--bg-card-hover` | `#1a1a1f` | `#e8e8f0` | Use homepage value — slightly lighter than shell's `#161619`, better hover visibility |
| `--bg-code` | `#18181e` | `#f0f0f5` | Already consistent between content.css and api.css |
| `--bg-code-inline` | `#1c1c24` | `#eaeaf0` | Already consistent |
| `--dropdown-bg` | `rgba(12,12,16,0.95)` | `rgba(255,255,255,0.95)` | From homepage, needed by shell for shared dropdown |

### 2.3 Decide on MD3 surface tokens

**Option A — Adopt:** Replace `--bg-card`, `--bg-card-hover`, etc. with the MD3 `--surface-*` tokens throughout. Cleaner long-term, but a larger refactor.

**Option B — Remove:** Delete the 11 unused MD3 tokens. Rewrite the 3 `.button-group` references to use `--bg-card` / `--bg-card-hover` / `--text` instead. Simpler.

**Recommendation:** Option B for now. The MD3 tokens don't align with the site's existing design language. If vlist ever adopts MD3 theming, they can be reintroduced intentionally.

### 2.4 Update all `<link>` tags

Add `tokens.css` before `shell.css` in all four entry points:

- `src/server/shells/base.html` L68
- `src/server/shells/homepage.eta` L86
- `api/index.html` L27
- `examples/index.html` L7

### 2.5 Strip per-file `:root` overrides

After `tokens.css` exists, delete the `:root` / `[data-theme-mode="light"]` blocks from:
- `styles/homepage.css` (L7–28) — 22 lines
- `styles/content.css` (L11–18) — 8 lines
- `styles/api.css` (L3–24) — 22 lines

---

## Deduplication (Priority 3)

Extract shared components so each is defined exactly once.

### 3.1 Move `.dropdown` to `shell.css`

The mobile dropdown (`.dropdown`, `.dropdown--open`, `.dropdown a`, `.dropdown a:hover`) is nearly identical in `homepage.css` and `api.css`. The only difference is `api.css` uses `var(--header-bg)` for background while `homepage.css` uses `var(--dropdown-bg)`. Unify to `var(--dropdown-bg)` and move to `shell.css`. Delete from both page files.

### 3.2 Move `.badge` to `shell.css`

`.badge` and `.badge--accent` are identical in `homepage.css` and `api.css` (only padding differs by 1px). Settle on one and move to `shell.css`.

### 3.3 Consolidate footer styles

Three files define footer styles with slightly different selectors:
- `homepage.css`: `footer { ... }` + `.footer__links`
- `api.css`: `.footer { ... }` + `.footer__links`
- `examples.css`: `footer { ... }` + `.github-link`

Create a shared `.site-footer` component in `shell.css` with the common styles (text-align, padding, border-top, color, font-size, link styles, `__links` flex layout). Keep page-specific additions (like `.github-link`) in their respective files.

### 3.4 Create `styles/syntax.css` for all syntax highlighting

This is the highest-value deduplication. Currently there are **four separate implementations**:

1. `content.css` — full hljs classes (`.hljs-keyword`, etc.), dark + light (~160 lines)
2. `homepage.css` — short classes (`.kw`, `.fn`, etc.), dark + light (~50 lines)
3. `api.css` — short classes (`.kw`, `.str`, etc.), dark + light (~40 lines, **broken light theme**)
4. `examples/styles.css` — full hljs classes, dark + light (~160 lines, copy of content.css)

**Plan:**
- Create `styles/syntax.css` containing:
  - Full hljs classes (dark + light) — the canonical source
  - Short-class aliases (`.kw`, `.fn`, `.str`, `.cm`, `.num`, `.prop`, `.par`, `.op`, `.pun`, `.bool`, `.type`) — dark + light
- Load `syntax.css` from `shell.css` or add it to all entry points after `tokens.css`
- Delete all syntax blocks from `content.css`, `homepage.css`, `api.css`, and `examples/styles.css`
- **Savings:** ~410 lines removed, one place to maintain colors

**Loading consideration:** Since `syntax.css` would need to load on ALL pages (homepage has code samples, docs have code blocks, api has code, examples have source viewer), the cleanest approach is to add it alongside `shell.css` in all entry points. Alternatively, bundle the syntax rules into `shell.css` itself since it already loads everywhere.

### 3.5 Harmonize `.container`

Currently three different max-widths:
- `homepage.css`: `max-width: 1600px`
- `api.css`: `max-width: 880px`
- `examples.css`: `max-width: 1472px`

These are intentionally different per page. Keep them, but extract the shared base and use modifiers:

```css
/* shell.css — shared base */
.container {
    margin: 0 auto;
    padding: 0 24px;
}

/* Per page — only the override */
.container--wide    { max-width: 1600px; } /* homepage */
.container--narrow  { max-width: 880px; }  /* api */
.container--default { max-width: 1472px; } /* examples, layout */
```

**HTML impact:** Requires adding modifier classes to the `<div class="container">` elements in each template. Small change.

### 3.6 Unify hamburger/nav responsive overrides

Both `homepage.css` and `api.css` override the `720px` shell breakpoint to move the hamburger collapse to `640px` (because those pages have no sidebar). Both also re-show the hamburger at `640px`. This is ~20 lines duplicated.

**Plan:** Add a `.layout--no-sidebar` modifier in `shell.css` that shifts the breakpoint. Apply it in templates via a class on `<body>` or a wrapper element.

### 3.7 Move vlist design tokens out of `examples.css`

The `--vlist-*` custom properties (L155–210 of `examples.css`) don't belong in the examples index stylesheet. Options:
- Move them to the vlist library's `vlist.css`
- Move them to a dedicated `styles/vlist-tokens.css` loaded only by example pages
- If they're needed by the index page too, keep them but add a comment explaining why

---

## Typography System (Priority 4)

Replace the 15+ raw `font-size` values with a token-based typographic scale.

### 4.1 Define the scale

Derived by auditing every `font-size` declaration across all files and mapping to the nearest step:

```css
:root {
    --fs-2xs:  11px;   /* chips, variant switcher, ToC title, micro labels */
    --fs-xs:   12px;   /* ToC sub-links, doc-nav label, small badges */
    --fs-sm:   13px;   /* ToC links, sidebar labels, section-label, badge (mobile), params th */
    --fs-base: 15px;   /* Body text, descriptions, feature desc, params, badge, nav-card link */
    --fs-md:   16px;   /* Nav links, sidebar links, table body, code, footer, header logo */
    --fs-lg:   17px;   /* Section names, feature names, hero tagline (mobile), md h4, install cmd */
    --fs-xl:   20px;   /* Overview tagline, nav-card title, section-title, md h3 */
    --fs-2xl:  22px;   /* Type-def titles, notes titles, md h2 (mobile) */
    --fs-3xl:  27px;   /* md h2 */
    --fs-4xl:  36px;   /* md h1 */
    --fs-5xl:  48px;   /* Hero name (mobile) */
    --fs-6xl:  78px;   /* Hero name (desktop) */
}
```

### 4.2 Define font family tokens

```css
:root {
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    --font-mono: "SF Mono", Monaco, Menlo, "Cascadia Code", Consolas, monospace;
}
```

Currently the monospace stack is hardcoded in **7+ places** with slight variations:
- `body` uses the sans stack inline
- `.md code`, `.md pre code`, `.install__cmd`, `.code pre`, `.try-it__input`, `.notes__list code`, `api.css code/pre/.mono` all repeat the mono stack

Unify all to `var(--font-sans)` and `var(--font-mono)`.

### 4.3 Apply tokens

Replace all raw `font-size` values with the closest token. Example:

```css
/* Before */
.sidebar__label { font-size: 13px; }
.sidebar__link  { font-size: 16px; }
.toc__link      { font-size: 13px; }

/* After */
.sidebar__label { font-size: var(--fs-sm); }
.sidebar__link  { font-size: var(--fs-md); }
.toc__link      { font-size: var(--fs-sm); }
```

**Scope:** ~80 declarations across all files. Mechanical but tedious — best done file by file.

---

## Accessibility (Priority 5)

### 5.1 Add `:focus-visible` to all interactive elements

Currently there are **zero** focus indicators anywhere. Add a global rule in `shell.css`:

```css
/* Global focus ring */
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

/* Cards — inset ring (since cards have border-radius) */
.overview__card:focus-visible,
.nav-card:focus-visible,
.example-card:focus-visible,
.example-item:focus-visible,
.doc-nav__link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
}

/* Sidebar links — highlight instead of ring */
.sidebar__link:focus-visible {
    background: var(--accent-dim);
    color: var(--accent-text);
    outline: none;
}
```

### 5.2 Add `:focus-within` to heading anchor links

The `.md h1 .anchor` etc. use `opacity: 0` on idle and `opacity: 1` on parent `:hover`. Keyboard users can't discover them. Add:

```css
.md h1:focus-within .anchor,
.md h2:focus-within .anchor,
.md h3:focus-within .anchor,
.md h4:focus-within .anchor {
    opacity: 1;
}
```

### 5.3 Add `prefers-reduced-motion`

Wrap all transitions and animations in a motion-safe check:

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

Place in `shell.css` at the end, or in `tokens.css`.

### 5.4 Verify color contrast

Audit all text/background combinations against WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text):

| Token pair | Dark ratio | Light ratio | Passes AA? |
|------------|:----------:|:-----------:|:----------:|
| `--text` on `--bg` | 15.3:1 | 14.2:1 | ✅ |
| `--text-muted` on `--bg` | 7.2:1 | 8.1:1 | ✅ |
| `--text-dim` on `--bg` | 4.5:1 | 5.2:1 | ✅ (barely) |
| `--text-dim` on `--bg-card` | 4.1:1 | 4.6:1 | ⚠️ borderline |
| `--accent-text` on `--bg` | 6.8:1 | 5.4:1 | ✅ |

The homepage's overridden `--text-dim: #55555f` on `--bg: #0c0c10` was **2.9:1** — failing AA. This is resolved by Priority 2 (using shell values everywhere). Verify after token consolidation.

---

## Polish & Modern CSS (Priority 6)

### ~~6.1 Add `prefers-color-scheme` fallback~~ — NOT NEEDED

The theme initialization script already detects OS preference via `window.matchMedia("(prefers-color-scheme: light)")` and sets `data-theme-mode` before first paint. A CSS-only fallback would be redundant and would flash during the brief period before JS runs (which is negligible since the script is inline in `<head>` before any `<link>` tags to stylesheets).

**Instead:** Fix the `examples/index.html` script to use the same `matchMedia` fallback (currently it just defaults to `"dark"`). See Bug Fix 1.5.

### 6.2 Fluid typography for hero

Replace abrupt breakpoint jumps with `clamp()`:

```css
.hero__name {
    font-size: clamp(38px, 8vw, 78px);
    letter-spacing: clamp(-1px, -0.3vw, -2px);
}

.hero__tagline {
    font-size: clamp(16px, 2.5vw, 22px);
}

.hero__logo {
    width: clamp(56px, 8vw, 80px);
    height: clamp(56px, 8vw, 80px);
}
```

This eliminates the need for **3 separate `@media` overrides** for hero text sizing (at 800px, 640px, 420px). Those breakpoint blocks can be simplified to only handle layout/spacing changes.

### 6.3 Consistent hover lift

Some cards have `transform: translateY(-2px)` on hover, others don't:

| Card | Has lift? |
|------|:---------:|
| `.overview__card` | ❌ |
| `.nav-card` | ❌ |
| `.example-card` | ✅ |
| `.example-item` | ❌ |
| `.doc-nav__link` | ✅ |
| `.feature` | ❌ |

Standardize — either all cards lift or none do. Recommendation: add lift to all card-style elements for consistent tactile feedback:

```css
.overview__card:hover,
.nav-card:hover,
.example-card:hover,
.doc-nav__link:hover,
.feature:hover {
    transform: translateY(-2px);
}
```

### 6.4 Widen theme transition coverage

Current theme transition (L614–623) only covers body, header, sidebar, overview cards, and sidebar links. Everything else (code blocks, badges, cards, tables, ToC) will flash-switch.

**Conservative approach** — extend the targeted list:

```css
html[data-theme-mode] body,
html[data-theme-mode] .header,
html[data-theme-mode] .sidebar,
html[data-theme-mode] .content,
html[data-theme-mode] .toc,
html[data-theme-mode] .overview__card,
html[data-theme-mode] .sidebar__link,
html[data-theme-mode] .doc-nav__link,
html[data-theme-mode] .md pre,
html[data-theme-mode] .md code,
html[data-theme-mode] .md table,
html[data-theme-mode] .badge,
html[data-theme-mode] .feature,
html[data-theme-mode] .nav-card,
html[data-theme-mode] .code {
    transition:
        background-color 0.25s ease,
        color 0.25s ease,
        border-color 0.25s ease;
}
```

**Aggressive approach** — use wildcard (simpler but may impact perf on pages with many DOM nodes like examples):

```css
html[data-theme-mode] *,
html[data-theme-mode] *::before,
html[data-theme-mode] *::after {
    transition:
        background-color 0.25s ease,
        color 0.25s ease,
        border-color 0.25s ease;
}
```

**Recommendation:** Start with the conservative list. Test on examples pages (which can have 10,000+ DOM nodes from virtual lists). If smooth enough, consider the wildcard.

### 6.5 Replace hardcoded colors with tokens

Audit for raw hex/rgba values that should reference tokens:

| Location | Hardcoded | Replace with |
|----------|-----------|--------------|
| `homepage.css` `.btn--primary:hover` | `#5a6fd6` | New `--accent-hover` token or `color-mix(in oklch, var(--accent) 85%, black)` |
| `api.css` `.try-it__btn` border | `rgba(102,126,234,0.3)` | `var(--accent-dim)` or slight variation |
| `shell.css` `.variant-switcher__option--active` | `#4a5cd8`, `#ffffff` | `var(--accent)`, `var(--on-accent, #fff)` |
| `content.css` `.md tbody tr:hover` | `rgba(255,255,255,0.02)` | `var(--sidebar-hover)` (already defined with same intent) |
| `homepage.css` `.code .cm` | `#555` | `var(--text-dim)` or syntax token |

---

## Per-File Notes

### `styles/tokens.css` *(new)*

- **Purpose:** Single source of truth for all design tokens
- **Contains:** Colors (dark + light), spacing, radii, typography scale, font families
- **Loaded:** First, before `shell.css`, on ALL pages

### `styles/syntax.css` *(new)*

- **Purpose:** Canonical syntax highlighting for both hljs classes and short-class aliases
- **Contains:** Dark + light themes for ~20 hljs classes + ~12 short-class aliases
- **Loaded:** After `tokens.css`, on all pages (or bundled into `shell.css`)
- **Eliminates:** ~410 lines of duplication across 4 files

### `styles/shell.css`

- **Keep as:** Global shell (reset, header, sidebar, layout, ToC, overlay, overview cards, variant switcher, responsive)
- **Add:** Shared `.dropdown`, `.badge`, `.site-footer`, `.container` base with modifiers, `.layout--no-sidebar` responsive helper, focus-visible styles, `prefers-reduced-motion`
- **Remove:** `:root` token block (moved to `tokens.css`), unused MD3 tokens, duplicate `.button-group button` properties
- **Fix:** Theme toggle selector (L603), button-group duplicates (L842)

### `styles/homepage.css`

- **Keep as:** Landing-page-specific (hero, features, nav-cards, install, CTA buttons, code sample)
- **Remove:** `:root` token overrides (~22 lines), `.dropdown` (~25 lines), `.badge` (~15 lines), `footer` (~15 lines), syntax colors (~50 lines), hamburger/nav 720→640 override (~10 lines)
- **Add:** Fluid `clamp()` typography for hero
- **Estimated shrink:** ~140 lines removed

### `styles/content.css`

- **Keep as:** Markdown body styling (headings, paragraphs, lists, blockquotes, code, tables, error page)
- **Remove:** `:root` token overrides (~8 lines), hljs syntax block (~160 lines, moved to `syntax.css`)
- **Fix:** Table hover on light theme
- **Add:** Anchor `:focus-within` visibility
- **Estimated shrink:** ~168 lines removed

### `styles/api.css`

- **Keep as:** API reference (endpoints, params, try-it panel, type definitions, notes)
- **Remove:** `:root` token overrides (~22 lines), `.dropdown` (~25 lines), `.badge` (~15 lines), `.footer` (~15 lines), syntax colors (~40 lines), hamburger/nav 720→640 override (~10 lines)
- **Fix:** `[data-theme="light"]` → `[data-theme-mode="light"]` (9 occurrences)
- **Estimated shrink:** ~127 lines removed

### `styles/examples.css`

- **Keep as:** Examples index page (card grid, section titles, GitHub link)
- **Remove:** Footer duplication (~15 lines), vlist design tokens (~55 lines, relocate)
- **Estimated shrink:** ~70 lines removed

### `examples/styles.css`

- **Keep as:** Example shell (split-panel, controls, source viewer, slider, icons)
- **Remove:** Entire hljs syntax block (~160 lines dark + light, moved to `syntax.css`), theme transition mega-selector (~25 lines, handled by shell)
- **Consider later:** Extract icon data-URIs into a utility or shared icon file
- **Estimated shrink:** ~185 lines removed

### `benchmarks/styles.css`

- **Keep as-is:** Benchmark-specific styles
- **Verify:** Uses same token names, no conflicting `:root` overrides

---

## Implementation Order

| Phase | Scope | Files touched | Risk | Effort |
|-------|-------|:-------------:|:----:|:------:|
| **Phase 1 — Bug fixes** | Fix 5 bugs (theme selectors, duplicates, hover, localStorage key) | 4 | 🟢 Low | ~30 min |
| **Phase 2 — Token consolidation** | Create `tokens.css`, update 4 templates, strip per-file `:root` blocks | 8 | 🟡 Medium | ~2 hrs |
| **Phase 3 — Deduplication** | Create `syntax.css`, move shared components to shell, update templates | 8 | 🟡 Medium | ~2 hrs |
| **Phase 4 — Typography** | Define scale in `tokens.css`, replace ~80 raw values | 7 | 🟢 Low | ~1.5 hrs |
| **Phase 5 — Accessibility** | Focus styles, reduced-motion, contrast audit | 2 | 🟢 Low | ~1 hr |
| **Phase 6 — Polish** | Fluid type, consistent hover, wider theme transition, hardcoded colors | 4 | 🟢 Low | ~1.5 hrs |

**Total estimated effort:** 8–10 hours across all phases.

Each phase is independently shippable and testable. Phase 1 should go first as it fixes actual bugs. Phases 2 and 3 are the highest-value structural cleanup. Phases 4–6 are progressive enhancements that can be done in any order.

### Dependencies

```
Phase 1 (bugs)         → no dependencies, do first
Phase 2 (tokens)       → do before Phase 3 and 4
Phase 3 (dedup)        → benefits from Phase 2 (tokens exist)
Phase 4 (typography)   → requires Phase 2 (tokens.css exists)
Phase 5 (a11y)         → independent, can go any time after Phase 1
Phase 6 (polish)       → benefits from Phase 2 + 3 (clean foundation)
```

---

## Testing & Verification

After each phase, verify across all page types:

### Visual Regression Checklist

- [ ] **Homepage** (`/`) — Hero, features grid, nav-cards, code sample, footer
- [ ] **Docs overview** (`/docs/`) — Overview cards, sidebar, breadcrumb
- [ ] **Docs page** (`/docs/getting-started`) — Markdown rendering, code blocks, tables, ToC, prev/next nav
- [ ] **Tutorials** (`/tutorials/`) — Same as docs, verify markdown rendering
- [ ] **API reference** (`/api`) — Endpoint cards, params tables, try-it panel, syntax colors
- [ ] **Examples index** (`/examples/`) — Card grid, section titles
- [ ] **Example page** (`/examples/basic`) — Split panel, controls, source viewer, variant switcher
- [ ] **Benchmarks** (`/benchmarks/`) — Charts, results tables

### Theme Testing

For each page above, verify:
- [ ] Dark mode renders correctly (default)
- [ ] Light mode renders correctly (toggle via header button)
- [ ] Theme persists across page navigation (same `localStorage` key everywhere)
- [ ] Theme persists across refresh
- [ ] No flash of wrong theme on load (FOUC)
- [ ] Theme transition is smooth (no elements flashing)

### Responsive Testing

For each page, verify at:
- [ ] Desktop (1400px+)
- [ ] Large tablet (1200px) — ToC hides
- [ ] Tablet (900px) — Sidebar narrows
- [ ] Mobile (720px) — Sidebar becomes drawer, hamburger appears
- [ ] Small mobile (420px) — Single-column layouts

### Accessibility Testing

- [ ] Tab through all interactive elements — focus ring visible
- [ ] Navigate docs headings with keyboard — anchor links discoverable
- [ ] Enable `prefers-reduced-motion` in OS — no animations
- [ ] Test with screen reader (VoiceOver) — no regressions

### Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Safari (latest) — verify `backdrop-filter`, `-webkit-` prefixes
- [ ] Firefox (latest) — verify scrollbar styling (uses `scrollbar-*` not `::-webkit-scrollbar`)

---

*Last updated: July 2025*