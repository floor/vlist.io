# Examples Refactoring — Audit & Plan

Companion to `documentation.md` (docs, phases 1–7) and `tutorials.md` (tutorials, planned). Same audit-log format — every decision and change recorded here.

---

## Motivation

Tutorials teach by building. Examples *are* the built thing, running live. Docs are the reference you consult while building. The three sections form a triangle — if any side is weak, the others lose credibility.

The examples are the strongest of the three today. Code quality is high, the build system is solid, and several examples are genuinely impressive (messaging-app, velocity-loading, file-browser). But coverage is uneven, organization is inconsistent, and several features have zero or minimal representation.

**Goal:** Make vlist's examples the best of any virtual scrolling library. Every feature has a showcase. Every tutorial points to a live example. Every example is polished, consistent, and teaches something by existing.

---

## Inventory

### What exists (14 example directories + build infrastructure)

| Slug | Feature(s) | Frameworks | Quality | Lines (JS) |
|------|-----------|------------|---------|------------|
| `basic` | Core | JS only | 🟢 | ~50 |
| `controls` | Selection, events | JS, React, Vue, Svelte | 🟢 | ~250 |
| `photo-album` | Grid, scrollbar | JS, React, Vue, Svelte | 🟢 | ~300 |
| `file-browser` | Grid, sections, scrollbar | JS only | 🟢 | ~600 |
| ~~`masonry/photo-album`~~ | ~~Masonry, scrollbar~~ | ~~JS only~~ | — | — | Merged into `photo-album` ✅ |
| `data/large-list` | Scale, scrollbar | JS, React, Vue, Svelte | 🟢 | ~250 |
| `data/velocity-loading` | Async, scale, scrollbar, snapshots, selection | JS only | 🟢 | ~300 |
| `horizontal/basic` | Horizontal orientation | JS, React, Vue, Svelte | 🟢 | ~60 |
| `horizontal/variable-width` | Horizontal, variable width | JS only | 🟡 | ~65 |
| `contact-list` | Sections | JS only | 🟢 | ~460 |
| `scroll-restore` | Snapshots, selection | JS only | 🟢 | ~240 |
| `window-scroll` | Page, async | JS only | 🟢 | ~150 |
| `messaging-app` | Reverse, sections | JS only | 🟢 | ~400 |
| `auto-size` | estimatedHeight (Mode B) | JS only | 🟢 | ~260 |
| `variable-heights` | height function (Mode A) | JS only | 🟢 | ~340 |
| `wizard-nav` | scroll.wheel: false, selection | JS only | 🟢 | ~330 |

**Also present:**
- `icons/` — SVG icon library used by examples (not an example itself)
- `build.ts` — Build system (auto-discover, parallel build, framework dedupe)
- `styles.css` — Shared example styles with theme bridging
- `index.html` — Landing page (hand-written, not generated from navigation.json)
- `navigation.json` — Example metadata (8 groups, 16 entries)

### Build system

Solid. Auto-discovers examples by scanning for `script.js`/`script.tsx`, builds in parallel with Bun, handles framework deduplication (React, Vue linked copies), maps bare `"vlist"` imports to `"@floor/vlist"`, reports sizes and gzip. Watch mode works. No issues found here.

### Import paths

All example scripts use `import { vlist } from "vlist"` (bare specifier). This is correct — the build plugin resolves `"vlist"` to `"@floor/vlist"` via the package.json imports field. **Not a bug**, but worth noting: readers who copy example code into their own project need `"@floor/vlist"`, not `"vlist"`. The examples don't make this visible.

---

## Quality Assessment

### What's good

1. **Code quality is high.** Examples are well-commented, use clean patterns, data generation is realistic (Picsum photos, chat messages from JSON, contact lists with real names).
2. **Build system is excellent.** Auto-discovery, parallel builds, framework dedupe, size reporting — nothing to change here.
3. **Feature coverage for core use cases exists.** Grid, async, scale, reverse, sections, snapshots, page scroll, horizontal — all represented.
4. **Several examples are genuinely impressive.** `messaging-app` is a full chat app with auto-messages, DOM measurement, date headers, event logging. `velocity-loading` has real-time velocity visualization, API delay slider, snapshot persistence. `file-browser` has grid/list toggle, breadcrumb navigation, real filesystem API.
5. **Multi-framework examples exist where they matter.** `controls`, `photo-album`, `data/large-list`, `horizontal/basic` all have JS + React + Vue + Svelte variants.

