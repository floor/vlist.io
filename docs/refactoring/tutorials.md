# Tutorial Refactoring — Audit & Plan

Companion to `documentation.md` (docs refactoring, phases 1–7 complete). Same principles, same audit-log format — every decision and change recorded here.

---

## Motivation

The `/tutorials/` section has 7 files. Only one (`chat-interface.md`) is actually a tutorial. The rest are reference material that landed in the wrong folder: feature tables, CSS token lists, engineering changelogs, browser compatibility matrices. None of them teach by building.

**Goal:** Make vlist's tutorials the best of any virtual scrolling library. Every tutorial walks the reader through building something real, step by step, ending with a working result linked to a live example.

---

## Current State — File-by-File Audit

### quick-start.md (~270 lines)

**What it is:** 7 copy-paste code blocks (simple list, selection, grid, sections, chat, infinite scroll, large dataset) plus a "Common Patterns" section and a feature cost table.

**Problems:**
- Not a tutorial — no narrative, no progression, no explanation of *why*
- Duplicates `getting-started.md` in `/docs/` (which is better structured)
- Bundle size numbers may drift as the library evolves
- "Common Patterns" section is a grab-bag of unrelated snippets

**Verdict:** Replace with `your-first-list` — a real tutorial that teaches one thing well.

### builder-pattern.md (~180 lines)

**What it is:** Explains the three-step builder (`vlist()` → `.use()` → `.build()`), lists features with bundle costs, shows a compatibility matrix, and gives a complex example.

**Problems:**
- Reference material, not a tutorial — no "build something" arc
- Feature table duplicates `features/overview.md`
- Compatibility matrix duplicates `features/overview.md`
- Bundle cost numbers duplicate `resources/bundle-size.md`

**Verdict:** Archive. The builder pattern is already covered in `docs/getting-started.md` and `docs/features/overview.md`. Feature tutorials will teach builder composition by example (every tutorial uses `.use()`).

### chat-interface.md (918 lines)

**What it is:** The only real tutorial. Teaches reverse mode for chat UIs — quick start, how it works, data operations, combining with sections/async/selection, API reference, multiple complete examples, troubleshooting.

**Problems:**
- 918 lines is excessive for a tutorial — tries to be both tutorial and reference
- Contains a full API reference section (methods, events) that belongs in `/docs/api/`
- Troubleshooting section duplicates error messages already documented in feature pages
- Older monolithic config style in some "combining with" examples (uses `getGroupForIndex` at top level instead of `withGroups()`)
- Title is "Reverse Mode" not "Chat Interface" — confusing mismatch with nav

**Verdict:** Keep and tighten. Strip API reference and troubleshooting to `/docs/`. Focus on the build-a-chat narrative. Verify all code uses builder API consistently.

### accessibility.md (526 lines)

**What it is:** Lists ARIA roles, DOM structure, keyboard shortcuts, screen reader behavior, CSS focus styles, design tokens, implementation details.

**Problems:**
- Reference doc, not a tutorial — no "make your list accessible" journey
- Overlaps significantly with `docs/api/reference.md` (which documents ARIA attributes)
- Configuration section shows old monolithic config (`selection`, `ariaLabel` at top level) — needs builder API examples
- "Implementation Details" section is internals content

**Verdict:** Rewrite as a focused tutorial: "Make your list accessible" — add `ariaLabel`, enable keyboard navigation with `withSelection()`, test with a screen reader. Move reference content to docs.

### mobile.md (~450 lines)

**What it is:** Explains how vlist works on mobile — native scrolling, performance optimizations, responsive CSS, scrollbar limitations, browser support table, testing instructions, speculative "Future Enhancements."

**Problems:**
- Reference/guide, not a tutorial
- Stale import paths: `import { vlist } from 'vlist'` (should be `@floor/vlist`)
- "Future Enhancements" section describes features that don't exist (pull-to-refresh, swipe actions, haptic feedback) — misleading
- Browser support table duplicates README
- Much of the performance content duplicates `optimization.md`
- Scrollbar limitation section duplicates `features/scrollbar.md`

**Verdict:** Archive. Useful CSS snippets (`100dvh`, safe-area-insets, touch targets) merge into the styling tutorial. The rest is covered by existing docs.

### optimization.md (~380 lines)

**What it is:** Internal engineering log. Lists every implemented optimization with ✅/⏸️/🟡 status markers, completed items with strikethrough (`~~S1. Remove innerHTML~~`), pending items with priority matrices, Chrome DevTools profiling instructions.

**Problems:**
- Not a tutorial — it's a development changelog
- Reads like git history: "S1 ✅ Implemented", "Z3 🟡 Low Impact"
- Template authoring guidelines are useful but buried in engineering context
- Benchmarking section is useful but belongs in `/docs/resources/`
- Stale `VListConfig` references (fixed in chat-interface and optimization during Phase 7, but the overall framing is still changelog-style)

**Verdict:** Archive the engineering log. Extract the two useful pieces:
1. Template authoring guidelines → merge into the styling tutorial or a new "templates" tutorial
2. Benchmarking/profiling → move to `docs/resources/` or the "large dataset" tutorial

### styling.md (~500 lines)

**What it is:** CSS reference — design tokens, class lists, variants, dark mode, template styling, loading/empty states, animations, utility classes, best practices.

**Problems:**
- Reference doc, not a tutorial — no "style your list" journey
- Comprehensive but overwhelming — 500 lines of CSS custom properties and class names
- Stale import paths in Quick Start: `import { vlist } from 'vlist'`
- CDN links use `unpkg.com/vlist` (wrong package name — should be `@floor/vlist`)

