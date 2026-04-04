# vlist.io — CSS Refactoring Plan

> Comprehensive audit and enhancement plan for all stylesheets in the vlist.io project.
>
> **Status: ✅ All 6 phases complete** — implemented on branch `refactor/css-cleanup`.

---

## Table of Contents

- [Architecture Context](#architecture-context)
- [Current State](#current-state)
- [File Inventory](#file-inventory)
- [Style Loading Model](#style-loading-model)
- [Systemic Issues (Resolved)](#systemic-issues-resolved)
- [Bug Fixes (Priority 1)](#bug-fixes-priority-1) ✅
- [Token Consolidation (Priority 2)](#token-consolidation-priority-2) ✅
- [Deduplication (Priority 3)](#deduplication-priority-3) ✅
- [Typography System (Priority 4)](#typography-system-priority-4) ✅
- [Accessibility (Priority 5)](#accessibility-priority-5) ✅
- [Polish & Modern CSS (Priority 6)](#polish--modern-css-priority-6) ✅
- [Deferred Items](#deferred-items)
- [Per-File Notes](#per-file-notes)
- [Implementation Log](#implementation-log)
- [Testing & Verification](#testing--verification)

---

## Architecture Context

### Rendering Pipeline

All docs/tutorial pages are **server-rendered** with Eta templates. The server reads Markdown files, injects them into a shell (`base.html`), and serves complete HTML. There is no client-side router — each page is a full document.

Standalone pages (`api/index.html`, `examples/index.html`) are **static HTML** files with no template engine.

Individual example pages (`examples/*/index.html`) are standalone HTML — they do NOT load the shared shell styles.

### Two Shell Templates

| Template | Used by | Notes |
|----------|---------|-------|
| `src/server/shells/base.html` | Docs, tutorials, example pages | Eta template, has sidebar + ToC slots |
| `src/server/shells/homepage.eta` | `/` landing page only | Eta template, no sidebar |

Both templates share `shell.css` for the header, but the homepage has its own layout.

### Theme Initialization

Theme is set **before first paint** via an inline `<script>` in `<head>` (before any `<link>` to stylesheets):

1. Read `localStorage.getItem("vlist-theme-mode")`
2. If not set, check `window.matchMedia("(prefers-color-scheme: light)")`
3. Set `document.documentElement.setAttribute("data-theme-mode", mode)`

This runs synchronously before the browser fetches CSS, so there is **zero flash of wrong theme** (FOUC).

### Theme JS — Consistent ✅

All 4 entry points now use the same pattern:
- localStorage key: `vlist-theme-mode`
- HTML attribute: `data-theme-mode`
- `matchMedia` fallback when no stored preference
- Toggle reads/writes the same key and attribute

---

## Current State

The site has **7 core stylesheets** (including 2 new ones created during refactoring) plus an **example shell** and a **benchmarks stylesheet**. Total core CSS is ~3,980 lines. The codebase has been refactored from a fragmented organic growth state into a well-organized token-based architecture.

**What works well:**
- ✅ Single source of truth for all design tokens (`tokens.css`)
- ✅ Single source of truth for all syntax highlighting (`syntax.css`)
- ✅ Dark/light theme via `[data-theme-mode]` attribute, set before paint
- ✅ Consistent localStorage key (`vlist-theme-mode`) across all pages
- ✅ Token-based typography scale (`--fs-2xs` through `--fs-6xl`)
- ✅ Font family tokens (`--font-sans`, `--font-mono`) — no inline stacks
- ✅ Frosted-glass header with `backdrop-filter`
- ✅ Sticky sidebar + table of contents
- ✅ Responsive breakpoints at sensible widths (1200, 900, 720, 640, 420)
- ✅ Consistent card hover behavior (all cards lift on hover)
- ✅ Keyboard focus indicators on all interactive elements
- ✅ `prefers-reduced-motion` support
- ✅ Smooth theme transitions across 15 element types
- ✅ Fluid hero typography with `clamp()` — no breakpoint jumps
- ✅ No duplicate component definitions
- ✅ No unused MD3 tokens

**Remaining opportunities (deferred):**
- Footer styles still per-page (3 slightly different implementations)
- `.container` max-widths intentionally differ per page (not deduplicated)
- `--vlist-*` design tokens in `examples.css` could move to vlist library

---

## File Inventory

| File | Lines | Purpose | Loaded on |
|------|------:|---------|-----------|
| `styles/tokens.css` *(new)* | 110 | Single source of truth: colors (dark + light), semantic colors, code colors, chrome colors, spacing, radii, font families, font-size scale | All pages (loaded first) |
| `styles/syntax.css` *(new)* | 243 | All syntax highlighting: hljs classes (dark + light) + short-class aliases (`.kw`, `.fn`, `.str`, etc.) | All pages |
| `styles/shell.css` | 935 | Reset, header, sidebar, layout, ToC, overlay, overview cards, variant switcher, theme toggle, doc-nav, button-group, dropdown, badge, `body.no-sidebar` breakpoint, focus indicators, reduced motion, theme transitions, responsive | All pages |
| `styles/homepage.css` | 479 | Hero (fluid `clamp()` typography), CTA buttons, install command, features grid, nav-cards, code sample, footer, responsive | `/` only |
| `styles/content.css` | 332 | Markdown body (headings, paragraphs, lists, blockquotes, hr), inline/block code, tables, error page, anchor `:focus-within`, responsive | `/docs/*`, `/tutorials/*` |
| `styles/api.css` | 588 | Endpoint cards, method badges, params table, code blocks, try-it interactive panel, type definitions, notes, footer, responsive | `/api` only |
| `styles/examples.css` | 253 | Example index card grid, section titles, GitHub link, footer, vlist design tokens | `/examples/` index only |
| `examples/styles.css` | 1040 | Split-panel layout, control panel, detail panel, source code viewer with tabs, example footer with stats, CSS icon system, responsive | `/examples/*` individual pages |
| `benchmarks/styles.css` | ~200 | Benchmark-specific layout, chart containers, result tables | `/benchmarks/*` |

**Total core styles: ~3,980 lines across 7 main files + ~1,040 for the example shell.**

---

## Style Loading Model

```
                    tokens.css → syntax.css → shell.css (always loaded, in this order)
                                                  │
                  ┌───────────────┬────────────────┼──────────────────┐
                  │               │                │                  │
             homepage.eta    base.html        api/index         examples/index
                  │               │             .html               .html
             homepage.css    EXTRA_STYLES      api.css          examples.css
                                  │
                       ┌──────────┼──────────┐
                       │          │          │
                  content.css  examples   benchmarks
                              /styles.css  /styles.css
                                  │
                       per-example/styles.css
```

**All 4 entry points load:**
1. `tokens.css` — design tokens (loaded first)
2. `syntax.css` — syntax highlighting
3. `shell.css` — shared chrome and components

**Pages without sidebar** (`homepage.eta`, `api/index.html`, `examples/index.html`) use `<body class="no-sidebar">` to shift the hamburger breakpoint from 720px to 640px via rules in `shell.css`.

### `<link>` tag order in each entry point

| File | CSS loading order |
|------|-------------------|
| `src/server/shells/base.html` | `tokens.css` → `shell.css` → `syntax.css` → `EXTRA_STYLES` |
| `src/server/shells/homepage.eta` | `tokens.css` → `syntax.css` → `shell.css` → `homepage.css` |
| `api/index.html` | `tokens.css` → `shell.css` → `syntax.css` → `api.css` |
| `examples/index.html` | `tokens.css` → `syntax.css` → `shell.css` → `examples.css` |

---

## Systemic Issues (Resolved)

All 8 systemic issues identified in the original audit have been resolved.

### 1. ~~Token Fragmentation — 🔴 High~~ ✅ Resolved in Phase 2

**Was:** Same custom properties re-declared with conflicting values across 4 files.

**Fix:** Created `tokens.css` as single source of truth. Settled conflicting values (documented in Phase 2). Stripped all per-file `:root` blocks. Homepage retains only `--radius: 12px` page-specific override.

### 2. ~~Duplicated Components — 🔴 High~~ ✅ Resolved in Phase 3

**Was:** ~320 lines of duplicated dropdown, badge, syntax, and hamburger overrides.

**Fix:** Moved `.dropdown` and `.badge` to `shell.css`. Created `syntax.css` for all syntax highlighting. Added `body.no-sidebar` breakpoint in `shell.css`. Actual savings: ~490 lines removed.

### 3. ~~Inconsistent Theme Selector — 🔴 Bug~~ ✅ Resolved in Phase 1

**Was:** `api.css` used `[data-theme="light"]` (without `-mode`) — 11 selectors that never matched.

**Fix:** Replaced all with `[data-theme-mode="light"]`. Light-mode syntax colors on API page now work.

### 4. ~~Duplicate Properties — 🟠 Medium~~ ✅ Resolved in Phase 1

**Was:** `.button-group button` had duplicate `color`, `font-weight`, `align-items`, `border`, `transition` declarations, plus a reference to undefined `--text-secondary`.

**Fix:** Merged into single clean declaration block.

### 5. ~~Unused MD3 Tokens — 🟡 Medium~~ ✅ Resolved in Phase 2

**Was:** 22 MD3 surface/on-surface tokens defined (dark + light), only 3 referenced.

**Fix:** Removed all MD3 tokens. Rewrote `.button-group` references to use core tokens (`--bg-card`, `--bg-card-hover`, `--text`).

### 6. ~~Theme Toggle Selector Bug — 🟠 Low~~ ✅ Resolved in Phase 1

**Was:** Sun icon rule had duplicate selector; moon icon rule mixed `data-theme-mode` and `data-theme`.

**Fix:** Cleaned to single correct `[data-theme-mode="light"]` selectors for both.

### 7. ~~Inconsistent Theme localStorage Key — 🟡 Medium~~ ✅ Resolved in Phase 1

**Was:** `examples/index.html` used `vlist-theme` key and `data-theme` attribute.

**Fix:** Updated to `vlist-theme-mode` key and `data-theme-mode` attribute, added `matchMedia` fallback. Also fixed `api/index.html` which had the same issue.

### 8. ~~vlist Design Tokens in Wrong File — 🟠 Low~~ Deferred

`--vlist-*` tokens in `examples.css` are scoped to individual example pages and not duplicated elsewhere. Low priority — can be relocated to vlist library CSS in a future pass.

---

## Bug Fixes (Priority 1) ✅

> **Commit:** `61b11c0` — `fix(styles): phase 1 bug fixes — theme selectors, duplicates, localStorage key`

All 5 bug fixes implemented as surgical edits:

### 1.1 Fix `api.css` theme selector ✅

Replaced all 11 occurrences of `[data-theme="light"]` with `[data-theme-mode="light"]` in the syntax highlighting section.

### 1.2 Fix `shell.css` theme toggle duplicate selector ✅

Cleaned sun icon rule (removed duplicate selector) and moon icon rule (removed stray `[data-theme="light"]`).

### 1.3 Fix `.button-group button` duplicate properties ✅

Merged into single declaration. Removed undefined `var(--text-secondary)`. Kept `color: var(--text)`.

### 1.4 Fix `.md tbody tr:hover` on light theme ✅

Added `[data-theme-mode="light"] .md tbody tr:hover { background: rgba(0, 0, 0, 0.02); }`.

*Note: Later replaced with `var(--sidebar-hover)` in Phase 6.*

### 1.5 Fix `examples/index.html` theme localStorage key ✅

Changed both `examples/index.html` and `api/index.html`:
- localStorage key: `vlist-theme` → `vlist-theme-mode`
- HTML attribute: `data-theme` → `data-theme-mode`
- Added `matchMedia` fallback to `examples/index.html`

---

## Token Consolidation (Priority 2) ✅

> **Commit:** `d9bd02e` — `refactor(styles): phase 2 token consolidation — single source of truth`

### 2.1 Create `styles/tokens.css` ✅

Created 110-line file with all design tokens organized into categories:

- **Colors: Base** — `--text`, `--text-muted`, `--text-dim`, `--bg`, `--bg-sidebar`, `--bg-card`, `--bg-card-hover`, `--border`, `--border-hover`, `--accent`, `--accent-dim`, `--accent-glow`, `--accent-text`
- **Colors: Semantic** — `--green`, `--green-dim`, `--orange`, `--orange-dim`, `--red`
- **Colors: Code** — `--bg-code`, `--bg-code-inline`, `--code-bar-bg`
- **Colors: Chrome** — `--header-bg`, `--dropdown-bg`, `--sidebar-hover`, `--overlay-bg`, `--shadow-sidebar`
- **Spacing** — `--header-height`, `--sidebar-width`, `--toc-width`
- **Radii** — `--radius` (8px), `--radius-sm` (6px), `--radius-xs` (4px)

Full `[data-theme-mode="light"]` overrides for all color tokens.

### 2.2 Settle conflicting values ✅

| Token | Settled value (dark) | Settled value (light) | Decision |
|-------|:--------------------:|:---------------------:|----------|
| `--radius` | `8px` | same | Shell value (homepage overrides to `12px` locally) |
| `--radius-sm` | `6px` | same | Compromise between content's `5px` and api's `8px` |
| `--radius-xs` | `4px` | same | New token, replaces hardcoded `4px` |
| `--text-muted` | `#a8a8ba` | `#40405a` | Shell values (homepage's `#7a7a88` had poor contrast) |
| `--text-dim` | `#8888a0` | `#5c5c78` | Shell values (homepage's `#55555f` was 2.9:1, failing AA) |
| `--bg-card-hover` | `#1a1a1f` | `#e8e8f0` | Homepage value (better hover visibility) |
| `--bg-code` | `#18181e` | `#f0f0f5` | Already consistent |
| `--bg-code-inline` | `#1c1c24` | `#eaeaf0` | Already consistent |
| `--dropdown-bg` | `rgba(12,12,16,0.95)` | `rgba(255,255,255,0.95)` | Promoted from homepage-only to global |

### 2.3 Decide on MD3 surface tokens — Option B (Remove) ✅

Deleted all 22 MD3 tokens. Rewrote `.button-group` to use core tokens:
- `--surface-container` → `--bg-card`
- `--surface-container-high` → `--bg-card-hover`
- `--text-primary` → `--text` (or `#fff` for active state)

### 2.4 Update all `<link>` tags ✅

Added `<link rel="stylesheet" href="/styles/tokens.css" />` before `shell.css` in all 4 entry points.

### 2.5 Strip per-file `:root` overrides ✅

Removed token blocks from:
- `shell.css` — 78 lines (full `:root` + light theme + MD3 tokens)
- `api.css` — 26 lines
- `homepage.css` — 20 lines (kept `--radius: 12px` page-specific override)
- `content.css` — 8 lines

---

## Deduplication (Priority 3) ✅

> **Commit:** `6b34482` — `refactor(styles): phase 3 deduplication — syntax, dropdown, badge, breakpoints`

### 3.1 Move `.dropdown` to `shell.css` ✅

Extracted from `homepage.css` and `api.css`. Unified background to `var(--dropdown-bg)`, font-size to `var(--fs-base)`.

### 3.2 Move `.badge` to `shell.css` ✅

Extracted `.badge` and `.badge--accent` from `homepage.css` and `api.css`. Settled on homepage styling (16px radius, 5px padding).

### 3.3 Consolidate footer styles — Deferred

Kept per-page — the three implementations differ enough (element vs class selector, different spacing, examples has `.github-link`). Low value dedup.

### 3.4 Create `styles/syntax.css` ✅

Created 243-line file containing:
- Full hljs classes (dark + light) — 20 selectors each
- Short-class aliases (`.kw`, `.fn`, `.str`, `.cm`, `.num`, `.prop`, `.par`, `.op`, `.pun`, `.bool`, `.type`) — dark + light

Deleted syntax blocks from:
- `content.css` — ~152 lines
- `api.css` — ~50 lines (kept API-specific `.code pre` and `.try-it__result pre` light overrides)
- `homepage.css` — ~62 lines (kept homepage-specific `.code` background override)
- `examples/styles.css` — ~165 lines

Added `syntax.css` `<link>` to all 4 entry points.

### 3.5 Harmonize `.container` — Deferred

The three max-widths (1600px homepage, 880px api, 1472px examples) are intentionally different. Extracting a base + modifiers would require HTML changes for marginal benefit.

### 3.6 Unify hamburger/nav responsive overrides ✅

Added `body.no-sidebar` rules in `shell.css`:
- Default: hide hamburger, show nav
- At 640px: show hamburger, hide nav, show dropdown

Added `class="no-sidebar"` to `<body>` in `homepage.eta`, `api/index.html`, `examples/index.html`.

Removed ~40 lines of duplicate 720px/640px overrides from `homepage.css` and `api.css`.

### 3.7 Move vlist design tokens out of `examples.css` — Deferred

`--vlist-*` tokens are scoped to example pages and not duplicated. Can move to vlist library CSS later.

---

## Typography System (Priority 4) ✅

> **Commit:** `c71af15` — `refactor(styles): phase 4 typography system — font-size scale + font-family tokens`

### 4.1 Define the scale ✅

Added to `tokens.css`:

```css
:root {
    --fs-2xs:  11px;   /* chips, variant switcher, ToC title */
    --fs-xs:   12px;   /* ToC sub-links, doc-nav label, button-group */
    --fs-sm:   13px;   /* ToC links, sidebar labels, section-label, params th */
    --fs-base: 15px;   /* Body text, descriptions, badges, dropdown links */
    --fs-md:   16px;   /* Nav links, sidebar links, table body, code, footer */
    --fs-lg:   17px;   /* Section names, feature names, md h4, install cmd */
    --fs-xl:   20px;   /* Overview tagline, nav-card title, section-title, md h3 */
    --fs-2xl:  22px;   /* Type-def titles, notes titles */
    --fs-3xl:  27px;   /* md h2 */
    --fs-4xl:  36px;   /* md h1, api hero title */
    --fs-5xl:  48px;   /* Hero name (mobile) */
    --fs-6xl:  78px;   /* Hero name (desktop) */
}
```

### 4.2 Define font family tokens ✅

```css
:root {
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    --font-mono: "SF Mono", Monaco, Menlo, "Cascadia Code", Consolas, monospace;
}
```

Replaced 7 inline font-family stacks across `shell.css`, `api.css`, `content.css`, `homepage.css`, `examples.css`.

### 4.3 Apply tokens ✅

Replaced ~55 raw `font-size` values with tokens. Responsive breakpoint overrides that scale to non-standard sizes (14px, 18px, 28px, 32px, etc.) kept as raw px — they're context-specific adjustments.

---

## Accessibility (Priority 5) ✅

> **Commit:** `22a67f2` — `refactor(styles): phase 5 accessibility — focus indicators, anchor discovery, reduced motion`

### 5.1 Add `:focus-visible` to all interactive elements ✅

Three tiers in `shell.css`:

```css
/* Global focus ring */
a:focus-visible, button:focus-visible, input:focus-visible,
select:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

/* Cards — inset ring (cards have border-radius) */
.overview__card:focus-visible, .nav-card:focus-visible,
.example-card:focus-visible, .example-item:focus-visible,
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

### 5.2 Add `:focus-within` to heading anchor links ✅

Added `:focus-within` selectors alongside existing `:hover` selectors for `.md h1–h4 .anchor` in `content.css`.

### 5.3 Add `prefers-reduced-motion` ✅

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

### 5.4 Verify color contrast ✅

| Token pair | Dark ratio | Light ratio | Passes AA? |
|------------|:----------:|:-----------:|:----------:|
| `--text` on `--bg` | 15.3:1 | 14.2:1 | ✅ |
| `--text-muted` on `--bg` | 7.2:1 | 8.1:1 | ✅ |
| `--text-dim` on `--bg` | 4.5:1 | 5.2:1 | ✅ |
| `--accent-text` on `--bg` | 6.8:1 | 5.4:1 | ✅ |

The homepage's old `--text-dim: #55555f` (2.9:1, failing AA) was resolved in Phase 2 by adopting the shell's `#8888a0` (4.5:1).

---

## Polish & Modern CSS (Priority 6) ✅

> **Commit:** `71f5ee5` — `refactor(styles): phase 6 polish — fluid typography, hover lift, transitions, token colors`

### ~~6.1 Add `prefers-color-scheme` fallback~~ — NOT NEEDED

Already handled by inline `<head>` scripts with `matchMedia` fallback (fixed in Phase 1, bug 1.5).

### 6.2 Fluid typography for hero ✅

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

Eliminated 3 breakpoints of redundant hero sizing overrides (at 800px, 640px, 420px — ~25 lines removed).

### 6.3 Consistent hover lift ✅

Added `transform: translateY(-2px)` on hover to `.overview__card`, `.nav-card`, `.feature` — matching existing behavior on `.example-card` and `.doc-nav__link`.

### 6.4 Widen theme transition coverage ✅

Extended from 5 selectors to 15:

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

### 6.5 Replace hardcoded colors with tokens ✅

| Location | Before | After |
|----------|--------|-------|
| `homepage.css` `.btn--primary:hover` | `#5a6fd6` | `color-mix(in oklch, var(--accent) 85%, black)` |
| `api.css` `.try-it__btn` border | `rgba(102,126,234,0.3)` | `var(--accent-dim)` |
| `shell.css` `.variant-switcher__option--active` | `#4a5cd8` / `#ffffff` | `var(--accent)` / `#fff` |
| `content.css` `.md tbody tr:hover` | `rgba(255,255,255,0.02)` + light override | `var(--sidebar-hover)` (handles both themes) |

---

## Deferred Items

Items from the original plan that were intentionally skipped:

| Item | Reason | Priority |
|------|--------|----------|
| **3.3** Consolidate footer styles | Three implementations differ enough (element vs class, spacing, `.github-link`) | Low |
| **3.5** Harmonize `.container` | Max-widths intentionally differ per page; modifier classes require HTML changes | Low |
| **3.7** Move `--vlist-*` tokens | Scoped to example pages, not duplicated | Low |
| **8** vlist tokens in wrong file | Same as 3.7 | Low |

---

## Per-File Notes

### `styles/tokens.css` — 110 lines

- **Created in:** Phase 2
- **Purpose:** Single source of truth for all design tokens
- **Contains:** Colors (dark + light), semantic colors, code colors, chrome colors, spacing, radii, font families, font-size scale
- **Loaded:** First, before all other stylesheets, on ALL pages

### `styles/syntax.css` — 243 lines

- **Created in:** Phase 3
- **Purpose:** Canonical syntax highlighting
- **Contains:** Full hljs class rules (dark + light) + short-class aliases (dark + light)
- **Loaded:** After `tokens.css`, on all pages
- **Eliminated:** ~430 lines of duplication across 4 files

### `styles/shell.css` — 935 lines

- **Role:** Global shell (reset, header, sidebar, layout, ToC, overlay, overview cards, variant switcher, responsive)
- **Added in refactor:** `.dropdown`, `.badge`, `body.no-sidebar` breakpoint, `:focus-visible` styles, `prefers-reduced-motion`, widened theme transitions
- **Removed in refactor:** `:root` token block (→ `tokens.css`), MD3 tokens, duplicate `.button-group` properties, hardcoded colors in variant switcher

### `styles/homepage.css` — 479 lines

- **Role:** Landing-page-specific (hero, features, nav-cards, install, CTA buttons, code sample, footer)
- **Removed in refactor:** `:root` token overrides, `.dropdown`, `.badge`, syntax colors, hamburger overrides, redundant hero breakpoint sizing
- **Added in refactor:** `clamp()` fluid typography, hover lift on cards/features, `color-mix()` for hover state
- **Kept:** `--radius: 12px` page-specific override

### `styles/content.css` — 332 lines

- **Role:** Markdown body styling (headings, paragraphs, lists, blockquotes, code, tables, error page)
- **Removed in refactor:** `:root` token overrides, entire hljs syntax block (→ `syntax.css`), hardcoded hover rgba
- **Added in refactor:** Anchor `:focus-within` visibility, typography tokens, `var(--sidebar-hover)` for table row hover

### `styles/api.css` — 588 lines

- **Role:** API reference (endpoints, params, try-it panel, type definitions, notes)
- **Removed in refactor:** `:root` token overrides, `.dropdown`, `.badge`, syntax colors, hamburger overrides
- **Fixed in refactor:** `[data-theme="light"]` → `[data-theme-mode="light"]`, hardcoded button border color
- **Kept:** API-specific light-theme `.code pre` and `.try-it__result pre` color overrides

### `styles/examples.css` — 253 lines

- **Role:** Examples index page (card grid, section titles, GitHub link, footer)
- **Changed in refactor:** Applied `--font-mono` and `--fs-xs` tokens

### `examples/styles.css` — 1040 lines

- **Role:** Example shell (split-panel, controls, source viewer, slider, icons)
- **Removed in refactor:** Entire hljs syntax block (~165 lines dark + light → `syntax.css`)

### `benchmarks/styles.css` — ~200 lines

- **Unchanged** — uses `--vlist-*` namespaced tokens, no conflicts with core tokens

---

## Implementation Log

| Phase | Commit | Summary | Files | Lines |
|-------|--------|---------|:-----:|:-----:|
| **1 — Bug fixes** | `61b11c0` | Theme selectors, duplicates, localStorage key | 5 | +32 −31 |
| **2 — Token consolidation** | `d9bd02e` | Create `tokens.css`, strip per-file `:root`, remove MD3 | 9 | +100 −139 |
| **3 — Deduplication** | `6b34482` | Create `syntax.css`, move dropdown/badge, `body.no-sidebar` | 10 | +333 −583 |
| **4 — Typography** | `c71af15` | Font-size scale, font-family tokens | 6 | +98 −80 |
| **5 — Accessibility** | `22a67f2` | Focus indicators, anchor discovery, reduced motion | 2 | +46 −1 |
| **6 — Polish** | `71f5ee5` | Fluid type, hover lift, transitions, token colors | 4 | +27 −49 |
| | | **Total** | | **+636 −883** |

**Net: 247 lines removed** while adding 2 new files, full accessibility support, a typography system, and eliminating all duplication.

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
- [ ] Safari (latest) — verify `backdrop-filter`, `-webkit-` prefixes, `color-mix()` support
- [ ] Firefox (latest) — verify scrollbar styling (uses `scrollbar-*` not `::-webkit-scrollbar`), `color-mix()` support

---

*Last updated: 3 mars 2026*
*Refactoring completed on branch `refactor/css-cleanup` — 6 commits, all phases implemented.*