### What's wrong

#### 1. Navigation structure is stale

`navigation.json` has 8 groups. `index.html` has 7 sections (hardcoded HTML, not generated from navigation.json). They're out of sync:

| navigation.json group | index.html section | Match? |
|----------------------|-------------------|--------|
| Getting Started | Getting Started | ✅ |
| Grid Feature | Grid Feature | ✅ |
| Masonry Feature | *(missing)* | ❌ |
| Data Feature | Data Feature | ✅ |
| Horizontal | Horizontal | ✅ |
| Groups Feature | Groups Feature | ✅ |
| Other Features | Other Features | ✅ |
| Advanced Examples | Advanced Examples | ✅ |

The Masonry section exists in `navigation.json` but is **missing from `index.html`**. Also, `horizontal/variable-width` exists on disk but is **missing from `navigation.json`** and `index.html`.

#### 2. Feature gaps

| Feature | Examples | Gap |
|---------|----------|-----|
| **Selection** | `controls` (embedded), `wizard-nav` | No dedicated selection showcase |
| **Masonry** | `photo-album` (grid/masonry toggle) | ✅ Merged into photo-album |
| **Async (standalone)** | `data/velocity-loading` | Velocity-loading is complex — no simple "fetch from API" example |
| **Page scroll** | `window-scroll` | Only one, works well |
| **Placeholders** | *(none)* | Placeholder system is documented but never shown |
| **Snapshots (standalone)** | `scroll-restore` | Works well |
| **Horizontal** | `basic` + `variable-width` | variable-width not in nav |
| **Reverse** | `messaging-app` | Good but complex — no simple reverse example |
| **Mode B (auto-size)** | `auto-size` | Good |
| **Combined features** | `file-browser` (grid+sections), `velocity-loading` (async+scale+scrollbar+snapshots+selection) | Good |

**Missing entirely:**
- No **selection-focused** example (multi-select, range select, programmatic selection)
- No **simple async** example (just fetch + placeholder, no velocity visualization)
- No **masonry multi-framework** variants
- No **placeholder styling** example

#### 3. Organization inconsistency

Examples use three different directory patterns:

```
# Pattern A: flat (single JS file)
examples/basic/script.js
examples/messaging-app/script.js

# Pattern B: name/framework (multi-framework)
examples/photo-album/javascript/script.js
examples/photo-album/react/script.tsx

# Pattern C: flat with shared.js (multi-framework with shared data)
examples/controls/javascript/script.js
examples/controls/shared.js
```

This is functional but inconsistent. Pattern A examples can't easily gain framework variants later. Not a blocker, but worth standardizing if we're adding new examples.

#### 4. "Other Features" is a catch-all

The group "Other Features" contains `scroll-restore` and `window-scroll` — two unrelated examples. It's the equivalent of a "Misc" folder. These should be organized by what they demonstrate.

#### 5. "Advanced Examples" mixes difficulty with feature type

`auto-size`, `variable-heights`, `messaging-app`, and `wizard-nav` are grouped by perceived difficulty rather than by feature. A reader looking for "how to use reverse mode" has to scan "Advanced Examples" to find `messaging-app`. A reader looking for "variable item sizes" has to know the difference between "Auto-Size Measurement" and "Variable Heights."

#### 6. index.html is hand-maintained

The landing page is 260+ lines of hardcoded HTML cards. Every time an example is added or renamed, both `navigation.json` AND `index.html` need manual updates. They're already out of sync (masonry missing). The index page should ideally be generated from `navigation.json`.

#### 7. No SolidJS examples

Four adapters exist (React, Vue, Svelte, SolidJS). Multi-framework examples include React, Vue, Svelte — but never SolidJS. The `vlist-solidjs` adapter is published and documented in `frameworks.md` but has zero representation in examples.

---

## Target Structure

**No feature-based categories.** Examples are organized by **what you're building** (the use case). Each example lists its features as chips — the reader scans by "I want to build something like this" and sees at a glance which vlist features are involved.