**Verdict:** Rewrite as a tutorial: "Style your list" — import styles, customize tokens, add dark mode, apply variants. Move the exhaustive class/token reference to a new `docs/api/styles.md` or keep in a collapsed reference section at the bottom.

### navigation.json

```json
[
  {
    "label": "Getting Started",
    "items": [
      { "slug": "quick-start", ... },
      { "slug": "builder-pattern", ... }
    ]
  },
  {
    "label": "Building Features",
    "items": [
      { "slug": "chat-interface", ... }
    ]
  },
  {
    "label": "Advanced Topics",
    "items": [
      { "slug": "accessibility", ... },
      { "slug": "mobile", ... },
      { "slug": "optimization", ... },
      { "slug": "styling", ... }
    ]
  }
]
```

**Problems:**
- "Building Features" has one entry
- "Advanced Topics" is a catch-all for unrelated reference docs
- No feature tutorials (grid, sections, selection, async, scale)

---

## Target Structure

```
tutorials/
├── Getting Started
│   └── your-first-list        ← NEW (replaces quick-start)
│
├── Feature Tutorials
│   ├── photo-gallery          ← NEW (grid + scrollbar)
│   ├── contact-list           ← NEW (sections + selection)
│   ├── chat-interface         ← REWRITE (reverse + async + date headers)
│   ├── infinite-feed          ← NEW (async + page + placeholders)
│   └── large-dataset          ← NEW (scale + scrollbar + performance)
│
├── Recipes
│   ├── styling                ← REWRITE (tutorial format, trim reference)
│   └── accessibility          ← REWRITE (tutorial format, trim reference)
│
└── Archive
    ├── quick-start            → replaced by your-first-list
    ├── builder-pattern        → content absorbed into feature tutorials
    ├── mobile                 → useful bits merged into styling
    └── optimization           → engineering log, not user-facing
```

### What each tutorial builds

| Tutorial | User builds | Features taught | Live example |
|----------|------------|-----------------|--------------|
| **Your First List** | A user directory (100K users) | Install, `vlist()`, `.build()`, template, `scrollToIndex`, events | `/examples/basic` |
| **Photo Gallery** | A responsive image grid | `withGrid()`, `withScrollbar()`, responsive columns, `item:click` | `/examples/photo-album` |
| **Contact List** | An A–Z contacts app | `withGroups()`, `withSelection()`, sticky headers, keyboard nav | `/examples/contact-list` |
| **Chat Interface** | A messaging UI | `reverse`, `withAsync()`, `withGroups({ sticky: false })`, append/prepend | `/examples/messaging-app` |
| **Infinite Feed** | A social media feed | `withAsync()`, `withPage()`, placeholders, velocity loading | `/examples/velocity-loading` |
| **Large Dataset** | A 5M-row data table | `withScale()`, `withScrollbar()`, compression, template perf | `/examples/large-list` |
| **Styling** | Dark-themed custom list | Tokens, variants, dark mode, scoped styles, `.vlist--scrolling` | — |
| **Accessibility** | WCAG-compliant list | `ariaLabel`, `withSelection()`, keyboard nav, screen reader testing | — |

### Principles for tutorials (extending the docs principles)

12. **Build, don't list** — Every tutorial walks through building one real thing. No feature tables, no compatibility matrices, no engineering changelogs.
13. **One tutorial, one outcome** — Each tutorial has a single goal stated in the first line. Everything in the file serves that goal.
14. **Show the live result** — Link to the corresponding `/examples/` page at the top. The reader knows what they're building before they start.
15. **Progressive disclosure** — Start with the simplest version, layer complexity. "Basic grid → add scrollbar → make responsive → add click handling."
16. **No duplication with /docs/** — Tutorials teach *how*. Docs are the *reference*. If a tutorial needs to explain an API, link to the docs page — don't reproduce the type table.
17. **Every code block runs** — No pseudo-code, no `// ...` elisions in critical paths. The reader should be able to copy-paste and get a working result.

---

## Phase Plan

### Phase 1 — Foundation

- Write `your-first-list.md`
- Archive `quick-start.md` and `builder-pattern.md`
- Update `navigation.json` with new structure
- Verify `/examples/basic` exists and matches the tutorial

### Phase 2 — Feature Tutorials (Grid, Sections)

- Write `photo-gallery.md` (grid + scrollbar)
- Write `contact-list.md` (sections + selection)
- Verify corresponding live examples exist and match

### Phase 3 — Feature Tutorials (Async, Scale)

- Write `infinite-feed.md` (async + page)
- Write `large-dataset.md` (scale + scrollbar)
- Verify corresponding live examples exist and match

### Phase 4 — Chat Interface Rewrite

- Tighten `chat-interface.md` — strip API reference, troubleshooting, monolithic config
- Focus on the build-a-chat narrative
- Verify all code uses builder API
- Verify `/examples/messaging-app` matches

### Phase 5 — Recipes (Styling, Accessibility)

- Rewrite `styling.md` as a tutorial
- Rewrite `accessibility.md` as a tutorial
- Move exhaustive reference content to `/docs/` if needed
- Archive `mobile.md` and `optimization.md`
- Merge useful mobile CSS snippets into styling tutorial
- Merge useful template/profiling content into relevant tutorials

### Phase 6 — Cross-Links and Polish

- Add "See it live" links at the top of each tutorial
- Add "Next tutorial" / "Previous tutorial" links at the bottom
- Update `/docs/` pages that link to tutorials (getting-started.md, feature pages, README)
- Update `NEXT_THREAD.md`
- Final read-through for consistency with the 17 principles

---

## Execution Log

*Phases will be logged below as they are completed, following the same format as `documentation.md`.*