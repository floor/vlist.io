# Examples Refactoring — Audit & Plan

Companion to `documentation.md` (docs, phases 1–7) and `tutorials.md` (tutorials, planned). Same audit-log format — every decision and change recorded here.

---

## Motivation

Tutorials teach by building. Examples *are* the built thing, running live. Docs are the reference you consult while building. The three sections form a triangle — if any side is weak, the others lose credibility.

The examples are the strongest of the three today. Code quality is high, the build system is solid, and several examples are genuinely impressive (reverse-chat, velocity-loading, file-browser). But coverage is uneven, organization is inconsistent, and several features have zero or minimal representation.

**Goal:** Make vlist's examples the best of any virtual scrolling library. Every feature has a showcase. Every tutorial points to a live example. Every example is polished, consistent, and teaches something by existing.

---

## Inventory

### What exists (14 example directories + build infrastructure)

| Slug | Feature(s) | Frameworks | Quality | Lines (JS) |
|------|-----------|------------|---------|------------|
| `basic` | Core | JS only | 🟢 | ~50 |
| `controls` | Selection, events | JS, React, Vue, Svelte | 🟢 | ~250 |
| `grid/photo-album` | Grid, scrollbar | JS, React, Vue, Svelte | 🟢 | ~300 |
| `grid/file-browser` | Grid, sections, scrollbar | JS only | 🟢 | ~600 |
| `masonry/photo-album` | Masonry, scrollbar | JS only | 🟡 | ~270 |
| `data/large-list` | Scale, scrollbar | JS, React, Vue, Svelte | 🟢 | ~250 |
| `data/velocity-loading` | Async, scale, scrollbar, snapshots, selection | JS only | 🟢 | ~300 |
| `horizontal/basic` | Horizontal orientation | JS, React, Vue, Svelte | 🟢 | ~60 |
| `horizontal/variable-width` | Horizontal, variable width | JS only | 🟡 | ~65 |
| `groups/sticky-headers` | Sections | JS only | 🟢 | ~460 |
| `scroll-restore` | Snapshots, selection | JS only | 🟢 | ~240 |
| `window-scroll` | Page, async | JS only | 🟢 | ~150 |
| `reverse-chat` | Reverse, sections | JS only | 🟢 | ~400 |
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
4. **Several examples are genuinely impressive.** `reverse-chat` is a full chat app with auto-messages, DOM measurement, date headers, event logging. `velocity-loading` has real-time velocity visualization, API delay slider, snapshot persistence. `file-browser` has grid/list toggle, breadcrumb navigation, real filesystem API.
5. **Multi-framework examples exist where they matter.** `controls`, `grid/photo-album`, `data/large-list`, `horizontal/basic` all have JS + React + Vue + Svelte variants.

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
| **Masonry** | `masonry/photo-album` (JS only) | No multi-framework, not in index.html |
| **Async (standalone)** | `data/velocity-loading` | Velocity-loading is complex — no simple "fetch from API" example |
| **Page scroll** | `window-scroll` | Only one, works well |
| **Placeholders** | *(none)* | Placeholder system is documented but never shown |
| **Snapshots (standalone)** | `scroll-restore` | Works well |
| **Horizontal** | `basic` + `variable-width` | variable-width not in nav |
| **Reverse** | `reverse-chat` | Good but complex — no simple reverse example |
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
examples/reverse-chat/script.js

# Pattern B: feature/name/framework (multi-framework)
examples/grid/photo-album/javascript/script.js
examples/grid/photo-album/react/script.tsx