Many examples use multiple features. Categorizing by feature forces a false hierarchy — the file browser uses grid + sections + scrollbar, where does it go? The answer: it goes under "File Browser," and the chips tell you the rest.

### Two groups — Essentials is the showcase

Almost everything belongs in Essentials. These are the real things developers build with a virtual list. Data is the deep dive for scale, async internals, and persistence.

```
Essentials
  basic-list             [core]                                          — exists
  photo-album            [grid] [masonry] [scrollbar]                    — exists (merge grid + masonry with toggle)
  messaging-app          [reverse] [sections]                            — exists (renamed from reverse-chat ✅)
  contact-list           [sections] [selection]                          — exists (rename from sticky-headers)
  wizard                 [scroll.wheel] [selection]                      — exists (rename from wizard-nav)
  feed                   [estimatedHeight] [async]                       — exists (rewrite auto-size with X API data)
  file-browser           [grid] [sections] [scrollbar]                   — exists
  carousel               [horizontal]                                    — exists (merge horizontal/basic + variable-width with toggle)
  window-scroll          [page] [async]                                  — exists

Data
  velocity-loading       [async] [scale] [scrollbar] [snapshots] [selection] — exists
  large-dataset          [scale] [scrollbar]                             — exists (4 frameworks)
  scroll-restore         [snapshots] [selection]                         — exists
```

### Feature chip vocabulary

Chips use the builder function name or config option — what the developer actually types:

| Chip | Means |
|------|-------|
| `[core]` | No features — `vlist().build()` only |
| `[grid]` | `withGrid()` |
| `[masonry]` | `withMasonry()` |
| `[sections]` | `withSections()` |
| `[selection]` | `withSelection()` |
| `[async]` | `withAsync()` |
| `[scale]` | `withScale()` |
| `[scrollbar]` | `withScrollbar()` |
| `[page]` | `withPage()` |
| `[snapshots]` | `withSnapshots()` |
| `[reverse]` | `reverse: true` |
| `[horizontal]` | `orientation: 'horizontal'` |
| `[events]` | Event listeners (`on('scroll', ...)`, etc.) |
| `[scroll.wheel]` | `scroll: { wheel: false }` |
| `[estimatedHeight]` | `item: { estimatedHeight }` (Mode B) |

### What changes

| Change | Type | Rationale |
|--------|------|-----------|
| Collapse 8 groups → 2 (Essentials + Data) | Nav | Almost everything is an essential use case; no need for Layouts, Lists, Messaging, Page & Window |
| Add feature chips to every entry | Nav | Each entry gets a `features` array rendered as chips |
| Merge `photo-album` + `masonry/photo-album` | Modify | One "Photo Album" with grid/masonry toggle ✅ done — `masonry/photo-album` deleted |
| Merge `horizontal/basic` + `horizontal/variable-width` | Modify | One "Carousel" with fixed/variable width toggle |
| Rewrite `auto-size` → "Feed" | Modify | Social feed with X API data instead of synthetic auto-size demo |
| Archive `controls` | Archive | API exploration replaced by individual Essentials examples that demo APIs in context |
| Archive `variable-heights` | Archive | Replaced by Feed example |
| Move everything into Essentials | Nav | `messaging-app` → Messaging, `contact-list` → Contact List, `wizard-nav` → Wizard, `file-browser` → File Browser, `window-scroll` → Window Scroll, `auto-size` → Feed |

### What doesn't change

- **Build system** — works perfectly, no changes needed
- **Shared styles** — solid, theme bridging works
- **Icons directory** — used by examples, stays as-is
- **Multi-framework strategy** — keep current approach (JS always, framework variants for key examples)
- **Directory structure on disk** — examples stay where they are; only navigation metadata changes

---

## Relationship to Tutorials

Each tutorial should point to one or more live examples. The mapping:

| Tutorial (from tutorials.md) | Primary Example | Secondary Examples | Status |
|------------------------------|----------------|-------------------|--------|
| Your First List | `/examples/basic` | — | ✅ Exists |
| Photo Gallery | `/examples/photo-album` | `file-browser` | ✅ Exists (adding masonry toggle) |
| Contact List | `/examples/contact-list` | — | ✅ Exists |
| Chat Interface | `/examples/messaging-app` | — | ✅ Exists |
| Infinite Feed | `/examples/auto-size` (→ Feed) | `data/velocity-loading`, `window-scroll` | 🟡 Rewrite needed (X API) |
| Large Dataset | `/examples/data/large-list` | `data/velocity-loading` | ✅ Exists |
| Styling | No dedicated example | — | ❌ (tutorial is self-contained) |
| Accessibility | No dedicated example | — | ❌ (tutorial is self-contained) |

