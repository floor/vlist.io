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

### Flat example list with feature chips

Groups are loose thematic clusters, not feature buckets. An example lives in whichever group best matches the *thing being built*.

```
Essentials
  basic                  [core]                            — exists
  controls               [selection] [events]              — exists (4 frameworks)

Layouts
  photo-album (grid)     [grid] [scrollbar]                — exists (4 frameworks)
  photo-album (masonry)  [masonry] [scrollbar]             — exists
  file-browser           [grid] [sections] [scrollbar]     — exists
  horizontal-list        [horizontal]                      — exists (4 frameworks)
  variable-width         [horizontal]                      — exists, add to nav

Data
  infinite-feed          [async] [page]                    ← NEW (simple fetch + placeholders)
  velocity-loading       [async] [scale] [scrollbar] [snapshots] [selection] — exists
  large-dataset          [scale] [scrollbar]               — exists (4 frameworks)

Lists
  contact-list           [sections] [selection]            — exists (rename from sticky-headers)
  multi-select           [selection]                       ← NEW (dedicated selection showcase)
  scroll-restore         [snapshots] [selection]           — exists

Messaging
  chat                   [reverse] [sections]              — exists
  variable-heights       [reverse]                         — exists

Page & Window
  window-scroll          [page] [async]                    — exists
  auto-size              [estimatedHeight]                  — exists

Other
  wizard-nav             [scroll.wheel] [selection]        — exists
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
| Flatten navigation — no feature-based categories | Nav | Examples use many features; categorize by use case, show features as chips |
| Rename "Groups Feature" → dissolve into "Lists" | Nav | `sticky-headers` is a contact list; group by what it builds |
| Rename "Data Feature" → dissolve into "Data" | Nav | Split scale from async — different use cases |
| Dissolve "Other Features" | Nav | `window-scroll` → "Page & Window", `scroll-restore` → "Lists" |
| Dissolve "Advanced Examples" | Nav | `reverse-chat` → "Messaging", `auto-size` → "Page & Window", `variable-heights` → "Messaging", `wizard-nav` → "Other" |
| Add masonry to index.html | Fix | Already in navigation.json, missing from landing page |
| Add `horizontal/variable-width` to nav | Fix | Exists on disk, missing from navigation.json |
| Add `selection/multi-select` | New | Selection has no dedicated example |
| Add `data/infinite-feed` | New | Async has no simple example (velocity-loading is too complex for a starting point) |
| Add feature chips to navigation.json entries | New | Each entry gets a `features` array for rendering chips |
| Sync index.html from navigation.json | Fix | Prevent future drift |

### What doesn't change

- **Build system** — works perfectly, no changes needed
- **Shared styles** — solid, theme bridging works
- **Existing example code** — quality is high, no rewrites needed
- **Icons directory** — used by examples, stays as-is
- **Multi-framework strategy** — keep current approach (JS always, framework variants for key examples)
- **Directory structure on disk** — examples stay where they are; only navigation metadata changes

---

## Relationship to Tutorials

Each tutorial should point to one or more live examples. The mapping:

| Tutorial (from tutorials.md) | Primary Example | Secondary Examples | Status |
|------------------------------|----------------|-------------------|--------|
| Your First List | `/examples/basic` | — | ✅ Exists |
| Photo Gallery | `/examples/grid/photo-album` | `grid/file-browser`, `masonry/photo-album` | ✅ Exists |
| Contact List | `/examples/groups/sticky-headers` | `controls` (selection) | ✅ Exists |
| Chat Interface | `/examples/reverse-chat` | `variable-heights` | ✅ Exists |
| Infinite Feed | new `/examples/data/infinite-feed` | `data/velocity-loading`, `window-scroll` | 🟡 Simple one needed |
| Large Dataset | `/examples/data/large-list` | `data/velocity-loading` | ✅ Exists |
| Styling | No dedicated example | — | ❌ (tutorial is self-contained) |
| Accessibility | No dedicated example | `controls` (keyboard nav) | ❌ (tutorial is self-contained) |

**Key insight:** The tutorial plan mostly maps to existing examples. The main gap is a simple async example for the "Infinite Feed" tutorial. Everything else exists.

---

## Phase Plan

### Phase 1 — Navigation & Chips

- Restructure `navigation.json` with use-case groups and `features` arrays on each entry
- Sync `index.html` to match — render feature chips next to each example card
- Add masonry to index.html (missing)
- Add `horizontal/variable-width` to navigation.json (missing)
- No code changes to existing examples

### Phase 2 — New Examples

- Create `data/infinite-feed` — minimal async fetch with placeholders (the "hello world" of async loading) `[async] [page]`
- Create `selection/multi-select` — dedicated selection example (single, multi, range, programmatic API) `[selection]`
- Wire both into navigation.json and index.html with feature chips

### Phase 3 — Polish & Consistency

- Verify all examples build cleanly (`bun run build:examples`)
- Verify all content.html files have consistent structure
- Add SolidJS variants to key multi-framework examples (if adapter is stable enough)
- Review descriptions in navigation.json for accuracy and consistency
- Check all examples use builder API (no monolithic config)

### Phase 4 — Cross-Links (shared with tutorials)

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

#### navigation.json — Full restructure

Rewrote `examples/navigation.json` from feature-based categories to use-case groups with feature chips.

**Before:** 8 groups organized by feature (`Grid Feature`, `Masonry Feature`, `Data Feature`, `Groups Feature`, `Other Features`, `Advanced Examples`).

**After:** 7 groups organized by what you're building (`Essentials`, `Layouts`, `Data`, `Lists`, `Messaging`, `Page & Window`, plus unchanged `Other`).

| Before (group) | Example | After (group) |
|----------------|---------|---------------|
| Getting Started | basic | Essentials |
| Getting Started | controls | Essentials |
| Grid Feature | grid/photo-album | Layouts |
| Grid Feature | grid/file-browser | Layouts |
| Masonry Feature | masonry/photo-album | Layouts |
| Data Feature | data/large-list | Data |
| Data Feature | data/velocity-loading | Data |
| Horizontal | horizontal/basic | Layouts |
| Horizontal | horizontal/variable-width | Layouts |
| Groups Feature | groups/sticky-headers | Lists |
| Other Features | scroll-restore | Lists |
| Other Features | window-scroll | Page & Window |
| Advanced Examples | auto-size | Page & Window |
| Advanced Examples | variable-heights | Messaging |
| Advanced Examples | reverse-chat | Messaging |
| Advanced Examples | wizard-nav | Lists |

Every entry now has a `features` array:

```json
{
  "slug": "grid/file-browser",
  "name": "File Browser",
  "desc": "Finder-like file browser with grid/list toggle and breadcrumb navigation",
  "features": ["grid", "sections", "scrollbar"]
}
```

**Fixes included:**
- `masonry/photo-album` — was in navigation.json but **missing from index.html**. Now in "Layouts" group, rendered by server from navigation.json.
- `horizontal/variable-width` — existed on disk but **missing from navigation.json**. Now included in "Layouts" group.

**Name improvements:**
- `basic` → "Basic List" (was "Basic")
- `grid/photo-album` → "Photo Album (Grid)" (disambiguate from masonry)
- `masonry/photo-album` → "Photo Album (Masonry)" (disambiguate from grid)
- `horizontal/basic` → "Horizontal Carousel" (was "Basic Horizontal")
- `groups/sticky-headers` → "Contact List" (was "Sticky Headers" — describes what it builds, not the feature)
- `data/large-list` → "Large Dataset" (was "Large List (Scale)")
- `scroll-restore` → "Scroll Restore" (was "Snapshots (Scroll Restore)")
- `reverse-chat` → "Chat" (was "Reverse Chat")
- `window-scroll` → "Window Scroll" (was "Window (Page Scroll)")

#### examples.ts — Feature chips in overview renderer

Added `features?: string[]` to `ExampleItem` interface. Updated `buildOverviewContent()` to render feature chips below each card description:

```html
<div class="overview__chips">
  <span class="overview__chip">grid</span>
  <span class="overview__chip">scrollbar</span>
</div>
```

Backward-compatible — entries without `features` render no chips.

#### shell.css — Chip styles

Added `.overview__chips` (flex container with gap) and `.overview__chip` (small rounded labels, subtle background, muted text). Uses existing `--bg-subtle` and `--text-dim` tokens for theme compatibility.

#### index.html — Not updated

The static `index.html` is a fallback — the server generates the examples overview from `navigation.json` via `buildOverviewContent()`. The static file is now stale relative to navigation.json but is not served in production. Updating it is deferred — ideally it should be generated, not hand-maintained (principle 23).