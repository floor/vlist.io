# Continue: @floor/vlist examples & tutorials refactoring

## Context

Three audit logs in `vlist.dev/docs/refactoring/` track all work:

- **`documentation.md`** — Docs refactoring, phases 1–7 complete. The 11 principles at the bottom govern all decisions.
- **`tutorials.md`** — Tutorial refactoring plan. Audit done, 6 phases planned, 0 executed.
- **`examples.md`** — Examples refactoring. Phase 1 complete, Phase 2 in progress (1/7 done).

Source lives in `vlist/`, adapter source in `vlist-react/`, `vlist-vue/`, `vlist-svelte/`, `vlist-solidjs/`. Docs in `vlist.dev/docs/`, tutorials in `vlist.dev/tutorials/`, examples in `vlist.dev/examples/`.

## What's done

### Docs (complete)

Phases 1–7 finished. All docs are factually accurate, structurally clean, import-path correct, builder-API consistent. `VListConfig` type added to core (`@floor/vlist@1.1.2`), all 4 adapters at `0.1.2`, everything published to npm.

### Examples Phase 1 (complete)

Navigation restructured from 8 feature-based groups to 2 use-case groups (Essentials + Data) with feature chips on every entry.

### Examples Phase 2 — Basic List ✅ (complete)

Rewrote `examples/basic/` into the **model interactive example** that establishes the design system for all subsequent examples.

**Layout — 3 zones (the template):**
1. `<header>` — title + one-line description
2. `.split-layout` — list (`.split-main`) + control panel (`.split-panel`) with N sections
3. `.example-footer` — universal stats bar below split-layout

**Panel sections (Basic List):**
- **Items** — count slider (100–100K), overscan slider (0–10)
- **Scroll To** — index input + align select + Go, quick jump icon buttons (first/middle/last)
- **Data** — prepend, append, +100, remove, clear, reset — all with icon buttons

**Design system components established (in shared `examples/styles.css`):**

1. **Example footer bar** — universal stats bar, same on every example:
   - Left (universal): progress % (0–100% scroll position) · velocity current/avg px/ms · DOM/total items
   - Right (contextual, varies per example): e.g. `height 56px · overscan 3`
   - Monospace font (`monospace, "Courier New", Courier`), `0.8em`, `tabular-nums`
   - Velocity uses vlist's native `velocity:change` event, average is running mean filtered 0.1–50 px/ms (same logic as desk/velocity.js)

2. **Icon system** — `<i class="icon icon--name"></i>`, CSS mask-image referencing SVGs from `/examples/icons/`. No inline SVG in bundles. 15 icons registered: `up`, `down`, `center`, `add`, `remove`, `trash`, `shuffle`, `back`, `forward`, `search`, `sort`, `filter`, `send`, `settings`.

3. **Panel slider** — `.panel-slider` class for styled range inputs (WebKit + Firefox).

4. **Shared data library** — `src/data/` with small, separate modules (tree-shaken per example):
   - `people.js` (~3 KB) — `makeUser(i)`, `makeUsers(count, start?)`, `makeContact(i)`, `makeContacts(count, start?)`, plus seed arrays (`FIRST_NAMES`, `LAST_NAMES`, `AVATAR_COLORS`) and utilities (`hash`, `pick`)
   - `messages.js` (~3 KB) — `getChatUser(i)`, `pickMessage(i)`, `makeMessage(i, opts?)`, `makeMessages(count, opts?)`
   - `posts.js` (~3 KB) — `makePost(i)`, `makePosts(count, start?)`
   - All deterministic (hash-based, no `Math.random()`), shared between examples and API (`src/api/users.ts`)
   - Import from examples: `import { makeUser } from '../../src/data/people.js'`
   - Import from API: `import { FIRST_NAMES, hash } from '../data/people.js'`

**Current `navigation.json` state — 12 examples, 2 groups:**

```
Essentials (9)
  basic              → "Basic List"         [core]
  photo-album        → "Photo Album"        [grid] [masonry] [scrollbar]
  reverse-chat       → "Messaging"          [reverse] [sections]
  groups/sticky-headers → "Contact List"    [sections] [selection]
  wizard-nav         → "Wizard"             [scroll.wheel] [selection]
  auto-size          → "Feed"               [estimatedHeight] [async]
  file-browser       → "File Browser"       [grid] [sections] [scrollbar]
  horizontal/basic   → "Carousel"           [horizontal]
  window-scroll      → "Window Scroll"      [page] [async]

Data (3)
  data/velocity-loading → "Velocity Loading" [async] [scale] [scrollbar] [snapshots] [selection]
  data/large-list    → "Large Dataset"       [scale] [scrollbar]
  scroll-restore     → "Scroll Restore"      [snapshots] [selection]
```

**Archived from nav (directories still on disk):** `controls`, `variable-heights`, `horizontal/variable-width`, `masonry/photo-album`.

## What's next — Phase 2: Remaining 6 Essentials

Read `examples.md` Phase 2 for full specs. Each example follows the Basic List model: header → split-layout → example-footer.

### 2. Photo Album — Layout toggle

Merge `photo-album` + `masonry/photo-album`. Add Grid ↔ Masonry layout switch. Keep existing grid controls (columns, gap, orientation). Masonry mode uses variable heights from photo aspect ratios. Archive `masonry/photo-album/` after merge. Footer right side: `grid 4×4 · gap 8px · vertical`.