**Key insight:** Every tutorial maps to an existing example. The main modification needed is rewriting `auto-size` into "Feed" with real X API data.

---

## Phase Plan

### Phase 1 — Navigation & Chips ✅

- Restructure `navigation.json` with use-case groups and `features` arrays on each entry
- Render feature chips on overview page (server-generated) and individual example pages (top-right)
- Iterative refinement: collapsed from 7 groups → 4 → 3 → 2 (Essentials + Data)
- Moved photo-album, messaging, contact-list, wizard, feed, file-browser, carousel, window-scroll into Essentials
- Archived controls, variable-heights conceptually (nav removed, directories remain for now)

### Phase 2 — Enhance Essentials

Upgrade every Essentials example into a polished, interactive showcase. Each gets a control panel aside, realistic data, and toggles that let the reader explore vlist features by switching options live.

#### 1. Basic List — Control panel ✅

Add a split layout with aside panel to explore the core API interactively:
- **Item count** slider (100 → 100K) — shows virtualization benefit as count grows
- **Overscan** slider (0–10) — visualize the render buffer
- **Scroll to** input + go button — `scrollToIndex()` with align selector (start/center/end)
- **Quick jump** icon buttons (first/middle/last) using CSS mask-image icons
- **Data operations** — prepend, append, +100, remove, clear, reset — with icon buttons
- **Example footer bar** — universal stats bar below split-layout (see design system below)

#### 2. Photo Album — Layout toggle grid / masonry

✅ Merged `photo-album` + `masonry/photo-album` into one example with controls (`masonry/photo-album` deleted):
- **Layout switch**: Grid ↔ Masonry — destroys and recreates with `withGrid()` or `withMasonry()`
- Keep existing grid controls (columns, gap, orientation)
- Masonry mode: variable heights from photo aspect ratios, shortest-lane placement
- Shared data (Picsum photos), shared card template
- ~~Archive `masonry/photo-album/` directory after merge~~ ✅ Deleted

#### 3. Messaging — Header controls

Enhance the existing messaging-app with section header controls:
- **Headers toggle**: On ↔ Off — rebuild with or without `withSections()`
- **Sticky toggle**: Sticky (Telegram style) ↔ Inline (iMessage style) — `sticky: true/false`
- **Header style** selector: Date labels, sender name, or custom grouping function
- Keep existing features: auto-scroll, incoming messages, send input, date grouping, DOM measurement

#### 4. Wizard — Orientation switch

Enhance wizard-nav with orientation and behavior controls:
- **Orientation switch**: Vertical ↔ Horizontal — rebuild with `orientation` option
- **Wheel toggle**: Enabled ↔ Disabled — `scroll: { wheel: true/false }`
- **Wrap toggle**: On ↔ Off — `scroll: { wrap: true }` for circular navigation
- **Selection mode**: None ↔ Single — toggle `withSelection()`
- Step-by-step recipe/onboarding UI with prev/next buttons

#### 5. Carousel — MD3 carousel

Rewrite `horizontal/basic` as an MD3-inspired carousel with multiple behaviors:
- **Mode switch**: Hero (single large + peek) ↔ Multi-browse (multiple visible) ↔ Uncontained (free scroll)
- **Item width toggle**: Fixed ↔ Variable — demonstrates both sizing strategies
- **Snap behavior**: Snap to item boundaries
- **Navigation**: Arrow buttons, swipe, keyboard
- Realistic card content (articles, products, media)
- Merge `horizontal/variable-width/` logic, archive that directory

#### 6. Feed — Social feed mocking X / Facebook

Rewrite `auto-size` as a realistic social media feed:
- **Platform switch**: X (Twitter) style ↔ Facebook style — different card layouts, same data
- `estimatedHeight` for variable post sizes (text-only, image, quote, thread)
- `withAsync()` with simulated API — infinite scroll loading
- `withPage()` option toggle — embedded scroll vs window scroll
- Realistic post data: avatars, usernames, timestamps, like/retweet counts, images
- Placeholder skeletons while loading
- Archive `variable-heights/` directory (replaced by this)