# Pattern C: flat with shared.js (multi-framework with shared data)
examples/controls/javascript/script.js
examples/controls/shared.js
```

This is functional but inconsistent. Pattern A examples can't easily gain framework variants later. Not a blocker, but worth standardizing if we're adding new examples.

#### 4. "Other Features" is a catch-all

The group "Other Features" contains `scroll-restore` and `window-scroll` — two unrelated examples. It's the equivalent of a "Misc" folder. These should be organized by what they demonstrate.

#### 5. "Advanced Examples" mixes difficulty with feature type

`auto-size`, `variable-heights`, `reverse-chat`, and `wizard-nav` are grouped by perceived difficulty rather than by feature. A reader looking for "how to use reverse mode" has to scan "Advanced Examples" to find `reverse-chat`. A reader looking for "variable item sizes" has to know the difference between "Auto-Size Measurement" and "Variable Heights."

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
  messaging              [reverse] [sections]                            — exists (rename from reverse-chat)
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
| Merge `grid/photo-album` + `masonry/photo-album` | Modify | One "Photo Album" with grid/masonry toggle — layout mode is a switch, not a different app |
| Merge `horizontal/basic` + `horizontal/variable-width` | Modify | One "Carousel" with fixed/variable width toggle |
| Rewrite `auto-size` → "Feed" | Modify | Social feed with X API data instead of synthetic auto-size demo |
| Archive `controls` | Archive | API exploration replaced by individual Essentials examples that demo APIs in context |
| Archive `variable-heights` | Archive | Replaced by Feed example |
| Move everything into Essentials | Nav | `reverse-chat` → Messaging, `groups/sticky-headers` → Contact List, `wizard-nav` → Wizard, `grid/file-browser` → File Browser, `window-scroll` → Window Scroll, `auto-size` → Feed |

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
| Photo Gallery | `/examples/grid/photo-album` | `grid/file-browser` | ✅ Exists (adding masonry toggle) |
| Contact List | `/examples/groups/sticky-headers` | — | ✅ Exists |
| Chat Interface | `/examples/reverse-chat` | — | ✅ Exists |
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

#### 1. Basic List — Control panel

Add an aside panel with controls to explore the core API interactively:
- **Item count** slider (100 → 100K) — shows virtualization benefit as count grows
- **Item height** toggle (fixed ↔ variable) — demonstrates both sizing strategies
- **Overscan** slider (0–10) — visualize the render buffer
- **Scroll to** input + go button — `scrollToIndex()` with align selector (start/center/end)
- **Data operations** — append, prepend, remove buttons
- Live stats: total items, DOM nodes, visible range, scroll position

#### 2. Photo Album — Layout toggle grid / masonry

Merge `grid/photo-album` + `masonry/photo-album` into one example with controls:
- **Layout switch**: Grid ↔ Masonry — destroys and recreates with `withGrid()` or `withMasonry()`
- Keep existing grid controls (columns, gap, orientation)
- Masonry mode: variable heights from photo aspect ratios, shortest-lane placement
- Shared data (Picsum photos), shared card template
- Archive `masonry/photo-album/` directory after merge

#### 3. Messaging — Header controls

Enhance the existing reverse-chat with section header controls:
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

### Phase 3 — Archive & Clean Up

- Archive `controls/`, `variable-heights/`, `horizontal/variable-width/`, `masonry/photo-album/` to `examples/archive/`
- Remove archived entries from navigation.json (already done in Phase 1)
- Verify all 12 examples build cleanly (`bun run build:examples`)
- Verify all content.html files have consistent structure
- Check all examples use builder API (no monolithic config)

### Phase 4 — Polish & Consistency

- Consistent control panel layout across all Essentials (same aside pattern, same button/toggle styles)
- Consistent stats bar across all examples (items, DOM nodes, visible range)
- Review descriptions in navigation.json for accuracy after all enhancements
- Verify feature chips match actual features used after modifications

### Phase 5 — Cross-Links (shared with tutorials)

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
| Grid Feature | grid/photo-album | Essentials → "Photo Album" | Will merge masonry with toggle |
| Grid Feature | grid/file-browser | Essentials → "File Browser" | — |
| Masonry Feature | masonry/photo-album | **Merged into Photo Album** | Grid ↔ Masonry toggle |
| Data Feature | data/large-list | Data → "Large Dataset" | — |
| Data Feature | data/velocity-loading | Data → "Velocity Loading" | — |
| Horizontal | horizontal/basic | Essentials → "Carousel" | Will merge variable-width with toggle |
| Horizontal | horizontal/variable-width | **Merged into Carousel** | Fixed ↔ Variable toggle |
| Groups Feature | groups/sticky-headers | Essentials → "Contact List" | — |
| Other Features | scroll-restore | Data → "Scroll Restore" | — |
| Other Features | window-scroll | Essentials → "Window Scroll" | — |
| Advanced Examples | auto-size | Essentials → "Feed" | Will rewrite with X API data |
| Advanced Examples | variable-heights | **Archived** | Replaced by Feed |
| Advanced Examples | reverse-chat | Essentials → "Messaging" | — |
| Advanced Examples | wizard-nav | Essentials → "Wizard" | — |

Every entry now has a `features` array:

```json
{
  "slug": "grid/file-browser",
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