### 3. Messaging — Header controls

Enhance `reverse-chat`. Add: Headers on/off toggle, Sticky ↔ Inline toggle (`sticky: true/false`), header style selector (date/sender/custom). Keep existing features (auto-scroll, incoming messages, send input, DOM measurement). Footer right side: `reverse · sticky headers`.

### 4. Wizard — Orientation switch

Enhance `wizard-nav`. Add: Vertical ↔ Horizontal orientation switch, wheel toggle, wrap toggle (`scroll: { wrap: true }`), selection mode toggle. Step-by-step recipe UI with prev/next buttons. Footer right side: `vertical · wheel off · wrap`.

### 5. Carousel — MD3 carousel

Rewrite `horizontal/basic`. MD3-inspired modes: Hero (single large + peek) ↔ Multi-browse (multiple visible) ↔ Uncontained (free scroll). Fixed ↔ Variable width toggle. Snap behavior. Merge `horizontal/variable-width/` logic, archive that directory. Footer right side: `horizontal · hero mode`.

### 6. Feed — Social feed (X / Facebook)

Rewrite `auto-size`. Platform switch: X style ↔ Facebook style. `estimatedHeight` for variable post sizes. `withAsync()` with simulated API. Realistic post data (avatars, usernames, timestamps, images). Placeholder skeletons. Archive `variable-heights/`. Footer right side: `estimatedHeight 120px · X style`.

### 7. File Browser — OS file manager

Enhance `file-browser`. OS switch: macOS Finder ↔ Windows Explorer. Click-to-preview detail pane (text, images, code with syntax highlighting). Sort controls (name, size, date, type). Keep existing grid/list toggle and breadcrumbs. Footer right side: `grid 4col · macOS · name ↑`.

## After Phase 2

- **Phase 3** — Reorganize directories: flatten `groups/sticky-headers` → `contact-list/`, etc. All flat, named by use case. Update slugs, URLs, cross-links. Full mapping table in `examples.md`. (`grid/photo-album` → `photo-album/` ✅ done)
- **Phase 4** — Archive retired directories to `examples/archive/`
- **Phase 5** — Polish: consistent control panel layout (already mostly done via design system), stats bar accuracy, feature chips accuracy
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
| `examples/styles.css` | Shared styles: footer bar, icon system, panel slider, panel components, source viewer |
| `examples/icons/` | SVG icons referenced via CSS mask-image (not bundled) |
| `src/data/people.js` | Shared data: names, colors, hash/pick, makeUser, makeContact |
| `src/data/messages.js` | Shared data: chat corpus, getChatUser, makeMessage |
| `src/data/posts.js` | Shared data: social feed texts, makePost |
| `src/server/renderers/examples.ts` | Server renderer (reads navigation.json, renders chips) |
| `styles/shell.css` | Overview page chip styles |
| `docs/refactoring/examples.md` | Full audit log with phase specs + design system docs |
| `docs/refactoring/tutorials.md` | Tutorial refactoring plan |
| `docs/refactoring/documentation.md` | Docs audit log (phases 1–7 complete) |

## Design system reference

### Example page structure (every example)

```html
<div class="container">
    <header>
        <h1>Example Name</h1>
        <p class="description">One-liner.</p>
    </header>

    <div class="split-layout">
        <div class="split-main">
            <div id="list-container"></div>
        </div>
        <aside class="split-panel">
            <section class="panel-section">...</section>
        </aside>
    </div>

    <footer class="example-footer">
        <div class="example-footer__left">
            <!-- progress %, velocity current/avg, DOM/total -->
        </div>
        <div class="example-footer__right">
            <!-- contextual: height, overscan, orientation, etc. -->
        </div>
    </footer>
</div>
```

### Footer bar — left side (universal)

| Slot | Format | Source |
|------|--------|--------|
| Progress | `47%` | `scrollPosition / maxScroll * 100` (0% top, 100% bottom) |
| Velocity | `0.00 / 0.00 px/ms` | current from `velocity:change` event, avg = running mean (0.1–50 filter) |
| Items | `12 / 10,000 items` | DOM node count / total items |

### Icons

`<i class="icon icon--name"></i>` — CSS mask-image, inherits `currentColor`. Available: `up`, `down`, `center`, `add`, `remove`, `trash`, `shuffle`, `back`, `forward`, `search`, `sort`, `filter`, `send`, `settings`.

### Panel components

- `.panel-section` + `.panel-title` — collapsible sections
- `.panel-row` + `.panel-label` + `.panel-value` — key/value rows
- `.panel-slider` — styled range input
- `.panel-segmented` + `.panel-segmented__btn` — toggle groups
- `.panel-btn` + `.panel-btn--icon` — action buttons
- `.panel-btn-group` — button row
- `.panel-input` + `.panel-input-group` — text/number inputs
- `.panel-select` — styled select dropdown

## Principles (23 total)

1–11: Documentation (see `documentation.md`)
12–17: Tutorials (see `tutorials.md`)
18–23: Examples (see `examples.md`)

Key ones for Phase 2:
- **18.** Organize by what you build, not features. Chips show features.
- **20.** Realistic data, minimal chrome.
- **21.** Copy-paste to learn.
- **22.** Progressive complexity within groups.