#### 7. File Browser — OS file manager

Enhance the existing file-browser into a polished OS file manager:
- **OS switch**: macOS Finder ↔ Windows Explorer — different chrome, same vlist
- **View toggle**: Grid (icons) ↔ List (details) — existing, polish further
- **Click to preview**: Click a file to see content in a detail pane (text files, images, code with syntax highlighting)
- **Breadcrumb navigation**: Existing, verify working
- **Sort controls**: Name, size, date, type
- Keep existing `withGrid()` + `withSections()` + `withScrollbar()`

### Phase 3 — Reorganize Directories

Flatten the directory structure to match the navigation. Directories named by what they build, not by feature.

**Before → After:**

| Before (path) | After (path) | Notes |
|----------------|-------------|-------|
| `basic/` | `basic-list/` | — |
| `photo-album/` | `photo-album/` | Already flat ✅ |
| `messaging-app/` | `messaging-app/` | Already renamed ✅ |
| `contact-list/` | `contact-list/` | Already flat ✅ |
| `wizard-nav/` | `wizard/` | — |
| `auto-size/` | `feed/` | Rewritten with X API |
| `file-browser/` | `file-browser/` | Already flat ✅ |
| `horizontal/basic/` | `carousel/` | Merged with variable-width |
| `window-scroll/` | `window-scroll/` | No change |
| `data/velocity-loading/` | `velocity-loading/` | — |
| `data/large-list/` | `large-dataset/` | — |
| `scroll-restore/` | `scroll-restore/` | No change |

**Also:**
- Move `controls/`, `variable-heights/`, `horizontal/variable-width/`, `data/` (empty after moves), `groups/` (empty after moves) to `examples/archive/` (`masonry/photo-album` ✅ deleted, `grid/` ✅ removed)
- Update `navigation.json` slugs to match new flat paths
- Update all docs/tutorials/feature pages that link to old paths (`grid/photo-album` ✅ done, etc.)
- Verify build system auto-discovers new paths (`bun run build:examples`)

**URL changes:**

| Old URL | New URL |
|---------|---------|
| `/examples/grid/photo-album` | `/examples/photo-album` ✅ |
| `/examples/grid/file-browser` | `/examples/file-browser` ✅ |
| `/examples/groups/sticky-headers` | `/examples/contact-list` ✅ |
| `/examples/data/velocity-loading` | `/examples/velocity-loading` |
| `/examples/data/large-list` | `/examples/large-dataset` |
| `/examples/horizontal/basic` | `/examples/carousel` |
| `/examples/reverse-chat` | `/examples/messaging-app` ✅ |
| `/examples/auto-size` | `/examples/feed` |
| `/examples/wizard-nav` | `/examples/wizard` |
| `/examples/basic` | `/examples/basic-list` |

### Phase 4 — Archive & Clean Up

- Verify `examples/archive/` contains all retired directories
- Verify all 12 examples build cleanly (`bun run build:examples`)
- Verify all content.html files have consistent structure
- Check all examples use builder API (no monolithic config)

### Phase 5 — Polish & Consistency

- Consistent control panel layout across all Essentials (same aside pattern, same button/toggle styles)
- Example footer bar already consistent (established in Phase 2, Basic List)
- Review descriptions in navigation.json for accuracy after all enhancements
- Verify feature chips match actual features used after modifications

### Phase 6 — Cross-Links (shared with tutorials)

- Tutorials link to their corresponding live examples ("See it live" at top)
- Example pages link back to their tutorial ("Learn step by step" where a tutorial exists)
- Feature doc pages link to relevant examples (partially done in docs Phase 7, verify completeness)

---

## Principles for Examples

Extending the 17 principles from docs + tutorials:

18. **Organize by what you build, not what features you use.** An example is a "Photo Album" or a "Chat," not a "Grid Feature" or "Reverse Feature." Feature chips tell the reader which vlist features are involved.
19. **Feature chips are the vocabulary.** Every example declares its features. Chips use builder function names (`[grid]`, `[async]`, `[selection]`) — what the developer types. Readers can scan for a chip across all examples to find every usage of a feature.
20. **Realistic data, minimal chrome.** Use plausible data (names, photos, messages, products) but keep the UI focused on the vlist functionality, not the surrounding app shell.
21. **Copy-paste to learn.** A developer should be able to read the source, copy the pattern into their own project (changing `"vlist"` to `"@floor/vlist"`), and have it work.
22. **Progressive complexity within groups.** If a group has multiple examples, order from simple to complex. The first example is the "hello world" for that theme.
23. **Navigation.json is the source of truth.** `index.html` must be generated from or kept in sync with `navigation.json`. No manual HTML-only entries. Feature chips render from the `features` array in each entry.

---

## Design System (established in Phase 2)

### Example Footer Bar

Universal stats bar below every `.split-layout`. Same structure on every example.

```
┌──────────────────────────────────────────────────────────────┐
│  0%    0.00 / 0.00 px/ms    12 / 10,000 items  │  height 56px · overscan 3  │
│  ← left: universal (same everywhere) ────────── │  ← right: contextual ────→ │
└──────────────────────────────────────────────────────────────┘
```

**Left side (universal, every example):**
- **Progress %** — scroll position as 0–100% (top → bottom)
- **Velocity** — `current / average` px/ms. Current from vlist's `velocity:change` event. Average is a running mean filtered to 0.1–50 px/ms (same logic as desk/velocity.js)
- **DOM / Total** — items currently in DOM vs total item count

**Right side (contextual, varies per example):**
- Basic List → `height 56px · overscan 3`
- Photo Album → `grid 4×4 · gap 8px · vertical`
- Messaging → `reverse · sticky headers`
- Carousel → `horizontal · hero mode`
- etc.

**CSS:** `.example-footer` in shared `examples/styles.css`. Monospace font (`monospace, "Courier New", Courier`), `0.8em`, `tabular-nums`. Responsive — wraps on mobile.

### Icon System

CSS mask-image icons via `<i class="icon icon--name"></i>`. SVG files in `/examples/icons/`, referenced by URL. No inline SVG in JS bundles.

**Registered icons:** `up`, `down`, `center`, `add`, `remove`, `trash`, `shuffle`, `back`, `forward`, `search`, `sort`, `filter`, `send`, `settings`.

**CSS:** `.icon` base + `.icon--{name}` modifiers in shared `examples/styles.css`. Uses `background-color: currentColor` + `mask-image` — inherits color from parent, works with light/dark themes.

### Panel Slider

Styled range input via `.panel-slider` class in shared `examples/styles.css`. Custom thumb (accent color, rounded) and track (border color). Works in both WebKit and Firefox.

### Shared Data Library

Small, separate modules in `src/data/` — each example imports only what it needs (tree-shaken by esbuild). The API (`src/api/`) imports the same modules at runtime.

```
src/data/
├── people.js      # names, colors, hash/pick, makeUser, makeContact, makeUsers, makeContacts
├── messages.js    # chat corpus (short/medium/long), getChatUser, pickMessage, makeMessage, makeMessages
└── posts.js       # social feed texts, images, tags, makePost, makePosts
```

**Design principles:**
- **Small modules** — `people.js` ~3 KB, `messages.js` ~3 KB, `posts.js` ~3 KB. An example importing only `people.js` pays nothing for messages or posts.
- **Deterministic** — `hash(index, seed)` + `pick(array, index, seed)` → same index always produces the same data. No `Math.random()`.
- **Layered generators** — `makeUser(i)` returns a lightweight shape (id, name, email, initials, color). `makeContact(i)` returns a richer shape (+ phone, company, department, role, city, country). Examples pick the shape they need.
- **Shared with API** — `src/api/users.ts` imports from `../data/people.js` instead of owning seed data. Single source of truth.
- **Batch helpers** — `makeUsers(count, startIndex)`, `makeContacts(count, startIndex)`, `makePosts(count, startIndex)` for generating arrays.

**Import paths:**
- From examples: `import { makeUser } from '../../src/data/people.js'`
- From API: `import { FIRST_NAMES, hash, pick } from '../data/people.js'`

**Generators summary:**

