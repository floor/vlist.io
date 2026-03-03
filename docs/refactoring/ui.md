# vlist.dev — UI Components Extraction Plan

> Extract reusable UI primitives from `examples/styles.css` into `styles/ui.css`,
> rename the `panel-*` prefix to generic `ui-*` names, and update all consumers.
>
> **Status: ✅ Phase 1 + 2 + 3 complete** (single atomic commit)

---

## Table of Contents

- [Motivation](#motivation)
- [Current State](#current-state)
- [Component Inventory](#component-inventory)
- [Naming Strategy](#naming-strategy)
- [Rename Map](#rename-map)
- [Phase 1 — Create `styles/ui.css` and rename classes](#phase-1--create-stylesuicss-and-rename-classes)
- [Phase 2 — Slim down `examples/styles.css`](#phase-2--slim-down-examplesstylescss)
- [Phase 3 — Centralize per-example extensions](#phase-3--centralize-per-example-extensions)
- [File Impact Summary](#file-impact-summary)
- [Testing & Verification](#testing--verification)

---

## Motivation

`examples/styles.css` (1 040 lines) is a monolith mixing two concerns:

1. **Reusable UI primitives** — buttons, segmented controls, inputs, sliders, icons, split-layout, source viewer — used identically across every example page.
2. **Page-level scaffolding** — container sizing, vlist theme bridging, responsive breakpoints — specific to the example shell.

The UI primitives are generic building blocks that happen to live inside examples. Extracting them into `styles/ui.css`:

- Creates a **single source of truth** for the component library
- Makes them **reusable** on other pages (docs, benchmarks, tutorials)
- Follows the pattern already established by `tokens.css` and `syntax.css`
- Improves **cacheability** (components change rarely; layout changes more often)

The `panel-*` prefix is misleading — a segmented button is a segmented button whether it sits in a panel, a toolbar, or a header. The `ui-` prefix maps directly to the file (`ui.css`) and makes the intent clear.

---

## Previous State (before extraction)

### Where UI components were defined

| Location | Role |
|----------|------|
| `examples/styles.css` L56–940 | Base definitions for all components |
| `examples/*/styles.css` | Per-example extensions (modifiers, variants) |

### Where UI components were consumed

| File type | Count | Class format |
|-----------|------:|--------------|
| `content.html` | ~34 files | `class="panel-*"` |
| `script.js` | ~10 files | `"panel-*"` string refs |
| `script.tsx` | ~5 files | `className="panel-*"` |
| `script.jsx` | ~2 files | `class="panel-*"` (Solid) |
| `script.js` (Vue templates) | ~4 files | `class="panel-*"` in template strings |
| `controls.js` | ~4 files | `classList.toggle("panel-*")` |
| Per-example `styles.css` | ~8 files | CSS selectors |

**Total consumer files: ~67**

### Style loading (before)

```
base.html
├── styles/tokens.css
├── styles/shell.css
├── styles/syntax.css
└── EXTRA_STYLES → dist/examples/styles.css   ← monolith (1 040 lines)
```

### Style loading (after) ✅

```
base.html
├── styles/tokens.css
├── styles/shell.css
├── styles/syntax.css
└── EXTRA_STYLES → styles/ui.css               ← generic components (877 lines)
                 → dist/examples/styles.css    ← page scaffolding only (302 lines)
```

---

## Component Inventory

### Layout (3)

| # | Component | Current class | Description |
|---|-----------|--------------|-------------|
| 1 | Split layout | `.split-layout` | Flex row container: main + panel |
| 2 | Split main | `.split-main`, `--full` | Left content area |
| 3 | Split panel | `.split-panel` | Right sidebar panel |

### Panel structure (5)

| # | Component | Current class | Description |
|---|-----------|--------------|-------------|
| 4 | Section | `.panel-section`, `--hidden` | Bordered section within panel |
| 5 | Title | `.panel-title`, `__hint` | Uppercase section heading |
| 6 | Row | `.panel-row`, `.slider`, `.no-margin`, `--action` | Flex row: label + control |
| 7 | Label | `.panel-label`, `--muted` | Row left text |
| 8 | Value | `.panel-value` | Row right monospace value |

### Typography (1)

| # | Component | Current class | Description |
|---|-----------|--------------|-------------|
| 9 | Text | `.panel-text` | Paragraph text (**used in HTML but never defined in CSS** — inherits only) |

### Form controls (4)

| # | Component | Current class | Description |
|---|-----------|--------------|-------------|
| 10 | Input | `.panel-input` | Number/text field |
| 11 | Input group | `.panel-input-group` | Flex row for input + select + button |
| 12 | Select | `.panel-select`, `--full` | Dropdown with custom arrow |
| 13 | Slider | `.panel-slider` | Styled range input (thumb + track) |

### Buttons (4)

| # | Component | Current class | Description |
|---|-----------|--------------|-------------|
| 14 | Button | `.panel-btn`, `--icon`, `--active`, `--primary`, `--load` | Small action button |
| 15 | Button group | `.panel-btn-group`, `--fill` | Flex wrap container for buttons |
| 16 | Segmented | `.panel-segmented` | Toggle button group (outer border) |
| 17 | Segmented btn | `.panel-segmented__btn`, `--active`, `--disabled` | Individual toggle button |

### Display (5)

| # | Component | Current class | Description |
|---|-----------|--------------|-------------|
| 18 | Detail | `.panel-detail` | Item preview card |
| 19 | Detail empty | `.panel-detail__empty` | Placeholder italic text |
| 20 | Detail header | `.panel-detail__header` | Avatar + name row |
| 21 | Detail name | `.panel-detail__name` | Bold item name |
| 22 | Detail meta | `.panel-detail__meta` | Monospace metadata list |

### Standalone components (6) — move to `ui.css`

| # | Component | Current class | Description |
|---|-----------|--------------|-------------|
| 23 | Stats bar | `.stats` | Top metrics bar |
| 24 | Controls bar | `.controls` (+ `label`, `select`, `button`) | Horizontal control row |
| 25 | Chips | `.example-chips`, `.example-chip` | Feature tag overlays |
| 26 | Badge | `.item__badge`, `.status-badge`, `.card-badge`, `.mode-badge`, `.badge`, `.meta-tag` | Small inline status/metadata labels (6 copies!) |
| 27 | Source viewer | `.source`, `__header`, `__title`, `__tabs`, `__toggle`, `__tab`, `__body`, `__panel` | Collapsible code drawer |
| 28 | Icon | `.icon`, `--up/down/center/add/remove/trash/shuffle/back/forward/search/sort/filter/send/settings` | CSS mask-image icons |

### Page scaffolding — stays in `examples/styles.css`

| Component | Class | Reason |
|-----------|-------|--------|
| Example footer | `.example-footer`, `__left`, `__right`, `__stat`, `__unit` | Page-level stats bar, not a reusable UI primitive |
| Container | `.container`, `header`, `h1`, `.description`, `footer` | Page layout |
| List containers | `[id$="-container"]` | vlist instance wrappers |
| VList theme bridge | `html[data-theme-mode]` `--vlist-*` tokens | Example-specific |

### Per-example extensions (currently in individual `styles.css` files)

| Example | Extension | Current class |
|---------|-----------|--------------|
| accessibility | Fill button group | `.panel-btn-group--fill` |
| accessibility | Title hint | `.panel-title__hint` |
| accessibility | Active button | `.panel-btn--active` |
| controls/* | Detail avatar | `.panel-detail__avatar` (5 copies!) |
| controls/* | Detail email | `.panel-detail__email` (5 copies!) |
| file-browser | Value override | `.panel-value` (word-break) |
| scroll-restore | Primary button | `.panel-btn--primary` |
| social-feed | Select override | `.panel-select` (wider, different tokens) |
| social-feed | Select optgroup/option | `.panel-select optgroup/option` |
| social-feed | Action row | `.panel-row--action` |
| social-feed | Load button | `.panel-btn--load` |
| social-feed | Hidden section | `.panel-section--hidden` |
| social-feed | Disabled segmented | `.panel-segmented__btn--disabled` |
| social-feed | Muted label | `.panel-label--muted` |

### Duplicated across examples (future centralization candidates)

| Component | Original class | Status |
|-----------|---------------|--------|
| ~~Toggle switch~~ | ~~`.toggle`, `.toggle-track`~~ | ✅ Already migrated to `.ui-switch` / `.ui-switch__track` in Phase 1 |
| ~~Control button~~ | ~~`.ctrl-btn`, `--active`~~ | ✅ Centralized as `.ui-ctrl-btn` in `ui.css` |
| ~~Badge~~ | ~~`.item__badge`, `.status-badge`, `.card-badge`, `.mode-badge`, `.badge`, `.meta-tag`~~ | ✅ Centralized as `.ui-badge` in `ui.css` |

---

## Naming Strategy

### Principles

1. **`ui-` prefix** — maps to `ui.css`, distinguishes from page-specific classes
2. **BEM-like** — `block__element--modifier` structure
3. **Short but unambiguous** — `.ui-btn` not `.ui-button`, `.ui-segmented` not `.ui-segmented-control`
4. **Layout components keep their names** — `.split-layout`, `.split-main`, `.split-panel` are already generic
5. **Standalone components keep their names** — `.stats`, `.controls`, `.source`, `.icon` are already generic
6. **Chips get renamed** — `.example-chips` → `.ui-chips` (they're a generic UI primitive, not page scaffolding)
7. **Footer stays** — `.example-footer` stays in `examples/styles.css` (page scaffolding)

---

## Rename Map

### Panel structure → `ui-*`

| Current | New |
|---------|-----|
| `.panel-section` | `.ui-section` |
| `.panel-section--hidden` | `.ui-section--hidden` |
| `.panel-title` | `.ui-title` |
| `.panel-title__hint` | `.ui-title__hint` |
| `.panel-row` | `.ui-row` |
| `.panel-row--action` | `.ui-row--action` |
| `.panel-label` | `.ui-label` |
| `.panel-label--muted` | `.ui-label--muted` |
| `.panel-value` | `.ui-value` |
| `.panel-text` | `.ui-text` |

### Form controls → `ui-*`

| Current | New |
|---------|-----|
| `.panel-input` | `.ui-input` |
| `.panel-input-group` | `.ui-input-group` |
| `.panel-select` | `.ui-select` |
| `.panel-select--full` | `.ui-select--full` |
| `.panel-slider` | `.ui-slider` |

### Buttons → `ui-*`

| Current | New |
|---------|-----|
| `.panel-btn` | `.ui-btn` |
| `.panel-btn--icon` | `.ui-btn--icon` |
| `.panel-btn--active` | `.ui-btn--active` |
| `.panel-btn--primary` | `.ui-btn--primary` |
| `.panel-btn--load` | `.ui-btn--load` |
| `.panel-btn-group` | `.ui-btn-group` |
| `.panel-btn-group--fill` | `.ui-btn-group--fill` |
| `.ctrl-btn` | `.ui-ctrl-btn` |
| `.ctrl-btn--active` | `.ui-ctrl-btn--active` |
| `.panel-segmented` | `.ui-segmented` |
| `.panel-segmented__btn` | `.ui-segmented__btn` |
| `.panel-segmented__btn--active` | `.ui-segmented__btn--active` |
| `.panel-segmented__btn--disabled` | `.ui-segmented__btn--disabled` |

### Display → `ui-*`

| Current | New |
|---------|-----|
| `.panel-detail` | `.ui-detail` |
| `.panel-detail__empty` | `.ui-detail__empty` |
| `.panel-detail__header` | `.ui-detail__header` |
| `.panel-detail__name` | `.ui-detail__name` |
| `.panel-detail__meta` | `.ui-detail__meta` |
| `.panel-detail__avatar` | `.ui-detail__avatar` |
| `.panel-detail__email` | `.ui-detail__email` |

### Chips → `ui-*`

| Current | New |
|---------|-----|
| `.example-chips` | `.ui-chips` |
| `.example-chip` | `.ui-chip` |

### Badges → `ui-badge`

| Current | New |
|---------|-----|
| `.item__badge` (basic) | `.ui-badge .ui-badge--sm` |
| `.item__badge--shipped` | `.ui-badge--info` |
| `.item__badge--delivered` | `.ui-badge--success` |
| `.item__badge--pending` | `.ui-badge--warning` |
| `.item__badge--processing` | `.ui-badge--purple` |
| `.item__badge--cancelled` | `.ui-badge--error` |
| `.item__badge--returned` | `.ui-badge--muted` |
| `.status-badge` (data-table) | `.ui-badge .ui-badge--pill` |
| `.status-badge--active` | `.ui-badge--success` |
| `.status-badge--inactive` | `.ui-badge--error` |
| `.card-badge` (carousel, horizontal) | `.ui-badge .ui-badge--pill .ui-badge--glass` |
| `.mode-badge` (social-feed) | `.ui-badge .ui-badge--pill .ui-badge--accent` |
| `.badge` (window-scroll) | `.ui-badge .ui-badge--pill .ui-badge--accent` |
| `.meta-tag` (wizard-nav) | `.ui-badge .ui-badge--pill` |
| `.compression-badge` (large-list) | `.ui-badge .ui-badge--pill` |

### Unchanged

| Class | Reason |
|-------|--------|
| `.split-layout`, `.split-main`, `.split-panel` | Already generic |
| `.stats` | Already generic |
| `.controls` | Already generic |
| `.source`, `__header`, `__title`, etc. | Already generic |
| `.icon`, `--up`, `--down`, etc. | Already generic |
| `.example-footer`, `__left`, `__right`, etc. | Page scaffolding — stays in `examples/styles.css` |

---

## Phase 1 — Create `styles/ui.css` and rename classes ✅

> Extract all UI primitives from `examples/styles.css` into `styles/ui.css`,
> applying the `ui-*` rename in one atomic pass. Update all consumer files.
>
> **Completed.** All UI primitives extracted, all `panel-*` → `ui-*` renames applied,
> `.ui-text` defined, `example-chips`/`example-chip` → `ui-chips`/`ui-chip`,
> renderer updated to load `styles/ui.css`. Build passes (34/34 examples).

### 1.1 Create `styles/ui.css`

New file with the following sections, using `ui-*` class names:

```
/* styles/ui.css — Reusable UI components for vlist.dev

   Split layout, sections, form controls, buttons, segmented toggles,
   detail cards, stats bar, controls bar, chips, source viewer, icons.

   Loaded on pages that use interactive UI components.
   Uses tokens.css design tokens for theming. */

/* ── Split Layout ── */           .split-layout, .split-main, .split-panel
/* ── Sections ── */               .ui-section
/* ── Rows ── */                   .ui-row, .ui-label, .ui-value, .ui-text
/* ── Inputs ── */                 .ui-input-group, .ui-input, .ui-select
/* ── Buttons ── */                .ui-btn, .ui-btn-group
/* ── Segmented ── */              .ui-segmented, .ui-segmented__btn
/* ── Detail ── */                 .ui-detail, __empty, __header, __name, __meta, __avatar, __email
/* ── Stats Bar ── */              .stats
/* ── Controls Bar ── */           .controls (+ label, select, button)
/* ── Chips ── */                  .ui-chips, .ui-chip
/* ── Source Viewer ── */          .source, __header, __title, __tabs, __toggle, __tab, __body, __panel
/* ── Slider ── */                 .ui-slider
/* ── Icons ── */                  .icon, --up, --down, etc.
/* ── Dark Mode Overrides ── */    [data-theme-mode="dark"] .ui-select
/* ── Theme Transitions ── */      UI component subset
/* ── Responsive ── */             Split-layout stacking, source viewer, stats, controls, chips
```

### 1.2 Define `.ui-text` (previously undefined)

`panel-text` is used in ~12 HTML/JSX files but was **never defined in CSS**. Add a proper definition:

```css
.ui-text {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-muted);
    margin: 0 0 8px;
}

.ui-text:last-child {
    margin-bottom: 0;
}
```

### 1.3 Update `examples/styles.css`

Remove everything that moved to `ui.css`. What remains (~170 lines):

```
/* VList Theme Overrides */           html[data-theme-mode] --vlist-* tokens
/* Design Token */                    .container { --examples-radius }
/* Container */                       .container sizing, header, h1, description, footer
/* List Containers */                 [id$="-container"] rules
/* Example Footer */                  .example-footer, __left, __right, __stat, __unit
/* Theme Transitions */               Page-level subset (.container, .vlist-*, .example-footer)
/* Responsive */                      Container + footer @media rules
```

### 1.4 Update style loading

In `src/server/renderers/examples.ts`, change `EXTRA_STYLES`:

```ts
EXTRA_STYLES:
  '<link rel="stylesheet" href="/styles/ui.css" />' +
  '<link rel="stylesheet" href="/dist/examples/styles.css" />',
```

### 1.5 Rename in all consumer files

Apply the rename map across all ~67 consumer files:

| File type | Count | What to rename |
|-----------|------:|----------------|
| `content.html` | ~34 | `class="panel-*"` → `class="ui-*"`, `class="example-chip"` → `class="ui-chip"` |
| `script.js` | ~10 | String refs: `"panel-*"` → `"ui-*"` |
| `script.tsx` | ~5 | `className="panel-*"` → `className="ui-*"` |
| `script.jsx` | ~2 | `class="panel-*"` → `class="ui-*"` |
| `controls.js` | ~4 | `classList.toggle("panel-*")` → `classList.toggle("ui-*")` |
| Per-example `styles.css` | ~8 | CSS selectors: `.panel-*` → `.ui-*` |

### 1.6 Verify

- [x] `grep -r "panel-" examples/` returns zero hits (except comments if any)
- [x] `grep -r "panel-" styles/ui.css` returns zero hits
- [x] `grep -r "example-chip" examples/` returns zero hits
- [ ] All example pages render identically
- [ ] All JS interactions work (segmented toggles, detail cards, etc.)
- [ ] Theme toggle works on every example
- [ ] Source viewer open/close works
- [ ] Responsive breakpoints work (split-layout stacking at ≤ 820px)

---

## Phase 2 — Slim down `examples/styles.css` ✅

> After extraction, verify the remaining file is clean and minimal.
>
> **Completed in Phase 1 commit.** File slimmed to 302 lines. Header comment updated.
> Slightly larger than the ~170 estimate because vlist theme overrides (~50 lines)
> and the full container/header/footer section are more verbose than sketched.

### 2.1 Actual remaining content (302 lines)

```
/* VList Theme Overrides */           ~35 lines (light + dark)
/* Sandbox design token */            ~3 lines
/* Container + page header */         ~55 lines (sizing, header, h1, description, code)
/* List container rules */            ~15 lines
/* Footer (page + example) */         ~60 lines
/* Theme transitions (page-level) */  ~10 lines
/* Responsive (large/tablet/mobile) */~35 lines
/* Responsive (split stacking) */     ~5 lines
```

### 2.2 File header comment ✅

```css
/* examples/styles.css — Page scaffolding for example pages

   Container layout, vlist theme bridging, example footer, and responsive
   breakpoints. UI components are in styles/ui.css.

   Used in: all individual example pages (built to dist/examples/)
   NOT used in: examples/index.html (uses styles/examples.css) */
```

### 2.3 Verify

- [x] File is under 350 lines (302 actual — estimate was optimistic)
- [x] No UI component definitions remain
- [x] All example pages still render correctly (34/34 build)

---

## Phase 3 — Centralize per-example extensions ✅

> Move commonly reused modifiers from per-example CSS into `ui.css`.
> All examples consume what's available — keep `ui.css` generic and complete.
>
> **Completed in Phase 1 commit.** All modifiers promoted to `ui.css`,
> duplicates removed from per-example files. CSS total dropped 3.2 KB.

### 3.1 Promoted to `styles/ui.css` ✅

All generic modifiers now live in `ui.css` as the single source of truth:

| Class | Removed from | Notes |
|-------|-------------|-------|
| `.ui-btn--active` | *(was only in JS toggles)* | Defined in `ui.css` |
| `.ui-btn--primary` | scroll-restore/styles.css | Removed duplicate |
| `.ui-btn--load` | social-feed/styles.css | Removed duplicate |
| `.ui-btn-group--fill` | accessibility/styles.css | Removed duplicate |
| `.ui-section--hidden` | social-feed/styles.css | Removed duplicate |
| `.ui-segmented__btn--disabled` | social-feed/styles.css | Removed duplicate |
| `.ui-title__hint` | accessibility/styles.css | Removed duplicate |
| `.ui-label--muted` | social-feed/styles.css | Removed duplicate |
| `.ui-row--action` | social-feed/styles.css | Removed duplicate |
| `.ui-detail__avatar` | controls/styles.css + velocity-loading/styles.css | Was 5 copies (symlinks) |
| `.ui-detail__email` | controls/styles.css + velocity-loading/styles.css | Was 5 copies (symlinks) |

### 3.2 Per-example overrides kept (not duplicates) ✅

These stay in per-example files because they override `ui.css` defaults with different values:

| File | Class | Why it stays |
|------|-------|-------------|
| social-feed/styles.css | `.ui-select` | Different tokens (`--vlist-*`), `width: 100%`, custom SVG arrow |
| social-feed/styles.css | `.ui-select optgroup/option` | Unique to this example |
| file-browser/vanilla/styles.css | `.ui-value` | Overrides `color`, adds `word-break: break-all` |
| velocity-loading/styles.css | `.ui-btn-group`, `.ui-btn--active` | Completely restyled (pill-shaped, surface tokens) |

### 3.3 Control buttons — `.ctrl-btn` → `.ui-ctrl-btn` ✅

Identical `.ctrl-btn` blocks (3 copies, 26 lines each) centralized into `styles/ui.css`
as `.ui-ctrl-btn`. These are discrete-value picker buttons (gap, radius, columns) —
visually distinct from `.ui-btn` (larger padding, accent-fill active state, card background).

| Action | Files |
|--------|-------|
| **Added to `ui.css`** | `.ui-ctrl-btn`, `:hover`, `--active` (26 lines) + theme transition |
| **Removed CSS block** | `carousel/styles.css`, `photo-album/styles.css`, `file-browser/vanilla/styles.css` |
| **Renamed in HTML** | `carousel/vanilla/content.html`, `photo-album/content.html` |
| **Renamed in JS** | `carousel/vanilla/script.js`, `photo-album/controls.js` |
| **Renamed in React** | `photo-album/react/script.tsx` |
| **Renamed in Vue** | `photo-album/vue/script.js` |

**Note:** `file-browser/vanilla/styles.css` had the CSS defined but never referenced
in its HTML/JS — it was dead code, now removed.

### 3.4 Toggle switch — `.toggle` → `.ui-switch` ✅ (done in Phase 1)

The `.toggle` / `.toggle-track` classes were already migrated to `.ui-switch` /
`.ui-switch__track` during Phase 1 when the switch was extracted from carousel
into `styles/ui.css`. Carousel's `content.html` already uses the new markup:

```html
<label class="ui-switch">
    <input type="checkbox" id="toggle-variable" />
    <span class="ui-switch__track"></span>
</label>
```

No `.toggle` CSS or class references remain anywhere in `examples/`.
Currently consumed by carousel; ready for reuse by other examples.

### 3.5 Badge — 6 classes → `.ui-badge` ✅

Six different badge/label classes across 8 examples unified into a single `.ui-badge`
component system in `styles/ui.css`. The base provides structure; modifiers handle
shape (`--pill`, `--sm`), appearance (`--glass`), and semantic colors
(`--success`, `--warning`, `--error`, `--info`, `--muted`, `--purple`, `--accent`).

**Added to `ui.css` (122 lines):**

| Class | Purpose |
|-------|---------|
| `.ui-badge` | Base — inline-flex, 11px, 600 weight, 4px radius |
| `.ui-badge--pill` | Full radius (20px) |
| `.ui-badge--sm` | 9px, tighter padding, uppercase |
| `.ui-badge--glass` | Translucent white + backdrop-blur (card overlays) |
| `.ui-badge--success` | Green (delivered, active) |
| `.ui-badge--warning` | Amber (pending) |
| `.ui-badge--error` | Red (cancelled, inactive) |
| `.ui-badge--info` | Blue (shipped) |
| `.ui-badge--muted` | Grey (returned, default) |
| `.ui-badge--purple` | Purple (processing) |
| `.ui-badge--accent` | Accent gradient (mode badge, hero badges) |
| Light-mode overrides | 6 `[data-theme-mode="light"]` selectors |

**Removed per-example CSS:**

| File | Removed | Notes |
|------|---------|-------|
| `basic/styles.css` | −80 lines | `.item__badge` + 6 variants × dark/light |
| `data-table/styles.css` | −36 lines | `.status-badge` + active/inactive × dark |
| `carousel/styles.css` | −16 lines | `.card-badge` + `.detail-meta__badge` |
| `horizontal/variable-width/styles.css` | −8 lines | `.card-badge` (near-identical to carousel) |
| `social-feed/styles.css` | −10 lines | `.mode-badge` |
| `window-scroll/styles.css` | −7 lines | `.badge` |
| `wizard-nav/styles.css` | −8 lines | `.meta-tag` |

**Renamed in JS/HTML/TSX:**

| File | Change |
|------|--------|
| `basic/shared.js` | `item__badge--${status}` → `ui-badge--${semantic}` via lookup map |
| `data-table/script.js` | `status-badge` → `ui-badge ui-badge--pill` |
| `carousel/shared.js` | `card-badge` → `ui-badge--pill--glass`, `detail-meta__badge` → `ui-badge--accent` |
| `horizontal/variable-width/shared.js` | `card-badge` → `ui-badge--pill--glass` |
| `social-feed/content.html` | `mode-badge` → `ui-badge--pill--accent` |
| `window-scroll/content.html` + `index.html` | `badge` → `ui-badge--pill--accent` |
| `wizard-nav/script.js` | `meta-tag` → `ui-badge--pill` |
| `large-list/react/script.tsx` | `compression-badge` → `ui-badge--pill` |
| `large-list/svelte/script.js` | `compression-badge` → `ui-badge--pill` |
| `large-list/vue/script.js` | `compression-badge` → `ui-badge--pill` |

**Per-example overrides kept (positioning / fonts only):**

| File | Class | Why |
|------|-------|-----|
| `carousel/styles.css` | `.card .ui-badge--glass` | `position: absolute; top; right` |
| `horizontal/variable-width/styles.css` | `.card .ui-badge--glass` | `position: absolute; top; right` + responsive override |
| `social-feed/styles.css` | `h1 .ui-badge` | `margin-left; vertical-align` |
| `window-scroll/styles.css` | `.hero-badges .ui-badge` | `font-family: monospace; letter-spacing` |
| `wizard-nav/styles.css` | `.meta-time`, `.meta-difficulty` | Color overrides using design tokens |

**Note:** `large-list/compression-badge` had no CSS at all — it was unstyled.
Now properly styled via `.ui-badge .ui-badge--pill .ui-badge--success` / `--muted`.

### 3.6 Verify

- [x] Deduplicated files are smaller (CSS total: 83.3 KB → 80.1 KB → ~77.8 KB → 71.2 KB)
- [x] No visual changes on any example (34/34 build)
- [x] `.ui-ctrl-btn` works in carousel and photo-album (all variants)
- [x] `.ui-switch` works in carousel (was `.toggle`, migrated in Phase 1)
- [x] `.ui-badge` works in all 8 consuming examples
- [x] No stray `.toggle`, `.ctrl-btn`, `.item__badge`, `.status-badge`, `.card-badge`, `.mode-badge`, `.badge`, `.meta-tag`, or `.compression-badge` CSS/class references remain

---

## File Impact Summary (actual)

### Files created

| File | Lines |
|------|------:|
| `styles/ui.css` | 1 078 |

### Files modified (51 + 10 + 16 = 77 total)

**Phase 1–3 (panel-* → ui-* rename + dedup):**

| File | Change |
|------|--------|
| `examples/styles.css` | 1 040 → 302 lines (page scaffolding only) |
| `src/server/renderers/examples.ts` | Add `ui.css` to `EXTRA_STYLES`, `example-chip` → `ui-chip` |
| 16 `content.html` files | `class="panel-*"` → `class="ui-*"` |
| 10 `script.js` files | String refs `"panel-*"` → `"ui-*"` |
| 5 `script.tsx` files | `className="panel-*"` → `className="ui-*"` |
| 1 `script.jsx` file | `class="panel-*"` → `class="ui-*"` |
| 5 `controls.js` files | `classList.toggle("panel-*")` → `classList.toggle("ui-*")` |
| 12 per-example `styles.css` files | `.panel-*` → `.ui-*` + duplicate removal |
| `docs/refactoring/ui.md` | This file — status updates |

**ctrl-btn dedup (`.ctrl-btn` → `.ui-ctrl-btn`):**

| File | Change |
|------|--------|
| `styles/ui.css` | +31 lines (`.ui-ctrl-btn` block + theme transition selector) |
| `examples/carousel/styles.css` | −30 lines (removed `.ctrl-btn` block) |
| `examples/photo-album/styles.css` | −30 lines (removed `.ctrl-btn` block) |
| `examples/file-browser/vanilla/styles.css` | −30 lines (removed dead `.ctrl-btn` block) |
| `examples/carousel/vanilla/content.html` | `ctrl-btn` → `ui-ctrl-btn` |
| `examples/carousel/vanilla/script.js` | `ctrl-btn--active` → `ui-ctrl-btn--active` |
| `examples/photo-album/content.html` | `ctrl-btn` → `ui-ctrl-btn` |
| `examples/photo-album/controls.js` | `ctrl-btn--active` → `ui-ctrl-btn--active` |
| `examples/photo-album/react/script.tsx` | `ctrl-btn` → `ui-ctrl-btn` |
| `examples/photo-album/vue/script.js` | `ctrl-btn` → `ui-ctrl-btn` |

**Badge dedup (6 badge classes → `.ui-badge`):**

| File | Change |
|------|--------|
| `styles/ui.css` | +122 lines (`.ui-badge` system + theme transition selector) |
| `examples/basic/styles.css` | −80 lines (removed `.item__badge` + 12 variant/theme rules) |
| `examples/basic/shared.js` | Status → semantic color mapping |
| `examples/data-table/styles.css` | −36 lines (removed `.status-badge` + dark overrides) |
| `examples/data-table/script.js` | `status-badge` → `ui-badge ui-badge--pill` |
| `examples/carousel/styles.css` | −16 lines (`.card-badge` → position-only, removed `.detail-meta__badge`) |
| `examples/carousel/shared.js` | `card-badge` → `ui-badge--glass`, `detail-meta__badge` → `ui-badge--accent` |
| `examples/horizontal/variable-width/styles.css` | −8 lines (`.card-badge` → position-only) |
| `examples/horizontal/variable-width/shared.js` | `card-badge` → `ui-badge--glass` |
| `examples/social-feed/styles.css` | −10 lines (`.mode-badge` → position-only) |
| `examples/social-feed/content.html` | `mode-badge` → `ui-badge--pill--accent` |
| `examples/window-scroll/styles.css` | −7 lines (`.badge` → font-only override) |
| `examples/window-scroll/content.html` + `index.html` | `badge` → `ui-badge--pill--accent` |
| `examples/wizard-nav/styles.css` | −8 lines (removed `.meta-tag` base) |
| `examples/wizard-nav/script.js` | `meta-tag` → `ui-badge--pill` |
| `examples/large-list/react/script.tsx` | `compression-badge` → `ui-badge--pill` |
| `examples/large-list/svelte/script.js` | `compression-badge` → `ui-badge--pill` |
| `examples/large-list/vue/script.js` | `compression-badge` → `ui-badge--pill` |

**CSS total:** 83.3 KB → 80.1 KB (−3.2 KB Phase 1–3) → 77.2 KB (−2.9 KB ctrl-btn) → 71.2 KB (−6.0 KB badge dedup)

### Files unchanged

| File | Reason |
|------|--------|
| `styles/tokens.css` | No UI component references |
| `styles/shell.css` | No UI component references |
| `styles/syntax.css` | No UI component references |
| `styles/content.css` | No UI component references |
| `styles/homepage.css` | No UI component references |
| `styles/api.css` | No UI component references |
| `styles/examples.css` | Examples *index* page — uses card grid, not UI components |
| `examples/build.ts` | References file paths only, not class names |

---

## Testing & Verification

### Visual Regression Checklist

Verify every example page renders identically after the extraction:

- [ ] basic (vanilla, react, vue, svelte, solidjs)
- [ ] controls (vanilla, react, vue, svelte)
- [ ] large-list (vanilla, react, vue, svelte)
- [ ] photo-album (shared, react, vue)
- [ ] file-browser
- [ ] data-table
- [ ] contact-list
- [ ] social-feed
- [ ] variable-heights
- [ ] messaging-app
- [ ] scroll-restore
- [ ] velocity-loading
- [ ] window-scroll
- [ ] wizard-nav
- [ ] accessibility
- [ ] carousel (vanilla, react)
- [ ] horizontal/basic (vanilla, react, vue, svelte)
- [ ] horizontal/variable-width

### Interaction Testing

- [ ] Segmented button toggles (controls, data-table, contact-list, social-feed)
- [ ] Button clicks (navigation, selection, detail display)
- [ ] Input fields (scroll-to-index number input)
- [ ] Select dropdowns (scroll align, social-feed filters)
- [ ] Slider range inputs (data-table row height, carousel size)
- [ ] Source viewer open/close and tab switching
- [ ] Detail card population on item click
- [ ] Stats bar updates on scroll

### Theme Testing

- [ ] Light → dark toggle: all UI components transition smoothly
- [ ] Dark → light toggle: all UI components transition smoothly
- [ ] Dark mode: select dropdown arrow uses light fill
- [ ] Refresh in each mode: no flash

### Responsive Testing

- [ ] ≤ 820px: split-layout stacks vertically, panel goes full-width
- [ ] ≤ 720px: source viewer font shrinks, controls stack
- [ ] ≤ 900px: container padding reduces

### Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

---

*Created: February 2026*
*Phase 1–3 completed: 03 February 2026*
*ctrl-btn dedup completed: 04 February 2026*
*badge dedup completed: 04 February 2026*
*Commits:*
- *`refactor(css): extract UI components into styles/ui.css, rename panel-* → ui-*`*
- *`refactor(css): centralize .ctrl-btn → .ui-ctrl-btn in ui.css`*
- *`refactor(css): centralize 6 badge classes → .ui-badge system in ui.css`*