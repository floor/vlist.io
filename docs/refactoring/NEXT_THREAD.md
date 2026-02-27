# Continue: @floor/vlist examples & tutorials refactoring

## Context

Three audit logs in `vlist.dev/docs/refactoring/` track all work:

- **`documentation.md`** — Docs refactoring, phases 1–7 complete. The 11 principles at the bottom govern all decisions.
- **`tutorials.md`** — Tutorial refactoring plan. Audit done, 6 phases planned, 0 executed.
- **`examples.md`** — Examples refactoring. Phase 1 complete, phases 2–6 planned.

Source lives in `vlist/`, adapter source in `vlist-react/`, `vlist-vue/`, `vlist-svelte/`, `vlist-solidjs/`. Docs in `vlist.dev/docs/`, tutorials in `vlist.dev/tutorials/`, examples in `vlist.dev/examples/`.

## What's done

### Docs (complete)

Phases 1–7 finished. All docs are factually accurate, structurally clean, import-path correct, builder-API consistent. `VListConfig` type added to core (`@floor/vlist@1.1.2`), all 4 adapters at `0.1.2`, everything published to npm.

### Examples Phase 1 (complete)

Navigation restructured from 8 feature-based groups to 2 use-case groups (Essentials + Data) with feature chips on every entry. Feature chips render on both overview page and individual example pages (top-right, absolute positioned).

**Current `navigation.json` state — 12 examples, 2 groups:**

```
Essentials (9)
  basic              → "Basic List"         [core]
  grid/photo-album   → "Photo Album"        [grid] [masonry] [scrollbar]
  reverse-chat       → "Messaging"          [reverse] [sections]
  groups/sticky-headers → "Contact List"    [sections] [selection]
  wizard-nav         → "Wizard"             [scroll.wheel] [selection]
  auto-size          → "Feed"               [estimatedHeight] [async]
  grid/file-browser  → "File Browser"       [grid] [sections] [scrollbar]
  horizontal/basic   → "Carousel"           [horizontal]
  window-scroll      → "Window Scroll"      [page] [async]

Data (3)
  data/velocity-loading → "Velocity Loading" [async] [scale] [scrollbar] [snapshots] [selection]
  data/large-list    → "Large Dataset"       [scale] [scrollbar]
  scroll-restore     → "Scroll Restore"      [snapshots] [selection]
```

**Archived from nav (directories still on disk):** `controls`, `variable-heights`, `horizontal/variable-width`, `masonry/photo-album`.

### Server changes (complete)

- `src/server/renderers/examples.ts` — `ExampleItem.features?: string[]`, chips on overview + individual pages
- `styles/shell.css` — `.overview__chips`, `.overview__chip` for overview page
- `examples/styles.css` — `.example-chips`, `.example-chip` (absolute top-right) for individual pages

## What's next — Phase 2: Enhance Essentials

Read `examples.md` Phase 2 for full specs. Summary of each example to build/modify:

### 1. Basic List — Control panel

Add aside panel: item count slider (100→100K), height toggle (fixed/variable), overscan slider, scroll-to input, data operation buttons (append/prepend/remove), live stats.

### 2. Photo Album — Layout toggle

Merge `grid/photo-album` + `masonry/photo-album`. Add Grid ↔ Masonry layout switch. Keep existing grid controls (columns, gap, orientation). Masonry mode uses variable heights from photo aspect ratios. Archive `masonry/photo-album/` after merge.

### 3. Messaging — Header controls

Enhance `reverse-chat`. Add: Headers on/off toggle, Sticky ↔ Inline toggle (`sticky: true/false`), header style selector (date/sender/custom). Keep existing features (auto-scroll, incoming messages, send input, DOM measurement).

### 4. Wizard — Orientation switch

Enhance `wizard-nav`. Add: Vertical ↔ Horizontal orientation switch, wheel toggle, wrap toggle (`scroll: { wrap: true }`), selection mode toggle. Step-by-step recipe UI with prev/next buttons.

### 5. Carousel — MD3 carousel

Rewrite `horizontal/basic`. MD3-inspired modes: Hero (single large + peek) ↔ Multi-browse (multiple visible) ↔ Uncontained (free scroll). Fixed ↔ Variable width toggle. Snap behavior. Merge `horizontal/variable-width/` logic, archive that directory.

### 6. Feed — Social feed (X / Facebook)

Rewrite `auto-size`. Platform switch: X style ↔ Facebook style. `estimatedHeight` for variable post sizes. `withAsync()` with simulated API. Realistic post data (avatars, usernames, timestamps, images). Placeholder skeletons. Archive `variable-heights/`.

### 7. File Browser — OS file manager

Enhance `grid/file-browser`. OS switch: macOS Finder ↔ Windows Explorer. Click-to-preview detail pane (text, images, code with syntax highlighting). Sort controls (name, size, date, type). Keep existing grid/list toggle and breadcrumbs.

## After Phase 2

- **Phase 3** — Reorganize directories: flatten from `grid/photo-album` → `photo-album/`, `groups/sticky-headers` → `contact-list/`, etc. All flat, named by use case. Update slugs, URLs, cross-links. Full mapping table in `examples.md`.
- **Phase 4** — Archive retired directories to `examples/archive/`
- **Phase 5** — Polish: consistent control panel layout, stats bar, feature chips accuracy
- **Phase 6** — Cross-links between tutorials ↔ examples ↔ docs

## Tutorials (not started)

Plan is in `tutorials.md`. 8 tutorials planned, each building one real thing linked to a live example. Waiting for examples to stabilize before writing tutorials that point to them. The structure:

- **Essentials**: Your First List
- **Feature Tutorials**: Photo Gallery, Contact List, Chat Interface, Infinite Feed, Large Dataset
- **Recipes**: Styling, Accessibility

Archived tutorials: `quick-start`, `builder-pattern`, `mobile`, `optimization` (reference docs, not tutorials).

## Key files

| File | Purpose |
|------|---------|
| `examples/navigation.json` | Source of truth for example metadata + feature chips |
| `examples/build.ts` | Auto-discovers and builds all examples (don't modify) |
| `examples/styles.css` | Shared styles for example pages (has chip styles) |
| `src/server/renderers/examples.ts` | Server renderer (reads navigation.json, renders chips) |
| `styles/shell.css` | Overview page chip styles |
| `docs/refactoring/examples.md` | Full audit log with phase specs |
| `docs/refactoring/tutorials.md` | Tutorial refactoring plan |
| `docs/refactoring/documentation.md` | Docs audit log (phases 1–7 complete) |

## Principles (23 total)

1–11: Documentation (see `documentation.md`)
12–17: Tutorials (see `tutorials.md`)
18–23: Examples (see `examples.md`)

Key ones for Phase 2:
- **18.** Organize by what you build, not features. Chips show features.
- **20.** Realistic data, minimal chrome.
- **21.** Copy-paste to learn.
- **22.** Progressive complexity within groups.