| Function | Module | Returns |
|-|-|-|
| `makeUser(i)` | people.js | `{ id, name, email, initials, color }` |
| `makeContact(i)` | people.js | `{ id, firstName, lastName, email, phone, company, department, role, initials, color, city, country }` |
| `makeUsers(count, start?)` | people.js | Array of users |
| `makeContacts(count, start?)` | people.js | Array of contacts |
| `getChatUser(i)` | messages.js | `{ name, initials, color }` |
| `pickMessage(i)` | messages.js | String (short/medium/long distribution) |
| `makeMessage(i, opts?)` | messages.js | `{ id, text, user, initials, color, isSelf, time, dateSection }` |
| `makeMessages(count, opts?)` | messages.js | Array of messages |
| `makePost(i)` | posts.js | `{ id, user, initials, color, text, hasImage, image, tags, time, likes, comments }` |
| `makePosts(count, start?)` | posts.js | Array of posts |

### Shared vs Per-Example Styles

| In shared `examples/styles.css` | In per-example `styles.css` |
|-|-|
| `.example-footer` (footer bar) | `#list-container` height |
| `.icon` system | Item template styles (`.item`, `.card`, etc.) |
| `.panel-slider` | `.split-main { padding: 0 }` if needed |
| `.panel-*` components | Example-specific overrides |
| `.split-layout`, `.split-panel` | Responsive height adjustments |

---

## Execution Log

### Phase 1 — Navigation & Chips

Iterative process — started with an intermediate 7-group structure, then refined through discussion into the final 2-group layout.

#### navigation.json — Full restructure

Rewrote `examples/navigation.json` from feature-based categories to use-case groups with feature chips.

**Before:** 8 groups organized by feature (`Getting Started`, `Grid Feature`, `Masonry Feature`, `Data Feature`, `Horizontal`, `Groups Feature`, `Other Features`, `Advanced Examples`). 16 entries.

**After:** 2 groups organized by what you're building (`Essentials`, `Data`). 12 entries.

| Before (group) | Example | After | Notes |
|----------------|---------|-------|-------|
| Getting Started | basic | Essentials → "Basic List" | — |
| Getting Started | controls | **Archived** | API exploration replaced by individual examples |
| Grid Feature | photo-album | Essentials → "Photo Album" | Will merge masonry with toggle |
| Grid Feature | file-browser | Essentials → "File Browser" | — |
| Masonry Feature | masonry/photo-album | **Merged into Photo Album** ✅ | Grid ↔ Masonry toggle, directory deleted |
| Data Feature | data/large-list | Data → "Large Dataset" | — |
| Data Feature | data/velocity-loading | Data → "Velocity Loading" | — |
| Horizontal | horizontal/basic | Essentials → "Carousel" | Will merge variable-width with toggle |
| Horizontal | horizontal/variable-width | **Merged into Carousel** | Fixed ↔ Variable toggle |
| Groups Feature | contact-list | Essentials → "Contact List" | Renamed + flattened ✅ |
| Other Features | scroll-restore | Data → "Scroll Restore" | — |
| Other Features | window-scroll | Essentials → "Window Scroll" | — |
| Advanced Examples | auto-size | Essentials → "Feed" | Will rewrite with X API data |
| Advanced Examples | variable-heights | **Archived** | Replaced by Feed |
| Advanced Examples | messaging-app | Essentials → "Messaging" | Renamed ✅ |
| Advanced Examples | wizard-nav | Essentials → "Wizard" | — |

Every entry now has a `features` array:

```json
{
  "slug": "file-browser",
  "name": "File Browser",
  "desc": "Finder-like file browser with grid/list toggle and breadcrumb navigation",
  "features": ["grid", "sections", "scrollbar"]
}
```

**Key decisions (iterative refinement):**

1. **No feature-based categories.** Categorize by what you build, show features as chips.
2. **"Messaging" not "Chat & Reverse."** More descriptive, not locked to chat.
3. **Controls → archive.** Individual Essentials examples demonstrate APIs in context.
4. **Merge grid + masonry photo albums.** Layout mode is a toggle, not a different app.
5. **Merge horizontal basic + variable-width.** Fixed/variable width is a toggle.
6. **Auto-size → Feed.** Real X API data instead of synthetic demo.
7. **File Browser + Carousel + Window Scroll → Essentials.** Almost everything is an essential use case.
8. **Collapsed to 2 groups.** Essentials (9) + Data (3). No Layouts, Lists, Messaging, or Page & Window groups needed.

#### examples.ts — Feature chips on both overview and example pages

Added `features?: string[]` to `ExampleItem` interface.

**Overview page:** Updated `buildOverviewContent()` to render chips below each card description:

```html
<div class="overview__chips">
  <span class="overview__chip">grid</span>
  <span class="overview__chip">scrollbar</span>
</div>
```

**Individual example pages:** Updated `renderExamplesPage()` to inject a chip bar between the variant switcher and the example content:

```html
<div class="example-chips">
  <span class="example-chip">grid</span>
  <span class="example-chip">sections</span>
  <span class="example-chip">scrollbar</span>
</div>
```

Positioned absolute top-right, same level as the variant switcher (top-left).

#### CSS — Chip styles

**shell.css:** Added `.overview__chips` and `.overview__chip` for the overview page. Subtle background via `--bg-subtle` token, muted text via `--text-dim`.

**examples/styles.css:** Added `.example-chips` (absolute, top-right, z-index 5) and `.example-chip` (12px, rounded, border + background) for individual example pages.

#### index.html — Not updated

The static `index.html` is a fallback — the server generates the examples overview from `navigation.json` via `buildOverviewContent()`. The static file is now stale but is not served in production.

### Phase 2 — Enhance Essentials

#### 1. Basic List — Control panel ✅

Rewrote `examples/basic/` from a minimal demo into the model interactive example. This establishes the pattern for all 7 Essentials.

**Layout — 3 zones:**
1. `<header>` — title + one-line description
2. `.split-layout` — list (`.split-main`) + control panel (`.split-panel`, 3 sections)
3. `.example-footer` — universal stats bar

**Panel sections:**
- **Items** — count slider (100–100K via `.panel-slider`), overscan slider (0–10)
- **Scroll To** — index input + align select + Go button, quick jump icon buttons (first/middle/last)
- **Data** — prepend, append, +100, remove, clear, reset — all with icon buttons

**What was removed vs original spec:**
- ~~Item height toggle (fixed ↔ variable)~~ — removed, basic list uses fixed height only. Variable heights demonstrated in Feed example.
- ~~Live stats panel section~~ — replaced by the example footer bar. No duplication.
- ~~Top stats bar~~ — removed entirely. Footer is the only stats display.
- ~~Page footer prose paragraph~~ — removed. The description in `<header>` is enough.

**Footer bar (new design system component):**
- Left: progress % (scroll position 0–100%), velocity current/average px/ms, DOM/total items
- Right: `height 56px` · `overscan 3` (updates when overscan slider changes)
- Velocity uses vlist's native `velocity:change` event, average computed as running mean (0.1–50 px/ms filter, matching desk/velocity.js logic)

**Icon system (new design system component):**
- Buttons use `<i class="icon icon--add"></i>` instead of emoji or inline SVG
- CSS mask-image references SVG files from `/examples/icons/`
- 15 icons registered in shared stylesheet for reuse across all examples

**Shared styles added to `examples/styles.css`:**
- `.example-footer` — footer bar layout, monospace `0.8em`, responsive
- `.icon` + `.icon--{name}` — mask-image icon system (15 icons)
- `.panel-slider` — styled range input (WebKit + Firefox)

**Per-example `basic/styles.css` kept minimal:**
- `#list-container` height
- `.item` template styles (avatar, text, index)
- `.split-main { padding: 0 }`
- Responsive height override

**navigation.json updated:**
- Description changed to: "Interactive control panel — item count, sizing strategies, overscan, scroll-to, data operations"

**Files changed:**
- `examples/basic/content.html` — full rewrite
- `examples/basic/script.js` — full rewrite, imports `makeUser`/`makeUsers` from `src/data/people.js`
- `examples/basic/styles.css` — trimmed, slider styles moved to shared
- `examples/styles.css` — added footer bar, icon system, panel slider
- `examples/navigation.json` — updated basic description
- `src/data/people.js` — **new** shared data module (names, colors, hash, generators)
- `src/data/messages.js` — **new** shared data module (chat corpus, message generators)
- `src/data/posts.js` — **new** shared data module (social feed texts, post generators)